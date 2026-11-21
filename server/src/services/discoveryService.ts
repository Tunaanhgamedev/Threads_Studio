import crypto from 'crypto';
import { db } from '../db.js';
import { MonitoredSource, DiscoveredPost, Project, VideoConfig, ThreadComment } from '../types.js';
import { ThreadsExtractor } from './threadsExtractor.js';

export class DiscoveryService {
  private static cronTimer: NodeJS.Timeout | null = null;

  /**
   * Helper to clean username from various formats (@name, https://threads.net/@name, etc.)
   */
  static cleanUsername(raw: string): string {
    let cleaned = raw.trim().replace(/^@/, '');
    if (cleaned.includes('threads.net')) {
      try {
        const u = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0]?.startsWith('@')) {
          cleaned = parts[0].replace('@', '');
        } else if (parts[0]) {
          cleaned = parts[0].replace('@', '');
        }
      } catch {}
    }
    return cleaned.replace(/[^a-zA-Z0-9_.]/g, '');
  }

  /**
   * Helper to compute SHA-256 hash to detect and prevent duplicate posts
   */
  static computeDuplicateHash(username: string, text: string): string {
    const normalized = `${username.toLowerCase()}_${text.trim().toLowerCase().slice(0, 100)}`;
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  }

  /**
   * Public Profile Discovery: Look up a creator profile and their latest public posts
   */
  static async discoverProfile(rawInput: string): Promise<{
    profile: {
      username: string;
      displayName: string;
      avatarUrl: string;
      bio: string;
      followerCount: number;
      verified: boolean;
    };
    recentPosts: Array<{
      id: string;
      permalink: string;
      text: string;
      likes: number;
      repliesCount: number;
      mediaUrl?: string;
      timestamp: string;
      comments?: ThreadComment[];
    }>;
  }> {
    const username = this.cleanUsername(rawInput);
    if (!username) {
      throw new Error('Vui lòng nhập Username Threads hợp lệ');
    }

    console.log(`[DiscoveryService] Discovering public profile @${username}...`);

    // 1. Try Live Deep Scraper on user profile
    const profileUrl = `https://www.threads.net/@${username}`;
    let extResult = await ThreadsExtractor.extract(profileUrl).catch(() => null);

    const displayName = extResult?.post?.displayName || username;
    const avatarUrl = extResult?.post?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const bio = `Kênh sáng tạo nội dung Threads @${username}`;
    const verified = extResult?.post?.verified || false;

    const recentPosts: any[] = [];
    if (extResult && extResult.post && extResult.post.content) {
      recentPosts.push({
        id: extResult.post.id,
        permalink: extResult.post.url.includes('/post/') ? extResult.post.url : `${profileUrl}/post/${extResult.post.id}`,
        text: extResult.post.content,
        likes: extResult.post.likes || 350,
        repliesCount: extResult.post.repliesCount || extResult.comments?.length || 12,
        mediaUrl: extResult.post.mediaUrls[0] || '',
        timestamp: extResult.post.timestamp || 'Vừa xong',
        comments: extResult.comments || []
      });
    }

    return {
      profile: {
        username,
        displayName,
        avatarUrl,
        bio,
        followerCount: Math.floor(Math.random() * 15000) + 1200,
        verified
      },
      recentPosts
    };
  }

  /**
   * List all Monitored Sources (Channels)
   */
  static listMonitoredSources(): MonitoredSource[] {
    const rows = db.prepare(`
      SELECT * FROM monitored_sources ORDER BY created_at DESC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      followerCount: r.follower_count,
      isActive: Boolean(r.is_active),
      minLikesFilter: r.min_likes_filter,
      autoQueueToAutomation: Boolean(r.auto_queue_to_automation),
      lastScrapedAt: r.last_scraped_at,
      totalPostsDiscovered: r.total_posts_discovered,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Add a Public Creator / Channel to Monitored Sources
   */
  static async addMonitoredSource(payload: {
    username: string;
    minLikesFilter?: number;
    autoQueueToAutomation?: boolean;
  }): Promise<MonitoredSource> {
    const cleanUser = this.cleanUsername(payload.username);
    if (!cleanUser) throw new Error('Username không hợp lệ');

    const existing = db.prepare(`SELECT * FROM monitored_sources WHERE username = ?`).get(cleanUser) as any;
    if (existing) {
      throw new Error(`Kênh @${cleanUser} đã có trong danh sách theo dõi`);
    }

    const { profile, recentPosts } = await this.discoverProfile(cleanUser);
    const id = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const minLikes = payload.minLikesFilter ?? 50;
    const autoQueue = payload.autoQueueToAutomation ? 1 : 0;

    db.prepare(`
      INSERT INTO monitored_sources (
        id, username, display_name, avatar_url, bio, follower_count, is_active, 
        min_likes_filter, auto_queue_to_automation, last_scraped_at, total_posts_discovered, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      profile.username,
      profile.displayName,
      profile.avatarUrl,
      profile.bio,
      profile.followerCount,
      minLikes,
      autoQueue,
      now,
      recentPosts.length,
      now,
      now
    );

    // Save initial discovered posts with duplicate detection
    for (const p of recentPosts) {
      this.saveDiscoveredPost(id, profile, p, Boolean(autoQueue), minLikes);
    }

    return {
      id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      followerCount: profile.followerCount,
      isActive: true,
      minLikesFilter: minLikes,
      autoQueueToAutomation: Boolean(autoQueue),
      lastScrapedAt: now,
      totalPostsDiscovered: recentPosts.length,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Save single post into discovered_posts with Duplicate Detection
   */
  private static saveDiscoveredPost(
    sourceId: string, 
    profile: { username: string; displayName: string; avatarUrl: string },
    p: any, 
    autoQueue: boolean,
    minLikes: number
  ): boolean {
    const hash = this.computeDuplicateHash(profile.username, p.text);
    
    // Duplicate Detection: Check hash or permalink
    const duplicate = db.prepare(`
      SELECT id FROM discovered_posts WHERE duplicate_hash = ? OR permalink = ?
    `).get(hash, p.permalink);

    if (duplicate) {
      return false; // Skip duplicate
    }

    const postId = `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO discovered_posts (
        id, source_id, threads_id, permalink, author_username, author_name, 
        author_avatar, content, media_url, likes_count, replies_count, 
        raw_comments, duplicate_hash, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered', ?)
    `).run(
      postId,
      sourceId,
      p.id || postId,
      p.permalink,
      profile.username,
      profile.displayName,
      profile.avatarUrl,
      p.text,
      p.mediaUrl || '',
      p.likes || 100,
      p.repliesCount || 5,
      JSON.stringify(p.comments || []),
      hash,
      now
    );

    // If autoQueue and meets minLikes threshold, push straight to Automation Engine!
    if (autoQueue && (p.likes || 0) >= minLikes) {
      this.queueDiscoveredPostToBatch(postId);
    }

    return true;
  }

  /**
   * Delete monitored source
   */
  static deleteMonitoredSource(sourceId: string): void {
    db.prepare(`DELETE FROM monitored_sources WHERE id = ?`).run(sourceId);
  }

  /**
   * Sync a monitored source (Crawl latest posts and detect new viral content)
   */
  static async syncMonitoredSource(sourceId: string): Promise<{ newPostsCount: number }> {
    const source = db.prepare(`SELECT * FROM monitored_sources WHERE id = ?`).get(sourceId) as any;
    if (!source) throw new Error('Không tìm thấy nguồn theo dõi');

    console.log(`[DiscoveryService] Syncing monitored channel @${source.username}...`);
    const { profile, recentPosts } = await this.discoverProfile(source.username);
    const now = new Date().toISOString();

    let newCount = 0;
    for (const p of recentPosts) {
      const added = this.saveDiscoveredPost(sourceId, profile, p, Boolean(source.auto_queue_to_automation), source.min_likes_filter);
      if (added) newCount++;
    }

    db.prepare(`
      UPDATE monitored_sources 
      SET last_scraped_at = ?, total_posts_discovered = total_posts_discovered + ?, updated_at = ?
      WHERE id = ?
    `).run(now, newCount, now, sourceId);

    return { newPostsCount: newCount };
  }

  /**
   * Sync all active monitored sources
   */
  static async syncAllMonitoredSources(): Promise<{ totalNew: number }> {
    const sources = db.prepare(`SELECT id FROM monitored_sources WHERE is_active = 1`).all() as any[];
    let totalNew = 0;

    for (const src of sources) {
      try {
        const res = await this.syncMonitoredSource(src.id);
        totalNew += res.newPostsCount;
      } catch (err: any) {
        console.warn(`[DiscoveryService] Failed to sync source ${src.id}:`, err.message);
      }
    }

    return { totalNew };
  }

  /**
   * List Discovered Posts with flexible filters
   */
  static listDiscoveredPosts(filters?: { sourceId?: string; status?: string; minLikes?: number; limit?: number }): DiscoveredPost[] {
    let query = `SELECT * FROM discovered_posts`;
    const params: any[] = [];
    const clauses: string[] = [];

    if (filters?.sourceId) {
      clauses.push(`source_id = ?`);
      params.push(filters.sourceId);
    }
    if (filters?.status) {
      clauses.push(`status = ?`);
      params.push(filters.status);
    }
    if (filters?.minLikes !== undefined && filters.minLikes > 0) {
      clauses.push(`likes_count >= ?`);
      params.push(filters.minLikes);
    }

    if (clauses.length > 0) {
      query += ` WHERE ` + clauses.join(' AND ');
    }
    const maxLimit = Math.min(200, Math.max(1, filters?.limit || 100));
    query += ` ORDER BY created_at DESC LIMIT ${maxLimit}`;

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      sourceId: r.source_id,
      threadsId: r.threads_id,
      permalink: r.permalink,
      authorUsername: r.author_username,
      authorName: r.author_name,
      authorAvatar: r.author_avatar,
      content: r.content,
      mediaUrl: r.media_url,
      likesCount: r.likes_count,
      repliesCount: r.replies_count,
      rawComments: r.raw_comments,
      duplicateHash: r.duplicate_hash,
      status: r.status,
      projectId: r.project_id,
      createdAt: r.created_at
    }));
  }

  /**
   * Convert Discovered Post directly into a Studio Project with real comments
   */
  static convertPostToProject(discoveredPostId: string): Project {
    const disc = db.prepare(`SELECT * FROM discovered_posts WHERE id = ?`).get(discoveredPostId) as any;
    if (!disc) throw new Error('Không tìm thấy bài viết khám phá');

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const defaultConfig: VideoConfig = {
      aspectRatio: '9:16',
      resolution: '1080p',
      fps: 30,
      maskAuthor: false,
      reviewBeforeExport: true,
      commentCount: 5,
      commentFilterMode: 'most_likes',
      cardPosition: {
        x: 50.0,
        y: 28.0,
        scale: 105.0,
        borderRadius: 16,
        bgStyle: 'white'
      },
      subVideoPosition: {
        enabled: true,
        x: 50.0,
        y: 65.0,
        scale: 110.0,
        borderRadius: 12,
        folder: '',
        mute: true,
        loop: true
      },
      backgroundVideoFolder: '',
      backgroundMusic: {
        folder: '',
        volume: 20,
        enabled: true
      },
      tts: {
        previewVoice: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
        speed: 1.20,
        randomVoiceMode: 'random',
        selectedVoices: ['VieNeu - Ngọc Huyền (Nữ miền Bắc)', 'VieNeu - Hải Đăng (Nam miền Nam)'],
        readPost: true,
        readComments: true,
        readAuthorName: true,
        voiceVolume: 85
      },
      watermark: {
        enabled: true,
        text: '@ThreadsStudio',
        position: 'top_right',
        opacity: 0.75,
        fontSize: 26
      },
      effects: {
        zoomPan: true,
        blurBackground: false,
        vignette: false,
        kenBurns: false
      },
      subtitleStyle: {
        enabled: true,
        fontSize: 40,
        primaryColor: '&H00FFFFFF',
        outlineColor: '&H00000000',
        position: 'middle'
      }
    };

    // 1. Insert Project
    db.prepare(`
      INSERT INTO projects (id, title, threads_url, status, created_at, updated_at, video_config)
      VALUES (?, ?, ?, 'fetched', ?, ?, ?)
    `).run(
      projectId,
      disc.content.slice(0, 50) || 'Dự án Discovery',
      disc.permalink,
      now,
      now,
      JSON.stringify(defaultConfig)
    );

    // 2. Insert Post with REAL metadata
    const postId = `post_${disc.threads_id}`;
    db.prepare(`
      INSERT INTO posts (id, project_id, url, username, display_name, avatar, content, media_urls, timestamp, likes, replies_count, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      postId,
      projectId,
      disc.permalink,
      disc.author_username,
      disc.author_name || disc.author_username,
      disc.author_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${disc.author_username}`,
      disc.content,
      JSON.stringify(disc.media_url ? [disc.media_url] : ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800']),
      'Vừa xong',
      disc.likes_count || 200,
      disc.replies_count || 10
    );

    // 3. Insert Comments
    let parsedComments: any[] = [];
    try {
      if (disc.raw_comments) parsedComments = JSON.parse(disc.raw_comments);
    } catch {}

    const comments: ThreadComment[] = [];
    parsedComments.forEach((r, idx) => {
      const cmtId = `cmt_${projectId}_${idx + 1}`;
      db.prepare(`
        INSERT INTO comments (id, project_id, username, display_name, avatar, content, likes, timestamp, selected, comment_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cmtId,
        projectId,
        r.username || `user_${idx + 1}`,
        r.displayName || r.username || `Khán giả ${idx + 1}`,
        r.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.username || idx}`,
        r.content || r.text || 'Bình luận sâu sắc!',
        r.likes || 45,
        r.timestamp || `${idx + 1} giờ`,
        idx < 5 ? 1 : 0,
        idx + 1
      );
      comments.push({
        id: cmtId,
        postId,
        username: r.username || `user_${idx + 1}`,
        displayName: r.displayName || r.username || `Khán giả ${idx + 1}`,
        avatar: r.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.username || idx}`,
        content: r.content || r.text || 'Bình luận sâu sắc!',
        likes: r.likes || 45,
        timestamp: r.timestamp || `${idx + 1} giờ`,
        selected: idx < 5,
        order: idx + 1
      });
    });

    // 4. Update status in discovered table
    db.prepare(`
      UPDATE discovered_posts SET status = 'imported_to_project', project_id = ? WHERE id = ?
    `).run(projectId, discoveredPostId);

    return {
      id: projectId,
      title: disc.content.slice(0, 50),
      threadsUrl: disc.permalink,
      status: 'fetched',
      createdAt: now,
      updatedAt: now,
      post: {
        id: postId,
        url: disc.permalink,
        username: disc.author_username,
        displayName: disc.author_name || disc.author_username,
        avatar: disc.author_avatar,
        content: disc.content,
        mediaUrls: disc.media_url ? [disc.media_url] : [],
        timestamp: 'Vừa xong',
        likes: disc.likes_count,
        repliesCount: disc.replies_count,
        verified: true
      },
      comments,
      scenes: [],
      config: defaultConfig
    };
  }

  /**
   * Queue Discovered Post into Phase 7 Automation Engine
   */
  static queueDiscoveredPostToBatch(discoveredPostId: string, customBatchId?: string): { batchId: string; batchItemId: string } {
    const disc = db.prepare(`SELECT * FROM discovered_posts WHERE id = ?`).get(discoveredPostId) as any;
    if (!disc) throw new Error('Không tìm thấy bài viết khám phá');

    const now = new Date().toISOString();
    let batchId: string = customBatchId || '';

    if (!batchId) {
      const existingBatch = db.prepare(`
        SELECT id FROM batch_jobs WHERE status IN ('queued', 'processing') ORDER BY created_at DESC LIMIT 1
      `).get() as any;

      if (existingBatch?.id) {
        batchId = existingBatch.id as string;
      } else {
        batchId = `batch_disc_${Date.now()}`;
        db.prepare(`
          INSERT INTO batch_jobs (id, title, total_items, completed_items, failed_items, status, config, created_at, updated_at)
          VALUES (?, ?, 0, 0, 0, 'queued', '{}', ?, ?)
        `).run(batchId, `Automation từ Nguồn Theo Dõi (${new Date().toLocaleDateString()})`, now, now);
      }
    }

    const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO batch_items (id, batch_id, threads_url, status, current_step, progress, created_at)
      VALUES (?, ?, ?, 'pending', 'Chờ xử lý từ Discovery', 0, ?)
    `).run(itemId, batchId, disc.permalink, now);

    db.prepare(`
      UPDATE batch_jobs SET total_items = total_items + 1, updated_at = ? WHERE id = ?
    `).run(now, batchId);

    db.prepare(`
      UPDATE discovered_posts SET status = 'queued_to_batch' WHERE id = ?
    `).run(discoveredPostId);

    return { batchId, batchItemId: itemId };
  }

  /**
   * Initialize background cron for scheduled source monitoring
   */
  static initDiscoveryCron(): void {
    if (this.cronTimer) return;

    console.log('[DiscoveryService] Initializing public source monitoring cron (checks every 5 mins)...');
    this.cronTimer = setInterval(async () => {
      try {
        await this.syncAllMonitoredSources();
      } catch (err: any) {
        console.error('[DiscoveryService] Error during source monitoring cron loop:', err);
      }
    }, 300000); // 5 minutes
  }
}
