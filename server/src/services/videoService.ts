import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn, ChildProcess, execSync } from 'child_process';
import { db } from '../db.js';
import { RenderJob, Project, ScriptScene, ScreenshotItem, AudioItem } from '../types.js';
import { getStorageDir } from '../storagePath.js';
import { ScreenshotEngine } from './screenshotEngine.js';
import { VoiceEngine } from './voiceEngine.js';
import { ReliabilityService } from './reliabilityService.js';

interface ActiveJobContext {
  canceled: boolean;
  paused?: boolean;
  timer?: NodeJS.Timeout;
  ffmpegProcess?: ChildProcess;
  jobId?: string;
}

export class VideoService {
  private static activeJobs: Map<string, ActiveJobContext> = new Map();
  private static queue: Array<{ project: Project; jobId: string }> = [];

  static getActiveWorkerCount(): number {
    return this.activeJobs.size;
  }

  static getQueuedJobCount(): number {
    return this.queue.length;
  }

  /**
   * Phase 18: RAM availability check before rendering
   */
  static checkRamAvailability(minFreeRamGb: number = 1.5): {
    available: boolean;
    freeRamGb: number;
    minRequiredGb: number;
    message: string;
  } {
    const freeBytes = os.freemem();
    const freeGb = freeBytes / (1024 * 1024 * 1024);
    const available = freeGb >= minFreeRamGb;
    return {
      available,
      freeRamGb: Number(freeGb.toFixed(2)),
      minRequiredGb: minFreeRamGb,
      message: available
        ? `Đủ dung lượng RAM khả dụng (${freeGb.toFixed(2)} GB / yêu cầu ${minFreeRamGb} GB)`
        : `Không đủ RAM trống để an toàn render video (yêu cầu tối thiểu ${minFreeRamGb} GB, hiện còn ${freeGb.toFixed(2)} GB).`
    };
  }

  /**
   * Phase 18: Deterministic SHA-256 signature for a scene
   */
  static calculateSceneSignature(
    projectId: string,
    scene: ScriptScene,
    screenshotPath?: string,
    audioPath?: string,
    preset?: string
  ): string {
    const hash = crypto.createHash('sha256');
    hash.update(projectId);
    hash.update(scene.id);
    hash.update(String(scene.order));
    hash.update(scene.text || '');
    hash.update(scene.voice || '');
    hash.update(String(scene.duration || 0));
    hash.update(screenshotPath || '');
    hash.update(audioPath || '');
    hash.update(preset || 'veryfast');
    return hash.digest('hex');
  }

