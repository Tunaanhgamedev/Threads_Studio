import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { VideoService } from '../videoService.js';

export class EdgeTTSProvider implements ITTSProvider {
  readonly name = 'Microsoft Edge Neural TTS (Natural Vietnamese)';

  // Map user-selected voice names to high-quality Microsoft Edge Neural voices
  private voiceMap: Record<string, { voice: string; pitchDelta: string; rateDelta: number }> = {
    'VieNeu - Ngọc Huyền (Nữ miền Bắc)': { voice: 'vi-VN-HoaiMyNeural', pitchDelta: '+0Hz', rateDelta: 0 },
    'VieNeu - Thiện Minh (Nam miền Bắc)': { voice: 'vi-VN-NamMinhNeural', pitchDelta: '+0Hz', rateDelta: 0 },
    'VieNeu - Hải Đăng (Nam miền Nam)': { voice: 'vi-VN-NamMinhNeural', pitchDelta: '+2Hz', rateDelta: 5 },
    'TikTok Việt 1 (Nữ viral)': { voice: 'vi-VN-HoaiMyNeural', pitchDelta: '+6Hz', rateDelta: 12 },
    'TikTok Việt 2 (Nam vui vẻ)': { voice: 'vi-VN-NamMinhNeural', pitchDelta: '+4Hz', rateDelta: 10 },
    'Adam bựa - VieNeu': { voice: 'vi-VN-NamMinhNeural', pitchDelta: '-4Hz', rateDelta: 18 },
    'VieNeu - Mai Linh (Nữ miền Trung)': { voice: 'vi-VN-HoaiMyNeural', pitchDelta: '-2Hz', rateDelta: -5 }
  };

  async isAvailable(): Promise<boolean> {
    // Edge TTS is cloud-based, available when network connectivity is present
    return true;
  }

  async getVoices(): Promise<{ id: string; name: string }[]> {
    return Object.keys(this.voiceMap).map(k => ({ id: k, name: k }));
  }

  async synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const rawVoice = options.voice || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)';
    const mapped = this.voiceMap[rawVoice] || { voice: 'vi-VN-HoaiMyNeural', pitchDelta: '+0Hz', rateDelta: 0 };
    
    // Calculate playback speed rate string: e.g. speed 1.2 -> +20%, speed 0.9 -> -10%
    const baseSpeed = options.speed || 1.2;
    const effectiveSpeedPercent = Math.round((baseSpeed - 1.0) * 100) + mapped.rateDelta;
    const rateStr = (effectiveSpeedPercent >= 0 ? `+${effectiveSpeedPercent}%` : `${effectiveSpeedPercent}%`);

    console.log(`[Edge TTS] Synthesizing "${text.slice(0, 35)}..." with voice ${mapped.voice} (${rateStr}, ${mapped.pitchDelta})`);

    const mp3Buffer = await this.synthesizeToMp3(text, mapped.voice, rateStr, mapped.pitchDelta);
    return await this.convertMp3ToWav(mp3Buffer, text, baseSpeed);
  }

  private synthesizeToMp3(text: string, voiceName: string, rateStr: string, pitchDelta: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const connId = crypto.randomUUID().replace(/-/g, '');
      const reqId = crypto.randomUUID().replace(/-/g, '');
      const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EA654972869237699971D574&ConnectionId=${connId}`;

      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${voiceName}'><prosody pitch='${pitchDelta}' rate='${rateStr}' volume='+0%'>${escapedText}</prosody></voice></speak>`;

      const audioChunks: Buffer[] = [];
      let timeout: NodeJS.Timeout | null = null;

      try {
        const ws = new WebSocket(url, {
          // Custom headers supported by Node 22+ native WebSocket
          // @ts-ignore
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });

        timeout = setTimeout(() => {
          try { ws.close(); } catch {}
          reject(new Error('Edge TTS request timed out after 18 seconds'));
        }, 18000);

        ws.onopen = () => {
          const configMsg = 'Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n';
          ws.send(configMsg);

          const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
          ws.send(ssmlMsg);
        };

        ws.onmessage = (event: MessageEvent) => {
          if (typeof event.data === 'string') {
            if (event.data.includes('Path:turn.end')) {
              if (timeout) clearTimeout(timeout);
              try { ws.close(); } catch {}
              if (audioChunks.length === 0) {
                reject(new Error('Edge TTS finished but no audio data was received'));
              } else {
                resolve(Buffer.concat(audioChunks));
              }
            }
          } else {
            // Binary audio chunk (ArrayBuffer)
            const raw = Buffer.from(event.data as ArrayBuffer);
            if (raw.length >= 2) {
              const headerLen = raw.readUInt16BE(0);
              if (raw.length > 2 + headerLen) {
                const headerText = raw.toString('utf8', 2, 2 + headerLen);
                if (headerText.includes('Path:audio')) {
                  const audioPayload = raw.subarray(2 + headerLen);
                  audioChunks.push(audioPayload);
                }
              }
            }
          }
        };

        ws.onerror = (err) => {
          if (timeout) clearTimeout(timeout);
          reject(new Error(`Edge TTS WebSocket error: ${String(err)}`));
        };

        ws.onclose = () => {
          if (timeout) clearTimeout(timeout);
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          }
        };
      } catch (err: any) {
        if (timeout) clearTimeout(timeout);
        reject(err);
      }
    });
  }

  private async convertMp3ToWav(mp3Buffer: Buffer, text: string, speed: number): Promise<TTSSynthesizeResult> {
    const tempDir = os.tmpdir();
    const tempMp3 = path.join(tempDir, `tts_edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);
    const tempWav = path.join(tempDir, `tts_edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);

    fs.writeFileSync(tempMp3, mp3Buffer);

    const ffmpegPath = VideoService.getFFmpegPath().path;

    return new Promise((resolve) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-i', tempMp3,
        '-ar', '44100',
        '-ac', '2',
        tempWav
      ]);

      proc.on('close', (code) => {
        try {
          if (code === 0 && fs.existsSync(tempWav)) {
            const wavBuffer = fs.readFileSync(tempWav);
            const duration = this.parseWavDuration(wavBuffer, text, speed);
            
            // Clean up temp files
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

        // Fallback: estimate duration and return MP3 buffer wrapped with header or estimate
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
