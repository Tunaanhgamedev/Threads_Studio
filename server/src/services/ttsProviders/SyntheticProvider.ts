import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';

export class SyntheticProvider implements ITTSProvider {
  readonly name = 'Synthetic TTS (Built-in Harmonic Fallback)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getVoices(): Promise<{ id: string; name: string }[]> {
    return [
      { id: 'vi-VN-NgocHuyen', name: 'VieNeu - Ngọc Huyền (Nữ miền Bắc)' },
      { id: 'vi-VN-HaiDang', name: 'VieNeu - Hải Đăng (Nam miền Nam)' },
      { id: 'vi-VN-ThienMinh', name: 'VieNeu - Thiện Minh (Nam miền Bắc)' },
      { id: 'vi-VN-TikTok1', name: 'TikTok Việt 1 (Nữ viral)' },
      { id: 'vi-VN-TikTok2', name: 'TikTok Việt 2 (Nam vui vẻ)' },
      { id: 'vi-VN-AdamBua', name: 'Adam bựa - VieNeu' },
      { id: 'vi-VN-MaiLinh', name: 'VieNeu - Mai Linh (Nữ miền Trung)' }
    ];
  }

  async synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
    const speed = Math.max(0.5, Math.min(2.5, options.speed || 1.2));
    const words = text.split(/\s+/).filter(Boolean);
    // Typical Vietnamese speech rate ~ 2.6 words/sec at 1.0x speed
    const wordRate = 2.6 * speed;
    const duration = Math.max(2.0, Math.min(30.0, words.length / wordRate + 0.6));

    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const totalSamples = Math.floor(sampleRate * duration);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = totalSamples * blockAlign;

    const buffer = Buffer.alloc(44 + dataSize);

    // 1. RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // 2. fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // 3. data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    const voice = options.voice || '';
    const isFemale = voice.includes('Huyền') || voice.includes('Linh') || voice.includes('TikTok 1');
    const baseFreq = isFemale ? 220 : 130;

    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Syllable rhythmic cadence (approx 4 syllables per second)
      const syllableMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t);

      // Speech harmonic spectrum (fundamental + formants)
      const f1 = Math.sin(2 * Math.PI * baseFreq * t);
      const f2 = 0.4 * Math.sin(2 * Math.PI * (baseFreq * 2) * t);
      const f3 = 0.2 * Math.sin(2 * Math.PI * (baseFreq * 3.5) * t);

      // Envelope: smooth fade-in and fade-out
      let env = 1.0;
      if (t < 0.1) env = t / 0.1;
      if (t > duration - 0.2) env = Math.max(0, (duration - t) / 0.2);

      const sampleVal = Math.floor((f1 + f2 + f3) * 0.3 * syllableMod * env * 24000);
      const clamped = Math.max(-32768, Math.min(32767, sampleVal));

      buffer.writeInt16LE(clamped, offset);
      buffer.writeInt16LE(clamped, offset + 2);
      offset += 4;
    }

    return {
      buffer,
      duration: parseFloat(duration.toFixed(2)),
      sampleRate,
      channels: numChannels
    };
  }
}
