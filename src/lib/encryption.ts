import crypto from 'crypto';

/**
 * AES-256-GCM Encryption Service
 * 
 * Provides encryption for sensitive data at rest:
 * - User phone numbers
 * - Passenger identity numbers (KTP/Passport)
 * - Payment details (VA numbers)
 * 
 * Features:
 * - AES-256-GCM authenticated encryption
 * - HKDF key derivation for per-purpose keys
 * - Deterministic hashing for searchable fields
 * - Key rotation support
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// Key purposes for HKDF derivation
export type KeyPurpose = 
  | 'user:phone'
  | 'passenger:idNumber'
  | 'payment:details'
  | 'search:hash';

// Cache for derived keys
const keyCache = new Map<string, Buffer>();

/**
 * Get or derive encryption key for a specific purpose
 * Uses HKDF to derive unique keys from the master key
 */
function getKey(purpose: KeyPurpose): Buffer {
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  const cacheKey = `${purpose}:${masterKey.substring(0, 8)}`;
  
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  // Derive purpose-specific key using HKDF
  const derivedKey = crypto.hkdfSync(
    'sha256',
    Buffer.from(masterKey, 'base64'),
    Buffer.from('speedboat-ticket-salt'),
    Buffer.from(purpose),
    KEY_LENGTH
  );

  const keyBuffer = Buffer.from(derivedKey);
  keyCache.set(cacheKey, keyBuffer);
  
  return keyBuffer;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64 encoded: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, purpose: KeyPurpose): string {
  if (!plaintext) return '';

  const key = getKey(purpose);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();

  // Format: base64(iv):base64(authTag):base64(ciphertext)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decrypt(ciphertext: string, purpose: KeyPurpose): string {
  if (!ciphertext) return '';
  
  // Check if this is encrypted data (contains colons)
  if (!ciphertext.includes(':')) {
    // Return as-is if not encrypted (for backward compatibility)
    return ciphertext;
  }

  const [ivBase64, authTagBase64, encryptedBase64] = ciphertext.split(':');
  
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted data format');
  }

  const key = getKey(purpose);
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Create a deterministic hash for searching encrypted fields
 * Uses HMAC-SHA256 for consistent hashing
 */
export function hashForSearch(value: string, purpose: KeyPurpose = 'search:hash'): string {
  if (!value) return '';
  
  const key = getKey(purpose);
  const normalizedValue = value.toLowerCase().trim();
  
  return crypto
    .createHmac('sha256', key)
    .update(normalizedValue)
    .digest('hex');
}

// ============================================
// TYPE-SPECIFIC ENCRYPTION HELPERS
// ============================================

/**
 * Encrypt phone number
 */
export function encryptPhone(phone: string): { encrypted: string; hash: string } {
  return {
    encrypted: encrypt(phone, 'user:phone'),
    hash: hashForSearch(phone.replace(/\D/g, '')), // Hash normalized phone
  };
}

/**
 * Decrypt phone number
 */
export function decryptPhone(encrypted: string): string {
  return decrypt(encrypted, 'user:phone');
}

/**
 * Encrypt identity number (KTP/Passport)
 */
export function encryptIdNumber(idNumber: string): { encrypted: string; hash: string } {
  return {
    encrypted: encrypt(idNumber, 'passenger:idNumber'),
    hash: hashForSearch(idNumber.replace(/\s/g, '')), // Hash normalized ID
  };
}

/**
 * Decrypt identity number
 */
export function decryptIdNumber(encrypted: string): string {
  return decrypt(encrypted, 'passenger:idNumber');
}

/**
 * Encrypt payment details
 */
export function encryptPaymentDetail(detail: string): string {
  return encrypt(detail, 'payment:details');
}

/**
 * Decrypt payment details
 */
export function decryptPaymentDetail(encrypted: string): string {
  return decrypt(encrypted, 'payment:details');
}

// ============================================
// KEY MANAGEMENT
// ============================================

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  return parts.length === 3;
}

/**
 * Re-encrypt data with a new key (for key rotation)
 */
export function reencrypt(
  ciphertext: string,
  purpose: KeyPurpose,
  oldKey: string
): string {
  // Temporarily use old key to decrypt
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;
  keyCache.clear();
  
  const plaintext = decrypt(ciphertext, purpose);
  
  // Restore new key and re-encrypt
  process.env.ENCRYPTION_KEY = originalKey;
  keyCache.clear();
  
  return encrypt(plaintext, purpose);
}

/**
 * Generate a new encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Clear the key cache (useful after key rotation)
 */
export function clearKeyCache(): void {
  keyCache.clear();
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that the encryption key is properly configured
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    return { valid: false, error: 'ENCRYPTION_KEY not set' };
  }
  
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length < 32) {
      return { valid: false, error: 'ENCRYPTION_KEY must be at least 32 bytes' };
    }
    
    // Test encryption/decryption
    const testValue = 'test-encryption-setup';
    const encrypted = encrypt(testValue, 'user:phone');
    const decrypted = decrypt(encrypted, 'user:phone');
    
    if (decrypted !== testValue) {
      return { valid: false, error: 'Encryption/decryption test failed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
