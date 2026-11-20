import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import projectsRouter from './routes/projects.js';
import ttsRouter from './routes/tts.js';
import settingsRouter from './routes/settings.js';
import screenshotsRouter from './routes/screenshots.js';
import voiceRouter from './routes/voice.js';
import templatesRouter from './routes/templates.js';
import mediaRouter from './routes/media.js';
import { getStorageDir } from './storagePath.js';

export const app = express();
const PORT = Number(process.env.PORT) || 3210;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Ensure storage subfolders exist
const storageDir = getStorageDir();
const videoDir = path.join(storageDir, 'videos');
const imageDir = path.join(storageDir, 'images');
const audioDir = path.join(storageDir, 'audio');

[storageDir, videoDir, imageDir, audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Static routes to access generated video/audio/image files
app.use('/api/videos', express.static(videoDir));
app.use('/api/images', express.static(imageDir));
app.use('/api/audio', express.static(audioDir));

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects', screenshotsRouter);
app.use('/api/projects', voiceRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/media', mediaRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Threads Content Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Threads Content Studio Server] Running on http://127.0.0.1:${PORT}`);
});
