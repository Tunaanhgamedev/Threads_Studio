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
import automationRouter from './routes/automation.js';
import threadsConnectorRouter from './routes/threadsConnector.js';
import discoveryRouter from './routes/discovery.js';
import youtubeRouter from './routes/youtube.js';
import aiIntelligenceRouter from './routes/aiIntelligence.js';
import experimentsRouter from './routes/experiments.js';
import { channelsRouter } from './routes/channels.js';
import { reliabilityRouter } from './routes/reliability.js';
import { desktopRouter } from './routes/desktop.js';
import { ThreadsApiService } from './services/threadsApiService.js';
import { DiscoveryService } from './services/discoveryService.js';
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
app.use('/api/automation', automationRouter);
app.use('/api/threads-connector', threadsConnectorRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/intelligence', aiIntelligenceRouter);
app.use('/api/experiments', experimentsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/reliability', reliabilityRouter);
app.use('/api/desktop', desktopRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Threads Content Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown API routes so it never falls through to HTML index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`
  });
});

// Serve frontend production build statically if available
const clientDistDir = path.resolve(process.cwd(), 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Threads Content Studio Server] Running on http://127.0.0.1:${PORT}`);
    // Start Phase 8 background sync scheduler
    ThreadsApiService.initScheduledSync();
    // Start Phase 9 background discovery cron
    DiscoveryService.initDiscoveryCron();
  });
}
