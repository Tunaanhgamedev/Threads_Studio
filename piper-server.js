const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = parseInt(process.env.PIPER_PORT || '5000', 10);
const PIPER_DIR = path.join(__dirname, 'piper');
const PIPER_EXE = path.join(PIPER_DIR, 'piper.exe');
const MODEL_DIR = path.join(PIPER_DIR, 'models');
const DEFAULT_MODEL_NAME = 'vi_VN-vais1000-medium';
const DEFAULT_MODEL_PATH = path.join(MODEL_DIR, `${DEFAULT_MODEL_NAME}.onnx`);
const DEFAULT_CONFIG_PATH = path.join(MODEL_DIR, `${DEFAULT_MODEL_NAME}.onnx.json`);

// Read sample rate from model config json if available
function getSampleRate() {
  try {
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, 'utf8'));
      if (config.audio && config.audio.sample_rate) {
        return config.audio.sample_rate;
      }
    }
  } catch (err) {
    // ignore
  }
  return 22050;
}

// Build standard 44-byte RIFF/WAVE header
function buildWavHeader(dataLength, sampleRate = 22050, channels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check & status
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health' || req.url === '/api/status')) {
    const exeExists = fs.existsSync(PIPER_EXE);
    const modelExists = fs.existsSync(DEFAULT_MODEL_PATH);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: exeExists && modelExists ? 'ok' : 'degraded',
      service: 'Piper TTS Server (Node.js Bridge)',
      piperExecutable: exeExists,
      modelLoaded: modelExists,
      activeModel: DEFAULT_MODEL_NAME,
      sampleRate: getSampleRate(),
      port: PORT
    }));
    return;
  }

  // Synthesize text to WAV audio
  if (req.method === 'POST' && (req.url === '/synthesize' || req.url === '/api/synthesize')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Guard against payload abuse (> 5MB)
      if (body.length > 5 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const text = (payload.text || '').trim();

        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Field "text" is required.' }));
          return;
        }

        if (!fs.existsSync(PIPER_EXE)) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'piper.exe not found. Please run .\\setup-piper.ps1 first.'
          }));
          return;
        }

        if (!fs.existsSync(DEFAULT_MODEL_PATH)) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: `Voice model not found: ${DEFAULT_MODEL_PATH}. Please run .\\setup-piper.ps1 first.`
          }));
          return;
        }

        const lengthScale = payload.length_scale || (payload.speed ? 1 / payload.speed : 1.0);
        const speakerId = payload.speaker_id ?? 0;

        const args = [
          '--model', DEFAULT_MODEL_PATH,
          '--output-raw'
        ];

        if (lengthScale) {
          args.push('--length-scale', String(lengthScale));
        }

        if (speakerId) {
          args.push('--speaker', String(speakerId));
        }

        const child = spawn(PIPER_EXE, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        const pcmChunks = [];
        let stderrData = '';

        child.stdout.on('data', chunk => pcmChunks.push(chunk));
        child.stderr.on('data', chunk => { stderrData += chunk.toString(); });

        child.on('error', err => {
          console.error('[Piper Server] Spawn error:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to spawn piper process: ' + err.message }));
          }
        });

        child.on('close', code => {
          if (code !== 0) {
            console.error(`[Piper Server] Exited with code ${code}. Stderr: ${stderrData}`);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Piper synthesis failed (exit code ${code})`, details: stderrData }));
            }
            return;
          }

          const rawPcm = Buffer.concat(pcmChunks);
          const sampleRate = getSampleRate();
          const wavHeader = buildWavHeader(rawPcm.length, sampleRate, 1, 16);
          const fullWav = Buffer.concat([wavHeader, rawPcm]);

          res.writeHead(200, {
            'Content-Type': 'audio/wav',
            'Content-Length': fullWav.length,
            'X-Piper-Sample-Rate': sampleRate,
            'X-Piper-Duration': (rawPcm.length / (sampleRate * 2)).toFixed(2)
          });
          res.end(fullWav);
        });

        // Feed Vietnamese text into piper stdin encoded as UTF-8
        child.stdin.write(text, 'utf8');
        child.stdin.end();

      } catch (err) {
        console.error('[Piper Server] JSON parse error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`==========================================================`);
  console.log(`[Piper TTS Server] Running on http://127.0.0.1:${PORT}`);
  console.log(`[Piper TTS Server] Piper Executable: ${fs.existsSync(PIPER_EXE) ? 'Found' : 'MISSING (Run .\\setup-piper.ps1)'}`);
  console.log(`[Piper TTS Server] Model: ${DEFAULT_MODEL_NAME} (${fs.existsSync(DEFAULT_MODEL_PATH) ? 'Ready' : 'MISSING'})`);
  console.log(`[Piper TTS Server] Sample Rate: ${getSampleRate()} Hz`);
  console.log(`==========================================================`);
});
