import { Router } from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getStorageDir } from '../storagePath.js';

const router = Router();

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);

function runPowerShellScript(psScript: string, timeoutMs = 120000): Promise<string | null> {
  return new Promise((resolve) => {
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { encoding: 'utf8', timeout: timeoutMs },
      (error, stdout, stderr) => {
        if (error) {
          console.warn('[PowerShell Dialog] Error or dismissed:', error.message);
          return resolve(null);
        }
        const lines = (stdout || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // Exclude progress lines or CLIXML
        const validPath = lines.find(l => !l.startsWith('#<') && !l.startsWith('<') && fs.existsSync(l));
        resolve(validPath || (lines.length > 0 ? lines[lines.length - 1] : null));
      }
    );
  });
}

// POST /api/media/browse-folder - Open native Windows FolderBrowserDialog
router.post('/browse-folder', async (req, res) => {
  const { initialPath, title } = req.body || {};
  const promptTitle = title || 'Chọn thư mục chứa Video hoặc Âm thanh';

  let cleanStartDir = '';
  if (initialPath && typeof initialPath === 'string') {
    const candidate = initialPath.trim().replace(/\//g, '\\');
    if (fs.existsSync(candidate)) {
      cleanStartDir = (fs.statSync(candidate).isDirectory() ? candidate : path.dirname(candidate)).replace(/'/g, "''");
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
$topForm.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$topForm.Location = New-Object System.Drawing.Point(-3000, -3000)
$topForm.Size = New-Object System.Drawing.Size(1, 1)
$topForm.Show()
$topForm.BringToFront()
if ($dialog.ShowDialog($topForm) -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.SelectedPath
}
$topForm.Dispose()
$dialog.Dispose()
`.trim();

  const selected = await runPowerShellScript(psScript);
  console.log('[browse-folder] Selected path:', selected);
  res.json({ success: true, path: selected || null });
});

// POST /api/media/browse-file - Open native Windows OpenFileDialog for single video or audio file
router.post('/browse-file', async (req, res) => {
  const { initialPath, title, fileType } = req.body || {};
  const promptTitle = title || 'Chọn file Video hoặc Âm thanh';
  const isVideo = fileType !== 'audio';

  let cleanStartDir = '';
  if (initialPath && typeof initialPath === 'string') {
    const candidate = initialPath.trim().replace(/\//g, '\\');
    if (fs.existsSync(candidate)) {
      cleanStartDir = (fs.statSync(candidate).isDirectory() ? candidate : path.dirname(candidate)).replace(/'/g, "''");
    }
  }

  const filterStr = isVideo
    ? 'Video files (*.mp4;*.mov;*.webm;*.mkv;*.avi)|*.mp4;*.mov;*.webm;*.mkv;*.avi|All files (*.*)|*.*'
    : 'Audio files (*.mp3;*.wav;*.m4a;*.aac;*.flac)|*.mp3;*.wav;*.m4a;*.aac;*.flac|All files (*.*)|*.*';

  const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = '${promptTitle.replace(/'/g, "''")}'
$dialog.Filter = '${filterStr}'
if ('${cleanStartDir}') {
    $dialog.InitialDirectory = '${cleanStartDir}'
}
$topForm = New-Object System.Windows.Forms.Form
$topForm.TopMost = $true
$topForm.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$topForm.Location = New-Object System.Drawing.Point(-3000, -3000)
$topForm.Size = New-Object System.Drawing.Size(1, 1)
$topForm.Show()
$topForm.BringToFront()
if ($dialog.ShowDialog($topForm) -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $dialog.FileName
}
$topForm.Dispose()
$dialog.Dispose()
`.trim();

  const selected = await runPowerShellScript(psScript);
  console.log('[browse-file] Selected path:', selected);
  res.json({ success: true, path: selected || null });
});

// GET /api/media/sample-media - Provide built-in sample videos and audio tracks
router.get('/sample-media', (req, res) => {
  try {
    const storageDir = getStorageDir();
    const sampleDir = path.join(storageDir, 'sample_media');
    const subVideo = path.join(sampleDir, 'videos', 'satisfying_loop.mp4');
    const bgVideo = path.join(sampleDir, 'videos', 'background_gameplay.mp4');
    const bgMusic = path.join(sampleDir, 'music', 'lofi_ambient.mp3');

    res.json({
      success: true,
      subVideo: fs.existsSync(subVideo) ? subVideo : null,
      backgroundVideo: fs.existsSync(bgVideo) ? bgVideo : null,
      backgroundMusic: fs.existsSync(bgMusic) ? bgMusic : null
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media/scan-folder - Scan directory OR single file for available video and audio files
router.get('/scan-folder', (req, res) => {
  try {
    const rawFolder = req.query.folder as string;
    if (!rawFolder) {
      return res.json({ success: true, exists: false, isFile: false, videoCount: 0, audioCount: 0, files: [] });
    }

    const folderPath = path.normalize(rawFolder.trim());
    if (!fs.existsSync(folderPath)) {
      return res.json({ success: true, exists: false, isFile: false, path: folderPath, videoCount: 0, audioCount: 0, files: [] });
    }

    const stats = fs.statSync(folderPath);

    // If it's a direct file
    if (stats.isFile()) {
      const ext = path.extname(folderPath).toLowerCase();
      const isVideo = VIDEO_EXTS.has(ext);
      const isAudio = AUDIO_EXTS.has(ext);
      const fileName = path.basename(folderPath);

      return res.json({
        success: true,
        exists: true,
        isFile: true,
        path: folderPath,
        videoCount: isVideo ? 1 : 0,
        audioCount: isAudio ? 1 : 0,
        videoFiles: isVideo ? [fileName] : [],
        audioFiles: isAudio ? [fileName] : []
      });
    }

    // If it's a directory
    const allFiles = fs.readdirSync(folderPath);
    const videoFiles = allFiles.filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
    const audioFiles = allFiles.filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()));

    res.json({
      success: true,
      exists: true,
      isFile: false,
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
