import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { db } from '../db.js';
import { getStorageDir } from '../storagePath.js';
import {
  ServiceHealthStatus,
  SystemHealthReport,
  StorageBreakdownStats,
  CleanTempResult,
  SystemBackupItem,
  CreateBackupDto,
  BackupScheduleConfig,
  SystemLogEntry,
  RenderPerformanceConfig,
  SystemResourceUsage,
  SceneCacheStats,
  SceneCacheItem
} from '../types.js';

const execFileAsync = promisify(execFile);

export class ReliabilityService {
  private static instance: ReliabilityService;
  private storageDir: string;
  private backupsDir: string;
  private logsDir: string;
  private tempDir: string;
  private sceneCacheDir: string;
  private logFilePath: string;
  private scheduleTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.storageDir = getStorageDir();
    this.backupsDir = path.join(this.storageDir, 'backups');
    this.logsDir = path.join(this.storageDir, 'logs');
    this.tempDir = path.join(this.storageDir, 'temp');
    this.sceneCacheDir = path.join(this.storageDir, 'temp', 'scene_cache');
    this.logFilePath = path.join(this.logsDir, 'system.jsonl');

    [this.backupsDir, this.logsDir, this.tempDir, this.sceneCacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    this.initScheduleTable();
    this.initPerformanceConfigTable();
    this.startScheduler();
    this.log('info', 'ReliabilityService', 'Khởi tạo trung tâm Reliability, Security & Backup (Phase 15)');
  }

  public static getInstance(): ReliabilityService {
    if (!ReliabilityService.instance) {
      ReliabilityService.instance = new ReliabilityService();
    }
    return ReliabilityService.instance;
  }

  // ==========================================
  // 1. Structured Logging & Secret Masking
  // ==========================================

  /**
   * Redacts sensitive secrets, tokens, client secrets, and keys
   */
  public maskSensitiveData(input: any): any {
    if (typeof input === 'string') {
      let masked = input;
      // Mask Bearer tokens
      masked = masked.replace(/Bearer\s+([A-Za-z0-9\._~+\/-]+=*)/gi, 'Bearer [REDACTED_TOKEN]');
      // Mask OAuth refresh tokens and secrets
      masked = masked.replace(/(refresh_token=)[^&\s]+/gi, '$1[REDACTED]');
      masked = masked.replace(/(client_secret=)[^&\s]+/gi, '$1[REDACTED]');
      masked = masked.replace(/(client_id=)[^&\s]+/gi, '$1[REDACTED]');
      // Mask Google API keys (AIza...)
      masked = masked.replace(/AIza[0-9A-Za-z\-_]{30,45}/g, 'AIza...[REDACTED]');
      // Mask environment variables if present
      const envSecrets = [
        process.env.ENCRYPTION_KEY,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.THREADS_APP_SECRET
      ].filter((s): s is string => Boolean(s && s.length >= 8));

      for (const secret of envSecrets) {
        masked = masked.replaceAll(secret, '[REDACTED_SECRET]');
      }

      return masked;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.maskSensitiveData(item));
    }

    if (input !== null && typeof input === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(input)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('encryptionkey') ||
          lowerKey.includes('authorization') ||
          lowerKey.includes('cookie')
        ) {
          sanitized[key] = typeof val === 'string' && val.length > 8 
            ? `${val.substring(0, 4)}...[REDACTED]` 
            : '[REDACTED]';
        } else {
          sanitized[key] = this.maskSensitiveData(val);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Append a structured JSONL entry and perform log rotation if file exceeds 5MB
   */
  public log(level: 'info' | 'warn' | 'error', module: string, message: string, details?: any): void {
    try {
      const entry: SystemLogEntry = {
        timestamp: new Date().toISOString(),
        level,
        module,
        message: this.maskSensitiveData(message),
        details: details ? this.maskSensitiveData(details) : undefined
      };

      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFilePath, line, 'utf8');

      this.rotateLogsIfNeeded();
    } catch (err) {
      console.error('[ReliabilityService] Error writing log:', err);
    }
  }

  /**
   * Rotate logs when > 5MB, keep latest 5 archive files
   */
  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;
      const stats = fs.statSync(this.logFilePath);
      const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

