import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import os from 'node:os';

// Phase 18: Scene Signature Calculation Function
export function calculateSceneSignature(
  projectId: string,
  scene: { id: string; order: number; text: string; speed?: number; voiceId?: string; cardPosition?: any },
  screenshotPath?: string,
  audioPath?: string,
  preset: string = 'veryfast'
): string {
  const hash = crypto.createHash('sha256');
  hash.update(projectId);
  hash.update(scene.id);
  hash.update(String(scene.order));
  hash.update(scene.text || '');
  hash.update(String(scene.speed || 1.0));
  hash.update(scene.voiceId || '');
  if (scene.cardPosition) {
    hash.update(JSON.stringify(scene.cardPosition));
  }
  if (screenshotPath) hash.update(screenshotPath);
  if (audioPath) hash.update(audioPath);
  hash.update(preset);
  return hash.digest('hex');
}

// Phase 18: RAM Availability Guard
export function checkRamAvailability(
  freeBytes: number,
  minFreeRamGb: number = 1.5
): { available: boolean; freeRamGb: number; minRequiredGb: number; message: string } {
  const freeGb = freeBytes / (1024 * 1024 * 1024);
  const available = freeGb >= minFreeRamGb;
  return {
    available,
    freeRamGb: Math.round(freeGb * 100) / 100,
    minRequiredGb: minFreeRamGb,
    message: available
      ? `Đủ bộ nhớ RAM khả dụng (${freeGb.toFixed(2)} GB >= ${minFreeRamGb} GB)`
      : `Không đủ bộ nhớ RAM khả dụng để render (${freeGb.toFixed(2)} GB < ${minFreeRamGb} GB). Vui lòng đóng bớt ứng dụng.`
  };
}

// Phase 18: Render Queue Concurrency Simulator
export class MockRenderQueue {
  private activeWorkers = 0;
  private queue: string[] = [];
  public maxWorkers: number;

  constructor(maxWorkers: number = 1) {
    this.maxWorkers = maxWorkers;
  }

  public enqueueJob(jobId: string): 'rendering' | 'queued' {
    if (this.activeWorkers < this.maxWorkers) {
      this.activeWorkers++;
      return 'rendering';
    }
    this.queue.push(jobId);
    return 'queued';
  }

  public finishJob(): string | null {
    if (this.activeWorkers > 0) {
      this.activeWorkers--;
    }
    if (this.queue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const nextJobId = this.queue.shift()!;
      this.activeWorkers++;
      return nextJobId;
    }
    return null;
  }

