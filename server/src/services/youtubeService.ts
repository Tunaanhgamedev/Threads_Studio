import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { 
  YouTubeAccount, 
  YouTubePublishItem, 
  AvailableRenderedVideo, 
  YouTubePrivacyStatus 
} from '../types.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { getStorageDir } from '../storagePath.js';

export class YouTubeService {
  private static readonly OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private static readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
  private static readonly YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  /**
   * Get Google OAuth 2.0 Authorization URL
   */
  static getAuthUrl(customRedirect?: string): { url: string; clientIdSet: boolean } {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = customRedirect || process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3210/api/youtube/oauth/callback';

    if (!clientId) {
      return {
        url: '',
        clientIdSet: false
      };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    return {
      url: `${this.OAUTH_AUTH_URL}?${params.toString()}`,
      clientIdSet: true
    };
  }

  /**
   * Handle Google OAuth 2.0 Callback with authorization code
   */
  static async handleOAuthCallback(code: string, customRedirect?: string): Promise<YouTubeAccount> {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = customRedirect || process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3210/api/youtube/oauth/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Chưa cấu hình YOUTUBE_CLIENT_ID hoặc YOUTUBE_CLIENT_SECRET trong server/.env');
    }

    // Exchange code for tokens
    const tokenRes = await fetch(this.OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Đổi OAuth Token thất bại (${tokenRes.status}): ${errText}`);
    }

    const tokenData = await tokenRes.json() as any;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = Number(tokenData.expires_in) || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Fetch Channel Information from YouTube Data API
    const channelRes = await fetch(`${this.YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!channelRes.ok) {
      const errText = await channelRes.text();
      throw new Error(`Không thể lấy thông tin kênh YouTube: ${errText}`);
    }

    const channelData = await channelRes.json() as any;
    const item = channelData.items?.[0];
    if (!item) {
      throw new Error('Tài khoản Google này chưa có kênh YouTube nào được tạo.');
    }

    const channelId = item.id;
    const channelTitle = item.snippet?.title || 'Kênh YouTube của tôi';
    const channelHandle = item.snippet?.customUrl || '';
    const avatarUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '';
    const subscriberCount = Number(item.statistics?.subscriberCount) || 0;
    const videoCount = Number(item.statistics?.videoCount) || 0;

    const id = `yt_acc_${Date.now()}`;
    const now = new Date().toISOString();

    // Save or update in database
    const existing = db.prepare('SELECT id FROM youtube_accounts WHERE channel_id = ?').get(channelId) as any;
    if (existing) {
      db.prepare(`
        UPDATE youtube_accounts 
        SET channel_title = ?, channel_handle = ?, avatar_url = ?, subscriber_count = ?, video_count = ?,
            access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expiry = ?, is_active = 1, updated_at = ?
        WHERE channel_id = ?
      `).run(
        channelTitle,
        channelHandle,
        avatarUrl,
        subscriberCount,
        videoCount,
        encryptToken(accessToken),
        refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiry,
        now,
        channelId
      );

      return {
        id: existing.id,
        channelId,
        channelTitle,
        channelHandle,
        avatarUrl,
        subscriberCount,
        videoCount,
        tokenExpiry,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    } else {
      db.prepare(`
        INSERT INTO youtube_accounts 
        (id, channel_id, channel_title, channel_handle, avatar_url, subscriber_count, video_count, access_token, refresh_token, token_expiry, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        channelId,
        channelTitle,
        channelHandle,
        avatarUrl,
        subscriberCount,
        videoCount,
        encryptToken(accessToken),
        refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiry,
        now,
        now
      );

      return {
        id,
        channelId,
        channelTitle,
        channelHandle,
        avatarUrl,
        subscriberCount,
        videoCount,
        tokenExpiry,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    }
  }

  /**
   * Add a manual or demo YouTube account
   */
  static addManualAccount(data: {
    channelTitle: string;
    channelHandle?: string;
    avatarUrl?: string;
    accessToken?: string;
  }): YouTubeAccount {
    const id = `yt_acc_${Date.now()}`;
    const now = new Date().toISOString();
    const channelId = `UC_demo_${Math.random().toString(36).substring(2, 10)}`;
    const channelTitle = data.channelTitle.trim() || 'Kênh Demo Content Studio';
    const channelHandle = data.channelHandle?.trim() || '@demochannel';
    const avatarUrl = data.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80';
    const token = data.accessToken || `demo_access_token_${Date.now()}`;

    db.prepare(`
      INSERT INTO youtube_accounts 
      (id, channel_id, channel_title, channel_handle, avatar_url, subscriber_count, video_count, access_token, refresh_token, token_expiry, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1250, 48, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      channelId,
      channelTitle,
      channelHandle,
      avatarUrl,
      encryptToken(token),
      null,
      new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      now,
      now
    );

    return {
      id,
      channelId,
      channelTitle,
      channelHandle,
      avatarUrl,
      subscriberCount: 1250,
      videoCount: 48,
      tokenExpiry: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * List all connected YouTube Accounts
   */
  static listAccounts(): YouTubeAccount[] {
    const rows = db.prepare('SELECT * FROM youtube_accounts ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      channelId: r.channel_id,
      channelTitle: r.channel_title,
      channelHandle: r.channel_handle,
      avatarUrl: r.avatar_url,
      subscriberCount: r.subscriber_count,
      videoCount: r.video_count,
      tokenExpiry: r.token_expiry,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Delete connected YouTube account
   */
  static deleteAccount(id: string): void {
    db.prepare('DELETE FROM youtube_accounts WHERE id = ?').run(id);
  }

  /**
   * Get valid decrypted access token (refreshing automatically if needed)
   */
  private static async getValidAccessToken(accountId: string): Promise<string> {
    const row = db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(accountId) as any;
    if (!row) throw new Error('Không tìm thấy tài khoản YouTube');

    let accessToken = decryptToken(row.access_token);
    const expiry = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;
    const isExpired = Date.now() >= expiry - 60000; // 1 min buffer

    if (isExpired && row.refresh_token) {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      const refreshToken = decryptToken(row.refresh_token);

      if (clientId && clientSecret && refreshToken) {
        try {
          const res = await fetch(this.OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token'
            })
          });

          if (res.ok) {
            const data = await res.json() as any;
            accessToken = data.access_token;
            const newExpiry = new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000).toISOString();
            
            db.prepare(`
              UPDATE youtube_accounts 
              SET access_token = ?, token_expiry = ?, updated_at = ?
              WHERE id = ?
            `).run(encryptToken(accessToken), newExpiry, new Date().toISOString(), accountId);
          }
        } catch (err: any) {
          console.warn('[YouTubeService] Token refresh error:', err.message);
        }
      }
    }

    return accessToken;
  }

  /**
   * Scan storage & database for available rendered MP4 videos ready for YouTube
   */
  static listAvailableVideos(): AvailableRenderedVideo[] {
    const storageDir = getStorageDir();
    const videoDir = path.join(storageDir, 'videos');
    const available: AvailableRenderedVideo[] = [];
    const seenPaths = new Set<string>();

    // 1. Projects with completed render jobs
    const projectRows = db.prepare(`
      SELECT p.id as project_id, p.title as project_title, r.output_video_path, r.output_video_url, r.thumbnail_url, r.created_at,
             post.username, post.content
      FROM projects p
      JOIN render_jobs r ON p.id = r.project_id
      LEFT JOIN posts post ON p.id = post.project_id
      WHERE r.status = 'completed' AND r.output_video_path IS NOT NULL
      ORDER BY r.created_at DESC
    `).all() as any[];

    for (const row of projectRows) {
      if (row.output_video_path && fs.existsSync(row.output_video_path)) {
        seenPaths.add(path.resolve(row.output_video_path));
        available.push({
          projectId: row.project_id,
          projectTitle: row.project_title || 'Video Threads',
          videoPath: row.output_video_path,
          videoUrl: row.output_video_url || `/api/videos/${path.basename(row.output_video_path)}`,
          thumbnailUrl: row.thumbnail_url,
          createdAt: row.created_at,
          authorUsername: row.username,
          postContent: row.content
        });
      }
    }

    // 2. Scan physical video directory for any orphaned or exported MP4s
    if (fs.existsSync(videoDir)) {
      const files = fs.readdirSync(videoDir);
      for (const file of files) {
        if (file.endsWith('.mp4')) {
          const fullPath = path.join(videoDir, file);
          const resolved = path.resolve(fullPath);
          if (!seenPaths.has(resolved)) {
            const stats = fs.statSync(fullPath);
            seenPaths.add(resolved);
            available.push({
              projectId: `file_${file}`,
              projectTitle: `Video xuất khẩu: ${file}`,
              videoPath: fullPath,
              videoUrl: `/api/videos/${file}`,
              createdAt: stats.birthtime.toISOString()
            });
          }
        }
      }
    }

    return available;
  }

  /**
   * Auto-generate SEO-friendly YouTube Shorts title, description, and tags
   */
  static generateMetadata(projectId?: string, customTitle?: string): {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: YouTubePrivacyStatus;
  } {
    let postContent = '';
    let authorUsername = '';
    let authorDisplayName = '';
    let postUrl = '';

    if (projectId) {
      const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
      const post = db.prepare('SELECT * FROM posts WHERE project_id = ?').get(projectId) as any;
      if (post) {
        postContent = post.content || '';
        authorUsername = post.username || '';
        authorDisplayName = post.display_name || '';
        postUrl = post.url || '';
      }
    }

    // 1. Title formatting (Under 100 chars, SEO rich, with #Shorts)
    let baseTitle = customTitle || postContent.replace(/\n/g, ' ').slice(0, 75).trim();
    if (!baseTitle) {
      baseTitle = 'Câu chuyện Threads đáng suy ngẫm hôm nay';
    }
    const cleanTitle = baseTitle.replace(/[#@]/g, '').trim();
    const finalTitle = `${cleanTitle} #Shorts`.slice(0, 100);

    // 2. Description with Story & Credits
    const description = `📖 CÂU CHUYỆN THREADS NỔI BẬT:
${postContent ? postContent : cleanTitle}

${authorUsername ? `👤 Tác giả: @${authorUsername}${authorDisplayName ? ` (${authorDisplayName})` : ''}` : ''}
${postUrl ? `🔗 Nguồn bài viết: ${postUrl}` : ''}

🎬 Video được biên tập và xuất bản tự động với Threads Content Studio (v0.10.0).
👍 Hãy bấm Like và Đăng ký kênh để đón xem những câu chuyện tâm sự Threads hấp dẫn mỗi ngày!

------------------------------------
#Shorts #Threads #Story #Reddit #TikTok #Viral #Podcast #TamTrang`;

    // 3. Recommended tags
    const tags = [
      'shorts',
      'threads',
      'cauchuyen',
      'story',
      'reddit',
      'tiktok',
      'vietnam',
      'tamtrang',
      'podcast',
      'viral'
    ];

    return {
      title: finalTitle,
      description,
      tags,
      categoryId: '22', // 22 = People & Blogs
      privacyStatus: 'public'
    };
  }

  /**
   * List all publishing records
   */
  static listPublishes(): YouTubePublishItem[] {
    const rows = db.prepare(`
      SELECT p.*, a.channel_title
      FROM youtube_publishes p
      LEFT JOIN youtube_accounts a ON p.account_id = a.id
      ORDER BY p.created_at DESC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      accountId: r.account_id,
      channelTitle: r.channel_title,
      projectId: r.project_id,
      projectTitle: r.project_title,
      videoPath: r.video_path,
      videoUrl: r.video_url,
      title: r.title,
      description: r.description,
      tags: JSON.parse(r.tags || '[]'),
      categoryId: r.category_id || '22',
      privacyStatus: r.privacy_status || 'private',
      publishAt: r.publish_at,
      thumbnailPath: r.thumbnail_path,
      thumbnailUrl: r.thumbnail_url,
      youtubeVideoId: r.youtube_video_id,
      status: r.status,
      uploadProgress: r.upload_progress || 0,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      publishedAt: r.published_at
    }));
  }

  /**
   * Create a new draft publish task
   */
  static createPublishDraft(data: {
    accountId?: string;
    projectId?: string;
    projectTitle?: string;
    videoPath: string;
    videoUrl?: string;
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: YouTubePrivacyStatus;
    publishAt?: string;
    thumbnailPath?: string;
    thumbnailUrl?: string;
  }): YouTubePublishItem {
    const id = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const tagsJson = JSON.stringify(data.tags || ['shorts', 'threads']);
    const privacy = data.privacyStatus || 'private';

    db.prepare(`
      INSERT INTO youtube_publishes 
      (id, account_id, project_id, project_title, video_path, video_url, title, description, tags, category_id, privacy_status, publish_at, thumbnail_path, thumbnail_url, status, upload_progress, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?)
    `).run(
      id,
      data.accountId || null,
      data.projectId || null,
      data.projectTitle || 'Video Threads',
      data.videoPath,
      data.videoUrl || null,
      data.title,
      data.description || '',
      tagsJson,
      data.categoryId || '22',
      privacy,
      data.publishAt || null,
      data.thumbnailPath || null,
      data.thumbnailUrl || null,
      now,
      now
    );

    return {
      id,
      accountId: data.accountId,
      projectId: data.projectId,
      projectTitle: data.projectTitle,
      videoPath: data.videoPath,
      videoUrl: data.videoUrl,
      title: data.title,
      description: data.description || '',
      tags: data.tags || ['shorts', 'threads'],
      categoryId: data.categoryId || '22',
      privacyStatus: privacy,
      publishAt: data.publishAt,
      thumbnailPath: data.thumbnailPath,
      thumbnailUrl: data.thumbnailUrl,
      status: 'draft',
      uploadProgress: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update publish draft details
   */
  static updatePublish(id: string, updates: Partial<YouTubePublishItem>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.accountId !== undefined) { fields.push('account_id = ?'); values.push(updates.accountId); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
    if (updates.categoryId !== undefined) { fields.push('category_id = ?'); values.push(updates.categoryId); }
    if (updates.privacyStatus !== undefined) { fields.push('privacy_status = ?'); values.push(updates.privacyStatus); }
    if (updates.publishAt !== undefined) { fields.push('publish_at = ?'); values.push(updates.publishAt); }
    if (updates.thumbnailPath !== undefined) { fields.push('thumbnail_path = ?'); values.push(updates.thumbnailPath); }
    if (updates.thumbnailUrl !== undefined) { fields.push('thumbnail_url = ?'); values.push(updates.thumbnailUrl); }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE youtube_publishes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
  }

  /**
   * Delete publish task
   */
  static deletePublish(id: string): void {
    db.prepare('DELETE FROM youtube_publishes WHERE id = ?').run(id);
  }

  /**
   * Execute video upload to YouTube using Resumable Upload protocol
   */
  static async uploadVideo(publishId: string): Promise<{ success: boolean; videoId?: string; error?: string }> {
    const row = db.prepare('SELECT * FROM youtube_publishes WHERE id = ?').get(publishId) as any;
    if (!row) throw new Error('Không tìm thấy mục xuất bản');

    if (!fs.existsSync(row.video_path)) {
      db.prepare("UPDATE youtube_publishes SET status = 'failed', error_message = ? WHERE id = ?")
        .run(`Không tìm thấy file video tại: ${row.video_path}`, publishId);
      throw new Error(`File video không tồn tại: ${row.video_path}`);
    }

    // Set status to uploading
    db.prepare("UPDATE youtube_publishes SET status = 'uploading', upload_progress = 10, error_message = NULL WHERE id = ?").run(publishId);

    // Rule enforcement: If publish_at is set, YouTube mandates privacyStatus = 'private'
    let privacyStatus = row.privacy_status || 'private';
    if (row.publish_at) {
      privacyStatus = 'private';
    }

    const fileStats = fs.statSync(row.video_path);
    const fileSize = fileStats.size;

    // Check account connection
    const account = row.account_id ? db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(row.account_id) as any : null;

    // LIVE UPLOAD VIA YOUTUBE DATA API (when credentials exist)
    if (account && process.env.YOUTUBE_CLIENT_ID && !account.channel_id.startsWith('UC_demo_')) {
      try {
        const accessToken = await this.getValidAccessToken(account.id);
        const tags = JSON.parse(row.tags || '[]');

        // Step 1: Initiate Resumable Upload
        const initRes = await fetch(`${this.YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': fileSize.toString(),
            'X-Upload-Content-Type': 'video/mp4'
          },
          body: JSON.stringify({
            snippet: {
              title: row.title,
              description: row.description || '',
              tags,
              categoryId: row.category_id || '22'
            },
            status: {
              privacyStatus,
              publishAt: row.publish_at || undefined,
              selfDeclaredMadeForKids: false
            }
          })
        });

        if (!initRes.ok) {
          const errText = await initRes.text();
          throw new Error(`Khởi tạo upload YouTube thất bại (${initRes.status}): ${errText}`);
        }

        const uploadUrl = initRes.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('YouTube không trả về Location URL cho upload resumable');
        }

        db.prepare("UPDATE youtube_publishes SET upload_progress = 30 WHERE id = ?").run(publishId);

        // Step 2: Upload Video File Content
        const videoBuffer = fs.readFileSync(row.video_path);
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': 'video/mp4'
          },
          body: videoBuffer
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Truyền tải video lên YouTube thất bại: ${errText}`);
        }

        const uploadedVideo = await uploadRes.json() as any;
        const videoId = uploadedVideo.id;

        db.prepare("UPDATE youtube_publishes SET upload_progress = 85, youtube_video_id = ? WHERE id = ?").run(videoId, publishId);

        // Step 3: Optional Thumbnail Upload
        if (row.thumbnail_path && fs.existsSync(row.thumbnail_path)) {
          try {
            const thumbBuffer = fs.readFileSync(row.thumbnail_path);
            const isPng = row.thumbnail_path.endsWith('.png');
            await fetch(`${this.YOUTUBE_UPLOAD_BASE}/thumbnails/set?videoId=${videoId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': isPng ? 'image/png' : 'image/jpeg'
              },
              body: thumbBuffer
            });
          } catch (tErr: any) {
            console.warn('[YouTubeService] Cài đặt thumbnail gặp lỗi:', tErr.message);
          }
        }

