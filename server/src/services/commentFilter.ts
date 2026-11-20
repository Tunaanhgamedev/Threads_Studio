import { ThreadComment } from '../types.js';

export interface CommentFilterOptions {
  limit?: number; // 5, 10, 20, 50, -1 (all)
  sortBy?: 'likes_desc' | 'likes_asc' | 'latest' | 'oldest' | 'order';
  minLength?: number;
  maxLength?: number;
  onlyWithEmoji?: boolean;
  minLikes?: number;
  deduplicate?: boolean;
}

export class CommentFilterService {
  // Regex to detect emojis
  private static emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;

  static applyFilters(comments: ThreadComment[], options: CommentFilterOptions): ThreadComment[] {
    let result = [...comments];

    // 1. Min likes filter
    if (options.minLikes !== undefined && options.minLikes > 0) {
      result = result.filter(c => c.likes >= options.minLikes!);
    }

    // 2. Length filter
    if (options.minLength !== undefined && options.minLength > 0) {
      result = result.filter(c => c.content.length >= options.minLength!);
    }
    if (options.maxLength !== undefined && options.maxLength > 0) {
      result = result.filter(c => c.content.length <= options.maxLength!);
    }

    // 3. Emoji filter
    if (options.onlyWithEmoji) {
      result = result.filter(c => this.emojiRegex.test(c.content));
    }

    // 4. Deduplicate (remove identical or spam content)
    if (options.deduplicate) {
      const seen = new Set<string>();
      result = result.filter(c => {
        const normalized = c.content.toLowerCase().trim().replace(/[.,!?;:]/g, '');
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    // 5. Sorting
    switch (options.sortBy) {
      case 'likes_desc':
        result.sort((a, b) => b.likes - a.likes);
        break;
      case 'likes_asc':
        result.sort((a, b) => a.likes - b.likes);
        break;
      case 'latest':
        // If timestamp strings or order
        result.sort((a, b) => b.order - a.order);
        break;
      case 'oldest':
        result.sort((a, b) => a.order - b.order);
        break;
      case 'order':
      default:
        result.sort((a, b) => a.order - b.order);
        break;
    }

    // 6. Limit
    if (options.limit && options.limit > 0 && options.limit < result.length) {
      result = result.slice(0, options.limit);
    }

    return result;
  }
}