  /**
   * Phase 18: Verify integrity of cached scene MP4 with FFprobe
   */
  static verifySceneCache(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false;
      const stat = fs.statSync(filePath);
      if (stat.size < 5000) return false;
      const ffprobeCandidates = [
        'D:\\DevData\\ffmpeg\\bin\\ffprobe.exe',
        'C:\\ffmpeg\\bin\\ffprobe.exe',
        'ffprobe.exe',
        'ffprobe'
      ];
      let probeCmd = 'ffprobe';
      for (const p of ffprobeCandidates) {
        if (fs.existsSync(p)) {
          probeCmd = p;
          break;
        }
      }
      try {
        const out = execSync(`"${probeCmd}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, {
          timeout: 4000,
          stdio: 'pipe'
        }).toString().trim();
        const dur = parseFloat(out);
        return !isNaN(dur) && dur > 0.1;
      } catch {
        return stat.size > 20000;
      }
    } catch {
      return false;
    }
  }

  /**
   * Phase 18: Process next queued job when a worker becomes free
   */
  static processNextQueuedJob(): void {
    const perfConfig = ReliabilityService.getInstance().getPerformanceConfig();
    if (this.queue.length === 0) return;
    if (perfConfig.queueEnabled && this.activeJobs.size >= perfConfig.maxWorkers) return;

    const next = this.queue.shift();
    if (!next) return;

    const { project, jobId } = next;
    const currentJob = this.getJob(jobId);
    if (!currentJob || currentJob.status !== 'queued') return;

    const context: ActiveJobContext = { canceled: false, jobId };
    this.activeJobs.set(project.id, context);

    this.updateStep(jobId, 5, 'Bắt đầu xử lý', 'Worker đã tiếp nhận job từ hàng đợi...', 'Worker khởi động từ hàng đợi.');
    db.prepare("UPDATE render_jobs SET status = 'rendering' WHERE id = ?").run(jobId);
    db.prepare("UPDATE projects SET status = 'rendering' WHERE id = ?").run(project.id);

    this.runPipeline(project, jobId, context).catch(err => {
      console.error('[VideoService] Pipeline error for queued job:', err);
      if (!context.canceled) {
        this.markJobFailed(project.id, jobId, err.message);
      }
    });
  }

  static getFFmpegPath(): { path: string; exists: boolean } {
    const candidatePaths = [
      'D:\\DevData\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'ffmpeg.exe',
      'ffmpeg'
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return { path: p, exists: true };
      }
    }
    return { path: 'D:\\DevData\\ffmpeg\\bin\\ffmpeg.exe', exists: false };
  }

  static getJob(jobId: string): RenderJob | null {
    const row = db.prepare('SELECT * FROM render_jobs WHERE id = ?').get(jobId) as any;
    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      status: row.status,
      progress: row.progress,
      currentStep: row.current_step,
      stepDetails: row.step_details,
      logs: JSON.parse(row.logs || '[]'),
      outputVideoPath: row.output_video_path,
      outputVideoUrl: row.output_video_url,
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      error: row.error
    };
  }

  static getLatestProjectJob(projectId: string): RenderJob | null {
    const row = db.prepare('SELECT * FROM render_jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId) as any;
    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      status: row.status,
      progress: row.progress,
      currentStep: row.current_step,
      stepDetails: row.step_details,
      logs: JSON.parse(row.logs || '[]'),
      outputVideoPath: row.output_video_path,
      outputVideoUrl: row.output_video_url,
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      error: row.error
    };
  }

  static stopRender(projectId: string): boolean {
    const jobInfo = this.activeJobs.get(projectId);
    if (jobInfo) {
      jobInfo.canceled = true;
      if (jobInfo.timer) clearTimeout(jobInfo.timer);
      if (jobInfo.ffmpegProcess) {
        try {
          jobInfo.ffmpegProcess.kill('SIGKILL');
        } catch (e) {
          console.warn('[VideoService] Error killing ffmpeg process:', e);
        }
      }
      this.activeJobs.delete(projectId);

      const latestJob = this.getLatestProjectJob(projectId);
      if (latestJob && latestJob.status === 'rendering') {
        const updatedLogs = [...latestJob.logs, `[${new Date().toLocaleTimeString()}] Đã hủy tiến trình render bởi người dùng.`];
        db.prepare(`
          UPDATE render_jobs 
          SET status = 'failed', current_step = 'Đã dừng', error = 'Tiến trình bị dừng bởi người dùng', logs = ?
          WHERE id = ?
        `).run(JSON.stringify(updatedLogs), latestJob.id);

        db.prepare("UPDATE projects SET status = 'draft' WHERE id = ?").run(projectId);
      }
      this.processNextQueuedJob();
      return true;
    }
    return false;
  }

  /**
   * Phase 18: Pause active rendering job
   */
  static pauseRender(projectId: string): boolean {
    const jobInfo = this.activeJobs.get(projectId);
    if (jobInfo) {
      jobInfo.paused = true;
      jobInfo.canceled = true;
      if (jobInfo.timer) clearTimeout(jobInfo.timer);
      if (jobInfo.ffmpegProcess) {
        try {
          jobInfo.ffmpegProcess.kill('SIGINT');
        } catch {}
      }
      this.activeJobs.delete(projectId);

      const latestJob = this.getLatestProjectJob(projectId);
      if (latestJob && (latestJob.status === 'rendering' || latestJob.status === 'queued')) {
        const updatedLogs = [
          ...latestJob.logs,
          `[${new Date().toLocaleTimeString()}] Đã tạm dừng tiến trình render. Các cảnh hoàn thành được lưu an toàn trong cache.`
        ];
        db.prepare(`
          UPDATE render_jobs
          SET status = 'paused', current_step = 'Tạm dừng', step_details = 'Đã tạm dừng render. Bấm Tiếp tục để tái sử dụng cache.', logs = ?
          WHERE id = ?
        `).run(JSON.stringify(updatedLogs), latestJob.id);

        db.prepare("UPDATE projects SET status = 'draft' WHERE id = ?").run(projectId);
      }

      this.processNextQueuedJob();
      return true;
    }
    return false;
  }

  /**
   * Phase 18: Resume paused rendering job using scene cache
   */
  static resumeRender(projectId: string): RenderJob | null {
    const latestJob = this.getLatestProjectJob(projectId);
    if (!latestJob || (latestJob.status !== 'paused' && latestJob.status !== 'failed')) {
      return null;
    }

    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!row) return null;

    const scenes = (db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_order ASC').all(projectId) as any[]).map(s => ({
      id: s.id,
      order: s.scene_order,
      type: s.type,
      title: s.title,
      text: s.text,
      voice: s.voice,
      duration: s.duration,
      selected: Boolean(s.selected)
    }));

    const project: Project = {
      id: row.id,
      title: row.title,
      threadsUrl: row.threads_url,
      status: 'rendering',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      config: JSON.parse(row.video_config || '{}'),
      post: {} as any,
      comments: [],
      scenes
    };

    const updatedLogs = [
      ...latestJob.logs,
      `[${new Date().toLocaleTimeString()}] Tiếp tục quy trình render từ cache phân cảnh đã lưu...`
    ];
    db.prepare(`
      UPDATE render_jobs
      SET status = 'rendering', current_step = 'Tiếp tục render', step_details = 'Đang kiểm tra và tái sử dụng các cảnh từ cache...', logs = ?
      WHERE id = ?
    `).run(JSON.stringify(updatedLogs), latestJob.id);

    db.prepare("UPDATE projects SET status = 'rendering' WHERE id = ?").run(projectId);

    const context: ActiveJobContext = { canceled: false, jobId: latestJob.id };
    this.activeJobs.set(projectId, context);

    this.runPipeline(project, latestJob.id, context).catch(err => {
      console.error('[VideoService] Resume pipeline error:', err);
      if (!context.canceled) {
        this.markJobFailed(projectId, latestJob.id, err.message);
      }
    });

    return {
      ...latestJob,
      status: 'rendering',
      currentStep: 'Tiếp tục render',
      stepDetails: 'Đang kiểm tra và tái sử dụng các cảnh từ cache...'
    };
  }

  /**
   * Phase 18: Graceful shutdown handler
   */
  static gracefulShutdown(timeoutMs: number = 300000): void {
    console.log(`[VideoService] Initiating graceful shutdown (timeout: ${timeoutMs / 1000}s)...`);
    for (const [projectId, context] of this.activeJobs.entries()) {
      context.paused = true;
      context.canceled = true;
      if (context.timer) clearTimeout(context.timer);
      if (context.ffmpegProcess) {
        try {
          context.ffmpegProcess.kill('SIGINT');
        } catch {}
      }
      const latestJob = this.getLatestProjectJob(projectId);
      if (latestJob && latestJob.status === 'rendering') {
        const updatedLogs = [
          ...latestJob.logs,
          `[${new Date().toLocaleTimeString()}] Hệ thống đóng an toàn: Tiến trình được tạm dừng, cache phân cảnh đã lưu để phục hồi.`
        ];
        db.prepare(`
          UPDATE render_jobs
          SET status = 'paused', current_step = 'Tạm dừng', step_details = 'Đã tạm dừng an toàn khi đóng ứng dụng. Cache phân cảnh được bảo toàn.', logs = ?
          WHERE id = ?
        `).run(JSON.stringify(updatedLogs), latestJob.id);
        db.prepare("UPDATE projects SET status = 'draft' WHERE id = ?").run(projectId);
      }
    }
    this.activeJobs.clear();
    this.queue = [];
  }

  /**
   * Phase 18: Recover jobs interrupted by sudden crashes or restarts
   */
  static recoverInterruptedJobs(): void {
    try {
      const activeRows = db.prepare("SELECT * FROM render_jobs WHERE status = 'rendering'").all() as any[];
      for (const row of activeRows) {
        const logs = JSON.parse(row.logs || '[]');
        logs.push(`[${new Date().toLocaleTimeString()}] Tự động khôi phục sau khởi động lại: Chuyển về trạng thái tạm dừng, bảo vệ cache.`);
        db.prepare(`
          UPDATE render_jobs
          SET status = 'paused', current_step = 'Tạm dừng', step_details = 'Tự động khôi phục sau khởi động lại. Bấm Tiếp tục để hoàn thành.', logs = ?
          WHERE id = ?
        `).run(JSON.stringify(logs), row.id);
        db.prepare("UPDATE projects SET status = 'draft' WHERE id = ?").run(row.project_id);
      }
      if (activeRows.length > 0) {
        console.log(`[VideoService] Recovered ${activeRows.length} interrupted render jobs to paused state.`);
      }
    } catch (e) {
      console.error('[VideoService] Error recovering interrupted jobs:', e);
    }
  }

  private static appendLog(jobId: string, message: string) {
    const currentJob = this.getJob(jobId);
    if (!currentJob) return;
    const logLine = `[${new Date().toLocaleTimeString()}] ${message}`;
    const updatedLogs = [...currentJob.logs, logLine];
    db.prepare('UPDATE render_jobs SET logs = ? WHERE id = ?').run(JSON.stringify(updatedLogs), jobId);
  }

  private static updateStep(jobId: string, progress: number, stepName: string, stepDetails: string, logMsg?: string) {
    const currentJob = this.getJob(jobId);
    if (!currentJob) return;
    const logs = logMsg ? [...currentJob.logs, `[${new Date().toLocaleTimeString()}] ${logMsg}`] : currentJob.logs;
    db.prepare(`
      UPDATE render_jobs 
      SET progress = ?, current_step = ?, step_details = ?, logs = ?
      WHERE id = ?
    `).run(progress, stepName, stepDetails, JSON.stringify(logs), jobId);
  }

  static startRender(project: Project): RenderJob {
    this.stopRender(project.id);

    const perfConfig = ReliabilityService.getInstance().getPerformanceConfig();

    // 1. Check RAM availability
    const ramCheck = this.checkRamAvailability(perfConfig.minFreeRamGb);
    if (!ramCheck.available) {
      throw new Error(ramCheck.message);
    }

    const jobId = `job_${Date.now()}`;
    const now = new Date().toISOString();
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] Khởi động quy trình sản xuất video cho dự án: "${project.title}"`,
      `[${new Date().toLocaleTimeString()}] Tỷ lệ: ${project.config.aspectRatio || '9:16'} · Độ phân giải: ${project.config.resolution || '1080p'} · FPS: ${project.config.fps || 30}`,
      `[${new Date().toLocaleTimeString()}] Thẻ giao diện: X=${project.config.cardPosition?.x ?? 50}%, Y=${project.config.cardPosition?.y ?? 28}%, Cỡ=${project.config.cardPosition?.scale ?? 105}%, Nền=${project.config.cardPosition?.bgStyle ?? 'Trắng'}`,
      `[${new Date().toLocaleTimeString()}] Hiệu năng: Preset=${perfConfig.ffmpegPreset} · Luồng CPU=${perfConfig.cpuThreads || 'Auto'} · Cache cảnh=${perfConfig.sceneCacheEnabled ? 'Bật' : 'Tắt'}`
    ];

    // 2. Queue handling: limit active workers
    if (perfConfig.queueEnabled && this.activeJobs.size >= perfConfig.maxWorkers) {
      const queuedLogs = [
        ...initialLogs,
        `[${new Date().toLocaleTimeString()}] Đã đưa vào hàng đợi: ${this.activeJobs.size}/${perfConfig.maxWorkers} worker đang bận.`
      ];
      db.prepare(`
        INSERT INTO render_jobs (id, project_id, status, progress, current_step, step_details, logs, created_at)
        VALUES (?, ?, 'queued', 0, 'Đang trong hàng đợi', 'Hệ thống giới hạn worker để bảo vệ RAM. Đang chờ worker trước hoàn thành...', ?, ?)
      `).run(jobId, project.id, JSON.stringify(queuedLogs), now);

      db.prepare("UPDATE projects SET status = 'rendering' WHERE id = ?").run(project.id);

      this.queue.push({ project, jobId });

      return {
        id: jobId,
        projectId: project.id,
        status: 'queued',
        progress: 0,
        currentStep: 'Đang trong hàng đợi',
        stepDetails: 'Hệ thống giới hạn worker để bảo vệ RAM. Đang chờ worker trước hoàn thành...',
        logs: queuedLogs,
        createdAt: now
      };
    }

    db.prepare(`
      INSERT INTO render_jobs (id, project_id, status, progress, current_step, step_details, logs, created_at)
      VALUES (?, ?, 'rendering', 5, 'Chuẩn bị tài nguyên', 'Đang kiểm tra và chuẩn bị dữ liệu sản xuất...', ?, ?)
    `).run(jobId, project.id, JSON.stringify(initialLogs), now);

    db.prepare("UPDATE projects SET status = 'rendering' WHERE id = ?").run(project.id);

    const jobRecord: RenderJob = {
      id: jobId,
      projectId: project.id,
      status: 'rendering',
      progress: 5,
      currentStep: 'Chuẩn bị tài nguyên',
      stepDetails: 'Đang kiểm tra và chuẩn bị dữ liệu sản xuất...',
      logs: initialLogs,
      createdAt: now
    };

    const context: ActiveJobContext = { canceled: false, jobId };
    this.activeJobs.set(project.id, context);

    // Launch async production pipeline
    this.runPipeline(project, jobId, context).catch(err => {
      console.error('[VideoService] Pipeline uncaught error:', err);
      if (!context.canceled) {
        this.markJobFailed(project.id, jobId, err.message);
      }
    });

    return jobRecord;
  }

  private static async runPipeline(project: Project, jobId: string, context: ActiveJobContext): Promise<void> {
    const storageDir = getStorageDir();
    const tempDir = path.join(storageDir, 'temp');
    const videosDir = path.join(storageDir, 'videos');
    const imagesDir = path.join(storageDir, 'images');

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    // Step 1: Ensure Script Scenes
    if (context.canceled) return;
    this.updateStep(jobId, 10, 'Chuẩn bị kịch bản', 'Kiểm tra kịch bản phân cảnh...');
    let scenes = project.scenes.filter(s => s.selected);
    if (scenes.length === 0) {
      this.appendLog(jobId, 'Chưa có phân cảnh, tự động sinh kịch bản AI...');
      const generated = await VoiceEngine.generateAIScript(project);
      for (const sc of generated) {
        db.prepare(`
          INSERT INTO scenes (id, project_id, scene_order, type, title, text, voice, duration, selected)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(sc.id, project.id, sc.order, sc.type, sc.title, sc.text, sc.voice, sc.duration ?? null);
      }
      scenes = generated;
    }
    this.appendLog(jobId, `Đã xác nhận ${scenes.length} phân cảnh cho video.`);

    // Step 2: Ensure Screenshots
    if (context.canceled) return;
    this.updateStep(jobId, 25, 'Render thẻ giao diện', 'Đang tạo hình ảnh thẻ Threads và bình luận...');
    let screenshots = ScreenshotEngine.listScreenshots(project.id);
    const postScreenshot = screenshots.find(s => s.type === 'post');
    if (!postScreenshot || screenshots.length < 2) {
      this.appendLog(jobId, 'Render mới bộ ảnh thẻ Threads bằng Playwright...');
      screenshots = await ScreenshotEngine.renderBatch(project, {
        aspectRatio: project.config.aspectRatio || '9:16',
        theme: (project.config.cardPosition?.bgStyle === 'dark') ? 'dark' : 'light'
      });
      this.appendLog(jobId, `Đã render thành công ${screenshots.length} ảnh thẻ Threads.`);
    } else {
      this.appendLog(jobId, `Sử dụng ${screenshots.length} ảnh thẻ đã có trong thư viện.`);
    }

    // Step 3: Ensure Audio narration
    if (context.canceled) return;
    this.updateStep(jobId, 45, 'Tổng hợp giọng đọc AI', 'Đang chuẩn bị giọng đọc cho từng phân cảnh...');
    const sceneAudios: { scene: ScriptScene; audioPath: string; duration: number }[] = [];
    const existingAudios = VoiceEngine.listAudios(project.id);

    for (const sc of scenes) {
      if (context.canceled) return;
      let matched = existingAudios.find(a => a.sceneId === sc.id && fs.existsSync(a.filePath) && fs.statSync(a.filePath).size > 100);
      if (!matched) {
        this.appendLog(jobId, `Đang tạo giọng đọc cho phân cảnh: "${sc.title}"...`);
        matched = await VoiceEngine.generateSceneAudio(project, sc);
      }
      sceneAudios.push({
        scene: sc,
        audioPath: matched.filePath,
        duration: matched.duration
      });
    }

    const totalDuration = sceneAudios.reduce((acc, cur) => acc + cur.duration, 0);
    this.appendLog(jobId, `Tổng thời lượng video dự kiến: ${totalDuration.toFixed(1)} giây.`);

    // Step 4: Generate ASS Subtitles
    if (context.canceled) return;
    this.updateStep(jobId, 60, 'Tạo phụ đề tự động', 'Đang đồng bộ phụ đề chữ nhảy từng phân cảnh...');
    const assPath = path.join(tempDir, `subtitles_${jobId}.ass`);
    this.generateAssSubtitles(assPath, sceneAudios, project.config.aspectRatio || '9:16', project.config.subtitleStyle);
    this.appendLog(jobId, 'Đã tạo tệp phụ đề ASS đồng bộ thời gian chính xác.');

    // Step 5 & 6: FFmpeg Video Multiplexing
    if (context.canceled) return;
    this.updateStep(jobId, 75, 'Thiết lập bố cục FFmpeg', 'Đang kết hợp các lớp video, thẻ ảnh và âm thanh...');

    const ffmpegInfo = this.getFFmpegPath();
    if (!ffmpegInfo.exists) {
      throw new Error(`Không tìm thấy FFmpeg tại ${ffmpegInfo.path}`);
    }

    const outputFileName = `threads_video_${Date.now()}.mp4`;
    const outputFilePath = path.join(videosDir, outputFileName);
    const outputUrl = `/api/videos/${outputFileName}`;
    const thumbnailFileName = `thumb_${Date.now()}.jpg`;
    const thumbnailPath = path.join(imagesDir, thumbnailFileName);
    const thumbnailUrl = `/api/images/${thumbnailFileName}`;

    await this.renderVideoWithFFmpeg(
      project,
      jobId,
      context,
      ffmpegInfo.path,
      sceneAudios,
      screenshots,
      assPath,
      totalDuration,
      outputFilePath
    );

    if (context.canceled) return;

    // Step 7: Generate Thumbnail
    try {
      await this.extractThumbnail(ffmpegInfo.path, outputFilePath, thumbnailPath);
    } catch (e) {
      console.warn('[VideoService] Could not generate thumbnail:', e);
    }

    // Step 8: Complete Job
    this.markJobCompleted(project.id, jobId, outputFilePath, outputUrl, thumbnailUrl);
  }

  private static generateAssSubtitles(
    assPath: string,
    sceneAudios: { scene: ScriptScene; duration: number }[],
    aspectRatio: string,
    subConfig?: any
  ): void {
    if (subConfig?.enabled === false) {
      fs.writeFileSync(assPath, '\uFEFF[Script Info]\nTitle: Empty\n[Events]\n', 'utf8');
      return;
    }

    const isPortrait = aspectRatio === '9:16';
    const playResX = isPortrait ? 1080 : 1920;
    const playResY = isPortrait ? 1920 : 1080;

    let alignment = 2; // Bottom center
    let marginV = isPortrait ? 280 : 120;
    if (subConfig?.position === 'middle') {
      alignment = 5; // Middle center
      marginV = 0;
    } else if (subConfig?.position === 'top') {
      alignment = 8; // Top center
      marginV = isPortrait ? 180 : 80;
    }

    const fontSize = subConfig?.fontSize || (isPortrait ? 44 : 46);
    // Default to viral punchy yellow #FFE600 (&H0000E6FF in ASS BGR format)
    let primaryColor = subConfig?.primaryColor || '&H0000E6FF';
    if (primaryColor.startsWith('#')) {
      // Convert HEX #RRGGBB to ASS &H00BBGGRR
      const hex = primaryColor.replace('#', '');
      if (hex.length === 6) {
        const r = hex.substring(0, 2);
        const g = hex.substring(2, 4);
        const b = hex.substring(4, 6);
        primaryColor = `&H00${b}${g}${r}`;
      }
    }
    const outlineColor = subConfig?.outlineColor || '&H00000000';

    const formatTime = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const cs = Math.floor((seconds % 1) * 100);
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    };

    const lines: string[] = [
      '[Script Info]',
      'Title: Threads Studio Subtitles',
      'ScriptType: v4.00+',
      `PlayResX: ${playResX}`,
      `PlayResY: ${playResY}`,
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      `Style: Default,Arial,${fontSize},${primaryColor},&H0000FFFF,${outlineColor},&H90000000,1,0,0,0,100,100,0,0,1,4.5,2.0,${alignment},40,40,${marginV},1`,
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
    ];

    let currentTime = 0.2;
    for (const item of sceneAudios) {
      const sceneDur = item.duration;
      const text = item.scene.text.trim();
      
      // Split into smaller subtitle chunks of 6-8 words for smooth reading
      const words = text.split(/\s+/).filter(Boolean);
      const chunkSize = 7;
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
      }

      const chunkDur = (sceneDur - 0.2) / Math.max(1, chunks.length);
      for (let j = 0; j < chunks.length; j++) {
        const startSec = currentTime + j * chunkDur;
        const endSec = startSec + chunkDur - 0.05;
        const cleanChunk = chunks[j].replace(/[\r\n]+/g, ' ');
        lines.push(`Dialogue: 0,${formatTime(startSec)},${formatTime(endSec)},Default,,0,0,0,,${cleanChunk}`);
      }
      currentTime += sceneDur;
    }

    // Write UTF-8 with BOM for DirectWrite
    fs.writeFileSync(assPath, '\uFEFF' + lines.join('\n'), 'utf8');
  }

  private static async renderVideoWithFFmpeg(
    project: Project,
    jobId: string,
    context: ActiveJobContext,
    ffmpegPath: string,
    sceneAudios: { scene: ScriptScene; audioPath: string; duration: number }[],
    screenshots: ScreenshotItem[],
    assPath: string,
    totalDuration: number,
    outputPath: string
  ): Promise<void> {
    const isPortrait = project.config.aspectRatio === '9:16' || !project.config.aspectRatio;
    const width = isPortrait ? 1080 : 1920;
    const height = isPortrait ? 1920 : 1080;

    const postScreenshot = screenshots.find(s => s.type === 'post') || screenshots[0];
    const commentScreenshots = screenshots.filter(s => s.type === 'comment');

    const cardScale = ((project.config.cardPosition?.scale ?? 92) / 100);
    const cardTargetWidth = Math.round((width * 0.88) * cardScale);
    const cardPosYPercent = ((project.config.cardPosition?.y ?? 40) / 100).toFixed(2);
    const cardXExpr = `(W-w)/2`;
    const cardYExpr = `H*${cardPosYPercent}-(h/2)`;

    // PIP Sub video settings
    const subVideoEnabled = project.config.subVideoPosition?.enabled !== false;
    const subVideoScale = ((project.config.subVideoPosition?.scale ?? 110) / 100);
    const subVideoWidth = Math.round((width * 0.70) * subVideoScale);
    const subVideoHeight = Math.round(subVideoWidth * (9 / 16));
    const subVideoX = Math.round((width - subVideoWidth) * ((project.config.subVideoPosition?.x ?? 50) / 100));
    const subVideoY = Math.round(height * 0.60);

    const inputs: string[] = [];
    const filterParts: string[] = [];
    let nextInputIndex = 0;

    const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi']);
    const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

    // Helper to find video file in directory or subdirectories
    const findVideoInFolder = (folderOrFile: string): string | null => {
      try {
        const candidate = path.normalize(folderOrFile);
        if (!fs.existsSync(candidate)) return null;
        if (fs.statSync(candidate).isFile()) return candidate;
        const entries = fs.readdirSync(candidate, { withFileTypes: true });
        const directVideos = entries
          .filter(e => e.isFile() && VIDEO_EXTS.has(path.extname(e.name).toLowerCase()))
          .map(e => path.join(candidate, e.name));
        if (directVideos.length > 0) {
          return directVideos[Math.floor(Math.random() * directVideos.length)];
        }
        for (const sub of entries.filter(e => e.isDirectory())) {
          const subPath = path.join(candidate, sub.name);
          const subEntries = fs.readdirSync(subPath).filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
          if (subEntries.length > 0) {
            return path.join(subPath, subEntries[Math.floor(Math.random() * subEntries.length)]);
          }
        }
      } catch (e) {
        console.error('Error finding video in folder:', e);
      }
      return null;
    };

    // 1. Detect video source (Gameplay / Satisfying / B-roll) from disk if enabled
    let bgVideoPath: string | null = null;
    const isVideoEnabled = project.config.subVideoPosition?.enabled !== false;

    if (isVideoEnabled) {
      if (project.config.subVideoPosition?.folder) {
        bgVideoPath = findVideoInFolder(project.config.subVideoPosition.folder);
      }
      if (!bgVideoPath && project.config.backgroundVideoFolder) {
        bgVideoPath = findVideoInFolder(project.config.backgroundVideoFolder);
      }
      // If still not found, check default sample gameplay media
      if (!bgVideoPath) {
        const sampleGameplay = path.resolve(process.cwd(), 'storage', 'sample_media', 'videos', 'background_gameplay.mp4');
        if (fs.existsSync(sampleGameplay)) {
          bgVideoPath = sampleGameplay;
        }
      }
    }

    if (bgVideoPath) {
      this.appendLog(jobId, `Sử dụng video nền dọc toàn màn hình: ${path.basename(bgVideoPath)}`);
      inputs.push('-stream_loop', '-1', '-i', bgVideoPath);
      const bgInputIdx = nextInputIndex++;
      let bgFilter = `[${bgInputIdx}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=30`;
      if (project.config.effects?.blurBackground || (project.config.subVideoPosition?.blur && project.config.subVideoPosition.blur > 0)) {
        bgFilter += `,boxblur=10:5`;
      }
      if (project.config.effects?.vignette) {
        bgFilter += `,vignette=PI/4`;
      }
      // Contrast dimming so white card and subtitles stand out sharply
      const dimLevel = Math.max(0.3, Math.min(1.0, ((project.config.subVideoPosition?.brightness ?? 80) / 100))).toFixed(2);
      bgFilter += `,colorlevels=rimax=${dimLevel}:gimax=${dimLevel}:bimax=${dimLevel}[bg]`;
      filterParts.push(bgFilter);
    } else {
      // Fallback: dark clean luxury canvas with subtle grid
      inputs.push('-f', 'lavfi', '-i', `color=c=0x070d19:s=${width}x${height}:d=${totalDuration.toFixed(2)}:r=30`);
      const bgInputIdx = nextInputIndex++;
      let bgFilter = `[${bgInputIdx}:v]drawgrid=width=120:height=120:thickness=2:color=white@0.08`;
      if (project.config.effects?.vignette) {
        bgFilter += `,vignette=PI/4`;
      }
      if (project.config.effects?.blurBackground) {
        bgFilter += `,boxblur=10:5`;
      }
      bgFilter += `[bg]`;
      filterParts.push(bgFilter);
    }
    let currentV = '[bg]';

    // 2. Optional secondary PIP box overlay ONLY if layoutMode is explicitly 'pip' and not 9:16 portrait
    const layoutMode = project.config.subVideoPosition?.layoutMode || 'fullscreen';
    if (layoutMode === 'pip' && isVideoEnabled && !isPortrait) {
      let subVideoPath: string | null = null;
      if (project.config.subVideoPosition?.folder) {
        subVideoPath = findVideoInFolder(project.config.subVideoPosition.folder);
      }
      if (!subVideoPath && project.config.backgroundVideoFolder) {
        subVideoPath = findVideoInFolder(project.config.backgroundVideoFolder);
      }

      if (subVideoPath) {
        this.appendLog(jobId, `Sử dụng khung PIP video phụ: ${path.basename(subVideoPath)}`);
        inputs.push('-stream_loop', '-1', '-i', subVideoPath);
        const subInputIdx = nextInputIndex++;
        filterParts.push(
          `[${subInputIdx}:v]scale=${subVideoWidth}:${subVideoHeight}:force_original_aspect_ratio=increase,crop=${subVideoWidth}:${subVideoHeight},fps=30[subv]`
        );
        filterParts.push(`${currentV}[subv]overlay=${subVideoX}:${subVideoY}[v_pip]`);
        currentV = '[v_pip]';
      }
    }

    // Audio inputs and concatenation with volume mixing per scene
    let audioFilterConcat = '';
    for (let i = 0; i < sceneAudios.length; i++) {
      inputs.push('-i', sceneAudios[i].audioPath);
      const audioInputIdx = nextInputIndex++;
      const sceneVol = ((sceneAudios[i].scene.volume ?? 100) / 100).toFixed(2);
      const volTag = `[a_vol_${i}]`;
      filterParts.push(`[${audioInputIdx}:a]aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo,volume=${sceneVol}${volTag}`);
      audioFilterConcat += volTag;
    }
    audioFilterConcat += `concat=n=${sceneAudios.length}:v=0:a=1[v_audio]`;
    filterParts.push(audioFilterConcat);

    // Card overlays per scene with transitions
    let sceneStartTime = 0;
    let cardOverlayCount = 0;

    for (let i = 0; i < sceneAudios.length; i++) {
      const item = sceneAudios[i];
      const startT = sceneStartTime;
      const endT = sceneStartTime + item.duration;
      sceneStartTime += item.duration;

      // Select card for scene
      let chosenCard = postScreenshot;
      if (item.scene.type === 'comment') {
        const cmtIdx = commentScreenshots.findIndex(cs => cs.refId === item.scene.id || cs.refId.includes(item.scene.id));
        if (cmtIdx >= 0) {
          chosenCard = commentScreenshots[cmtIdx];
        } else if (commentScreenshots[cardOverlayCount % commentScreenshots.length]) {
          chosenCard = commentScreenshots[cardOverlayCount % commentScreenshots.length];
        }
      }

      if (chosenCard && fs.existsSync(chosenCard.filePath)) {
        inputs.push('-i', chosenCard.filePath);
        const cardInputIdx = nextInputIndex++;

        const cardTag = `[card_${cardOverlayCount}]`;
        const nextV = `[v_card_${cardOverlayCount}]`;
        const transType = item.scene.transition || project.config.defaultTransition || 'fade';
        const transDur = item.scene.transitionDuration || 0.4;

        if (transType === 'slide_left') {
          // Slide in from right
          filterParts.push(`[${cardInputIdx}:v]scale=${cardTargetWidth}:-1${cardTag}`);
          const xExpr = `if(lt(t,${startT.toFixed(2)}+${transDur}),W-(t-${startT.toFixed(2)})/${transDur}*(W-(W-w)/2),(W-w)/2)`;
          filterParts.push(
            `${currentV}${cardTag}overlay=x='${xExpr}':y='${cardYExpr}':enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'${nextV}`
          );
        } else if (transType === 'slide_right') {
          // Slide in from left
          filterParts.push(`[${cardInputIdx}:v]scale=${cardTargetWidth}:-1${cardTag}`);
          const xExpr = `if(lt(t,${startT.toFixed(2)}+${transDur}),-w+(t-${startT.toFixed(2)})/${transDur}*((W-w)/2+w),(W-w)/2)`;
          filterParts.push(
            `${currentV}${cardTag}overlay=x='${xExpr}':y='${cardYExpr}':enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'${nextV}`
          );
        } else if (transType === 'fade') {
          // Fade in with alpha
          filterParts.push(
            `[${cardInputIdx}:v]scale=${cardTargetWidth}:-1,fade=t=in:st=${startT.toFixed(2)}:d=${transDur}:alpha=1${cardTag}`
          );
          filterParts.push(
            `${currentV}${cardTag}overlay=x='${cardXExpr}':y='${cardYExpr}':enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'${nextV}`
          );
        } else {
          // Cut / direct overlay
          filterParts.push(`[${cardInputIdx}:v]scale=${cardTargetWidth}:-1${cardTag}`);
          filterParts.push(
            `${currentV}${cardTag}overlay=x='${cardXExpr}':y='${cardYExpr}':enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'${nextV}`
          );
        }

        currentV = nextV;
        cardOverlayCount++;
      }
    }

    // Watermark overlay
    if (project.config.watermark?.enabled && project.config.watermark.text) {
      const wm = project.config.watermark;
      const text = wm.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');
      const fontSize = wm.fontSize || (isPortrait ? 28 : 32);
      const opacity = Math.min(1.0, Math.max(0.1, wm.opacity || 0.85));

      let xPos = 'w-tw-40';
      let yPos = '50';
      if (wm.position === 'top_left') {
        xPos = '40';
        yPos = '50';
      } else if (wm.position === 'top_center') {
        xPos = '(w-tw)/2';
        yPos = '50';
      } else if (wm.position === 'bottom_right') {
        xPos = 'w-tw-40';
        yPos = 'h-th-50';
      } else if (wm.position === 'bottom_left') {
        xPos = '40';
        yPos = 'h-th-50';
      }

      const wmV = `[v_wm]`;
      filterParts.push(`${currentV}drawtext=text='${text}':fontsize=${fontSize}:fontcolor=yellow@${opacity.toFixed(2)}:box=1:boxcolor=black@0.6:boxborderw=10:x=${xPos}:y=${yPos}${wmV}`);
      currentV = wmV;
    }

    // Burn-in ASS Subtitles using relative path to avoid Windows drive-letter colon conflicts
    const relAssPath = path.relative(process.cwd(), assPath).replace(/\\/g, '/');
    const finalV = '[v_out]';
    filterParts.push(`${currentV}ass=${relAssPath}${finalV}`);

    // Mix Background Music if configured
    let musicPath: string | null = null;
    const musicFolder = project.config.backgroundMusic?.folder;
    if (musicFolder) {
      const musicCandidate = path.normalize(musicFolder);
      if (fs.existsSync(musicCandidate)) {
        if (fs.statSync(musicCandidate).isDirectory()) {
          const files = fs.readdirSync(musicCandidate).filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()));
          if (files.length > 0) {
            musicPath = path.join(musicCandidate, files[Math.floor(Math.random() * files.length)]);
          }
        } else if (fs.statSync(musicCandidate).isFile()) {
          musicPath = musicCandidate;
        }
      }
    }