        const now = new Date().toISOString();
        db.prepare(`
          UPDATE youtube_publishes 
          SET status = 'published', upload_progress = 100, youtube_video_id = ?, published_at = ?, updated_at = ?
          WHERE id = ?
        `).run(videoId, now, now, publishId);

        return { success: true, videoId };
      } catch (err: any) {
        db.prepare("UPDATE youtube_publishes SET status = 'failed', error_message = ? WHERE id = ?")
          .run(err.message, publishId);
        return { success: false, error: err.message };
      }
    } else {
      // TEST / DEMO SIMULATION MODE (Fast, safe, zero-config testing)
      console.log(`[YouTubeService] Uploading in simulated/demo mode for task: ${publishId}`);

      await new Promise(r => setTimeout(r, 600));
      db.prepare("UPDATE youtube_publishes SET upload_progress = 45 WHERE id = ?").run(publishId);

      await new Promise(r => setTimeout(r, 800));
      db.prepare("UPDATE youtube_publishes SET upload_progress = 80 WHERE id = ?").run(publishId);

      await new Promise(r => setTimeout(r, 600));
      const demoVideoId = `yt_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE youtube_publishes 
        SET status = 'published', upload_progress = 100, youtube_video_id = ?, published_at = ?, updated_at = ?
        WHERE id = ?
      `).run(demoVideoId, now, now, publishId);

      return { success: true, videoId: demoVideoId };
    }
  }

  /**
   * Check status of video in YouTube Studio processing pipeline
   */
  static async checkProcessingStatus(publishId: string): Promise<{
    status: string;
    processingDetails?: any;
    embedUrl?: string;
  }> {
    const row = db.prepare('SELECT * FROM youtube_publishes WHERE id = ?').get(publishId) as any;
    if (!row || !row.youtube_video_id) {
      return { status: 'unknown' };
    }

    if (row.youtube_video_id.startsWith('yt_')) {
      return {
        status: 'succeeded',
        embedUrl: `https://www.youtube.com/embed/dQw4w9WgXcQ`
      };
    }

    const account = row.account_id ? db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(row.account_id) as any : null;
    if (account && process.env.YOUTUBE_CLIENT_ID) {
      try {
        const accessToken = await this.getValidAccessToken(account.id);
        const res = await fetch(`${this.YOUTUBE_API_BASE}/videos?id=${row.youtube_video_id}&part=status,processingDetails`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.ok) {
          const data = await res.json() as any;
          const item = data.items?.[0];
          const procStatus = item?.processingDetails?.processingStatus || item?.status?.uploadStatus || 'succeeded';
          return {
            status: procStatus,
            processingDetails: item?.processingDetails,
            embedUrl: `https://www.youtube.com/embed/${row.youtube_video_id}`
          };
        }
      } catch (err: any) {
        console.warn('[YouTubeService] Check processing error:', err.message);
      }
    }

    return {
      status: 'succeeded',
      embedUrl: `https://www.youtube.com/embed/${row.youtube_video_id}`
    };
  }
}
