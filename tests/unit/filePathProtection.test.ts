import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';

// Path traversal validation utility
export function sanitizeSafePath(baseDir: string, relativeOrTarget: string): string {
  if (relativeOrTarget.includes('\0')) {
    throw new Error('Phát hiện Null byte độc hại trong đường dẫn file');
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativeOrTarget);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error(`Path traversal phát hiện! Đường dẫn nằm ngoài phạm vi an toàn: ${relativeOrTarget}`);
  }

  return resolvedTarget;
}

describe('2. Kiểm tra bảo vệ đường dẫn file (Path Traversal Protection)', () => {
  const allowedBaseDir = 'E:\\Threads_Studio\\storage';

  test('Test 4: Ngăn chặn triệt để các payload path traversal vượt cấp (../../etc/passwd)', () => {
    const maliciousPayloads = [
      '../../windows/system32/calc.exe',
      '..\\..\\secret.env',
      'videos/../../../sensitive.db',
      'temp/..\\..\\config.json'
    ];

    for (const payload of maliciousPayloads) {
      assert.throws(() => {
        sanitizeSafePath(allowedBaseDir, payload);
      }, /Path traversal phát hiện/, `Payload "${payload}" phải bị chặn`);
    }
  });

  test('Test 5: Từ chối các chuỗi chứa ký tự Null Byte (\0) gây bypass', () => {
    const nullBytePayload = 'videos/avatar.png\0.exe';
    assert.throws(() => {
      sanitizeSafePath(allowedBaseDir, nullBytePayload);
    }, /Null byte độc hại/);
  });

  test('Test 6: Chuẩn hóa và cho phép đường dẫn hợp lệ bên trong storage directory', () => {
    const validRelative = 'videos/render_1080p.mp4';
    const safeResult = sanitizeSafePath(allowedBaseDir, validRelative);
    assert.strictEqual(
      safeResult.toLowerCase(),
      path.resolve(allowedBaseDir, validRelative).toLowerCase()
    );
  });
});
