import path from 'path';
import fs from 'fs';

export function getStorageDir(): string {
  // If run from workspace root E:\Threads_Studio
  const candidate1 = path.resolve(process.cwd(), 'storage');
  if (fs.existsSync(candidate1)) {
    return candidate1;
  }
  // If run from E:\Threads_Studio\server
  const candidate2 = path.resolve(process.cwd(), '../storage');
  if (fs.existsSync(candidate2)) {
    return candidate2;
  }
  // Default fallback
  const fallback = path.resolve(process.cwd(), 'storage');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}
