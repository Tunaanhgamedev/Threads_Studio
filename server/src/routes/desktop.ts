import { Router, Request, Response } from 'express';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getStorageConfig, setCustomStorageDir } from '../storagePath.js';
import { db } from '../db.js';
import { ReliabilityService } from '../services/reliabilityService.js';

export const desktopRouter = Router();

let piperProcess: any = null;
let ollamaProcess: any = null;

// 1. Status overview
desktopRouter.get('/status', (req: Request, res: Response) => {
  const storageConfig = getStorageConfig();

  res.json({
    success: true,
    data: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      port: 3210,
      storageDir: storageConfig.storageDir,
      isCustomStorageDir: storageConfig.isCustom,
      configFilePath: storageConfig.configFilePath,
      deepLinkProtocol: 'threads-studio://',
      deepLinkActive: true
    }
  });
});

// 2. Services Status (Piper & Ollama)
desktopRouter.get('/services', async (req: Request, res: Response) => {
  let piperRunning = false;
  let piperDetails: any = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const resp = await fetch('http://localhost:5000/health', { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      piperRunning = true;
      piperDetails = await resp.json();
    }
  } catch {}

  let ollamaRunning = false;
  let ollamaDetails: any = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const resp = await fetch('http://localhost:11434/api/version', { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      ollamaRunning = true;
      ollamaDetails = await resp.json();
    }
  } catch {}

  res.json({
    success: true,
    data: {
      piper: {
        running: piperRunning,
        port: 5000,
        url: 'http://localhost:5000',
        details: piperDetails
      },
      ollama: {
        running: ollamaRunning,
        port: 11434,
        url: 'http://localhost:11434',
        details: ollamaDetails
      }
    }
  });
});

// 3. Piper Management (Start / Stop)
desktopRouter.post('/services/piper', async (req: Request, res: Response) => {
  const { action } = req.body; // 'start' | 'stop'

  if (action === 'start') {
    try {
      // Find piper-server.js
      const candidates = [
        path.resolve(process.cwd(), 'piper-server.js'),
        path.resolve(process.cwd(), '../piper-server.js')
      ];
      const piperScript = candidates.find(c => fs.existsSync(c));

      if (!piperScript) {
        return res.status(400).json({
          success: false,
          error: 'Không tìm thấy tệp piper-server.js trong thư mục dự án.'
        });
      }

      if (piperProcess) {
        try { piperProcess.kill(); } catch {}
      }

      piperProcess = spawn('node', [piperScript], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(piperScript)
      });
      piperProcess.unref();

      ReliabilityService.getInstance().log('info', 'DesktopManager', 'Đã khởi động Piper TTS Server trên cổng 5000');

      return res.json({
        success: true,
        message: 'Đã gửi lệnh khởi động Piper TTS Server'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Lỗi khởi động Piper: ${err.message}`
      });
    }
  }

  if (action === 'stop') {
    try {
      if (piperProcess) {
        try { piperProcess.kill(); } catch {}
        piperProcess = null;
      }

      // Also kill on Windows port 5000 if needed
      try {
        if (process.platform === 'win32') {
          execSync('powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { timeout: 3000 });
        }
      } catch {}

      ReliabilityService.getInstance().log('info', 'DesktopManager', 'Đã dừng Piper TTS Server');

      return res.json({
        success: true,
        message: 'Đã dừng Piper TTS Server'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Lỗi dừng Piper: ${err.message}`
      });
    }
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ (hỗ trợ "start" hoặc "stop")' });
});

// 4. Ollama Management (Start / Stop)
desktopRouter.post('/services/ollama', async (req: Request, res: Response) => {
  const { action } = req.body; // 'start' | 'stop'

  if (action === 'start') {
    try {
      if (ollamaProcess) {
        try { ollamaProcess.kill(); } catch {}
      }

      ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      ollamaProcess.unref();

      ReliabilityService.getInstance().log('info', 'DesktopManager', 'Đã gửi lệnh khởi động Ollama AI (ollama serve)');

      return res.json({
        success: true,
        message: 'Đã gửi lệnh khởi động Ollama AI'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Không thể khởi động Ollama: ${err.message}. Đảm bảo Ollama đã được cài đặt.`
      });
    }
  }

  if (action === 'stop') {
    try {
      if (ollamaProcess) {
        try { ollamaProcess.kill(); } catch {}
        ollamaProcess = null;
      }

      try {
        if (process.platform === 'win32') {
          execSync('taskkill /F /IM ollama.exe /T', { timeout: 3000 });
        }
      } catch {}

      ReliabilityService.getInstance().log('info', 'DesktopManager', 'Đã dừng dịch vụ Ollama AI');

      return res.json({
        success: true,
        message: 'Đã dừng dịch vụ Ollama AI'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Lỗi dừng Ollama: ${err.message}`
      });
    }
  }

  res.status(400).json({ success: false, error: 'Hành động không hợp lệ' });
});

// 5. Change Storage Directory (e.g. Move to Drive D/E)
desktopRouter.post('/change-storage-dir', async (req: Request, res: Response) => {
  const { newDir, copyData = true } = req.body;

  if (!newDir || typeof newDir !== 'string' || !newDir.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ mới hợp lệ.'
    });
  }

  try {
    const result = await setCustomStorageDir(newDir.trim(), Boolean(copyData));
    ReliabilityService.getInstance().log('info', 'DesktopManager', `Đã chuyển đổi vị trí lưu trữ sang: ${result.newDir}`);

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi thay đổi thư mục lưu trữ'
    });
  }
});

// 6. Safe Shutdown Endpoint (Cleanly called on desktop window close)
desktopRouter.post('/shutdown', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Đang tiến hành đóng an toàn hệ thống Threads Content Studio...'
  });

  setTimeout(() => {
    try {
      console.log('[Desktop] Graceful shutdown requested...');
      ReliabilityService.getInstance().log('info', 'DesktopManager', 'Đóng an toàn hệ thống theo yêu cầu ứng dụng Desktop');
      
      // Close SQLite database cleanly
      try {
        db.close();
      } catch {}

      process.exit(0);
    } catch {
      process.exit(0);
    }
  }, 400);
});
