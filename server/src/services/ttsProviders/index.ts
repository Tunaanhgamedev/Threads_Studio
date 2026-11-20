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

  // 1. Check if user has local Piper server running
  const piper = new PiperProvider();
  if (await piper.isAvailable()) {
    console.log('[TTS Provider] Piper TTS is ONLINE at http://localhost:5000');
    cachedProvider = piper;
    lastCheckTime = now;
    return cachedProvider;
  }

  // 2. Default to Microsoft Edge Neural TTS (Ultra-natural studio Vietnamese voices)
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
