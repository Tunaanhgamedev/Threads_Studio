import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

// AES-256-GCM Token Encryption Utility
export function encryptToken(plainText: string, keyString: string): string {
  const key = crypto.createHash('sha256').update(keyString).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decryptToken(encryptedPayload: string, keyString: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Định dạng token mã hóa không hợp lệ (cần iv:ciphertext:tag)');
  }
  
  const [ivHex, cipherHex, tagHex] = parts;
  const key = crypto.createHash('sha256').update(keyString).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

describe('1. Kiểm tra mã hóa token (AES-256-GCM)', () => {
  const testSecretKey = 'TestEncryptionKey_SuperSafe32Chars!';
  const testToken = 'ya29.a0ARrdaM-ThreadsContentStudioRealOAuthTokenExample_12345';

  test('Test 1: Mã hóa và giải mã token thành công trả về đúng chuỗi gốc', () => {
    const encrypted = encryptToken(testToken, testSecretKey);
    assert.notStrictEqual(encrypted, testToken, 'Ciphertext không được trùng với plaintext');
    assert.match(encrypted, /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/, 'Ciphertext phải theo định dạng iv:cipher:tag');
    
    const decrypted = decryptToken(encrypted, testSecretKey);
    assert.strictEqual(decrypted, testToken, 'Giải mã phải khôi phục 100% token ban đầu');
  });

  test('Test 2: Mỗi lần mã hóa với IV ngẫu nhiên sinh ra ciphertext khác nhau hoàn toàn', () => {
    const enc1 = encryptToken(testToken, testSecretKey);
    const enc2 = encryptToken(testToken, testSecretKey);
    assert.notStrictEqual(enc1, enc2, 'Hai lần mã hóa cùng dữ liệu phải có IV và ciphertext khác nhau');
    
    assert.strictEqual(decryptToken(enc1, testSecretKey), testToken);
    assert.strictEqual(decryptToken(enc2, testSecretKey), testToken);
  });

  test('Test 3: Từ chối và ném lỗi khi ciphertext bị chỉnh sửa hoặc sai auth tag', () => {
    const encrypted = encryptToken(testToken, testSecretKey);
    const parts = encrypted.split(':');
    // Tamper with ciphertext by altering last char
    const tamperedCipher = parts[1].slice(0, -2) + (parts[1].endsWith('a') ? 'b' : 'a');
    const tamperedPayload = `${parts[0]}:${tamperedCipher}:${parts[2]}`;
    
    assert.throws(() => {
      decryptToken(tamperedPayload, testSecretKey);
    }, Error, 'Phải ném lỗi khi dữ liệu bị giả mạo');
  });
});
