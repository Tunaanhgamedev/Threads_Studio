import { db } from '../db.js';
import { BatchJob, BatchItem, VideoConfig, Project } from '../types.js';
import { createProjectFromUrl, formatProject } from '../routes/projects.js';
import { ScreenshotEngine } from './screenshotEngine.js';
import { VoiceEngine } from './voiceEngine.js';
import { VideoService } from './videoService.js';

export class AutomationService {
  private static isProcessing = false;
  private static cancelledBatches = new Set<string>();

  /**
   * Parse arbitrary text (multiline, comma-separated) and extract valid Threads URLs
   */
  static extractThreadsUrls(text: string): string[] {
    if (!text) return [];
    const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const valid: string[] = [];

    for (const line of lines) {
      const match = line.match(/https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/i);
      const url = match ? match[0] : (line.includes('threads.net') ? line : null);
      if (url && !seen.has(url)) {
        seen.add(url);
        valid.push(url);
      }
    }
    return valid;
  }

  /**
   * Create a new Batch Automation Job
   */
  static createBatch(urls: string[], config: Partial<VideoConfig> = {}, title?: string): BatchJob {
    const cleanUrls = urls.filter(u => u && u.includes('threads.net'));
    if (cleanUrls.length === 0) {
      throw new Error('Không có URL Threads hợp lệ nào để xử lý.');
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const batchTitle = title || `Mẻ tự động ${new Date().toLocaleDateString('vi-VN')} (${cleanUrls.length} bài)`;

    db.prepare(`
      INSERT INTO batch_jobs (id, title, total_items, completed_items, failed_items, status, config, created_at, updated_at)
      VALUES (?, ?, ?, 0, 0, 'queued', ?, ?, ?)
    `).run(batchId, batchTitle, cleanUrls.length, JSON.stringify(config), now, now);

    const items: BatchItem[] = [];
    const insertItemStmt = db.prepare(`
      INSERT INTO batch_items (id, batch_id, threads_url, status, current_step, progress, created_at)
      VALUES (?, ?, ?, 'pending', 'Chờ xử lý', 0, ?)
    `);

    for (let i = 0; i < cleanUrls.length; i++) {
      const itemId = `bitem_${batchId}_${i + 1}`;
      insertItemStmt.run(itemId, batchId, cleanUrls[i], now);
      items.push({
        id: itemId,
        batchId,
        threadsUrl: cleanUrls[i],
        status: 'pending',
        currentStep: 'Chờ xử lý',
        progress: 0,
        createdAt: now
      });
    }

    // Trigger background runner
    setTimeout(() => {
      this.processQueue().catch(err => {
        console.error('[AutomationService] Queue processing error:', err);
      });
    }, 200);

    return {
      id: batchId,
      title: batchTitle,
      totalItems: cleanUrls.length,
      completedItems: 0,
      failedItems: 0,
      status: 'queued',
      config,
      items,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * List all batch jobs
   */
  static listBatches(): BatchJob[] {
    const rows = db.prepare('SELECT * FROM batch_jobs ORDER BY created_at DESC').all() as any[];
    return rows.map(r => this.formatBatch(r));
  }

  /**
   * Get single batch by id with all items
   */
  static getBatch(batchId: string): BatchJob | null {
    const row = db.prepare('SELECT * FROM batch_jobs WHERE id = ?').get(batchId) as any;
    if (!row) return null;
    return this.formatBatch(row);
  }

  /**
   * Cancel a batch
   */
  static cancelBatch(batchId: string): boolean {
    this.cancelledBatches.add(batchId);
    db.prepare("UPDATE batch_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?").run(new Date().toISOString(), batchId);
    db.prepare("UPDATE batch_items SET status = 'failed', current_step = 'Đã hủy bởi người dùng', error = 'Cancelled' WHERE batch_id = ? AND status IN ('pending', 'scraping', 'screenshotting', 'voicing', 'rendering')").run(batchId);
    return true;
  }

  /**
   * Delete batch
   */
  static deleteBatch(batchId: string): boolean {
    this.cancelledBatches.add(batchId);
    db.prepare('DELETE FROM batch_jobs WHERE id = ?').run(batchId);
    return true;
  }

  /**
   * Worker loop: processes queued batches sequentially
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        // Find next pending batch
        const nextBatchRow = db.prepare("SELECT * FROM batch_jobs WHERE status IN ('queued', 'processing') ORDER BY created_at ASC LIMIT 1").get() as any;
        if (!nextBatchRow) break;

        const batchId = nextBatchRow.id;
        if (this.cancelledBatches.has(batchId)) {
          this.cancelledBatches.delete(batchId);
          continue;
        }

        db.prepare("UPDATE batch_jobs SET status = 'processing', updated_at = ? WHERE id = ?").run(new Date().toISOString(), batchId);

        // Process pending items for this batch
        const items = db.prepare("SELECT * FROM batch_items WHERE batch_id = ? AND status = 'pending' ORDER BY created_at ASC").all(batchId) as any[];

        for (const item of items) {
          if (this.cancelledBatches.has(batchId)) {
            break;
          }
          await this.processItem(item.id, batchId, item.threads_url, JSON.parse(nextBatchRow.config || '{}'));
        }

        // Check if all items done
        const remainingCount = db.prepare("SELECT COUNT(*) as c FROM batch_items WHERE batch_id = ? AND status IN ('pending', 'scraping', 'screenshotting', 'voicing', 'rendering')").get(batchId) as any;

        if (remainingCount.c === 0) {
          db.prepare("UPDATE batch_jobs SET status = 'completed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), batchId);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single Threads post in the batch end-to-end
   */
  private static async processItem(itemId: string, batchId: string, url: string, batchConfig: Partial<VideoConfig>): Promise<void> {
    console.log(`[AutomationService] >>> Starting automated pipeline for item ${itemId} (${url})...`);

    const updateItem = (updates: Partial<BatchItem>) => {
      const sets: string[] = [];
      const values: any[] = [];
      if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
      if (updates.currentStep !== undefined) { sets.push('current_step = ?'); values.push(updates.currentStep); }
      if (updates.progress !== undefined) { sets.push('progress = ?'); values.push(updates.progress); }
      if (updates.error !== undefined) { sets.push('error = ?'); values.push(updates.error); }
      if (updates.outputVideoUrl !== undefined) { sets.push('output_video_url = ?'); values.push(updates.outputVideoUrl); }
      if (updates.projectId !== undefined) { sets.push('project_id = ?'); values.push(updates.projectId); }
      if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(updates.completedAt); }

      if (sets.length > 0) {
        values.push(itemId);
        db.prepare(`UPDATE batch_items SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }
    };

    try {
      // 1. Scraping & Project creation
      updateItem({ status: 'scraping', currentStep: 'Đang trích xuất bài viết & bình luận Threads...', progress: 15 });
      const project = await createProjectFromUrl(url, undefined, batchConfig);
      updateItem({ projectId: project.id, progress: 30 });
      console.log(`[AutomationService] Item ${itemId}: Created Project ${project.id} with ${project.comments.length} comments.`);

      // 2. Screenshot Generation (Phase 3 Engine)
      updateItem({ status: 'screenshotting', currentStep: 'Đang chụp ảnh thẻ bài viết & bình luận chuẩn Threads...', progress: 40 });
      const screenshots = await ScreenshotEngine.renderBatch(project, {
        aspectRatio: project.config.aspectRatio,
        theme: project.config.cardPosition?.bgStyle === 'dark' ? 'dark' : 'light'
      });
      console.log(`[AutomationService] Item ${itemId}: Rendered ${screenshots.length} screenshot cards.`);
      updateItem({ progress: 55 });

      // 3. AI Neural Voice Generation (Phase 4 Engine)
      updateItem({ status: 'voicing', currentStep: 'Đang tổng hợp giọng đọc AI Neural (Microsoft Edge / VieNeu)...', progress: 65 });
      const audios = await VoiceEngine.generateAllScenes(project);
      console.log(`[AutomationService] Item ${itemId}: Synthesized ${audios.length} voice scenes.`);
      updateItem({ progress: 75 });

      // 4. Video Compositing with FFmpeg (Phase 5/6 Engine)
      updateItem({ status: 'rendering', currentStep: 'Đang ghép video MP4 với video nền, video phụ PIP & phụ đề...', progress: 80 });

      // Fetch fresh project with generated audios and scenes
      const freshProject = formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id));
      const renderJob = VideoService.startRender(freshProject);

      // Await render job completion
      const completedJob = await this.awaitRenderJob(renderJob.id, (prog, step) => {
        const itemProg = Math.min(98, 80 + Math.floor(prog * 0.18));
        updateItem({ progress: itemProg, currentStep: `FFmpeg: ${step} (${prog}%)` });
      });

      if (completedJob.status === 'completed' && completedJob.outputVideoUrl) {
        const now = new Date().toISOString();
        updateItem({
          status: 'completed',
          currentStep: 'Hoàn thành!',
          progress: 100,
          outputVideoUrl: completedJob.outputVideoUrl,
          completedAt: now
        });
        db.prepare('UPDATE batch_jobs SET completed_items = completed_items + 1, updated_at = ? WHERE id = ?').run(now, batchId);
        console.log(`[AutomationService] Item ${itemId}: COMPLETED! Video URL: ${completedJob.outputVideoUrl}`);
      } else {
        throw new Error(completedJob.error || 'Video rendering failed');
      }
    } catch (err: any) {
      console.error(`[AutomationService] Item ${itemId} failed:`, err.message);
      const now = new Date().toISOString();
      updateItem({
        status: 'failed',
        currentStep: 'Thất bại',
        progress: 100,
        error: err.message,
        completedAt: now
      });
      db.prepare('UPDATE batch_jobs SET failed_items = failed_items + 1, updated_at = ? WHERE id = ?').run(now, batchId);
    }
  }

  private static awaitRenderJob(jobId: string, onProgress: (prog: number, step: string) => void): Promise<{ status: string; outputVideoUrl?: string; error?: string }> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const job = VideoService.getJob(jobId);
        if (!job) {
          clearInterval(interval);
          resolve({ status: 'failed', error: 'Render job not found' });
          return;
        }

        onProgress(job.progress, job.currentStep);

        if (job.status === 'completed') {
          clearInterval(interval);
          resolve({ status: 'completed', outputVideoUrl: job.outputVideoUrl });
        } else if (job.status === 'failed') {
          clearInterval(interval);
          resolve({ status: 'failed', error: job.error });
        }
      }, 1000);
    });
  }

  private static formatBatch(row: any): BatchJob {
    const itemRows = db.prepare('SELECT * FROM batch_items WHERE batch_id = ? ORDER BY created_at ASC').all(row.id) as any[];
    const items: BatchItem[] = itemRows.map(i => ({
      id: i.id,
      batchId: i.batch_id,
      threadsUrl: i.threads_url,
      projectId: i.project_id || undefined,
      status: i.status,
      currentStep: i.current_step,
      progress: i.progress,
      error: i.error || undefined,
      outputVideoUrl: i.output_video_url || undefined,
      createdAt: i.created_at,
      completedAt: i.completed_at || undefined
    }));

    return {
      id: row.id,
      title: row.title,
      totalItems: row.total_items,
      completedItems: row.completed_items,
      failedItems: row.failed_items,
      status: row.status,
      config: JSON.parse(row.config || '{}'),
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
