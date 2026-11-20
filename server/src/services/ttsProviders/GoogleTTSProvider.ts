import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { VideoService } from '../videoService.js';

export class GoogleTTSProvider implements ITTSProvider {
  readonly name = 'Google Neural TTS (Vietnamese Fallback)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getVoices(): Promise<{ id: string; name: string }[]> {
    return [
      { id: 'vi-VN-Standard', name: 'Google Tiếng Việt (Chuẩn Nữ)' }
    ];
  }

  async synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const speed = options.speed || 1.2;
    console.log(`[Google TTS] Synthesizing "${text.slice(0, 35)}..." at speed ${speed}x`);

    // Split text into chunks <= 180 characters to comply with Google TTS limits
    const chunks = this.chunkText(text, 180);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Google TTS request failed with status ${response.status}`);
      }

      const arr = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arr));
    }

    const combinedMp3 = Buffer.concat(audioBuffers);
    return await this.convertMp3ToWav(combinedMp3, text, speed);
  }

  private chunkText(text: string, maxLen: number): string[] {
    const sentences = text.split(/(?<=[.!?,\n])/);
    const chunks: string[] = [];
    let cur = '';

    for (const s of sentences) {
      if ((cur + s).length > maxLen) {
        if (cur.trim()) chunks.push(cur.trim());
        cur = s;
      } else {
        cur += s;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
  }

  private async convertMp3ToWav(mp3Buffer: Buffer, text: string, speed: number): Promise<TTSSynthesizeResult> {
    const tempDir = os.tmpdir();
    const tempMp3 = path.join(tempDir, `tts_g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);
    const tempWav = path.join(tempDir, `tts_g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);

    fs.writeFileSync(tempMp3, mp3Buffer);

    const ffmpegPath = VideoService.getFFmpegPath().path;

    return new Promise((resolve) => {
      // Adjust tempo if speed != 1.0
      const atempo = Math.max(0.5, Math.min(2.0, speed));
      const args = [
        '-y',
        '-i', tempMp3,
        '-filter:a', `atempo=${atempo}`,
        '-ar', '44100',
        '-ac', '2',
        tempWav
      ];

      const proc = spawn(ffmpegPath, args);

      proc.on('close', (code) => {
        try {
          if (code === 0 && fs.existsSync(tempWav)) {
            const wavBuffer = fs.readFileSync(tempWav);
            const duration = this.parseWavDuration(wavBuffer, text, speed);

            try { fs.unlinkSync(tempMp3); fs.unlinkSync(tempWav); } catch {}

            resolve({
              buffer: wavBuffer,
              duration,
              sampleRate: 44100,
              channels: 2
            });
            return;
          }
        } catch {}

        try { if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3); } catch {}
        const words = text.split(/\s+/).filter(Boolean);
        const estDuration = Math.max(1.5, parseFloat((words.length / (2.6 * speed) + 0.5).toFixed(2)));
        resolve({
          buffer: mp3Buffer,
          duration: estDuration,
          sampleRate: 24000,
          channels: 1
        });
      });

      proc.on('error', () => {
        try { if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3); } catch {}
        const words = text.split(/\s+/).filter(Boolean);
        const estDuration = Math.max(1.5, parseFloat((words.length / (2.6 * speed) + 0.5).toFixed(2)));
        resolve({
          buffer: mp3Buffer,
          duration: estDuration,
          sampleRate: 24000,
          channels: 1
        });
      });
    });
  }

  private parseWavDuration(buffer: Buffer, text: string, speed: number): number {
    try {
      if (buffer.length >= 44 && buffer.toString('utf8', 0, 4) === 'RIFF') {
        const byteRate = buffer.readUInt32LE(28);
        const dataSize = buffer.readUInt32LE(40);
        if (byteRate > 0 && dataSize > 0) {
          return parseFloat((dataSize / byteRate).toFixed(2));
        }
      }
    } catch {}
    const words = text.split(/\s+/).filter(Boolean);
    return Math.max(1.5, parseFloat((words.length / (2.6 * speed) + 0.5).toFixed(2)));
  }
}
