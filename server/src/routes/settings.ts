import { Router } from 'express';
import path from 'path';
import { db } from '../db.js';
import { VideoService } from '../services/videoService.js';
import { getStorageDir } from '../storagePath.js';

const router = Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const ffmpegInfo = VideoService.getFFmpegPath();
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      settingsMap[r.key] = r.value;
    }

    res.json({
      success: true,
      settings: {
        ffmpegPath: settingsMap['ffmpegPath'] || ffmpegInfo.path,
        ffmpegDetected: ffmpegInfo.exists,
        storagePath: getStorageDir(),
        aiProvider: settingsMap['aiProvider'] || 'gemini',
        apiKey: settingsMap['apiKey'] ? '••••••••••••••••' : '',
        defaultVoice: settingsMap['defaultVoice'] || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)',
        autoSave: settingsMap['autoSave'] !== 'false'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings
router.post('/', (req, res) => {
  try {
    const { ffmpegPath, aiProvider, apiKey, defaultVoice, autoSave } = req.body;

    const upsertSetting = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    if (ffmpegPath !== undefined) upsertSetting.run('ffmpegPath', ffmpegPath);
    if (aiProvider !== undefined) upsertSetting.run('aiProvider', aiProvider);
    if (apiKey !== undefined && apiKey !== '••••••••••••••••') upsertSetting.run('apiKey', apiKey);
    if (defaultVoice !== undefined) upsertSetting.run('defaultVoice', defaultVoice);
    if (autoSave !== undefined) upsertSetting.run('autoSave', String(autoSave));

    res.json({ success: true, message: 'Đã cập nhật cấu hình hệ thống' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