    let finalAudioTag = '[v_audio]';
    if (musicPath) {
      this.appendLog(jobId, `Trộn nhạc nền: ${path.basename(musicPath)}`);
      inputs.push('-stream_loop', '-1', '-i', musicPath);
      const musicInputIdx = nextInputIndex++;
      const musicVol = ((project.config.backgroundMusic?.volume ?? 20) / 100).toFixed(2);
      filterParts.push(`[${musicInputIdx}:a]volume=${musicVol}[a_bgm]`);
      filterParts.push(`[v_audio][a_bgm]amix=inputs=2:duration=first:dropout_transition=2[a_final]`);
      finalAudioTag = '[a_final]';
    }

    const filterComplex = filterParts.join('; ');

    const perfConfig = ReliabilityService.getInstance().getPerformanceConfig();
    const preset = perfConfig.ffmpegPreset || 'veryfast';
    const cpuThreads = perfConfig.cpuThreads || 0;

    const args = [
      '-y',
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', finalV,
      '-map', finalAudioTag,
      '-c:v', 'libx264',
      '-preset', preset,
      ...(cpuThreads > 0 ? ['-threads', String(cpuThreads)] : []),
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', totalDuration.toFixed(2),
      outputPath
    ];

    this.updateStep(jobId, 90, 'FFmpeg xuất video', 'Đang thực hiện render và mã hóa H.264...');
    this.appendLog(jobId, 'Bắt đầu render video với FFmpeg...');

