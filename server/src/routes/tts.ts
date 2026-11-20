import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { TTSService } from '../services/ttsService.js';
import { getTTSProvider, EdgeTTSProvider, GoogleTTSProvider, SyntheticProvider, PiperProvider } from '../services/ttsProviders/index.js';
import { OllamaService } from '../services/ollamaService.js';
import { getStorageDir } from '../storagePath.js';

const router = Router();

// GET /api/tts/status - check status of TTS and Ollama AI
router.get('/status', async (req, res) => {
  try {
    const piper = new PiperProvider();
    const piperOnline = await piper.isAvailable();
    const activeProvider = await getTTSProvider(true);
    const ollamaStatus = await OllamaService.isAvailable();

    res.json({
      success: true,
      tts: {
        activeProvider: activeProvider.name,
        piperAvailable: piperOnline,
        piperUrl: process.env.PIPER_URL || 'http://localhost:5000'
      },
      ai: {
        available: ollamaStatus.available,
        model: ollamaStatus.model,
        availableModels: ollamaStatus.availableModels,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
        error: ollamaStatus.error
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tts/voices
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    voices: TTSService.getAvailableVoices()
  });
});

// POST /api/tts/preview - synthesize live preview audio
router.post('/preview', async (req, res) => {
  try {
    const { voiceId, voiceName, text, speed } = req.body;
    const voiceToUse = voiceName || voiceId || 'VieNeu - Ngọc Huyền (Nữ miền Bắc)';
    const textToSynthesize = (text || 'Xin chào, đây là giọng đọc thử nghiệm trong Threads Content Studio.').trim();
    const playbackSpeed = parseFloat(speed) || 1.2;

    let result;
    let usedProviderName = '';

    // Multi-tier synthesis: Edge Neural -> Google -> Synthetic fallback
    try {
      const edge = new EdgeTTSProvider();
      result = await edge.synthesize(textToSynthesize, { voice: voiceToUse, speed: playbackSpeed });
      usedProviderName = edge.name;
    } catch (edgeErr: any) {
      console.warn('[TTS Preview] Edge TTS failed, attempting Google TTS fallback:', edgeErr.message);
      try {
        const google = new GoogleTTSProvider();
        result = await google.synthesize(textToSynthesize, { voice: voiceToUse, speed: playbackSpeed });
        usedProviderName = google.name;
      } catch (googleErr: any) {
        console.warn('[TTS Preview] Google TTS failed, falling back to Synthetic:', googleErr.message);
        const synth = new SyntheticProvider();
        result = await synth.synthesize(textToSynthesize, { voice: voiceToUse, speed: playbackSpeed });
        usedProviderName = synth.name;
      }
    }

    const storageDir = getStorageDir();
    const audioDir = path.join(storageDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const previewFileName = `preview_${Date.now()}.wav`;
    const previewFilePath = path.join(audioDir, previewFileName);
    fs.writeFileSync(previewFilePath, result.buffer);

    res.json({
      success: true,
      audioUrl: `/api/audio/${previewFileName}`,
      duration: result.duration,
      provider: usedProviderName,
      voice: voiceToUse,
      speed: playbackSpeed,
      text: textToSynthesize
    });
  } catch (err: any) {
    console.error('[TTS Preview] Fatal error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
