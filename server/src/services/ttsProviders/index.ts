import { ITTSProvider } from './ITTSProvider.js';
import { PiperProvider } from './PiperProvider.js';
import { SyntheticProvider } from './SyntheticProvider.js';

let cachedProvider: ITTSProvider | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 15000; // Check Piper availability every 15s

export async function getTTSProvider(forceRefresh: boolean = false): Promise<ITTSProvider> {
  const now = Date.now();
  if (!forceRefresh && cachedProvider && (now - lastCheckTime < CACHE_TTL_MS)) {
    return cachedProvider;
  }

  const piper = new PiperProvider();
  const piperAvailable = await piper.isAvailable();

  if (piperAvailable) {
    console.log('[TTS Provider] Piper TTS is ONLINE at http://localhost:5000');
    cachedProvider = piper;
  } else {
    console.log('[TTS Provider] Piper TTS is OFFLINE. Using Synthetic Harmonic TTS.');
    cachedProvider = new SyntheticProvider();
  }

  lastCheckTime = now;
  return cachedProvider;
}

export { ITTSProvider, TTSSynthesizeOptions, TTSSynthesizeResult } from './ITTSProvider.js';
export { PiperProvider } from './PiperProvider.js';
export { SyntheticProvider } from './SyntheticProvider.js';
