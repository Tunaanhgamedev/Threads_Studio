import { test, describe } from 'node:test';
import assert from 'node:assert';

export interface ParsedThreadsUrl {
  isValid: boolean;
  username?: string;
  postId?: string;
  cleanUrl?: string;
}

export function parseThreadsUrl(inputUrl: string): ParsedThreadsUrl {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false };
  }

  const cleaned = inputUrl.trim().replace(/\?.*$/, '').replace(/\/+$/, '');
  
  // Standard format: https://www.threads.net/@username/post/POST_ID
  const match = cleaned.match(/threads\.net\/@([a-zA-Z0-9._]+)\/post\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    return {
      isValid: true,
      username: match[1],
      postId: match[2],
      cleanUrl: `https://www.threads.net/@${match[1]}/post/${match[2]}`
    };
  }

  // Short share format: https://www.threads.net/t/POST_ID or /share/POST_ID
  const shareMatch = cleaned.match(/threads\.net\/(?:t|share)\/([a-zA-Z0-9_-]+)/i);
  if (shareMatch) {
    return {
      isValid: true,
      postId: shareMatch[1],
      cleanUrl: `https://www.threads.net/t/${shareMatch[1]}`
    };
  }

  return { isValid: false };
}

describe('3. Kiểm tra trích xuất & chuẩn hóa URL Threads', () => {
  test('Test 7: Trích xuất chính xác username và post id từ URL Threads tiêu chuẩn', () => {
    const url = 'https://www.threads.net/@haminhh.1999/post/DQodErtCtpi';
    const parsed = parseThreadsUrl(url);

    assert.strictEqual(parsed.isValid, true);
    assert.strictEqual(parsed.username, 'haminhh.1999');
    assert.strictEqual(parsed.postId, 'DQodErtCtpi');
    assert.strictEqual(parsed.cleanUrl, 'https://www.threads.net/@haminhh.1999/post/DQodErtCtpi');
  });

  test('Test 8: Chuẩn hóa các URL có query params, tracking igshid hoặc trailing slash', () => {
    const urlWithTracking = 'https://www.threads.net/@viet_story/post/DAbc123XYZ/?igshid=MzRlODBiNWFlZA%3D%3D&sub_action=share///';
    const parsed = parseThreadsUrl(urlWithTracking);

    assert.strictEqual(parsed.isValid, true);
    assert.strictEqual(parsed.username, 'viet_story');
    assert.strictEqual(parsed.postId, 'DAbc123XYZ');
    assert.strictEqual(parsed.cleanUrl, 'https://www.threads.net/@viet_story/post/DAbc123XYZ');
  });

  test('Test 9: Nhận diện và từ chối các URL sai định dạng hoặc không phải từ Threads', () => {
    const invalidUrls = [
      'https://www.facebook.com/groups/12345',
      'https://www.instagram.com/p/Cxyz123/',
      'https://threads.net/not-a-post',
      'just-random-text-without-url'
    ];

    for (const invalid of invalidUrls) {
      const res = parseThreadsUrl(invalid);
      assert.strictEqual(res.isValid, false, `URL "${invalid}" phải bị coi là không hợp lệ`);
    }
  });
});
