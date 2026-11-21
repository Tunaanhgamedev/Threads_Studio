import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getStorageDir } from '../../server/src/storagePath.js';

describe('FFmpeg & FFprobe Media Smoke Test', () => {
  const storageDir = getStorageDir();
  const tempDir = path.join(storageDir, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const testVideoPath = path.join(tempDir, `smoke_test_${Date.now()}.mp4`);

  test('Test Media: Tạo video MP4 dọc H.264/AAC và dùng FFprobe xác nhận streams & kích thước 9:16', () => {
    // 1. Verify FFmpeg & FFprobe availability
    assert.doesNotThrow(() => {
      execSync('ffmpeg -version', { stdio: 'ignore' });
    }, 'FFmpeg phải khả dụng trên hệ thống');

    assert.doesNotThrow(() => {
      execSync('ffprobe -version', { stdio: 'ignore' });
    }, 'FFprobe phải khả dụng trên hệ thống');

    // 2. Generate 1.5s vertical MP4 test video with H.264 and AAC tone
    // Uses virtual color bars and sine wave audio source
    const ffmpegCmd = [
      'ffmpeg -y',
      '-f lavfi -i testsrc=duration=1.5:size=720x1280:rate=30',
      '-f lavfi -i sine=frequency=440:duration=1.5',
      '-c:v libx264 -pix_fmt yuv420p',
      '-c:a aac -b:a 128k',
      '-shortest',
      `"${testVideoPath}"`
    ].join(' ');

    execSync(ffmpegCmd, { stdio: 'ignore' });
    assert.ok(fs.existsSync(testVideoPath), 'Tệp video test MP4 phải được tạo trên đĩa');
    const fileSize = fs.statSync(testVideoPath).size;
    assert.ok(fileSize > 1000, `Kích thước video phải hợp lệ (${fileSize} bytes)`);

    // 3. Inspect generated video with FFprobe
    const probeCmd = `ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -show_entries format=duration -of json "${testVideoPath}"`;
    const probeOutput = execSync(probeCmd, { encoding: 'utf8' });
    const probeData = JSON.parse(probeOutput);

    // Verify video stream
    const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
    assert.ok(videoStream, 'Phải có video stream');
    assert.strictEqual(videoStream.codec_name, 'h264', 'Video codec phải là H.264');
    assert.strictEqual(videoStream.width, 720, 'Chiều rộng video 720');
    assert.strictEqual(videoStream.height, 1280, 'Chiều cao video 1280 (chuẩn dọc 9:16)');

    // Verify audio stream
    const audioStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');
    assert.ok(audioStream, 'Phải có audio stream');
    assert.strictEqual(audioStream.codec_name, 'aac', 'Audio codec phải là AAC');

    // Verify duration
    const duration = parseFloat(probeData.format?.duration || '0');
    assert.ok(duration >= 1.0, `Thời lượng video (${duration}s) phải >= 1.0 giây`);

    // 4. Cleanup
    try {
      fs.unlinkSync(testVideoPath);
    } catch {}
  });
});