  public getActiveCount(): number {
    return this.activeWorkers;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

// Phase 18: Performance Config Validator
export function validatePerformanceConfig(input: {
  maxWorkers?: number;
  minFreeRamGb?: number;
  ffmpegPreset?: string;
  cpuThreads?: number;
}) {
  const validPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'];
  const validThreads = [0, 1, 2, 4, 6, 8];

  const maxWorkers = input.maxWorkers !== undefined 
    ? Math.max(1, Math.min(2, Math.round(input.maxWorkers))) 
    : 1;

  const minFreeRamGb = input.minFreeRamGb !== undefined 
    ? Math.max(0.5, Math.min(16.0, Number(input.minFreeRamGb))) 
    : 1.5;

  const ffmpegPreset = input.ffmpegPreset && validPresets.includes(input.ffmpegPreset)
    ? input.ffmpegPreset
    : 'veryfast';

  const cpuThreads = input.cpuThreads !== undefined && validThreads.includes(Number(input.cpuThreads))
    ? Number(input.cpuThreads)
    : 0;

  return { maxWorkers, minFreeRamGb, ffmpegPreset, cpuThreads };
}

describe('6. Kiểm tra Tối ưu hóa Hiệu năng & Render Queue (Phase 18)', () => {
  test('Test 17: Tính toán chữ ký SHA-256 cho Scene Cache chính xác và xác định', () => {
    const scene1 = { id: 'scene_01', order: 1, text: 'Nội dung phân cảnh mẫu Threads', speed: 1.0, voiceId: 'vi_VN_nu' };
    const sig1 = calculateSceneSignature('proj_123', scene1, '/storage/img1.png', '/storage/audio1.wav', 'veryfast');
    
    // Đảm bảo là hex hash SHA-256 (64 ký tự)
    assert.strictEqual(sig1.length, 64, 'Chữ ký SHA-256 phải có đúng 64 ký tự hex');
    assert.match(sig1, /^[0-9a-f]{64}$/, 'Chữ ký phải chỉ chứa ký tự thập lục phân');

    // Deterministic: Cùng tham số cho cùng chữ ký
    const sig1Repeat = calculateSceneSignature('proj_123', scene1, '/storage/img1.png', '/storage/audio1.wav', 'veryfast');
    assert.strictEqual(sig1, sig1Repeat, 'Chữ ký phải đồng nhất khi cùng dữ liệu đầu vào');

    // Khi thay đổi nội dung chữ, chữ ký phải đổi
    const sceneModified = { ...scene1, text: 'Nội dung bài viết Threads đã được chỉnh sửa' };
    const sigModified = calculateSceneSignature('proj_123', sceneModified, '/storage/img1.png', '/storage/audio1.wav', 'veryfast');
    assert.notStrictEqual(sig1, sigModified, 'Chữ ký phải thay đổi khi nội dung phân cảnh bị sửa');

    // Khi đổi preset, chữ ký phải đổi để re-encode đúng thông số
    const sigDiffPreset = calculateSceneSignature('proj_123', scene1, '/storage/img1.png', '/storage/audio1.wav', 'ultrafast');
    assert.notStrictEqual(sig1, sigDiffPreset, 'Chữ ký phải thay đổi khi đổi preset encode video');
  });

  test('Test 18: Kiểm tra ngưỡng RAM khả dụng trước khi kích hoạt render', () => {
    // Trường hợp RAM dồi dào: 4 GB free, yêu cầu tối thiểu 1.5 GB -> PASS
    const ampleRamBytes = 4 * 1024 * 1024 * 1024;
    const ampleCheck = checkRamAvailability(ampleRamBytes, 1.5);
    assert.strictEqual(ampleCheck.available, true, 'Hệ thống phải cho phép render khi RAM dư dả');
    assert.match(ampleCheck.message, /Đủ bộ nhớ RAM khả dụng/);

    // Trường hợp RAM khan hiếm: 0.8 GB free, yêu cầu 1.5 GB -> BLOCK
    const lowRamBytes = 0.8 * 1024 * 1024 * 1024;
    const lowCheck = checkRamAvailability(lowRamBytes, 1.5);
    assert.strictEqual(lowCheck.available, false, 'Hệ thống phải chặn render khi RAM dưới ngưỡng an toàn');
    assert.match(lowCheck.message, /Không đủ bộ nhớ RAM khả dụng/);
  });

  test('Test 19: Kiểm soát số lượng worker render đồng thời và hàng đợi queue', () => {
    // Giới hạn 1 worker đồng thời
    const queue = new MockRenderQueue(1);

    // Job 1 bắt đầu -> worker nhận việc (status: rendering)
    const status1 = queue.enqueueJob('job_alpha');
    assert.strictEqual(status1, 'rendering', 'Job đầu tiên phải được kích hoạt rendering ngay');
    assert.strictEqual(queue.getActiveCount(), 1);
    assert.strictEqual(queue.getQueueLength(), 0);

    // Job 2 đến trong lúc job 1 đang chạy -> chuyển vào hàng đợi (status: queued)
    const status2 = queue.enqueueJob('job_beta');
    assert.strictEqual(status2, 'queued', 'Job thứ hai phải được đưa vào hàng đợi queued');
    assert.strictEqual(queue.getActiveCount(), 1);
    assert.strictEqual(queue.getQueueLength(), 1);

    // Job 1 hoàn thành -> queue tự động nhường slot cho Job 2
    const nextJob = queue.finishJob();
    assert.strictEqual(nextJob, 'job_beta', 'Job trong queue phải được kích hoạt tiếp theo');
    assert.strictEqual(queue.getActiveCount(), 1);
    assert.strictEqual(queue.getQueueLength(), 0);

    // Job 2 hoàn thành -> giải phóng worker
    const noMoreJob = queue.finishJob();
    assert.strictEqual(noMoreJob, null);
    assert.strictEqual(queue.getActiveCount(), 0);
  });

  test('Test 20: Xác thực cấu hình FFmpeg preset và CPU threads an toàn', () => {
    // Input hợp lệ
    const validConfig = validatePerformanceConfig({
      maxWorkers: 2,
      minFreeRamGb: 2.0,
      ffmpegPreset: 'ultrafast',
      cpuThreads: 4
    });
    assert.strictEqual(validConfig.maxWorkers, 2);
    assert.strictEqual(validConfig.minFreeRamGb, 2.0);
    assert.strictEqual(validConfig.ffmpegPreset, 'ultrafast');
    assert.strictEqual(validConfig.cpuThreads, 4);

    // Input bất thường: vượt max workers cho phép (ép về 2), threads không hợp lệ (về 0 auto)
    const clampedConfig = validatePerformanceConfig({
      maxWorkers: 10, // Max cho phép là 2
      minFreeRamGb: 0.1, // Min an toàn là 0.5 GB
      ffmpegPreset: 'invalid_super_slow', // Không có trong danh sách -> fallback veryfast
      cpuThreads: 99 // Không trong danh sách [0,1,2,4,6,8] -> fallback 0
    });
    assert.strictEqual(clampedConfig.maxWorkers, 2, 'Worker phải được giới hạn tối đa 2');
    assert.strictEqual(clampedConfig.minFreeRamGb, 0.5, 'RAM tối thiểu phải được giới hạn tối thiểu 0.5 GB');
    assert.strictEqual(clampedConfig.ffmpegPreset, 'veryfast', 'Preset không hợp lệ phải fallback về veryfast');
    assert.strictEqual(clampedConfig.cpuThreads, 0, 'CPU threads không hợp lệ phải fallback về 0 (auto)');
  });
});
