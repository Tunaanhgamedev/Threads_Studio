import { ThreadPost, ThreadComment } from '../types.js';
import { ThreadsExtractor } from './threadsExtractor.js';

export class ThreadsService {
  /**
   * Parse and validate Threads URL
   */
  static parseUrl(url: string): { valid: boolean; postId?: string; username?: string } {
    try {
      let targetUrl = url.trim().replace(/^https?:\/\/(www\.)?threads\.com/i, 'https://www.threads.net');
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      const parsed = new URL(targetUrl);
      if (!parsed.hostname.includes('threads.net') && !parsed.hostname.includes('threads.com')) {
        return { valid: false };
      }
      // Matches: https://www.threads.net/@username/post/POST_ID or /share/POST_ID or /t/POST_ID
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0]?.startsWith('@') && parts[1] === 'post' && parts[2]) {
        return { valid: true, username: parts[0].replace('@', ''), postId: parts[2] };
      }
      if (parts[0] === 'share' && parts[1]) {
        return { valid: true, postId: parts[1] };
      }
      if (parts[0] === 't' && parts[1]) {
        return { valid: true, postId: parts[1] };
      }
      return { valid: true, postId: parts[parts.length - 1] || 'post_default' };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Fetch thread data using the multi-tier extraction pipeline
   */
  static async fetchThreadData(url: string): Promise<{ post: ThreadPost; comments: ThreadComment[] }> {
    const result = await ThreadsExtractor.extract(url);
    return {
      post: result.post,
      comments: result.comments
    };
  }
}
