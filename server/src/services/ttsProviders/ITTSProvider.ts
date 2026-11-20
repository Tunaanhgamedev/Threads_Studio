export interface TTSSynthesizeOptions {
  voice: string;
  speed: number;
  speakerId?: number;
  emotion?: string;
}

export interface TTSSynthesizeResult {
  buffer: Buffer;
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface ITTSProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  synthesize(text: string, options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult>;
  getVoices(): Promise<{ id: string; name: string }[]>;
}
