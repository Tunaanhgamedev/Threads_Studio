import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_SOURCE = process.env.THREADS_TOKEN_ENCRYPTION_KEY || 'threads_studio_master_encryption_key_2026_mmo';
const MASTER_KEY = crypto.createHash('sha256').update(DEFAULT_KEY_SOURCE).digest();

/**
 * Encrypt access token using AES-256-GCM with authentication tag
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt access token using AES-256-GCM. 
 * Gracefully handles legacy plaintext tokens if not yet encrypted.
 */
export function decryptToken(encryptedString: string): string {
  if (!encryptedString) return '';
  const parts = encryptedString.split(':');
  
  // If not in iv:tag:data format, return bare string as legacy fallback
  if (parts.length !== 3) {
    return encryptedString;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.warn('[Crypto] Token decryption failed, returning raw string:', err.message);
    return encryptedString;
  }
}
