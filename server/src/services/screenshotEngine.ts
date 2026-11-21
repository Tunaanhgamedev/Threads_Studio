import fs from 'fs';
import path from 'path';
import { chromium, Browser } from 'playwright';
import { db } from '../db.js';
import { Project, ThreadPost, ThreadComment, ScreenshotItem } from '../types.js';
import { getStorageDir } from '../storagePath.js';

export interface RenderOptions {
  theme?: 'light' | 'dark';
  aspectRatio?: '9:16' | '16:9' | '1:1';
  scale?: number;
  bgStyle?: 'white' | 'dark' | 'transparent';
  borderRadius?: number;
  maskAuthor?: boolean;
}

export class ScreenshotEngine {
  private static browserInstance: Browser | null = null;

  private static async getBrowser(): Promise<Browser> {
    if (this.browserInstance && this.browserInstance.isConnected()) {
      return this.browserInstance;
    }

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    };

    if (fs.existsSync(chromePath)) {
      launchOptions.executablePath = chromePath;
    } else if (fs.existsSync(edgePath)) {
      launchOptions.executablePath = edgePath;
    }

    this.browserInstance = await chromium.launch(launchOptions);
    return this.browserInstance;
  }

  private static getDimensions(ratio: '9:16' | '16:9' | '1:1'): { width: number; height: number } {
    switch (ratio) {
      case '16:9': return { width: 1920, height: 1080 };
      case '1:1': return { width: 1080, height: 1080 };
      case '9:16':
      default: return { width: 1080, height: 1920 };
    }
  }

  /**
   * HTML Template for Post Card
   */
  private static getPostHtml(post: ThreadPost, options: RenderOptions): string {
    const isDark = options.theme === 'dark';
    const mask = options.maskAuthor ?? false;
    const displayName = mask ? 'Người dùng ẩn danh' : post.displayName;
    const username = mask ? 'anonymous' : post.username;
    const cardBg = isDark ? '#101726' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const subtextColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#1e293b' : '#e2e8f0';
    const radius = options.borderRadius ?? 24;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: auto;
            height: auto;
            display: inline-block;
            padding: 30px;
            background: transparent !important;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          }
          .card {
            width: 820px;
            background: ${cardBg};
            color: ${textColor};
            border-radius: ${radius}px;
            padding: 40px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px ${borderColor};
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
          }
          .author-info {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 2px solid ${borderColor};
            object-fit: cover;
          }
          .names {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .display-name {
            font-size: 24px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            background: #2563eb;
            color: white;
            border-radius: 50%;
            font-size: 13px;
          }
          .username {
            font-size: 18px;
            color: ${subtextColor};
          }
          .time {
            font-size: 18px;
            color: ${subtextColor};
          }
          .content {
            font-size: 30px;
            font-weight: 500;
            line-height: 1.45;
            margin-bottom: 32px;
            word-break: break-word;
          }
          .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 24px;
            border-top: 1px solid ${borderColor};
            color: ${subtextColor};
            font-size: 18px;
          }
          .actions {
            display: flex;
            align-items: center;
            gap: 28px;
          }
          .action-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }
          .threads-logo {
            font-size: 20px;
            font-weight: 800;
            color: #2563eb;
            letter-spacing: 1px;
          }
          .media-gallery {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }
          .post-media-img {
            width: 100%;
            max-height: 480px;
            object-fit: cover;
            border-radius: 16px;
            border: 1px solid ${borderColor};
          }
        </style>
      </head>
      <body>
        <div class="card" id="card">
          <div class="header">
            <div class="author-info">
              <span style="font-size: 28px; font-weight: 700; color: ${subtextColor}; margin-right: 4px; line-height: 1; user-select: none;">‹</span>
              <img class="avatar" src="${post.avatar}" alt="avatar" />
              <div class="names">
                <div class="display-name">
                  <span>${displayName}</span>
                  ${post.verified && !mask ? '<span class="badge">✓</span>' : ''}
                </div>
                <div class="username">@${username}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 16px; color: ${subtextColor};">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
          </div>
            <div class="time">${post.timestamp}</div>
          </div>
          <div class="content">${post.content}</div>
          ${post.mediaUrls && post.mediaUrls.length > 0 ? `
            <div class="media-gallery">
              ${post.mediaUrls.map((u: string) => `<img class="post-media-img" src="${u}" alt="Attachment" />`).join('')}
            </div>
          ` : ''}
          <div class="footer">
            <div class="actions">
              <div class="action-item" style="color: #ef4444;">
                <span>❤️</span>
                <span>${post.likes.toLocaleString()}</span>
              </div>
              <div class="action-item">
                <span>💬</span>
                <span>${post.repliesCount}</span>
              </div>
              <div class="action-item">
                <span>🔁</span>
              </div>
            </div>
            <div class="threads-logo">@ THREADS</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML Template for Comment Card
   */
  private static getCommentHtml(comment: ThreadComment, options: RenderOptions): string {
    const isDark = options.theme === 'dark';
    const cardBg = isDark ? '#101726' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const subtextColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? '#1e293b' : '#e2e8f0';
    const radius = options.borderRadius ?? 24;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: auto;
            height: auto;
            display: inline-block;
            padding: 30px;
            background: transparent !important;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          }
          .card {
            width: 820px;
            background: ${cardBg};
            color: ${textColor};
            border-radius: ${radius}px;
            padding: 36px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px ${borderColor};
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .author-info {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .avatar {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            border: 2px solid ${borderColor};
            object-fit: cover;
          }
          .names {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .display-name {
            font-size: 22px;
            font-weight: 700;
          }
          .username {
            font-size: 17px;
            color: ${subtextColor};
          }
          .time {
            font-size: 17px;
            color: ${subtextColor};
          }
          .content {
            font-size: 28px;
            font-weight: 500;
            line-height: 1.45;
            margin-bottom: 28px;
            word-break: break-word;
          }
          .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 20px;
            border-top: 1px solid ${borderColor};
            color: ${subtextColor};
            font-size: 17px;
          }
          .actions {
            display: flex;
            align-items: center;
            gap: 24px;
          }
          .action-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }
          .comment-tag {
            background: rgba(37, 99, 235, 0.1);
            color: #3b82f6;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="card" id="card">
          <div class="header">
            <div class="author-info">
              <span style="font-size: 26px; font-weight: 700; color: ${subtextColor}; margin-right: 4px; line-height: 1; user-select: none;">‹</span>
              <img class="avatar" src="${comment.avatar}" alt="avatar" />
              <div class="names">
                <div class="display-name">${comment.displayName}</div>
                <div class="username">@${comment.username}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 14px; color: ${subtextColor};">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
          </div>
            <div class="time">${comment.timestamp}</div>
          </div>
          <div class="content">${comment.content}</div>
          <div class="footer">
            <div class="actions">
              <div class="action-item" style="color: #ef4444;">
                <span>❤️</span>
                <span>${comment.likes.toLocaleString()}</span>
              </div>
              <div class="action-item">
                <span>💬</span>
              </div>
            </div>
            <div class="comment-tag">Bình luận Threads</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render HTML to PNG via Playwright
   */
  private static async captureHtml(html: string, outputPath: string, width: number, height: number): Promise<void> {
    const browser = await this.getBrowser();
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1
    });

    try {
      await page.setContent(html, { waitUntil: 'load' });
      // Small pause for font rendering
      await page.waitForTimeout(120);
      const cardEl = await page.$('#card');
      if (cardEl) {
        await cardEl.screenshot({ path: outputPath, omitBackground: true });
      } else {
        await page.screenshot({ path: outputPath, omitBackground: true });
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Render Post Screenshot
   */
  static async renderPost(project: Project, options: RenderOptions = {}): Promise<ScreenshotItem> {
    const ratio = options.aspectRatio || project.config?.aspectRatio || '9:16';
    const theme = options.theme || 'light';
    const { width, height } = this.getDimensions(ratio);

    const storageDir = getStorageDir();
    const imagesDir = path.join(storageDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const id = `ss_post_${Date.now()}`;
    const fileName = `${id}.png`;
    const filePath = path.join(imagesDir, fileName);
    const fileUrl = `/api/images/${fileName}`;

    const html = this.getPostHtml(project.post, { ...options, aspectRatio: ratio, theme });
    await this.captureHtml(html, filePath, width, height);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO screenshots (id, project_id, type, ref_id, file_path, file_url, theme, aspect_ratio, width, height, created_at)
      VALUES (?, ?, 'post', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project.id, project.post.id, filePath, fileUrl, theme, ratio, width, height, now);

    return {
      id,
      projectId: project.id,
      type: 'post',
      refId: project.post.id,
      filePath,
      fileUrl,
      theme,
      aspectRatio: ratio,
      width,
      height,
      createdAt: now
    };
  }

  /**
   * Render Comment Screenshot
   */
  static async renderComment(project: Project, comment: ThreadComment, options: RenderOptions = {}): Promise<ScreenshotItem> {
    const ratio = options.aspectRatio || project.config?.aspectRatio || '9:16';
    const theme = options.theme || 'light';
    const { width, height } = this.getDimensions(ratio);

    const storageDir = getStorageDir();
    const imagesDir = path.join(storageDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const id = `ss_cmt_${comment.id}_${Date.now()}`;
    const fileName = `${id}.png`;
    const filePath = path.join(imagesDir, fileName);
    const fileUrl = `/api/images/${fileName}`;

    const html = this.getCommentHtml(comment, { ...options, aspectRatio: ratio, theme });
    await this.captureHtml(html, filePath, width, height);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO screenshots (id, project_id, type, ref_id, file_path, file_url, theme, aspect_ratio, width, height, created_at)
      VALUES (?, ?, 'comment', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, project.id, comment.id, filePath, fileUrl, theme, ratio, width, height, now);

    return {
      id,
      projectId: project.id,
      type: 'comment',
      refId: comment.id,
      filePath,
      fileUrl,
      theme,
      aspectRatio: ratio,
      width,
      height,
      createdAt: now
    };
  }

  /**
   * Batch render: Post + All selected comments
   */
  static async renderBatch(project: Project, options: RenderOptions = {}): Promise<ScreenshotItem[]> {
    const results: ScreenshotItem[] = [];

    // 1. Post
    const postItem = await this.renderPost(project, options);
    results.push(postItem);

    // 2. Selected comments
    const selectedComments = project.comments.filter(c => c.selected);
    for (const c of selectedComments) {
      const commentItem = await this.renderComment(project, c, options);
      results.push(commentItem);
    }

    return results;
  }

  /**
   * List all screenshots for a project
   */
  static listScreenshots(projectId: string): ScreenshotItem[] {
    const rows = db.prepare('SELECT * FROM screenshots WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
    return rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      type: r.type as 'post' | 'comment',
      refId: r.ref_id,
      filePath: r.file_path,
      fileUrl: r.file_url,
      theme: r.theme as 'light' | 'dark',
      aspectRatio: r.aspect_ratio as '9:16' | '16:9' | '1:1',
      width: r.width,
      height: r.height,
      createdAt: r.created_at
    }));
  }

  /**
   * Delete a screenshot
   */
  static deleteScreenshot(id: string): boolean {
    const row = db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as any;
    if (row) {
      try {
        if (fs.existsSync(row.file_path)) {
          fs.unlinkSync(row.file_path);
        }
      } catch (e) {
        console.error('Failed to unlink screenshot file', e);
      }
      db.prepare('DELETE FROM screenshots WHERE id = ?').run(id);
      return true;
    }
    return false;
  }
}