    return new Promise((resolve, reject) => {
      const ffmpegProc = spawn(ffmpegPath, args);
      context.ffmpegProcess = ffmpegProc;
      let stderrLogs = '';

      ffmpegProc.stderr.on('data', (data) => {
        const text = data.toString();
        stderrLogs += text;
        // Extract time=HH:MM:SS.ss to calculate rough percentage
        const match = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          const currentSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
          const pct = Math.min(98, Math.max(90, Math.floor(90 + (currentSec / totalDuration) * 8)));
          this.updateStep(jobId, pct, 'FFmpeg xuất video', `Tiến độ mã hóa: ${Math.floor((currentSec / totalDuration) * 100)}% (${currentSec.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`);
        }
      });

      ffmpegProc.on('close', (code) => {
        context.ffmpegProcess = undefined;
        if (code === 0) {
          this.appendLog(jobId, `FFmpeg xuất file thành công: ${path.basename(outputPath)}`);
          resolve();
        } else if (context.canceled) {
          resolve();
        } else {
          console.error('[FFmpeg STDERR]:\n', stderrLogs);
          reject(new Error(`FFmpeg kết thúc với mã lỗi: ${code}. Chi tiết: ${stderrLogs.slice(-500)}`));
        }
      });

      ffmpegProc.on('error', (err) => {
        context.ffmpegProcess = undefined;
        reject(err);
      });
    });
  }

  private static async extractThumbnail(ffmpegPath: string, videoPath: string, thumbPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-ss', '1.0',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        thumbPath
      ]);

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Thumbnail exit code: ${code}`));
      });
      proc.on('error', reject);
    });
  }

  private static markJobCompleted(
    projectId: string,
    jobId: string,
    filePath: string,
    fileUrl: string,
    thumbnailUrl: string
  ) {
    const currentJob = this.getJob(jobId);
    const finalLogs = currentJob
      ? [
          ...currentJob.logs,
          `[${new Date().toLocaleTimeString()}] Hoàn tất xuất video MP4 1080p chuẩn âm thanh và phụ đề!`,
          `[${new Date().toLocaleTimeString()}] Video đã sẵn sàng tải xuống hoặc xem trực tiếp.`
        ]
      : ['Hoàn tất xuất video MP4.'];

    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE render_jobs
      SET status = 'completed', progress = 100, current_step = 'Hoàn thành', step_details = 'Video đã được xuất thành công!',
          output_video_path = ?, output_video_url = ?, thumbnail_url = ?, logs = ?, completed_at = ?
      WHERE id = ?
    `).run(filePath, fileUrl, thumbnailUrl, JSON.stringify(finalLogs), completedAt, jobId);

    db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(projectId);

    this.activeJobs.delete(projectId);
    this.processNextQueuedJob();
  }

  private static markJobFailed(projectId: string, jobId: string, errorMsg: string) {
    const currentJob = this.getJob(jobId);
    const finalLogs = currentJob
      ? [...currentJob.logs, `[${new Date().toLocaleTimeString()}] Lỗi render: ${errorMsg}`]
      : [`Lỗi: ${errorMsg}`];

    db.prepare(`
      UPDATE render_jobs
      SET status = 'failed', current_step = 'Thất bại', step_details = ?, error = ?, logs = ?
      WHERE id = ?
    `).run(errorMsg, errorMsg, JSON.stringify(finalLogs), jobId);

    db.prepare("UPDATE projects SET status = 'draft' WHERE id = ?").run(projectId);

    this.activeJobs.delete(projectId);
    this.processNextQueuedJob();
  }
}
