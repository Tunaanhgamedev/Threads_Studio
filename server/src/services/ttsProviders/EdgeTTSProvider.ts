import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { VideoService } from '../videoService.js';

interface VoiceMapping {
  voice: string;
  rateBonus: number;
  pitch: string;
}

export class EdgeTTSProvider implements ITTSProvider {
  readonly name = 'Microsoft Edge Neural TTS (Natural Vietnamese)';

  private voiceMap: Record<string, VoiceMapping> = {
    'VieNeu - Ngọc Huyền (Nữ miền Bắc)': { voice: 'vi-VN-HoaiMyNeural', rateBonus: 0, pitch: '+0Hz' },
    'VieNeu - Thiện Minh (Nam miền Bắc)': { voice: 'vi-VN-NamMinhNeural', rateBonus: 0, pitch: '+0Hz' },
    'VieNeu - Hải Đăng (Nam miền Nam)': { voice: 'vi-VN-NamMinhNeural', rateBonus: 5, pitch: '+3Hz' },
    'TikTok Việt 1 (Nữ viral)': { voice: 'vi-VN-HoaiMyNeural', rateBonus: 12, pitch: '+6Hz' },
    'TikTok Việt 2 (Nam vui vẻ)': { voice: 'vi-VN-NamMinhNeural', rateBonus: 10, pitch: '+4Hz' },
    'Adam bựa - VieNeu': { voice: 'vi-VN-NamMinhNeural', rateBonus: 18, pitch: '-4Hz' },
    'VieNeu - Mai Linh (Nữ miền Trung)': { voice: 'vi-VN-HoaiMyNeural', rateBonus: -5, pitch: '-2Hz' }
  };

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getVoices(): Promise<{ id: string; name: string }[]> {
    return Object.keys(this.voiceMap).map(k => ({ id: k, name: k }));
  }

  private resolveVoice(rawVoice: string): VoiceMapping {
    if (this.voiceMap[rawVoice]) return this.voiceMap[rawVoice];
    const v = (rawVoice || '').toLowerCase();
    if (v.includes('huyền') || v.includes('hoaimy')) {
      return { voice: 'vi-VN-HoaiMyNeural', rateBonus: 0, pitch: '+0Hz' };
    }
    if (v.includes('hải đăng') || v.includes('haidang')) {
      return { voice: 'vi-VN-NamMinhNeural', rateBonus: 5, pitch: '+3Hz' };
    }
    if (v.includes('thiện minh') || v.includes('thienminh')) {
      return { voice: 'vi-VN-NamMinhNeural', rateBonus: 0, pitch: '+0Hz' };
    }
    if (v.includes('tiktok') && (v.includes('1') || v.includes('nữ') || v.includes('nu') || v.includes('viral'))) {
      return { voice: 'vi-VN-HoaiMyNeural', rateBonus: 12, pitch: '+6Hz' };
    }
    if (v.includes('tiktok') && (v.includes('2') || v.includes('nam') || v.includes('vui'))) {
      return { voice: 'vi-VN-NamMinhNeural', rateBonus: 10, pitch: '+4Hz' };
    }
    if (v.includes('adam') || v.includes('bựa') || v.includes('bua')) {
      return { voice: 'vi-VN-NamMinhNeural', rateBonus: 18, pitch: '-4Hz' };
    }
    if (v.includes('linh') || v.includes('trung')) {
      return { voice: 'vi-VN-HoaiMyNeural', rateBonus: -5, pitch: '-2Hz' };
    }
    if (v.includes('nam') || v.includes('male')) {
      return { voice: 'vi-VN-NamMinhNeural', rateBonus: 0, pitch: '+0Hz' };
    }
    return { voice: 'vi-VN-HoaiMyNeural', rateBonus: 0, pitch: '+0Hz' };
  }

  async synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const rawVoice = options.voice || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)';
    const mapped = this.resolveVoice(rawVoice);

    // Speed calculation: speed 1.2 -> +20%, + rateBonus
    const baseSpeed = options.speed || 1.2;
    const effectiveSpeedPct = Math.round((baseSpeed - 1.0) * 100) + mapped.rateBonus;
    const rateStr = effectiveSpeedPct >= 0 ? `+${effectiveSpeedPct}%` : `${effectiveSpeedPct}%`;

    console.log(`[EdgeTTS] Synthesizing "${text.slice(0, 30)}..." with ${mapped.voice} (rate: ${rateStr}, pitch: ${mapped.pitch})`);

    const tempDir = os.tmpdir();
    const tempPrefix = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tempTxt = path.join(tempDir, `${tempPrefix}.txt`);
    const tempMp3 = path.join(tempDir, `${tempPrefix}.mp3`);
    const tempWav = path.join(tempDir, `${tempPrefix}.wav`);

    // Write text to UTF-8 file to prevent Windows CLI argument truncation/encoding corruption
    fs.writeFileSync(tempTxt, text.trim(), 'utf8');

    const pythonArgs = [
      '-m', 'edge_tts',
      '--voice', mapped.voice,
      '--file', tempTxt,
      '--write-media', tempMp3
    ];

    if (rateStr !== '+0%') {
      pythonArgs.push(`--rate=${rateStr}`);
    }
    if (mapped.pitch !== '+0Hz') {
      pythonArgs.push(`--pitch=${mapped.pitch}`);
    }

    // 1. Run Python edge-tts CLI
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python', pythonArgs);
      let stderr = '';

      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('close', code => {
        if (code === 0 && fs.existsSync(tempMp3) && fs.statSync(tempMp3).size > 0) {
          resolve();
        } else {
          reject(new Error(`edge-tts failed with exit code ${code}: ${stderr}`));
        }
      });

      proc.on('error', err => {
        reject(new Error(`Failed to execute python edge-tts: ${err.message}`));
      });
    });

    // 2. Convert MP3 to standard 44.1kHz 16-bit WAV with FFmpeg
    const ffmpegPath = VideoService.getFFmpegPath().path;
    const duration = await new Promise<number>((resolve) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-i', tempMp3,
        '-ar', '44100',
        '-ac', '2',
        tempWav
      ]);

      proc.on('close', () => {
        if (fs.existsSync(tempWav)) {
          const stats = fs.statSync(tempWav);
          // 44100Hz, 16-bit (2 bytes), 2 channels = 176,400 bytes/sec
          const pcmSize = Math.max(0, stats.size - 44);
          const dur = parseFloat((pcmSize / 176400).toFixed(2));
          resolve(Math.max(1.0, dur));
        } else {
          const words = text.split(/\s+/).filter(Boolean);
          resolve(Math.max(1.5, parseFloat((words.length / (2.6 * baseSpeed) + 0.5).toFixed(2))));
        }
      });

      proc.on('error', () => {
        const words = text.split(/\s+/).filter(Boolean);
        resolve(Math.max(1.5, parseFloat((words.length / (2.6 * baseSpeed) + 0.5).toFixed(2))));
      });
    });

    const wavBuffer = fs.readFileSync(fs.existsSync(tempWav) ? tempWav : tempMp3);

    // Clean up temporary files
    try { if (fs.existsSync(tempTxt)) fs.unlinkSync(tempTxt); } catch {}
    try { if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3); } catch {}
    try { if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav); } catch {}

    return {
      buffer: wavBuffer,
      duration,
      sampleRate: 44100,
      channels: 2
    };
  }
}
