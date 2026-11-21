import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import fs from 'fs';

let mainWindow: any = null;
let backendProcess: ChildProcess | null = null;
let isQuitting = false;

// 1. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Focus window if user opened a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Check for deep link on Windows
    const deepLinkUrl = commandLine.find(arg => arg.startsWith('threads-studio://'));
    if (deepLinkUrl && mainWindow) {
      mainWindow.webContents.send('oauth-callback', deepLinkUrl);
    }
  });
}

// 2. Register Deep Link Protocol (threads-studio://)
if ((process as any).defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('threads-studio', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('threads-studio');
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('oauth-callback', url);
  }
});

// Helper: Check if backend is alive
function checkBackendHealth(timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3210/api/health', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Helper: Start Backend Server if not already running
async function startBackendServer(): Promise<void> {
  const isAlive = await checkBackendHealth();
  if (isAlive) {
    console.log('[Desktop] Backend API already running on port 3210.');
    return;
  }

  console.log('[Desktop] Starting local Backend Express Server...');

  // Resolve backend server entry file
  const candidatePaths = [
    path.resolve(__dirname, '../../server/dist/index.js'),
    path.resolve(__dirname, '../server/dist/index.js'),
    path.resolve((process as any).resourcesPath || '', 'server/dist/index.js'),
    path.resolve(__dirname, 'server/dist/index.js')
  ];

  const serverScript = candidatePaths.find(p => fs.existsSync(p));

  // Read custom data directory if saved in AppData config
  const appData = process.env.APPDATA || path.join(process.env.HOME || '', '.config');
  const configFile = path.join(appData, 'threads-content-studio', 'config.json');
  let customDataDir: string | undefined;

  try {
    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (config.dataDir) customDataDir = config.dataDir;
    }
  } catch {}

  const env: Record<string, string | undefined> = {
    ...process.env,
    PORT: '3210',
    ELECTRON_RUN: 'true'
  };

  if (customDataDir) {
    env.THREADS_STUDIO_DATA_DIR = customDataDir;
  }

  if (serverScript) {
    backendProcess = spawn(process.execPath.includes('electron') ? 'node' : process.execPath, [serverScript], {
      env,
      stdio: 'pipe',
      windowsHide: true
    });

    backendProcess.stdout?.on('data', (d) => console.log(`[Backend] ${d.toString().trim()}`));
    backendProcess.stderr?.on('data', (d) => console.error(`[Backend ERR] ${d.toString().trim()}`));
  } else {
    // Development fallback using tsx
    console.log('[Desktop Dev] Launching dev server with tsx...');
    const devServerPath = path.resolve(__dirname, '../../server/src/index.ts');
    backendProcess = spawn('npx', ['tsx', devServerPath], {
      env,
      shell: true,
      stdio: 'inherit'
    });
  }

  // Poll until ready
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 600));
    if (await checkBackendHealth()) {
      console.log(`[Desktop] Backend API ready after ${(attempt + 1) * 600}ms!`);
      return;
    }
  }

  console.warn('[Desktop] Backend failed to report healthy within 18s. Opening UI anyway.');
}

// 3. Create Main App Window
async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 750,
    backgroundColor: '#070d19',
    autoHideMenuBar: true,
    title: 'Threads Content Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Handle external link clicks (open in system default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load URL
  // If Vite dev server is running on 5173, load it; otherwise load backend / dist
  const viteAlive = await new Promise<boolean>((resolve) => {
    const req = http.get('http://127.0.0.1:5173', { timeout: 800 }, (res) => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
  });

  if (viteAlive) {
    console.log('[Desktop] Loading Vite Dev Server at http://127.0.0.1:5173');
    await mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    console.log('[Desktop] Loading Production UI at http://127.0.0.1:3210');
    await mainWindow.loadURL('http://127.0.0.1:3210');
  }

  mainWindow.on('close', async (e) => {
    if (!isQuitting) {
      e.preventDefault();
      isQuitting = true;
      console.log('[Desktop] Window closing. Performing graceful shutdown...');

      // Notify backend to safely close database & resources
      try {
        const postData = JSON.stringify({});
        const req = http.request('http://127.0.0.1:3210/api/desktop/shutdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 1000
        });
        req.write(postData);
        req.end();
      } catch {}

      setTimeout(() => {
        if (backendProcess) {
          try { backendProcess.kill(); } catch {}
        }
        app.quit();
      }, 500);
    }
  });
}

// 4. App Lifecycle Events
app.whenReady().then(async () => {
  setupIpcHandlers();
  await startBackendServer();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 5. IPC Handlers
function setupIpcHandlers(): void {
  ipcMain.handle('desktop:get-info', () => ({
    isElectron: true,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch
  }));

  ipcMain.handle('desktop:open-external', async (_event, url: string) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('desktop:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục lưu trữ dữ liệu Threads Studio',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}
