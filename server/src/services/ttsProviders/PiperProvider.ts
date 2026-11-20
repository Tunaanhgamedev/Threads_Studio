import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';

export class PiperProvider implements ITTSProvider {
  readonly name = 'Piper TTS (Local Neural Vietnamese TTS)';
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PIPER_URL || 'http://localhost:5000';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return res.ok || res.status === 200 || res.status === 404;
    } catch {
      return false;
    }
  }

  async getVoices(): Promise<{ id: string; name: string }[]> {
    return [
      { id: 'vi_VN-vais1000-medium', name: 'Piper - Tiếng Việt (vais1000-medium)' }
    ];
  }

  async synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const speed = Math.max(0.5, Math.min(2.5, options.speed || 1.2));
    // In Piper: length_scale < 1.0 means faster speech; length_scale > 1.0 means slower
    const lengthScale = 1.0 / speed;

    const payload = {
      text: text.trim(),
      length_scale: parseFloat(lengthScale.toFixed(2)),
      speaker_id: options.speakerId ?? 0
    };

    console.log(`[Piper TTS] Requesting synthesis (${payload.text.length} chars, speed ${speed}x, scale ${lengthScale.toFixed(2)})...`);

    const response = await fetch(`${this.baseUrl}/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Piper TTS failed with status ${response.status}: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse WAV format from buffer header
    let sampleRate = 22050;
    let channels = 1;
    let duration = 3.0;

    if (buffer.length >= 44 && buffer.toString('utf8', 0, 4) === 'RIFF') {
      channels = buffer.readUInt16LE(22);
      sampleRate = buffer.readUInt32LE(24);
      const byteRate = buffer.readUInt32LE(28);
      const dataSize = buffer.readUInt32LE(40);
      if (byteRate > 0 && dataSize > 0) {
        duration = dataSize / byteRate;
      } else {
        duration = (buffer.length - 44) / (sampleRate * channels * 2);
      }
    } else {
      // Estimate fallback
      const words = text.split(/\s+/).filter(Boolean);
      duration = Math.max(1.5, words.length / (2.6 * speed));
    }

    duration = parseFloat(duration.toFixed(2));
    console.log(`[Piper TTS] Synthesis complete: ${buffer.length} bytes, duration ${duration}s, ${sampleRate}Hz, ${channels}ch`);

    return {
      buffer,
      duration,
      sampleRate,
      channels
    };
  }
}
