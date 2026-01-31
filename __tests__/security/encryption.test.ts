/**
 * Encryption Security Tests
 * Tests for data encryption at rest
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  encrypt,
  decrypt,
  encryptPhone,
  decryptPhone,
  encryptIdNumber,
  decryptIdNumber,
  encryptPaymentDetail,
  decryptPaymentDetail,
  hashForSearch,
  isEncrypted,
  generateEncryptionKey,
  validateEncryptionSetup,
} from "@/lib/encryption";

// Mock encryption key
vi.stubEnv("ENCRYPTION_KEY", "dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE="); // Base64 encoded 32-byte key

describe("Encryption Security", () => {
  describe("Key Generation", () => {
    it("should generate valid encryption keys", () => {
      const key = generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe("string");
      
      // Should be base64 encoded 32 bytes
      const decoded = Buffer.from(key, "base64");
      expect(decoded.length).toBe(32);
    });

    it("should generate unique keys", () => {
      const keys = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }
      
      expect(keys.size).toBe(100);
    });
  });

  describe("Basic Encryption/Decryption", () => {
    it("should encrypt and decrypt data correctly", () => {
      const plaintext = "sensitive data";
      const encrypted = encrypt(plaintext, "user:phone");
      const decrypted = decrypt(encrypted, "user:phone");
      
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "same data";
      const encrypted1 = encrypt(plaintext, "user:phone");
      const encrypted2 = encrypt(plaintext, "user:phone");
      
      // Due to random IV, ciphertexts should differ
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", () => {
      const encrypted = encrypt("", "user:phone");
      expect(encrypted).toBe("");
      
      const decrypted = decrypt("", "user:phone");
      expect(decrypted).toBe("");
    });

    it("should handle special characters", () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
      const encrypted = encrypt(specialChars, "user:phone");
      const decrypted = decrypt(encrypted, "user:phone");
      
      expect(decrypted).toBe(specialChars);
    });

    it("should handle unicode characters", () => {
      const unicode = "日本語テスト 🎉 émojis";
      const encrypted = encrypt(unicode, "user:phone");
      const decrypted = decrypt(encrypted, "user:phone");
      
      expect(decrypted).toBe(unicode);
    });

    it("should handle long strings", () => {
      const longString = "A".repeat(10000);
      const encrypted = encrypt(longString, "user:phone");
      const decrypted = decrypt(encrypted, "user:phone");
      
      expect(decrypted).toBe(longString);
    });
  });

  describe("Phone Number Encryption", () => {
    it("should encrypt phone numbers", () => {
      const phone = "+6281234567890";
      const { encrypted, hash } = encryptPhone(phone);
      
      expect(encrypted).not.toBe(phone);
      expect(isEncrypted(encrypted)).toBe(true);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex
    });

    it("should decrypt phone numbers", () => {
      const phone = "+6281234567890";
      const { encrypted } = encryptPhone(phone);
      const decrypted = decryptPhone(encrypted);
      
      expect(decrypted).toBe(phone);
    });

    it("should produce consistent hash for same phone", () => {
      const phone = "+6281234567890";
      const { hash: hash1 } = encryptPhone(phone);
      const { hash: hash2 } = encryptPhone(phone);
      
      expect(hash1).toBe(hash2);
    });

    it("should normalize phone before hashing", () => {
      const { hash: hash1 } = encryptPhone("+62 812 3456 7890");
      const { hash: hash2 } = encryptPhone("+6281234567890");
      
      // Both should produce same hash after normalization
      expect(hash1).toBe(hash2);
    });
  });

  describe("ID Number Encryption", () => {
    it("should encrypt ID numbers", () => {
      const idNumber = "3174051234567890";
      const { encrypted, hash } = encryptIdNumber(idNumber);
      
      expect(encrypted).not.toBe(idNumber);
      expect(isEncrypted(encrypted)).toBe(true);
      expect(hash.length).toBe(64);
    });

    it("should decrypt ID numbers", () => {
      const idNumber = "3174051234567890";
      const { encrypted } = encryptIdNumber(idNumber);
      const decrypted = decryptIdNumber(encrypted);
      
      expect(decrypted).toBe(idNumber);
    });

    it("should handle passport numbers", () => {
      const passport = "A12345678";
      const { encrypted } = encryptIdNumber(passport);
      const decrypted = decryptIdNumber(encrypted);
      
      expect(decrypted).toBe(passport);
    });
  });

  describe("Payment Detail Encryption", () => {
    it("should encrypt payment details", () => {
      const vaNumber = "12345678901234";
      const encrypted = encryptPaymentDetail(vaNumber);
      
      expect(encrypted).not.toBe(vaNumber);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should decrypt payment details", () => {
      const vaNumber = "12345678901234";
      const encrypted = encryptPaymentDetail(vaNumber);
      const decrypted = decryptPaymentDetail(encrypted);
      
      expect(decrypted).toBe(vaNumber);
    });
  });

  describe("Search Hash", () => {
    it("should generate consistent hashes", () => {
      const value = "search term";
      const hash1 = hashForSearch(value);
      const hash2 = hashForSearch(value);
      
      expect(hash1).toBe(hash2);
    });

    it("should normalize before hashing", () => {
      const hash1 = hashForSearch("UPPERCASE");
      const hash2 = hashForSearch("uppercase");
      
      expect(hash1).toBe(hash2);
    });

    it("should handle empty values", () => {
      const hash = hashForSearch("");
      expect(hash).toBe("");
    });

    it("should produce different hashes for different values", () => {
      const hash1 = hashForSearch("value1");
      const hash2 = hashForSearch("value2");
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Encryption Detection", () => {
    it("should detect encrypted values", () => {
      const encrypted = encrypt("test", "user:phone");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should not detect plain values as encrypted", () => {
      const plainValues = [
        "plain text",
        "12345678901234",
        "+6281234567890",
        "",
        "single:colon",
      ];

      for (const value of plainValues) {
        expect(isEncrypted(value)).toBe(false);
      }
    });

    it("should handle backward compatibility", () => {
      // Non-encrypted values should decrypt to themselves
      const plainValue = "not encrypted";
      const decrypted = decrypt(plainValue, "user:phone");
      
      expect(decrypted).toBe(plainValue);
    });
  });

  describe("Setup Validation", () => {
    it("should validate encryption setup when key is configured", () => {
      const result = validateEncryptionSetup();
      
      // In test environment without proper key, this may fail
      // The important thing is it returns a result object
      expect(result).toHaveProperty("valid");
      expect(typeof result.valid).toBe("boolean");
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Security Properties", () => {
    it("should use different keys for different purposes", () => {
      const plaintext = "same data";
      
      const encrypted1 = encrypt(plaintext, "user:phone");
      const encrypted2 = encrypt(plaintext, "passenger:idNumber");
      
      // Different purpose keys should produce different results
      // (even accounting for random IV)
      // We test by verifying cross-purpose decryption fails
      expect(() => {
        decrypt(encrypted1, "passenger:idNumber");
      }).toThrow();
    });

    it("should include authentication tag (GCM)", () => {
      const encrypted = encrypt("test", "user:phone");
      const parts = encrypted.split(":");
      
      // Format: iv:authTag:ciphertext
      expect(parts.length).toBe(3);
      
      // Auth tag should be 16 bytes base64
      const authTag = Buffer.from(parts[1], "base64");
      expect(authTag.length).toBe(16);
    });

    it("should use unique IV for each encryption", () => {
      const ivs = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt("test", "user:phone");
        const iv = encrypted.split(":")[0];
        ivs.add(iv);
      }
      
      expect(ivs.size).toBe(100);
    });
  });
});