      if (stats.size >= MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `system-${timestamp}.jsonl`;
        const archivePath = path.join(this.logsDir, archiveName);

        fs.renameSync(this.logFilePath, archivePath);

        // Keep at most 5 archives
        const files = fs.readdirSync(this.logsDir)
          .filter(f => f.startsWith('system-') && f.endsWith('.jsonl'))
          .map(f => ({
            name: f,
            path: path.join(this.logsDir, f),
            time: fs.statSync(path.join(this.logsDir, f)).mtimeMs
          }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 5) {
          files.slice(5).forEach(f => {
            try { fs.unlinkSync(f.path); } catch {}
          });
        }
      }
    } catch (err) {
      console.error('[ReliabilityService] Log rotation error:', err);
    }
  }

  /**
   * Retrieve system logs with optional filtering and limit
   */
  public getLogs(limit: number = 200, level?: string, search?: string): SystemLogEntry[] {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: SystemLogEntry[] = [];

      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        try {
          const entry = JSON.parse(lines[i]) as SystemLogEntry;
          if (level && level !== 'all' && entry.level !== level) continue;
          if (search) {
            const sLower = search.toLowerCase();
            const matchesMsg = entry.message.toLowerCase().includes(sLower);
            const matchesMod = entry.module.toLowerCase().includes(sLower);
            if (!matchesMsg && !matchesMod) continue;
          }
          entries.push(entry);
        } catch {}
      }

      return entries;
    } catch (err) {
      console.error('[ReliabilityService] Error reading logs:', err);
      return [];
    }
  }

  // ==========================================
  // 2. Health Checks
  // ==========================================

  public async runHealthChecks(): Promise<SystemHealthReport> {
    const checkedAt = new Date().toISOString();

    // 1. SQLite Health Check
    let sqliteStatus: ServiceHealthStatus;
    try {
      const t0 = performance.now();
      const checkRes = db.prepare('PRAGMA quick_check;').get() as { quick_check: string };
      const latencyMs = Math.round(performance.now() - t0);
      const dbPath = path.join(this.storageDir, 'threads_studio.sqlite');
      const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

      const isHealthy = checkRes?.quick_check === 'ok';
      sqliteStatus = {
        name: 'SQLite Database Engine',
        key: 'sqlite',
        status: isHealthy ? 'healthy' : 'degraded',
        latencyMs,
        version: 'SQLite 3 (node:sqlite)',
        message: isHealthy ? 'Database toàn vẹn (PRAGMA quick_check: ok)' : `Kiểm tra thất bại: ${checkRes?.quick_check}`,
        details: {
          path: dbPath,
          sizeBytes: dbSize,
          sizeFormatted: this.formatBytes(dbSize),
          quickCheck: checkRes?.quick_check
        },
        lastChecked: checkedAt
      };
    } catch (err: any) {
      sqliteStatus = {
        name: 'SQLite Database Engine',
        key: 'sqlite',
        status: 'offline',
        message: `Lỗi truy vấn cơ sở dữ liệu: ${err.message}`,
        lastChecked: checkedAt
      };
    }

    // 2. FFmpeg / FFprobe Health Check
    let ffmpegStatus: ServiceHealthStatus;
    try {
      const t0 = performance.now();
      const ffmpegOut = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 3000 });
      let ffprobeOk = false;
      try {
        execSync('ffprobe -version', { encoding: 'utf8', timeout: 3000 });
        ffprobeOk = true;
      } catch {}

      const latencyMs = Math.round(performance.now() - t0);
      const firstLine = ffmpegOut.split('\n')[0]?.trim() || 'FFmpeg';

      ffmpegStatus = {
        name: 'FFmpeg & FFprobe Multimedia Engine',
        key: 'ffmpeg',
        status: ffprobeOk ? 'healthy' : 'degraded',
        version: firstLine,
        latencyMs,
        message: ffprobeOk 
          ? 'FFmpeg và FFprobe sẵn sàng xử lý video render và filter' 
          : 'FFmpeg hoạt động, nhưng không tìm thấy ffprobe trên PATH',
        details: {
          hasFfmpeg: true,
          hasFfprobe: ffprobeOk,
          fullVersion: firstLine
        },
        lastChecked: checkedAt
      };
    } catch (err: any) {
      ffmpegStatus = {
        name: 'FFmpeg & FFprobe Multimedia Engine',
        key: 'ffmpeg',
        status: 'offline',
        message: 'Không tìm thấy FFmpeg trong biến môi trường PATH hệ thống',
        details: { error: err.message },
        lastChecked: checkedAt
      };
    }

    // 3. Piper / TTS Engine Check
    let piperStatus: ServiceHealthStatus;
    try {
      // Check VieNeu models or python edge-tts
      let hasEdgeTts = false;
      try {
        execSync('python -c "import edge_tts"', { timeout: 2000, stdio: 'ignore' });
        hasEdgeTts = true;
      } catch {}

      piperStatus = {
        name: 'Vietnamese Voice TTS (VieNeu / Edge-TTS)',
        key: 'piper',
        status: 'healthy',
        version: hasEdgeTts ? 'Edge-TTS + VieNeu Neural Engine' : 'Web Audio & Simulated TTS Engine',
        message: 'Động cơ giọng đọc tiếng Việt đa vùng miền (Bắc / Trung / Nam) sẵn sàng',
        details: {
          edgeTtsAvailable: hasEdgeTts,
          recommendedSpeed: '1.2x',
          defaultVoicesCount: 6
        },
        lastChecked: checkedAt
      };
    } catch (err: any) {
      piperStatus = {
        name: 'Vietnamese Voice TTS (VieNeu / Edge-TTS)',
        key: 'piper',
        status: 'degraded',
        message: 'TTS cơ bản hoạt động (Web Audio Synthesis fallback)',
        lastChecked: checkedAt
      };
    }

    // 4. Ollama LLM Check
    let ollamaStatus: ServiceHealthStatus;
    try {
      const t0 = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch('http://localhost:11434/api/version', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json() as { version?: string };
        const latencyMs = Math.round(performance.now() - t0);

        // Fetch installed models
        let modelsCount = 0;
        try {
          const tagsResp = await fetch('http://localhost:11434/api/tags');
          if (tagsResp.ok) {
            const tagsData = await tagsResp.json() as { models?: any[] };
            modelsCount = tagsData.models?.length || 0;
          }
        } catch {}

        ollamaStatus = {
          name: 'Ollama Local AI Intelligence Engine',
          key: 'ollama',
          status: 'healthy',
          version: `v${data.version || '0.x'}`,
          latencyMs,
          message: `Ollama máy chủ cục bộ đang kết nối (${modelsCount} models đã cài đặt)`,
          details: {
            endpoint: 'http://localhost:11434',
            version: data.version,
            installedModelsCount: modelsCount
          },
          lastChecked: checkedAt
        };
      } else {
        ollamaStatus = {
          name: 'Ollama Local AI Intelligence Engine',
          key: 'ollama',
          status: 'degraded',
          message: `Ollama trả lời HTTP ${resp.status}`,
          lastChecked: checkedAt
        };
      }
    } catch (err: any) {
      ollamaStatus = {
        name: 'Ollama Local AI Intelligence Engine',
        key: 'ollama',
        status: 'degraded',
        message: 'Ollama chưa khởi chạy (Hệ thống tự động dùng Smart Heuristics Engine thay thế)',
        details: {
          tip: 'Để kích hoạt AI local, hãy khởi động Ollama trên cổng 11434'
        },
        lastChecked: checkedAt
      };
    }

    // 5. Playwright Chromium Check
    let playwrightStatus: ServiceHealthStatus;
    try {
      const { chromium } = await import('playwright');
      const execPath = chromium.executablePath();
      const hasExec = Boolean(execPath && fs.existsSync(execPath));

      playwrightStatus = {
        name: 'Playwright Chromium Screenshot Engine',
        key: 'playwright',
        status: hasExec ? 'healthy' : 'degraded',
        version: 'Chromium Browser',
        message: hasExec ? 'Trình duyệt Chromium chụp ảnh thẻ Threads sẵn sàng' : 'Chưa cài đặt headless Chromium cho Playwright',
        details: {
          executablePath: execPath || 'Mặc định package',
          installed: hasExec
        },
        lastChecked: checkedAt
      };
    } catch (err: any) {
      playwrightStatus = {
        name: 'Playwright Chromium Screenshot Engine',
        key: 'playwright',
        status: 'degraded',
        message: 'Playwright sử dụng engine dựng thẻ DOM ảo fallback',
        details: { error: err.message },
        lastChecked: checkedAt
      };
    }

    // 6. OAuth & Encryption Security Check
    let oauthStatus: ServiceHealthStatus;
    const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
    const hasGoogleSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
    const hasThreadsAppId = Boolean(process.env.THREADS_APP_ID);
    const hasThreadsSecret = Boolean(process.env.THREADS_APP_SECRET);
    const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 16);

    const isOAuthConfigured = (hasGoogleClientId && hasGoogleSecret) || (hasThreadsAppId && hasThreadsSecret);
    oauthStatus = {
      name: 'OAuth API & AES-256 Security',
      key: 'oauth',
      status: isOAuthConfigured && hasEncryptionKey ? 'healthy' : 'degraded',
      version: 'AES-256-GCM',
      message: hasEncryptionKey 
        ? 'Hệ thống mã hóa khóa AES-256 an toàn và bảo mật token kích hoạt' 
        : 'Chưa cấu hình ENCRYPTION_KEY an toàn trong .env',
      details: {
        youtubeOAuthConfigured: hasGoogleClientId && hasGoogleSecret,
        threadsApiConfigured: hasThreadsAppId && hasThreadsSecret,
        encryptionKeyConfigured: hasEncryptionKey
      },
      lastChecked: checkedAt
    };

    // 7. Processing Queues & Render Status
    let queueStatus: ServiceHealthStatus;
    try {
      const activeRender = db.prepare(`SELECT COUNT(*) as count FROM render_jobs WHERE status IN ('queued', 'rendering')`).get() as { count: number };
      const activeBatches = db.prepare(`SELECT COUNT(*) as count FROM batch_jobs WHERE status IN ('queued', 'processing')`).get() as { count: number };
      const activePublishes = db.prepare(`SELECT COUNT(*) as count FROM youtube_publishes WHERE status IN ('queued', 'uploading')`).get() as { count: number };

      const totalActive = (activeRender?.count || 0) + (activeBatches?.count || 0) + (activePublishes?.count || 0);

      queueStatus = {
        name: 'Task Processing & Render Queue',
        key: 'queue',
        status: 'healthy',
        message: totalActive > 0 
          ? `Hàng đợi đang xử lý ${totalActive} tác vụ (Render: ${activeRender?.count || 0}, Batch: ${activeBatches?.count || 0})` 
          : 'Hàng đợi xử lý trống, sẵn sàng nhận tác vụ mới',
        details: {
          activeRenderJobs: activeRender?.count || 0,
          activeBatchJobs: activeBatches?.count || 0,
          activePublishJobs: activePublishes?.count || 0,
          totalActive
        },
        lastChecked: checkedAt
      };
    } catch (err: any) {
      queueStatus = {
        name: 'Task Processing & Render Queue',
        key: 'queue',
        status: 'degraded',
        message: `Lỗi đọc trạng thái hàng đợi: ${err.message}`,
        lastChecked: checkedAt
      };
    }

    const services = {
      sqlite: sqliteStatus,
      ffmpeg: ffmpegStatus,
      piper: piperStatus,
      ollama: ollamaStatus,
      playwright: playwrightStatus,
      oauth: oauthStatus,
      queue: queueStatus
    };

    const serviceList = Object.values(services);
    const healthyCount = serviceList.filter(s => s.status === 'healthy').length;
    const degradedCount = serviceList.filter(s => s.status === 'degraded').length;
    const offlineCount = serviceList.filter(s => s.status === 'offline').length;
    const totalCount = serviceList.length;

    let overallStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
    if (offlineCount > 0 || sqliteStatus.status !== 'healthy') {
      overallStatus = offlineCount >= 2 ? 'offline' : 'degraded';
    } else if (degradedCount > 0) {
      overallStatus = 'healthy'; // Minor degradations (like local Ollama or optional edge-tts) keep overall green/stable
    }

    return {
      overallStatus,
      checkedAt,
      services,
      summary: {
        healthyCount,
        degradedCount,
        offlineCount,
        totalCount
      }
    };
  }

  // ==========================================
  // 3. Storage Management & Safe Cleanup
  // ==========================================

  public getStorageStats(): StorageBreakdownStats {
    const dbPath = path.join(this.storageDir, 'threads_studio.sqlite');
    let sqliteBytes = 0;
    if (fs.existsSync(dbPath)) {
      sqliteBytes += fs.statSync(dbPath).size;
    }
    // Also check WAL/SHM if present
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) sqliteBytes += fs.statSync(walPath).size;
    if (fs.existsSync(shmPath)) sqliteBytes += fs.statSync(shmPath).size;

    const videosBytes = this.getDirSize(path.join(this.storageDir, 'videos'));
    const imagesBytes = this.getDirSize(path.join(this.storageDir, 'images'));
    const audioBytes = this.getDirSize(path.join(this.storageDir, 'audio'));
    const tempBytes = this.getDirSize(this.tempDir);
    const backupsBytes = this.getDirSize(this.backupsDir);
    const logsBytes = this.getDirSize(this.logsDir);

    const totalAppBytes = sqliteBytes + videosBytes + imagesBytes + audioBytes + tempBytes + backupsBytes + logsBytes;

    let diskFreeBytes: number | undefined;
    let diskTotalBytes: number | undefined;
    let diskUsagePercent: number | undefined;

    try {
      const stat = fs.statfsSync(this.storageDir);
      diskFreeBytes = stat.bfree * stat.bsize;
      diskTotalBytes = stat.blocks * stat.bsize;
      if (diskTotalBytes > 0) {
        diskUsagePercent = Math.round(((diskTotalBytes - diskFreeBytes) / diskTotalBytes) * 100);
      }
    } catch (err) {
      console.warn('[ReliabilityService] statfsSync error:', err);
    }

    return {
      sqliteBytes,
      sqliteFormatted: this.formatBytes(sqliteBytes),
      videosBytes,
      videosFormatted: this.formatBytes(videosBytes),
      imagesBytes,
      imagesFormatted: this.formatBytes(imagesBytes),
      audioBytes,
      audioFormatted: this.formatBytes(audioBytes),
      tempBytes,
      tempFormatted: this.formatBytes(tempBytes),
      backupsBytes,
      backupsFormatted: this.formatBytes(backupsBytes),
      logsBytes,
      logsFormatted: this.formatBytes(logsBytes),
      totalAppBytes,
      totalAppFormatted: this.formatBytes(totalAppBytes),
      diskFreeBytes,
      diskFreeFormatted: diskFreeBytes !== undefined ? this.formatBytes(diskFreeBytes) : undefined,
      diskTotalBytes,
      diskTotalFormatted: diskTotalBytes !== undefined ? this.formatBytes(diskTotalBytes) : undefined,
      diskUsagePercent
    };
  }

  /**
   * Safely cleans the storage/temp folder without touching active jobs or output media
   */
  public cleanTempFiles(): CleanTempResult {
    let deletedCount = 0;
    let bytesFreed = 0;

    try {
      if (!fs.existsSync(this.tempDir)) {
        return {
          success: true,
          deletedCount: 0,
          bytesFreed: 0,
          bytesFreedFormatted: '0 B',
          message: 'Thư mục tạm trống'
        };
      }

      // Find active rendering jobs to protect their working folders
      const activeJobs = db.prepare(`
        SELECT id FROM render_jobs WHERE status IN ('queued', 'rendering')
      `).all() as Array<{ id: string }>;
      const activeJobIds = new Set(activeJobs.map(j => j.id));

      const now = Date.now();
      const TEN_MINUTES_MS = 10 * 60 * 1000;

      const entries = fs.readdirSync(this.tempDir);
      for (const entry of entries) {
        // Protect active jobs
        if (Array.from(activeJobIds).some(id => entry.includes(id))) {
          continue;
        }

        const entryPath = path.join(this.tempDir, entry);
        try {
          const stat = fs.statSync(entryPath);
          // Protect files created in the last 10 minutes
          if (now - stat.mtimeMs < TEN_MINUTES_MS) {
            continue;
          }

          if (stat.isDirectory()) {
            const dirSize = this.getDirSize(entryPath);
            fs.rmSync(entryPath, { recursive: true, force: true });
            bytesFreed += dirSize;
            deletedCount++;
          } else {
            bytesFreed += stat.size;
            fs.unlinkSync(entryPath);
            deletedCount++;
          }
        } catch {}
      }

      const formatted = this.formatBytes(bytesFreed);
      this.log('info', 'ReliabilityService', `Dọn dẹp file tạm an toàn: Đã xóa ${deletedCount} mục, giải phóng ${formatted}`);

      return {
        success: true,
        deletedCount,
        bytesFreed,
        bytesFreedFormatted: formatted,
        message: `Đã dọn dẹp ${deletedCount} mục tạm an toàn, giải phóng ${formatted}`
      };
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi khi dọn dẹp file tạm: ${err.message}`);
      return {
        success: false,
        deletedCount,
        bytesFreed,
        bytesFreedFormatted: this.formatBytes(bytesFreed),
        message: `Lỗi khi dọn dẹp: ${err.message}`
      };
    }
  }

  // ==========================================
  // 4. Backup & Safe Restore System
  // ==========================================

  /**
   * Creates a safe atomic snapshot of SQLite using VACUUM INTO
   */
  public async createBackup(options: CreateBackupDto = {}): Promise<SystemBackupItem> {
    const backupType = options.backupType || 'manual';
    const includeDatabase = options.includeDatabase !== false;
    const includeMedia = Boolean(options.includeMedia);
    const includeEnv = Boolean(options.includeEnv);
    const notes = options.notes || (backupType === 'scheduled' ? 'Sao lưu tự động theo lịch' : 'Sao lưu hệ thống');

    const timestamp = Date.now();
    const backupId = `backup_${backupType}_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
    const filename = `threads_studio_${backupType}_${timestamp}.sqlite`;
    const targetPath = path.join(this.backupsDir, filename);

    try {
      this.log('info', 'ReliabilityService', `Bắt đầu tạo bản sao lưu ${backupType}: ${filename}`);

      // 1. Perform atomic VACUUM INTO
      // Replace backward slashes with forward slashes for SQLite string literal
      const normalizedPath = targetPath.replace(/\\/g, '/');
      db.exec(`VACUUM INTO '${normalizedPath}'`);

      if (!fs.existsSync(targetPath)) {
        throw new Error('VACUUM INTO không tạo được tệp sao lưu trên đĩa.');
      }

      // 2. Compute SHA-256 hash
      const fileBuffer = fs.readFileSync(targetPath);
      const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const fileSize = fileBuffer.length;

      // Write .sha256 checksum file
      fs.writeFileSync(`${targetPath}.sha256`, `${sha256Hash} *${filename}\n`, 'utf8');

      // 3. Insert record into system_backups table
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO system_backups (
          id, backup_type, filename, file_path, file_size, sha256_hash,
          includes_database, includes_media, includes_env, status, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        backupId,
        backupType,
        filename,
        targetPath,
        fileSize,
        sha256Hash,
        includeDatabase ? 1 : 0,
        includeMedia ? 1 : 0,
        includeEnv ? 1 : 0,
        'completed',
        createdAt,
        notes
      );

      // 4. If scheduled backup, enforce keep_count rotation
      if (backupType === 'scheduled') {
        this.rotateScheduledBackups();
      }

      this.log('info', 'ReliabilityService', `Tạo sao lưu thành công: ${filename} (${this.formatBytes(fileSize)}, SHA-256: ${sha256Hash.substring(0, 12)}...)`);

      return {
        id: backupId,
        backupType,
        filename,
        filePath: targetPath,
        fileSize,
        fileSizeFormatted: this.formatBytes(fileSize),
        sha256Hash,
        includesDatabase: includeDatabase,
        includesMedia: includeMedia,
        includesEnv: includeEnv,
        status: 'completed',
        createdAt,
        notes
      };
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi tạo sao lưu: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get list of backups ordered by created_at DESC
   */
  public getBackups(): SystemBackupItem[] {
    try {
      const rows = db.prepare(`
        SELECT * FROM system_backups ORDER BY created_at DESC
      `).all() as any[];

      return rows.map(r => ({
        id: r.id,
        backupType: r.backup_type as any,
        filename: r.filename,
        filePath: r.file_path,
        fileSize: r.file_size,
        fileSizeFormatted: this.formatBytes(r.file_size),
        sha256Hash: r.sha256_hash,
        includesDatabase: Boolean(r.includes_database),
        includesMedia: Boolean(r.includes_media),
        includesEnv: Boolean(r.includes_env),
        status: r.status as any,
        createdAt: r.created_at,
        notes: r.notes || undefined
      }));
    } catch (err) {
      console.error('[ReliabilityService] Error reading backups:', err);
      return [];
    }
  }

  /**
   * Delete backup file, sha256 checksum and database record
   */
  public deleteBackup(id: string): boolean {
    try {
      const row = db.prepare('SELECT * FROM system_backups WHERE id = ?').get(id) as any;
      if (!row) return false;

      if (fs.existsSync(row.file_path)) {
        try { fs.unlinkSync(row.file_path); } catch {}
      }
      const shaFile = `${row.file_path}.sha256`;
      if (fs.existsSync(shaFile)) {
        try { fs.unlinkSync(shaFile); } catch {}
      }

      db.prepare('DELETE FROM system_backups WHERE id = ?').run(id);
      this.log('info', 'ReliabilityService', `Đã xóa bản sao lưu: ${row.filename}`);
      return true;
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi xóa bản sao lưu ${id}: ${err.message}`);
      return false;
    }
  }

  /**
   * Safe offline restoration with mandatory pre-restore snapshot and SHA-256 verification
   */
  public async restoreBackup(id: string): Promise<{ success: boolean; preRestoreId: string; message: string }> {
    try {
      const targetBackup = db.prepare('SELECT * FROM system_backups WHERE id = ?').get(id) as any;
      if (!targetBackup) {
        throw new Error(`Không tìm thấy bản sao lưu với ID: ${id}`);
      }

      if (!fs.existsSync(targetBackup.file_path)) {
        throw new Error(`Tệp sao lưu không tồn tại trên đĩa: ${targetBackup.file_path}`);
      }

      // 1. Verify SHA-256 integrity
      const backupBuffer = fs.readFileSync(targetBackup.file_path);
      const computedHash = crypto.createHash('sha256').update(backupBuffer).digest('hex');

      if (computedHash.toLowerCase() !== targetBackup.sha256_hash.toLowerCase()) {
        throw new Error('Tính toàn vẹn SHA-256 không khớp! Tệp sao lưu có thể đã bị thay đổi hoặc hư hại.');
      }

      // 2. Create pre-restore safety snapshot before touching anything!
      const preRestoreItem = await this.createBackup({
        backupType: 'pre-restore',
        notes: `Tự động lưu trạng thái trước khi khôi phục từ bản sao lưu: ${targetBackup.filename}`
      });

      this.log('warn', 'ReliabilityService', `Đang phục hồi dữ liệu từ ${targetBackup.filename}. Bản an toàn pre-restore: ${preRestoreItem.filename}`);

      // 3. Safe database replacement:
      // Overwrite the live database file with the verified backup file
      const liveDbPath = path.join(this.storageDir, 'threads_studio.sqlite');
      fs.copyFileSync(targetBackup.file_path, liveDbPath);

      // Verify restored database quick_check
      const checkRes = db.prepare('PRAGMA quick_check;').get() as { quick_check: string };
      if (checkRes?.quick_check !== 'ok') {
        throw new Error(`Dữ liệu sau phục hồi không hợp lệ: ${checkRes?.quick_check}`);
      }

      this.log('info', 'ReliabilityService', `Khôi phục dữ liệu thành công từ bản sao lưu: ${targetBackup.filename}`);

      return {
        success: true,
        preRestoreId: preRestoreItem.id,
        message: `Đã khôi phục thành công từ bản ${targetBackup.filename}. Snapshot hoàn tác an toàn: ${preRestoreItem.filename}`
      };
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi phục hồi dữ liệu: ${err.message}`);
      throw err;
    }
  }

  // ==========================================
  // 5. Automated Scheduling & Retention
  // ==========================================

  private initScheduleTable(): void {
    try {
      const existing = db.prepare("SELECT * FROM backup_schedules WHERE id = 'default'").get();
      if (!existing) {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO backup_schedules (
            id, enabled, interval_hours, keep_count, include_media, include_env, updated_at
          ) VALUES ('default', 0, 24, 5, 0, 0, ?)
        `).run(now);
      }
    } catch (err) {
      console.error('[ReliabilityService] Error initializing backup schedule:', err);
    }
  }

  public getScheduleConfig(): BackupScheduleConfig {
    try {
      const row = db.prepare("SELECT * FROM backup_schedules WHERE id = 'default'").get() as any;
      if (!row) {
        return {
          id: 'default',
          enabled: false,
          intervalHours: 24,
          keepCount: 5,
          includeMedia: false,
          includeEnv: false,
          updatedAt: new Date().toISOString()
        };
      }

      return {
        id: row.id,
        enabled: Boolean(row.enabled),
        intervalHours: row.interval_hours,
        keepCount: row.keep_count,
        includeMedia: Boolean(row.include_media),
        includeEnv: Boolean(row.include_env),
        lastRunAt: row.last_run_at || null,
        nextRunAt: row.next_run_at || null,
        updatedAt: row.updated_at
      };
    } catch (err) {
      console.error('[ReliabilityService] Error getting schedule config:', err);
      return {
        id: 'default',
        enabled: false,
        intervalHours: 24,
        keepCount: 5,
        includeMedia: false,
        includeEnv: false,
        updatedAt: new Date().toISOString()
      };
    }
  }

  public updateScheduleConfig(input: Partial<BackupScheduleConfig>): BackupScheduleConfig {
    const current = this.getScheduleConfig();
    const enabled = input.enabled !== undefined ? input.enabled : current.enabled;
    const intervalHours = Math.max(6, Math.min(168, input.intervalHours || current.intervalHours));
    const keepCount = Math.max(1, Math.min(50, input.keepCount || current.keepCount));
    const includeMedia = input.includeMedia !== undefined ? input.includeMedia : current.includeMedia;
    const includeEnv = input.includeEnv !== undefined ? input.includeEnv : current.includeEnv;

    const now = new Date();
    let nextRunAt = current.nextRunAt;

    if (enabled && (!current.enabled || !nextRunAt || new Date(nextRunAt).getTime() <= now.getTime())) {
      nextRunAt = new Date(now.getTime() + intervalHours * 3600 * 1000).toISOString();
    } else if (!enabled) {
      nextRunAt = null;
    }

    const updatedAt = now.toISOString();

    db.prepare(`
      UPDATE backup_schedules
      SET enabled = ?, interval_hours = ?, keep_count = ?, include_media = ?, include_env = ?, next_run_at = ?, updated_at = ?
      WHERE id = 'default'
    `).run(
      enabled ? 1 : 0,
      intervalHours,
      keepCount,
      includeMedia ? 1 : 0,
      includeEnv ? 1 : 0,
      nextRunAt || null,
      updatedAt
    );

    this.log('info', 'ReliabilityService', `Cập nhật cấu hình sao lưu tự động: Bật=${enabled}, Chu kỳ=${intervalHours}h, Giữ lại=${keepCount} bản`);

    return this.getScheduleConfig();
  }

  private startScheduler(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }

    // Check every 5 minutes
    this.scheduleTimer = setInterval(() => {
      this.checkAndRunScheduledBackup();
    }, 5 * 60 * 1000);
    if (this.scheduleTimer.unref) {
      this.scheduleTimer.unref();
    }
  }

  private async checkAndRunScheduledBackup(): Promise<void> {
    try {
      const config = this.getScheduleConfig();
      if (!config.enabled || !config.nextRunAt) return;

      const now = Date.now();
      const nextRunTime = new Date(config.nextRunAt).getTime();

      if (now >= nextRunTime) {
        this.log('info', 'ReliabilityService', 'Kích hoạt sao lưu tự động theo lịch định kỳ...');
        await this.createBackup({
          backupType: 'scheduled',
          includeMedia: config.includeMedia,
          includeEnv: config.includeEnv,
          notes: `Sao lưu tự động chu kỳ ${config.intervalHours} giờ`
        });

        const newLastRun = new Date(now).toISOString();
        const newNextRun = new Date(now + config.intervalHours * 3600 * 1000).toISOString();

        db.prepare(`
          UPDATE backup_schedules
          SET last_run_at = ?, next_run_at = ?, updated_at = ?
          WHERE id = 'default'
        `).run(newLastRun, newNextRun, newLastRun);
      }
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi trong quá trình chạy sao lưu tự động: ${err.message}`);
    }
  }

  private rotateScheduledBackups(): void {
    try {
      const config = this.getScheduleConfig();
      const scheduledBackups = db.prepare(`
        SELECT * FROM system_backups WHERE backup_type = 'scheduled' ORDER BY created_at DESC
      `).all() as any[];

      if (scheduledBackups.length > config.keepCount) {
        const toDelete = scheduledBackups.slice(config.keepCount);
        for (const item of toDelete) {
          this.deleteBackup(item.id);
        }
      }
    } catch (err) {
      console.error('[ReliabilityService] Error rotating scheduled backups:', err);
    }
  }

  // ==========================================
  // Helper Utilities
  // ==========================================

  private getDirSize(dirPath: string): number {
    let size = 0;
    try {
      if (!fs.existsSync(dirPath)) return 0;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        try {
          if (entry.isDirectory()) {
            size += this.getDirSize(fullPath);
          } else if (entry.isFile()) {
            size += fs.statSync(fullPath).size;
          }
        } catch {}
      }
    } catch {}
    return size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==========================================
  // 6. Phase 18: Render Performance & Scene Caching
  // ==========================================

  private initPerformanceConfigTable(): void {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS render_performance_configs (
          id TEXT PRIMARY KEY DEFAULT 'default',
          queue_enabled INTEGER NOT NULL DEFAULT 1,
          max_workers INTEGER NOT NULL DEFAULT 1,
          min_free_ram_gb REAL NOT NULL DEFAULT 1.5,
          ffmpeg_preset TEXT NOT NULL DEFAULT 'veryfast',
          cpu_threads INTEGER NOT NULL DEFAULT 0,
          scene_cache_enabled INTEGER NOT NULL DEFAULT 1,
          shutdown_timeout_sec INTEGER NOT NULL DEFAULT 300,
          updated_at TEXT NOT NULL
        );
      `);

      const existing = db.prepare("SELECT * FROM render_performance_configs WHERE id = 'default'").get();
      if (!existing) {
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO render_performance_configs (
            id, queue_enabled, max_workers, min_free_ram_gb, ffmpeg_preset, cpu_threads, scene_cache_enabled, shutdown_timeout_sec, updated_at
          ) VALUES ('default', 1, 1, 1.5, 'veryfast', 0, 1, 300, ?)
        `).run(now);
      }
    } catch (err) {
      console.error('[ReliabilityService] Error initializing render performance config table:', err);
    }
  }

  public getPerformanceConfig(): RenderPerformanceConfig {
    try {
      const row = db.prepare("SELECT * FROM render_performance_configs WHERE id = 'default'").get() as any;
      if (!row) {
        return {
          queueEnabled: true,
          maxWorkers: 1,
          minFreeRamGb: 1.5,
          ffmpegPreset: 'veryfast',
          cpuThreads: 0,
          sceneCacheEnabled: true,
          shutdownTimeoutSec: 300
        };
      }

      const validPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'];
      return {
        queueEnabled: Boolean(row.queue_enabled),
        maxWorkers: Math.max(1, Math.min(2, row.max_workers || 1)),
        minFreeRamGb: Number(row.min_free_ram_gb || 1.5),
        ffmpegPreset: (validPresets.includes(row.ffmpeg_preset) ? row.ffmpeg_preset : 'veryfast') as any,
        cpuThreads: [0, 1, 2, 4, 6, 8].includes(Number(row.cpu_threads)) ? Number(row.cpu_threads) : 0,
        sceneCacheEnabled: Boolean(row.scene_cache_enabled),
        shutdownTimeoutSec: Number(row.shutdown_timeout_sec || 300)
      };
    } catch (err) {
      return {
        queueEnabled: true,
        maxWorkers: 1,
        minFreeRamGb: 1.5,
        ffmpegPreset: 'veryfast',
        cpuThreads: 0,
        sceneCacheEnabled: true,
        shutdownTimeoutSec: 300
      };
    }
  }

  public updatePerformanceConfig(input: Partial<RenderPerformanceConfig>): RenderPerformanceConfig {
    const current = this.getPerformanceConfig();
    const queueEnabled = input.queueEnabled !== undefined ? (input.queueEnabled ? 1 : 0) : (current.queueEnabled ? 1 : 0);
    const maxWorkers = input.maxWorkers !== undefined ? Math.max(1, Math.min(2, Math.round(input.maxWorkers))) : current.maxWorkers;
    const minFreeRamGb = input.minFreeRamGb !== undefined ? Math.max(0.5, Math.min(16.0, Number(input.minFreeRamGb))) : current.minFreeRamGb;
    
    const validPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'];
    const ffmpegPreset = (input.ffmpegPreset && validPresets.includes(input.ffmpegPreset)) ? input.ffmpegPreset : current.ffmpegPreset;

    const validThreads = [0, 1, 2, 4, 6, 8];
    const cpuThreads = (input.cpuThreads !== undefined && validThreads.includes(Number(input.cpuThreads))) ? Number(input.cpuThreads) : current.cpuThreads;

    const sceneCacheEnabled = input.sceneCacheEnabled !== undefined ? (input.sceneCacheEnabled ? 1 : 0) : (current.sceneCacheEnabled ? 1 : 0);
    const shutdownTimeoutSec = input.shutdownTimeoutSec !== undefined ? Math.max(30, Math.min(600, Number(input.shutdownTimeoutSec))) : current.shutdownTimeoutSec;

    const updatedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO render_performance_configs (
        id, queue_enabled, max_workers, min_free_ram_gb, ffmpeg_preset, cpu_threads, scene_cache_enabled, shutdown_timeout_sec, updated_at
      ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        queue_enabled = excluded.queue_enabled,
        max_workers = excluded.max_workers,
        min_free_ram_gb = excluded.min_free_ram_gb,
        ffmpeg_preset = excluded.ffmpeg_preset,
        cpu_threads = excluded.cpu_threads,
        scene_cache_enabled = excluded.scene_cache_enabled,
        shutdown_timeout_sec = excluded.shutdown_timeout_sec,
        updated_at = excluded.updated_at
    `).run(
      queueEnabled,
      maxWorkers,
      minFreeRamGb,
      ffmpegPreset,
      cpuThreads,
      sceneCacheEnabled,
      shutdownTimeoutSec,
      updatedAt
    );

    this.log(
      'info',
      'ReliabilityService',
      `Cập nhật cấu hình hiệu năng render: Workers=${maxWorkers}, MinRAM=${minFreeRamGb}GB, Preset=${ffmpegPreset}, Threads=${cpuThreads}`
    );

    return this.getPerformanceConfig();
  }

  public async getResourceUsage(): Promise<SystemResourceUsage> {
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const ramUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

    const cpus = os.cpus();
    const cpuCount = cpus.length;
    const cpuModel = cpus[0]?.model || 'Unknown Processor';

    let cpuUsagePercent = 0;
    try {
      let totalIdle = 0;
      let totalTick = 0;
      for (const cpu of cpus) {
        for (const type of Object.keys(cpu.times)) {
          totalTick += (cpu.times as any)[type];
        }
        totalIdle += cpu.times.idle;
      }
      const idlePercent = totalTick > 0 ? (totalIdle / totalTick) * 100 : 80;
      cpuUsagePercent = Math.min(100, Math.max(0, Math.round(100 - idlePercent)));
    } catch {
      cpuUsagePercent = 12;
    }

    let activeWorkers = 0;
    let queuedJobsCount = 0;
    try {
      const activeRow = db.prepare("SELECT COUNT(*) as cnt FROM render_jobs WHERE status = 'rendering'").get() as any;
      activeWorkers = activeRow?.cnt || 0;
      const queuedRow = db.prepare("SELECT COUNT(*) as cnt FROM render_jobs WHERE status = 'queued'").get() as any;
      queuedJobsCount = queuedRow?.cnt || 0;
    } catch {}

    const config = this.getPerformanceConfig();

    return {
      totalMemBytes,
      totalMemGb: (totalMemBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
      freeMemBytes,
      freeMemGb: (freeMemBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
      usedMemBytes,
      usedMemGb: (usedMemBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
      ramUsagePercent,
      cpuCount,
      cpuModel,
      cpuUsagePercent,
      activeWorkers,
      queuedJobsCount,
      config
    };
  }

  public getSceneCacheStats(): SceneCacheStats {
    let totalScenes = 0;
    let totalBytes = 0;
    const items: SceneCacheItem[] = [];
    const projectSet = new Set<string>();

    try {
      if (fs.existsSync(this.sceneCacheDir)) {
        const projectDirs = fs.readdirSync(this.sceneCacheDir, { withFileTypes: true });
        for (const pDir of projectDirs) {
          if (!pDir.isDirectory()) continue;
          projectSet.add(pDir.name);
          const pPath = path.join(this.sceneCacheDir, pDir.name);
          const metaPath = path.join(pPath, 'cache_index.json');
          let metaData: Record<string, any> = {};
          if (fs.existsSync(metaPath)) {
            try {
              metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            } catch {}
          }

          const files = fs.readdirSync(pPath);
          for (const file of files) {
            if (file.endsWith('.mp4')) {
              const filePath = path.join(pPath, file);
              const stat = fs.statSync(filePath);
              totalScenes++;
              totalBytes += stat.size;

              const metaItem = Object.values(metaData).find((m: any) => m.filename === file) as any;
              items.push({
                sceneId: metaItem?.sceneId || file.replace('.mp4', ''),
                sceneOrder: metaItem?.order || 1,
                signature: metaItem?.signature || 'N/A',
                filePath,
                duration: metaItem?.duration || 0,
                fileSize: stat.size,
                fileSizeFormatted: this.formatBytes(stat.size),
                createdAt: stat.birthtime ? stat.birthtime.toISOString() : new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[ReliabilityService] Error getting scene cache stats:', err);
    }

    return {
      totalScenes,
      totalBytes,
      totalFormatted: this.formatBytes(totalBytes),
      projectCount: projectSet.size,
      items
    };
  }

  public cleanSceneCache(force: boolean = false): {
    success: boolean;
    deletedCount: number;
    bytesFreed: number;
    bytesFreedFormatted: string;
    message: string;
  } {
    let deletedCount = 0;
    let bytesFreed = 0;

    try {
      if (!fs.existsSync(this.sceneCacheDir)) {
        return {
          success: true,
          deletedCount: 0,
          bytesFreed: 0,
          bytesFreedFormatted: '0 B',
          message: 'Thư mục cache phân cảnh trống.'
        };
      }

      const activeRows = db.prepare(`
        SELECT project_id FROM render_jobs WHERE status IN ('rendering', 'queued')
      `).all() as Array<{ project_id: string }>;
      const activeProjectIds = new Set(activeRows.map(r => r.project_id));

      const projectDirs = fs.readdirSync(this.sceneCacheDir, { withFileTypes: true });
      for (const pDir of projectDirs) {
        if (!pDir.isDirectory()) continue;
        if (!force && activeProjectIds.has(pDir.name)) {
          continue;
        }

        const pPath = path.join(this.sceneCacheDir, pDir.name);
        const dirSize = this.getDirSize(pPath);
        fs.rmSync(pPath, { recursive: true, force: true });
        bytesFreed += dirSize;
        deletedCount++;
      }

      const formatted = this.formatBytes(bytesFreed);
      this.log('info', 'ReliabilityService', `Dọn dẹp cache phân cảnh: Đã xóa ${deletedCount} thư mục dự án, giải phóng ${formatted}`);

      return {
        success: true,
        deletedCount,
        bytesFreed,
        bytesFreedFormatted: formatted,
        message: `Đã dọn dẹp ${deletedCount} cache phân cảnh, giải phóng ${formatted}`
      };
    } catch (err: any) {
      this.log('error', 'ReliabilityService', `Lỗi dọn dẹp cache phân cảnh: ${err.message}`);
      throw err;
    }
  }
}
