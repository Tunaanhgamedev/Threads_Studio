import { Router } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = Router();

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

// POST /api/media/browse-folder - Open native Windows FolderBrowserDialog
router.post('/browse-folder', (req, res) => {
  const { initialPath, title } = req.body || {};
  const promptTitle = title || 'Chọn thư mục chứa Video hoặc Âm thanh';
  
  // Clean initialPath
  let cleanStartDir = '';
  if (initialPath && typeof initialPath === 'string') {
    const candidate = initialPath.trim().replace(/\//g, '\\');
    if (fs.existsSync(candidate)) {
      cleanStartDir = candidate.replace(/'/g, "''");
    }
  }

  const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '${promptTitle.replace(/'/g, "''")}'
$dialog.ShowNewFolderButton = $true
if ('${cleanStartDir}') {
    $dialog.SelectedPath = '${cleanStartDir}'
}
$topForm = New-Object System.Windows.Forms.Form
$topForm.TopMost = $true
$topForm.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$topForm.Show()
$topForm.WindowState = [System.Windows.Forms.FormWindowState]::Normal
$topForm.BringToFront()
if ($dialog.ShowDialog($topForm) -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
}
$topForm.Dispose()
$dialog.Dispose()
`.trim();

  const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '`"')}"`;

  exec(command, { encoding: 'utf8', timeout: 90000 }, (error, stdout, stderr) => {
    if (error) {
      console.warn('[browse-folder] Dialog dismissed or error:', error.message);
      return res.json({ success: true, path: null });
    }
    const selected = stdout ? stdout.trim() : null;
    console.log('[browse-folder] Selected path:', selected);
    res.json({ success: true, path: selected || null });
  });
});

// GET /api/media/scan-folder - Scan directory for available video and audio files
router.get('/scan-folder', (req, res) => {
  try {
    const rawFolder = req.query.folder as string;
    if (!rawFolder) {
      return res.json({ success: true, exists: false, videoCount: 0, audioCount: 0, files: [] });
    }

    const folderPath = path.normalize(rawFolder.trim());
    if (!fs.existsSync(folderPath)) {
      return res.json({ success: true, exists: false, path: folderPath, videoCount: 0, audioCount: 0, files: [] });
    }

    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      return res.json({ success: true, exists: false, path: folderPath, error: 'Đường dẫn không phải thư mục' });
    }

    const allFiles = fs.readdirSync(folderPath);
    const videoFiles = allFiles.filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
    const audioFiles = allFiles.filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()));

    res.json({
      success: true,
      exists: true,
      path: folderPath,
      videoCount: videoFiles.length,
      audioCount: audioFiles.length,
      videoFiles: videoFiles.slice(0, 50),
      audioFiles: audioFiles.slice(0, 50)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media/stream-local - Stream local video/audio file with HTTP 206 Partial Content
router.get('/stream-local', (req, res) => {
  try {
    const rawFolder = req.query.folder as string;
    const rawFile = req.query.file as string;
    const mediaType = (req.query.type as string) || 'video';

    let targetFilePath = '';

    if (rawFile && fs.existsSync(rawFile)) {
      targetFilePath = path.normalize(rawFile);
    } else if (rawFolder) {
      const folderPath = path.normalize(rawFolder.trim());
      if (fs.existsSync(folderPath)) {
        const stats = fs.statSync(folderPath);
        if (stats.isFile()) {
          targetFilePath = folderPath;
        } else if (stats.isDirectory()) {
          const files = fs.readdirSync(folderPath);
          const filterSet = mediaType === 'audio' ? AUDIO_EXTS : VIDEO_EXTS;
          const candidates = files.filter(f => filterSet.has(path.extname(f).toLowerCase()));
          if (candidates.length > 0) {
            targetFilePath = path.join(folderPath, candidates[0]);
          }
        }
      }
    }

    if (!targetFilePath || !fs.existsSync(targetFilePath)) {
      return res.status(404).send('Không tìm thấy file video/âm thanh trong thư mục này');
    }

    const stat = fs.statSync(targetFilePath);
    const fileSize = stat.size;
    const ext = path.extname(targetFilePath).toLowerCase();

    // Map MIME type
    let contentType = 'video/mp4';
    if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.m4a') contentType = 'audio/mp4';

    const range = req.headers.range;

    if (range) {
      // Parse Range header (e.g. "bytes=0-")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(targetFilePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(targetFilePath).pipe(res);
    }
  } catch (err: any) {
    console.error('[stream-local] Error:', err);
    res.status(500).send('Lỗi khi phát video: ' + err.message);
  }
});

export default router;
