import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ReliabilityService } from '../../server/src/services/reliabilityService.js';

describe('5. Kiểm tra che thông tin nhạy cảm trong log (Secret Redaction)', () => {
  const service = ReliabilityService.getInstance();

  test('Test 13: Tự động che chuỗi Bearer token trong log message', () => {
    const rawMessage = 'User authorized with Bearer ya29.a0ARrdaM987654321_secret_token_data';
    const masked = service.maskSensitiveData(rawMessage);

    assert.ok(!masked.includes('ya29.a0ARrdaM987654321'), 'Không được chứa token gốc');
    assert.ok(masked.includes('Bearer [REDACTED_TOKEN]'), 'Phải được thay bằng [REDACTED_TOKEN]');
  });

  test('Test 14: Tự động che refresh_token và client_secret trong URL hoặc query parameters', () => {
    const rawQuery = 'https://oauth2.googleapis.com/token?refresh_token=1//0gXYZ987654&client_secret=GOCSPX-secret12345';
    const masked = service.maskSensitiveData(rawQuery);

    assert.ok(!masked.includes('1//0gXYZ987654'), 'Refresh token phải bị che');
    assert.ok(!masked.includes('GOCSPX-secret12345'), 'Client secret phải bị che');
    assert.ok(masked.includes('refresh_token=[REDACTED]'));
    assert.ok(masked.includes('client_secret=[REDACTED]'));
  });

  test('Test 15: Che các trường nhạy cảm trong JSON lồng nhau (password, token, encryptionKey)', () => {
    const nestedData = {
      user: 'admin',
      credentials: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.topsecret',
        encryptionKey: 'SuperKey32BytesForAESEncryption!',
        clientSecret: 'secret_abc_999'
      },
      publicInfo: {
        channelName: 'Threads Meme Studio'
      }
    };

    const sanitized = service.maskSensitiveData(nestedData);

    assert.strictEqual(sanitized.publicInfo.channelName, 'Threads Meme Studio', 'Thông tin công khai phải giữ nguyên');
    assert.ok(!sanitized.credentials.accessToken.includes('topsecret'), 'accessToken trong object phải được che');
    assert.ok(!sanitized.credentials.encryptionKey.includes('SuperKey'), 'encryptionKey trong object phải được che');
    assert.ok(!sanitized.credentials.clientSecret.includes('secret_abc_999'), 'clientSecret phải được che');
  });

  test('Test 16: Tự động phát hiện và che định dạng Google API Key (AIza...)', () => {
    const logWithGoogleKey = 'Failed to fetch YouTube Data API using key AIzaSyD9876543210123456789012345678901';
    const masked = service.maskSensitiveData(logWithGoogleKey);

    assert.ok(!masked.includes('AIzaSyD9876543210123456789012345678901'));
    assert.ok(masked.includes('AIza...[REDACTED]'));
  });
});
