import { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
import { EdgeTTSProvider } from './EdgeTTSProvider.js';
import { PiperProvider } from './PiperProvider.js';
import { GoogleTTSProvider } from './GoogleTTSProvider.js';
import { SyntheticProvider } from './SyntheticProvider.js';

let cachedProvider: ITTSProvider | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 30000;

export async function getTTSProvider(forceRefresh: boolean = false): Promise<ITTSProvider> {
  const now = Date.now();
  if (!forceRefresh && cachedProvider && (now - lastCheckTime < CACHE_TTL_MS)) {
    return cachedProvider;
  }

  // Microsoft Edge Neural TTS provides authentic Vietnamese male & female voices (Hoài My & Nam Minh)
  // with custom pitch & speed modulation for viral TikTok and meme personas.
  // We use Piper only when explicitly specified via TTS_PROVIDER=piper or if edge-tts is disabled.
  const preferred = (process.env.TTS_PROVIDER || 'edge').toLowerCase();

  if (preferred === 'piper') {
    const piper = new PiperProvider();
    if (await piper.isAvailable()) {
      console.log('[TTS Provider] Using local Piper TTS at http://localhost:5000');
      cachedProvider = piper;
      lastCheckTime = now;
      return cachedProvider;
    }
  }

  const edge = new EdgeTTSProvider();
  cachedProvider = edge;
  lastCheckTime = now;
  return cachedProvider;
}

export { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
export { EdgeTTSProvider } from './EdgeTTSProvider.js';
export { PiperProvider } from './PiperProvider.js';
export { GoogleTTSProvider } from './GoogleTTSProvider.js';
export { SyntheticProvider } from './SyntheticProvider.js';
