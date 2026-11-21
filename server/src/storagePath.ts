import path from 'path';
import fs from 'fs';

export interface StorageConfigInfo {
  storageDir: string;
  isCustom: boolean;
  configFilePath: string;
}

/**
 * Returns the path to the app configuration file in %APPDATA%/threads-content-studio/config.json
 */
export function getAppConfigPath(): string {
  const appData = process.env.APPDATA || (process.platform === 'darwin' 
    ? path.join(process.env.HOME || '', 'Library', 'Application Support') 
    : path.join(process.env.HOME || '', '.config'));
  
  const configDir = path.join(appData, 'threads-content-studio');
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch {}
  }
  return path.join(configDir, 'config.json');
}

/**
 * Reads persistent desktop configuration from config.json
 */
export function readDesktopConfig(): Record<string, any> {
  const configPath = getAppConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[StoragePath] Error reading config.json:', err);
  }
  return {};
}

/**
 * Writes persistent desktop configuration to config.json
 */
export function writeDesktopConfig(updates: Record<string, any>): void {
  const configPath = getAppConfigPath();
  try {
    const current = readDesktopConfig();
    const merged = { ...current, ...updates };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  } catch (err) {
    console.error('[StoragePath] Error writing config.json:', err);
  }
}

/**
 * Resolves the primary storage directory with support for:
 * 1. Environment variable THREADS_STUDIO_DATA_DIR (e.g. D:\Threads_Studio_Data)
 * 2. Persistent config.json dataDir
 * 3. Default workspace storage folder
 */
export function getStorageDir(): string {
  // 1. Check environment variable override
  if (process.env.THREADS_STUDIO_DATA_DIR && process.env.THREADS_STUDIO_DATA_DIR.trim()) {
    const envDir = path.resolve(process.env.THREADS_STUDIO_DATA_DIR.trim());
    if (!fs.existsSync(envDir)) {
      try { fs.mkdirSync(envDir, { recursive: true }); } catch {}
    }
    return envDir;
  }

  // 2. Check persistent user config in AppData
  const config = readDesktopConfig();
  if (config.dataDir && typeof config.dataDir === 'string' && config.dataDir.trim()) {
    const customDir = path.resolve(config.dataDir.trim());
    if (!fs.existsSync(customDir)) {
      try { fs.mkdirSync(customDir, { recursive: true }); } catch {}
    }
    return customDir;
  }

  // 3. Fallback to workspace storage directory
  const candidate1 = path.resolve(process.cwd(), 'storage');
  if (fs.existsSync(candidate1)) {
    return candidate1;
  }

  const candidate2 = path.resolve(process.cwd(), '../storage');
  if (fs.existsSync(candidate2)) {
    return candidate2;
  }

  const fallback = path.resolve(process.cwd(), 'storage');
  if (!fs.existsSync(fallback)) {
    try { fs.mkdirSync(fallback, { recursive: true }); } catch {}
  }
  return fallback;
}

/**
 * Inspect storage configuration metadata
 */
export function getStorageConfig(): StorageConfigInfo {
  const activeDir = getStorageDir();
  const config = readDesktopConfig();
  const isCustom = Boolean(process.env.THREADS_STUDIO_DATA_DIR || config.dataDir);

  return {
    storageDir: activeDir,
    isCustom,
    configFilePath: getAppConfigPath()
  };
}

/**
 * Change storage directory to a custom folder (e.g. D:\Threads_Studio_Data or E:\Threads_Studio_Data)
 * and optionally copy all existing database, media, and backups.
 */
export async function setCustomStorageDir(newDir: string, copyData: boolean = true): Promise<{
  success: boolean;
  oldDir: string;
  newDir: string;
  filesCopied: number;
  message: string;
}> {
  const oldDir = getStorageDir();
  const resolvedNewDir = path.resolve(newDir);

  if (oldDir.toLowerCase() === resolvedNewDir.toLowerCase()) {
    return {
      success: true,
      oldDir,
      newDir: resolvedNewDir,
      filesCopied: 0,
      message: 'Thư mục mới trùng với thư mục lưu trữ hiện tại.'
    };
  }

  // Ensure new directory and standard subdirectories exist
  if (!fs.existsSync(resolvedNewDir)) {
    fs.mkdirSync(resolvedNewDir, { recursive: true });
  }

  const subdirs = ['videos', 'images', 'audio', 'backups', 'logs', 'temp'];
  subdirs.forEach(sub => {
    const p = path.join(resolvedNewDir, sub);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  let filesCopied = 0;

  if (copyData && fs.existsSync(oldDir)) {
    // Helper recursive copy
    const copyRecursive = (src: string, dest: string) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
          copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          try {
            fs.copyFileSync(srcPath, destPath);
            filesCopied++;
          } catch (err) {
            console.warn(`[StoragePath] Could not copy ${srcPath}:`, err);
          }
        }
      }
    };

    copyRecursive(oldDir, resolvedNewDir);
  }

  // Persist into config.json
  writeDesktopConfig({ dataDir: resolvedNewDir });
  process.env.THREADS_STUDIO_DATA_DIR = resolvedNewDir;

  return {
    success: true,
    oldDir,
    newDir: resolvedNewDir,
    filesCopied,
    message: `Đã chuyển dữ liệu lưu trữ thành công sang: ${resolvedNewDir} (${filesCopied} tệp được chuyển giao an toàn)`
  };
}
