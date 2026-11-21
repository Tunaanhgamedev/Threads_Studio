import { db } from '../db.js';
import { 
  YouTubeAccount, 
  ProjectChannelMappingItem, 
  MultiChannelScheduleItem, 
  YouTubeQuotaStats, 
  MultiChannelDashboardSummary, 
  YouTubePublishItem 
} from '../types.js';

export class MultiChannelService {

  /**
   * List all connected channels with multi-channel metrics
   */
  static listChannels(): YouTubeAccount[] {
    const rows = db.prepare(`
      SELECT * FROM youtube_accounts ORDER BY is_default DESC, created_at DESC
    `).all() as any[];

    // Calculate today's date start in ISO (UTC midnight)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    const channels: YouTubeAccount[] = rows.map(r => {
      // Count uploads today for this channel
      const countRow = db.prepare(`
        SELECT COUNT(*) as cnt FROM youtube_publishes 
        WHERE account_id = ? AND status = 'published' AND published_at >= ?
      `).get(r.id, todayStartIso) as { cnt: number } | undefined;

      const uploadsToday = countRow?.cnt || 0;

      return {
        id: r.id,
        channelId: r.channel_id,
        channelTitle: r.channel_title,
        channelHandle: r.channel_handle || undefined,
        avatarUrl: r.avatar_url || undefined,
        subscriberCount: r.subscriber_count || 0,
        videoCount: r.video_count || 0,
        tokenExpiry: r.token_expiry || undefined,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        internalName: r.internal_name || undefined,
        timezone: r.timezone || 'Asia/Ho_Chi_Minh',
        dailyUploadLimit: r.daily_upload_limit ?? 10,
        isDefault: Boolean(r.is_default),
        quotaUsedToday: r.quota_used_today || (uploadsToday * 1600),
        quotaResetAt: r.quota_reset_at || undefined,
        todayUploadCount: uploadsToday
      };
    });

    // If accounts exist but none is marked default, automatically mark the first one as default
    if (channels.length > 0 && !channels.some(c => c.isDefault)) {
      channels[0].isDefault = true;
      try {
        db.prepare('UPDATE youtube_accounts SET is_default = 1 WHERE id = ?').run(channels[0].id);
      } catch {}
    }

    // If completely empty, return simulated channels for rich initial workspace preview
    if (channels.length === 0) {
      return this.getSimulatedChannels();
    }

    return channels;
  }

  /**
   * Update channel configuration (internal name, timezone, daily upload limit, isDefault)
   */
  static updateChannel(
    id: string, 
    updates: { 
      internalName?: string; 
      timezone?: string; 
      dailyUploadLimit?: number; 
      isDefault?: boolean;
    }
  ): YouTubeAccount {
    const existing = db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new Error(`Không tìm thấy kênh YouTube với ID: ${id}`);
    }

    if (updates.isDefault) {
      db.prepare('UPDATE youtube_accounts SET is_default = 0').run();
    }

    const now = new Date().toISOString();
    const newInternalName = updates.internalName !== undefined ? updates.internalName.trim() : existing.internal_name;
    const newTimezone = updates.timezone || existing.timezone || 'Asia/Ho_Chi_Minh';
    const newDailyLimit = updates.dailyUploadLimit !== undefined ? Number(updates.dailyUploadLimit) : (existing.daily_upload_limit ?? 10);
    const newIsDefault = updates.isDefault !== undefined ? (updates.isDefault ? 1 : 0) : existing.is_default;

    db.prepare(`
      UPDATE youtube_accounts 
      SET internal_name = ?, timezone = ?, daily_upload_limit = ?, is_default = ?, updated_at = ?
      WHERE id = ?
    `).run(newInternalName, newTimezone, newDailyLimit, newIsDefault, now, id);

    const updated = db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(id) as any;
    return {
      id: updated.id,
      channelId: updated.channel_id,
      channelTitle: updated.channel_title,
      channelHandle: updated.channel_handle || undefined,
      avatarUrl: updated.avatar_url || undefined,
      subscriberCount: updated.subscriber_count || 0,
      videoCount: updated.video_count || 0,
      tokenExpiry: updated.token_expiry || undefined,
      isActive: Boolean(updated.is_active),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      internalName: updated.internal_name || undefined,
      timezone: updated.timezone || 'Asia/Ho_Chi_Minh',
      dailyUploadLimit: updated.daily_upload_limit ?? 10,
      isDefault: Boolean(updated.is_default)
    };
  }

  /**
   * Set a channel as the workspace default
   */
  static setDefaultChannel(id: string): void {
    db.prepare('UPDATE youtube_accounts SET is_default = 0').run();
    db.prepare('UPDATE youtube_accounts SET is_default = 1, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  /**
   * Get all projects and their mapped default channel
   */
  static getProjectMappings(): ProjectChannelMappingItem[] {
    const projects = db.prepare('SELECT id, title, threads_url FROM projects ORDER BY created_at DESC').all() as any[];
    const mappings = db.prepare('SELECT * FROM project_channel_mappings').all() as any[];
    const accounts = db.prepare('SELECT id, channel_title, internal_name, avatar_url FROM youtube_accounts').all() as any[];

    const mappingMap = new Map<string, { accountId: string; assignedAt: string }>();
    mappings.forEach(m => mappingMap.set(m.project_id, { accountId: m.account_id, assignedAt: m.assigned_at }));

    const accountMap = new Map<string, any>();
    accounts.forEach(a => accountMap.set(a.id, a));

    // Also get default account if available
    const defaultAccount = accounts.find(a => a.is_default) || accounts[0];

    return projects.map(p => {
      const mapInfo = mappingMap.get(p.id);
      const acc = mapInfo ? accountMap.get(mapInfo.accountId) : defaultAccount;

      return {
        projectId: p.id,
        projectTitle: p.title || 'Dự án Threads',
        threadsUrl: p.threads_url || '',
        accountId: acc?.id || undefined,
        channelTitle: acc?.channel_title || undefined,
        internalName: acc?.internal_name || undefined,
        avatarUrl: acc?.avatar_url || undefined,
        assignedAt: mapInfo?.assignedAt || undefined
      };
    });
  }

  /**
   * Assign or unassign a project to a specific YouTube channel
   */
  static assignProjectChannel(projectId: string, accountId: string | null): void {
    if (!accountId) {
      db.prepare('DELETE FROM project_channel_mappings WHERE project_id = ?').run(projectId);
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO project_channel_mappings (project_id, account_id, assigned_at)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET account_id = excluded.account_id, assigned_at = excluded.assigned_at
    `).run(projectId, accountId, now);
  }

  /**
   * Get mapped channel for a specific project
   */
  static getChannelForProject(projectId: string): YouTubeAccount | null {
    const mapping = db.prepare('SELECT account_id FROM project_channel_mappings WHERE project_id = ?').get(projectId) as any;
    if (mapping?.account_id) {
      const acc = db.prepare('SELECT * FROM youtube_accounts WHERE id = ?').get(mapping.account_id) as any;
      if (acc) {
        return this.formatAccount(acc);
      }
    }

    // Fallback to workspace default channel
    const defaultAcc = db.prepare('SELECT * FROM youtube_accounts WHERE is_default = 1').get() as any;
    if (defaultAcc) {
      return this.formatAccount(defaultAcc);
    }

    // Fallback to first channel
    const firstAcc = db.prepare('SELECT * FROM youtube_accounts ORDER BY created_at ASC LIMIT 1').get() as any;
    return firstAcc ? this.formatAccount(firstAcc) : null;
  }

  /**
   * Centralized multi-channel publishing schedule
   */
  static getMultiChannelSchedule(filters: { accountId?: string; status?: string }): MultiChannelScheduleItem[] {
    let sql = `
      SELECT p.*, a.channel_title as acc_channel_title, a.internal_name, a.avatar_url as acc_avatar, a.timezone as acc_timezone
      FROM youtube_publishes p
      LEFT JOIN youtube_accounts a ON p.account_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.accountId && filters.accountId !== 'all') {
      sql += ' AND p.account_id = ?';
      params.push(filters.accountId);
    }

    if (filters.status && filters.status !== 'all') {
      sql += ' AND p.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY COALESCE(p.publish_at, p.created_at) DESC LIMIT 100';

    const rows = db.prepare(sql).all(...params) as any[];

    return rows.map(r => {
      const tz = r.acc_timezone || 'Asia/Ho_Chi_Minh';
      const targetTime = r.publish_at || r.published_at || r.created_at;
      let localFormatted = targetTime;

      try {
        const d = new Date(targetTime);
        localFormatted = new Intl.DateTimeFormat('vi-VN', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(d);
      } catch {}

      return {
        id: `sched_${r.id}`,
        publishId: r.id,
        accountId: r.account_id || '',
        channelTitle: r.acc_channel_title || r.channel_title || 'Kênh Chưa Gán',
        internalName: r.internal_name || undefined,
        channelAvatar: r.acc_avatar || undefined,
        channelTimezone: tz,
        projectId: r.project_id || undefined,
        projectTitle: r.project_title || undefined,
        title: r.title,
        description: r.description || undefined,
        thumbnailUrl: r.thumbnail_url || undefined,
        videoUrl: r.video_url || undefined,
        publishAt: targetTime,
        publishAtLocal: `${localFormatted} (${tz.split('/').pop()?.replace('_', ' ') || 'Local'})`,
        privacyStatus: r.privacy_status || 'private',
        status: r.status || 'draft'
      };
    });
  }

  /**
   * YouTube Data API Quota tracker (10,000 units/day)
   */
  static getQuotaStats(): YouTubeQuotaStats {
    const TOTAL_DAILY_QUOTA = 10000;
    const UPLOAD_UNIT_COST = 1600;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartIso = todayStart.toISOString();

    const accounts = db.prepare('SELECT * FROM youtube_accounts').all() as any[];

    // Count today's published/uploading videos across all accounts
    let totalUploadsToday = 0;
    const accountsQuota = accounts.map(a => {
      const row = db.prepare(`
        SELECT COUNT(*) as cnt FROM youtube_publishes 
        WHERE account_id = ? AND status = 'published' AND published_at >= ?
      `).get(a.id, todayStartIso) as { cnt: number } | undefined;

      const cnt = row?.cnt || 0;
      totalUploadsToday += cnt;
      const units = cnt * UPLOAD_UNIT_COST;

      return {
        accountId: a.id,
        channelTitle: a.channel_title,
        internalName: a.internal_name || undefined,
        avatarUrl: a.avatar_url || undefined,
        uploadsToday: cnt,
        dailyLimit: a.daily_upload_limit ?? 10,
        quotaUsedUnits: units
      };
    });

    const usedToday = Math.min(TOTAL_DAILY_QUOTA, (totalUploadsToday * UPLOAD_UNIT_COST) + 250); // +250 for metadata/list calls
    const remainingUnits = Math.max(0, TOTAL_DAILY_QUOTA - usedToday);
    const percentUsed = Math.min(100, Math.round((usedToday / TOTAL_DAILY_QUOTA) * 100));
    const estimatedUploadsRemaining = Math.floor(remainingUnits / UPLOAD_UNIT_COST);

    // YouTube API quota resets daily at midnight Pacific Time (00:00 PST = 08:00 UTC)
    const now = new Date();
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
    if (now.getTime() >= nextReset.getTime()) {
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }

    const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalDailyQuota: TOTAL_DAILY_QUOTA,
      usedToday,
      remainingUnits,
      percentUsed,
      estimatedUploadsRemaining,
      resetAt: nextReset.toISOString(),
      resetCountdown: `${hours}h ${minutes}m`,
      accountsQuota
    };
  }

  /**
   * Multi-Channel aggregated summary dashboard
   */
  static getMultiDashboardSummary(): MultiChannelDashboardSummary {
    const channels = this.listChannels();
    const quotaStats = this.getQuotaStats();

    const activeChannels = channels.filter(c => c.isActive).length;
    const defaultChannel = channels.find(c => c.isDefault) || channels[0];
    const totalSubscribers = channels.reduce((sum, c) => sum + (c.subscriberCount || 0), 0);
    const totalVideos = channels.reduce((sum, c) => sum + (c.videoCount || 0), 0);

    const uploadsTodayTotal = quotaStats.accountsQuota.reduce((sum, a) => sum + a.uploadsToday, 0);

    const scheduledCountRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM youtube_publishes 
      WHERE status IN ('queued', 'uploading') OR (status = 'draft' AND publish_at IS NOT NULL)
    `).get() as { cnt: number } | undefined;

    const recentPublishes = (db.prepare(`
      SELECT * FROM youtube_publishes ORDER BY created_at DESC LIMIT 5
    `).all() as any[]).map(r => ({
      id: r.id,
      accountId: r.account_id || undefined,
      channelTitle: r.channel_title || undefined,
      projectId: r.project_id || undefined,
      projectTitle: r.project_title || undefined,
      videoPath: r.video_path,
      videoUrl: r.video_url || undefined,
      title: r.title,
      description: r.description || '',
      tags: JSON.parse(r.tags || '[]'),
      categoryId: r.category_id || '22',
      privacyStatus: r.privacy_status || 'private',
      publishAt: r.publish_at || undefined,
      thumbnailPath: r.thumbnail_path || undefined,
      thumbnailUrl: r.thumbnail_url || undefined,
      youtubeVideoId: r.youtube_video_id || undefined,
      status: r.status || 'draft',
      uploadProgress: r.upload_progress || 0,
      errorMessage: r.error_message || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      publishedAt: r.published_at || undefined
    }));

    return {
      totalChannels: channels.length,
      activeChannels,
      defaultChannelId: defaultChannel?.id,
      defaultChannelName: defaultChannel ? (defaultChannel.internalName || defaultChannel.channelTitle) : undefined,
      totalSubscribers,
      totalVideos,
      uploadsTodayTotal,
      scheduledCount: scheduledCountRow?.cnt || 0,
      quotaStats,
      recentPublishes
    };
  }

  private static formatAccount(r: any): YouTubeAccount {
    return {
      id: r.id,
      channelId: r.channel_id,
      channelTitle: r.channel_title,
      channelHandle: r.channel_handle || undefined,
      avatarUrl: r.avatar_url || undefined,
      subscriberCount: r.subscriber_count || 0,
      videoCount: r.video_count || 0,
      tokenExpiry: r.token_expiry || undefined,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      internalName: r.internal_name || undefined,
      timezone: r.timezone || 'Asia/Ho_Chi_Minh',
      dailyUploadLimit: r.daily_upload_limit ?? 10,
      isDefault: Boolean(r.is_default)
    };
  }

  /**
   * Seed / demo simulated channels if user is running offline
   */
  private static getSimulatedChannels(): YouTubeAccount[] {
    return [
      {
        id: 'acc_demo_meme',
        channelId: 'UC_threads_meme_01',
        channelTitle: 'Việt Meme Stories',
        channelHandle: '@vietmemestories',
        avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80',
        subscriberCount: 24500,
        videoCount: 112,
        isActive: true,
        isDefault: true,
        internalName: 'Kênh Meme Shorts (Kênh A)',
        timezone: 'Asia/Ho_Chi_Minh',
        dailyUploadLimit: 5,
        quotaUsedToday: 3200,
        todayUploadCount: 2,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'acc_demo_story',
        channelId: 'UC_threads_story_02',
        channelTitle: 'Deep Threads VN',
        channelHandle: '@deepthreadsvn',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        subscriberCount: 68200,
        videoCount: 240,
        isActive: true,
        isDefault: false,
        internalName: 'Kênh Kể Chuyện Cuộc Sống (Kênh B)',
        timezone: 'Asia/Ho_Chi_Minh',
        dailyUploadLimit: 8,
        quotaUsedToday: 1600,
        todayUploadCount: 1,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'acc_demo_gaming',
        channelId: 'UC_threads_gaming_03',
        channelTitle: 'Gaming Confessions',
        channelHandle: '@gamingconfessions',
        avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
        subscriberCount: 15400,
        videoCount: 78,
        isActive: true,
        isDefault: false,
        internalName: 'Kênh Gaming & Drama (Kênh C)',
        timezone: 'America/New_York',
        dailyUploadLimit: 4,
        quotaUsedToday: 0,
        todayUploadCount: 0,
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}
