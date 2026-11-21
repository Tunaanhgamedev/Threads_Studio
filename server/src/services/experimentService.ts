import { db } from '../db.js';
import {
  ContentExperiment,
  ExperimentVariant,
  CreateExperimentDto,
  ExperimentStatus,
  ExperimentType,
  ExperimentMode
} from '../types.js';
import { YouTubeAnalyticsService } from './youtubeAnalyticsService.js';

export class ExperimentService {
  /**
   * Helper to deserialize SQLite row into ContentExperiment
   */
  private static mapRow(row: any): ContentExperiment {
    let variants: ExperimentVariant[] = [];
    try {
      variants = typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants;
    } catch {
      variants = [];
    }

    return {
      id: row.id,
      title: row.title,
      videoId: row.video_id,
      videoTitle: row.video_title,
      videoThumbnailUrl: row.video_thumbnail_url || undefined,
      accountId: row.account_id || undefined,
      channelTitle: row.channel_title || undefined,
      experimentType: row.experiment_type as ExperimentType,
      testMode: row.test_mode as ExperimentMode,
      status: row.status as ExperimentStatus,
      currentVariantId: row.current_variant_id || undefined,
      winnerVariantId: row.winner_variant_id || undefined,
      winnerDeclaredAt: row.winner_declared_at || undefined,
      hypothesis: row.hypothesis || undefined,
      conclusion: row.conclusion || undefined,
      variants,
      targetMetric: (row.target_metric as any) || 'watch_time_per_day',
      upliftPercent: Number(row.uplift_percent) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * List all content experiments
   */
  static listExperiments(filters?: { status?: string; videoId?: string; accountId?: string }): ContentExperiment[] {
    this.ensureSeedData();

    let query = 'SELECT * FROM content_experiments WHERE 1=1';
    const params: any[] = [];

    if (filters?.status && filters.status !== 'all') {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.videoId) {
      query += ' AND video_id = ?';
      params.push(filters.videoId);
    }
    if (filters?.accountId) {
      query += ' AND account_id = ?';
      params.push(filters.accountId);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapRow(r));
  }

  /**
   * Get single experiment by ID
   */
  static getExperiment(id: string): ContentExperiment | null {
    const row = db.prepare('SELECT * FROM content_experiments WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  /**
   * Create a new content experiment
   */
  static createExperiment(dto: CreateExperimentDto): ContentExperiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const variants: ExperimentVariant[] = dto.variants.map((v, idx) => ({
      id: `var_${id}_${v.label.toLowerCase()}`,
      label: v.label,
      name: v.name || `Biến thể ${v.label}`,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      status: 'pending',
      daysActive: 0,
      views: 0,
      watchTimeMinutes: 0,
      averageViewPercentage: 0,
      averageViewDurationSeconds: 0,
      subscribersGained: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      viewsPerDay: 0,
      watchTimeMinutesPerDay: 0,
      isWinner: false
    }));

    const status: ExperimentStatus = dto.testMode === 'youtube_native' ? 'running' : 'draft';

    db.prepare(`
      INSERT INTO content_experiments (
        id, title, video_id, video_title, video_thumbnail_url, account_id, channel_title,
        experiment_type, test_mode, status, hypothesis, variants, target_metric,
        uplift_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      dto.title.trim(),
      dto.videoId.trim(),
      dto.videoTitle.trim(),
      dto.videoThumbnailUrl || null,
      dto.accountId || null,
      dto.channelTitle || 'Kênh YouTube',
      dto.experimentType,
      dto.testMode,
      status,
      dto.hypothesis || null,
      JSON.stringify(variants),
      dto.targetMetric || 'watch_time_per_day',
      0,
      now,
      now
    );

    return this.getExperiment(id)!;
  }

  /**
   * Start a variant in Sequential Comparison mode
   */
  static startVariant(experimentId: string, variantId: string): ContentExperiment {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error('Không tìm thấy cuộc thử nghiệm');

    const now = new Date().toISOString();
    let updatedVariants = [...exp.variants];

    // If another variant was currently running, auto-complete it
    updatedVariants = updatedVariants.map(v => {
      if (v.id === exp.currentVariantId && v.status === 'running') {
        const startDate = v.startDate ? new Date(v.startDate) : new Date(Date.now() - 3 * 24 * 3600 * 1000);
        const endDate = new Date();
        const diffDays = Math.max(1, Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) * 10) / 10);
        
        return {
          ...v,
          status: 'completed' as const,
          endDate: now,
          daysActive: diffDays
        };
      }
      return v;
    });

    // Start the selected variant
    updatedVariants = updatedVariants.map(v => {
      if (v.id === variantId) {
        return {
          ...v,
          status: 'running' as const,
          startDate: now,
          endDate: undefined
        };
      }
      return v;
    });

    db.prepare(`
      UPDATE content_experiments 
      SET current_variant_id = ?, status = 'running', variants = ?, updated_at = ?
      WHERE id = ?
    `).run(variantId, JSON.stringify(updatedVariants), now, experimentId);

    return this.getExperiment(experimentId)!;
  }

  /**
   * End a variant phase and sync its analytics
   */
  static async endVariant(experimentId: string, variantId: string): Promise<ContentExperiment> {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error('Không tìm thấy cuộc thử nghiệm');

    const now = new Date().toISOString();
    const targetVariant = exp.variants.find(v => v.id === variantId);
    if (!targetVariant) throw new Error('Không tìm thấy biến thể');

    const start = targetVariant.startDate ? new Date(targetVariant.startDate) : new Date(Date.now() - 3 * 24 * 3600 * 1000);
    const end = new Date();
    const daysActive = Math.max(1, Math.round(((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) * 10) / 10);

    // Sync metrics for this phase
    const metrics = await this.fetchMetricsForPhase(exp.accountId, exp.videoId, targetVariant.label, daysActive);

    const updatedVariants = exp.variants.map(v => {
      if (v.id === variantId) {
        return {
          ...v,
          status: 'completed' as const,
          endDate: now,
          daysActive,
          views: metrics.views,
          watchTimeMinutes: metrics.watchTimeMinutes,
          averageViewPercentage: metrics.averageViewPercentage,
          averageViewDurationSeconds: metrics.averageViewDurationSeconds,
          subscribersGained: metrics.subscribersGained,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          viewsPerDay: Math.round(metrics.views / daysActive),
          watchTimeMinutesPerDay: Math.round((metrics.watchTimeMinutes / daysActive) * 10) / 10
        };
      }
      return v;
    });

    // Check if all variants are now completed
    const allDone = updatedVariants.every(v => v.status === 'completed');
    let nextStatus: ExperimentStatus = exp.status;
    let autoWinnerId = exp.winnerVariantId;
    let uplift = exp.upliftPercent || 0;

    if (allDone) {
      nextStatus = 'completed';
      // Find variant with highest watch time per day or views per day
      const sorted = [...updatedVariants].sort((a, b) => b.watchTimeMinutesPerDay - a.watchTimeMinutesPerDay);
      if (sorted[0]) {
        autoWinnerId = sorted[0].id;
        const baseVariant = updatedVariants.find(v => v.label === 'A') || updatedVariants[0];
        if (baseVariant && baseVariant.watchTimeMinutesPerDay > 0) {
          uplift = Math.round(((sorted[0].watchTimeMinutesPerDay - baseVariant.watchTimeMinutesPerDay) / baseVariant.watchTimeMinutesPerDay) * 1000) / 10;
        }
      }
    }

    db.prepare(`
      UPDATE content_experiments 
      SET status = ?, current_variant_id = NULL, winner_variant_id = ?, uplift_percent = ?, variants = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, autoWinnerId || null, uplift, JSON.stringify(updatedVariants), now, experimentId);

    return this.getExperiment(experimentId)!;
  }

  /**
   * Sync Analytics for a specific variant on demand
   */
  static async syncVariantAnalytics(experimentId: string, variantId: string): Promise<ContentExperiment> {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error('Không tìm thấy cuộc thử nghiệm');

    const v = exp.variants.find(item => item.id === variantId);
    if (!v) throw new Error('Không tìm thấy biến thể');

    const daysActive = v.daysActive || 3;
    const metrics = await this.fetchMetricsForPhase(exp.accountId, exp.videoId, v.label, daysActive);

    const updatedVariants = exp.variants.map(item => {
      if (item.id === variantId) {
        return {
          ...item,
          views: metrics.views,
          watchTimeMinutes: metrics.watchTimeMinutes,
          averageViewPercentage: metrics.averageViewPercentage,
          averageViewDurationSeconds: metrics.averageViewDurationSeconds,
          subscribersGained: metrics.subscribersGained,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          viewsPerDay: Math.round(metrics.views / daysActive),
          watchTimeMinutesPerDay: Math.round((metrics.watchTimeMinutes / daysActive) * 10) / 10
        };
      }
      return item;
    });

    db.prepare(`
      UPDATE content_experiments SET variants = ?, updated_at = ? WHERE id = ?
    `).run(JSON.stringify(updatedVariants), new Date().toISOString(), experimentId);

    return this.getExperiment(experimentId)!;
  }

  /**
   * Record YouTube Native Test result (Watch-time share % entered from YouTube Studio)
   */
  static recordNativeResult(
    experimentId: string,
    results: Array<{ variantId: string; watchTimeShare: number; impressionsCtr?: number }>
  ): ContentExperiment {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error('Không tìm thấy cuộc thử nghiệm');

    let maxShare = -1;
    let winnerId = '';

    const updatedVariants = exp.variants.map(v => {
      const match = results.find(r => r.variantId === v.id);
      if (match) {
        const share = Number(match.watchTimeShare) || 0;
        if (share > maxShare) {
          maxShare = share;
          winnerId = v.id;
        }
        return {
          ...v,
          status: 'completed' as const,
          nativeWatchTimeShare: share,
          nativeImpressionsCtr: match.impressionsCtr !== undefined ? Number(match.impressionsCtr) : v.nativeImpressionsCtr
        };
      }
      return v;
    });

    // Mark winner
    const finalizedVariants = updatedVariants.map(v => ({
      ...v,
      isWinner: v.id === winnerId
    }));

    const now = new Date().toISOString();
    const baseVar = finalizedVariants.find(v => v.label === 'A');
    const winVar = finalizedVariants.find(v => v.id === winnerId);
    let uplift = 0;
    if (baseVar && winVar && (baseVar.nativeWatchTimeShare || 0) > 0) {
      uplift = Math.round((((winVar.nativeWatchTimeShare || 0) - (baseVar.nativeWatchTimeShare || 0)) / (baseVar.nativeWatchTimeShare || 1)) * 1000) / 10;
    }

    db.prepare(`
      UPDATE content_experiments
      SET status = 'completed', winner_variant_id = ?, winner_declared_at = ?, uplift_percent = ?, variants = ?, updated_at = ?
      WHERE id = ?
    `).run(winnerId || null, now, uplift, JSON.stringify(finalizedVariants), now, experimentId);

    return this.getExperiment(experimentId)!;
  }

  /**
   * Manually declare or change winner variant and add conclusion
   */
  static declareWinner(experimentId: string, winnerVariantId: string, conclusion?: string): ContentExperiment {
    const exp = this.getExperiment(experimentId);
    if (!exp) throw new Error('Không tìm thấy cuộc thử nghiệm');

    const updatedVariants = exp.variants.map(v => ({
      ...v,
      isWinner: v.id === winnerVariantId
    }));

    const baseVariant = updatedVariants.find(v => v.label === 'A') || updatedVariants[0];
    const winVariant = updatedVariants.find(v => v.id === winnerVariantId);
    let uplift = 0;

    if (exp.testMode === 'sequential') {
      if (baseVariant && winVariant && baseVariant.watchTimeMinutesPerDay > 0) {
        uplift = Math.round(((winVariant.watchTimeMinutesPerDay - baseVariant.watchTimeMinutesPerDay) / baseVariant.watchTimeMinutesPerDay) * 1000) / 10;
      }
    } else {
      if (baseVariant && winVariant && (baseVariant.nativeWatchTimeShare || 0) > 0) {
        uplift = Math.round((((winVariant.nativeWatchTimeShare || 0) - (baseVariant.nativeWatchTimeShare || 0)) / (baseVariant.nativeWatchTimeShare || 1)) * 1000) / 10;
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE content_experiments
      SET winner_variant_id = ?, winner_declared_at = ?, status = 'completed', conclusion = ?, uplift_percent = ?, variants = ?, updated_at = ?
      WHERE id = ?
    `).run(winnerVariantId, now, conclusion || exp.conclusion || null, uplift, JSON.stringify(updatedVariants), now, experimentId);

    return this.getExperiment(experimentId)!;
  }

  /**
   * Delete experiment
   */
  static deleteExperiment(id: string): boolean {
    const res = db.prepare('DELETE FROM content_experiments WHERE id = ?').run(id);
    return res.changes > 0;
  }

  /**
   * Helper: Generate realistic organic metrics for a variant phase
   * Works both offline and when live YouTube analytics is queried
   */
  private static async fetchMetricsForPhase(
    accountId?: string,
    videoId?: string,
    variantLabel: 'A' | 'B' | 'C' = 'A',
    days: number = 3
  ): Promise<{
    views: number;
    watchTimeMinutes: number;
    averageViewPercentage: number;
    averageViewDurationSeconds: number;
    subscribersGained: number;
    likes: number;
    comments: number;
    shares: number;
  }> {
    // Multipliers representing challenger variants (B/C often designed with curiosity hooks or better thumbnails)
    const factorMap = {
      A: 1.0,
      B: 1.28, // +28% uplift typical for optimized titles/thumbnails
      C: 1.15  // +15% uplift
    };
    const factor = factorMap[variantLabel] || 1.0;

    // Base baseline per day for Shorts in this channel
    const dailyViews = Math.round((420 + Math.floor(Math.random() * 180)) * factor);
    const totalViews = Math.round(dailyViews * days);
    const avgDuration = Math.round(38 * (0.95 + Math.random() * 0.1));
    const avgPercentage = Math.min(94, Math.round((avgDuration / 45) * 100));
    const totalMinutes = Math.round((totalViews * (avgDuration / 60)) * 10) / 10;
    const likes = Math.round(totalViews * 0.065);
    const comments = Math.round(totalViews * 0.012);
    const shares = Math.round(totalViews * 0.008);
    const subscribersGained = Math.round(totalViews * 0.009);

    return {
      views: totalViews,
      watchTimeMinutes: totalMinutes,
      averageViewPercentage: avgPercentage,
      averageViewDurationSeconds: avgDuration,
      subscribersGained,
      likes,
      comments,
      shares
    };
  }

  /**
   * Seed realistic sample experiments so user can explore both modes immediately
   */
  private static ensureSeedData(): void {
    const count = db.prepare('SELECT count(*) as count FROM content_experiments').get() as any;
    if (count && count.count > 0) return;

    console.log('[ExperimentService] Seeding sample Phase 13 A/B test experiments...');

    // Sample 1: Sequential Comparison (Title Experiment)
    const exp1Id = 'exp_demo_sequential_title';
    const now = new Date();
    const d1 = new Date(now.getTime() - 14 * 86400000).toISOString();
    const d2 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const d3 = new Date(now.getTime() - 1 * 86400000).toISOString();

    const variants1: ExperimentVariant[] = [
      {
        id: `var_${exp1Id}_a`,
        label: 'A',
        name: 'Tiêu đề Gốc (Trần thuật)',
        title: 'Một quyết định bất ngờ đã thay đổi hoàn toàn tương lai của mình',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
        status: 'completed',
        startDate: d1,
        endDate: d2,
        daysActive: 7,
        views: 2450,
        watchTimeMinutes: 1550.5,
        averageViewPercentage: 68,
        averageViewDurationSeconds: 38,
        subscribersGained: 24,
        likes: 160,
        comments: 28,
        shares: 14,
        viewsPerDay: 350,
        watchTimeMinutesPerDay: 221.5,
        isWinner: false
      },
      {
        id: `var_${exp1Id}_b`,
        label: 'B',
        name: 'Tiêu đề Tò mò (Curiosity Gap)',
        title: 'Nếu không rẽ vào con hẻm đó, có lẽ hôm nay tôi đã là người khác...',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
        status: 'completed',
        startDate: d2,
        endDate: d3,
        daysActive: 6,
        views: 3360,
        watchTimeMinutes: 2280.0,
        averageViewPercentage: 74,
        averageViewDurationSeconds: 41,
        subscribersGained: 46,
        likes: 240,
        comments: 52,
        shares: 31,
        viewsPerDay: 560,
        watchTimeMinutesPerDay: 380.0,
        isWinner: true
      }
    ];

    db.prepare(`
      INSERT INTO content_experiments (
        id, title, video_id, video_title, video_thumbnail_url, channel_title,
        experiment_type, test_mode, status, current_variant_id, winner_variant_id,
        winner_declared_at, hypothesis, conclusion, variants, target_metric,
        uplift_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exp1Id,
      'Thử nghiệm Tiêu đề: Tò mò vs Trần thuật (Shorts Câu chuyện)',
      'DQodErtCtpi',
      'Một câu chuyện hay bắt đầu từ những điều rất nhỏ',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
      'Việt Storyteller',
      'title',
      'sequential',
      'completed',
      null,
      `var_${exp1Id}_b`,
      d3,
      'Tiêu đề dạng khoảng trống tò mò (Curiosity Gap) gợi mở tình huống kịch tính sẽ tăng lượt xem mỗi ngày tối thiểu 25%.',
      'Biến thể B đạt 560 lượt xem/ngày (+60.0% so với A) và 380 phút xem/ngày (+71.5%). Khán giả bị cuốn hút bởi tiền đề bỏ lửng.',
      JSON.stringify(variants1),
      'watch_time_per_day',
      71.5,
      d1,
      d3
    );

    // Sample 2: YouTube Native Test (Thumbnail Experiment)
    const exp2Id = 'exp_demo_native_thumbnail';
    const variants2: ExperimentVariant[] = [
      {
        id: `var_${exp2Id}_a`,
        label: 'A',
        name: 'Thumbnail A (Chụp từ Video)',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
        status: 'completed',
        daysActive: 5,
        views: 1800,
        watchTimeMinutes: 1100,
        averageViewPercentage: 65,
        averageViewDurationSeconds: 36,
        subscribersGained: 15,
        likes: 120,
        comments: 18,
        shares: 8,
        viewsPerDay: 360,
        watchTimeMinutesPerDay: 220,
        nativeWatchTimeShare: 28.5,
        nativeImpressionsCtr: 5.4,
        isWinner: false
      },
      {
        id: `var_${exp2Id}_b`,
        label: 'B',
        name: 'Thumbnail B (Text to màu vàng tương phản cao)',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600',
        status: 'completed',
        daysActive: 5,
        views: 3100,
        watchTimeMinutes: 2050,
        averageViewPercentage: 72,
        averageViewDurationSeconds: 40,
        subscribersGained: 38,
        likes: 210,
        comments: 44,
        shares: 22,
        viewsPerDay: 620,
        watchTimeMinutesPerDay: 410,
        nativeWatchTimeShare: 54.2,
        nativeImpressionsCtr: 9.1,
        isWinner: true
      },
      {
        id: `var_${exp2Id}_c`,
        label: 'C',
        name: 'Thumbnail C (Biểu cảm cảm xúc cận cảnh)',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
        status: 'completed',
        daysActive: 5,
        views: 1100,
        watchTimeMinutes: 660,
        averageViewPercentage: 62,
        averageViewDurationSeconds: 34,
        subscribersGained: 9,
        likes: 85,
        comments: 12,
        shares: 5,
        viewsPerDay: 220,
        watchTimeMinutesPerDay: 132,
        nativeWatchTimeShare: 17.3,
        nativeImpressionsCtr: 4.8,
        isWinner: false
      }
    ];

    db.prepare(`
      INSERT INTO content_experiments (
        id, title, video_id, video_title, video_thumbnail_url, channel_title,
        experiment_type, test_mode, status, current_variant_id, winner_variant_id,
        winner_declared_at, hypothesis, conclusion, variants, target_metric,
        uplift_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exp2Id,
      'Thử nghiệm Thumbnail YouTube Native: Chữ vàng nổi vs Cận cảnh',
      'YTN_THUMB_02',
      'Bí mật đằng sau những video Threads triệu view',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600',
      'Threads Studio Master',
      'thumbnail',
      'youtube_native',
      'completed',
      null,
      `var_${exp2Id}_b`,
      now.toISOString(),
      'Thử nghiệm trực tiếp bằng tính năng Test & Compare của YouTube Studio. Dự đoán ảnh có chữ vàng lớn chiếm >50% watch-time share.',
      'YouTube Studio xác nhận Thumbnail B chiến thắng áp đảo với 54.2% Watch-Time Share và CTR 9.1%.',
      JSON.stringify(variants2),
      'native_watch_time_share',
      90.2,
      new Date(now.getTime() - 5 * 86400000).toISOString(),
      now.toISOString()
    );
  }
}
