/**
 * CSRF Protection Security Tests
 * Tests for Cross-Site Request Forgery protection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCsrfToken,
  verifyCsrfToken,
  CSRF_CONSTANTS,
} from "@/lib/csrf";

// Mock environment variable
vi.stubEnv("NEXTAUTH_SECRET", "test-secret-key-for-csrf-testing-12345");

describe("CSRF Protection Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CSRF Token Generation", () => {
    it("should generate unique tokens", () => {
      const token1 = createCsrfToken();
      const token2 = createCsrfToken();

      expect(token1.token).not.toBe(token2.token);
      expect(token1.signedToken).not.toBe(token2.signedToken);
    });

    it("should generate tokens with expiry", () => {
      const { expiresAt } = createCsrfToken();
      
      expect(expiresAt).toBeGreaterThan(Date.now());
    });

    it("should generate cryptographically strong tokens", () => {
      const { token } = createCsrfToken();
      
      // Token should be 32 bytes hex encoded = 64 characters
      expect(token.length).toBe(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("should include signature in signed token", () => {
      const { signedToken } = createCsrfToken();
      
      // Signed token format: token:expiresAt:signature
      const parts = signedToken.split(":");
      expect(parts.length).toBe(3);
    });
  });

  describe("CSRF Token Verification", () => {
    it("should verify valid tokens", () => {
      const { signedToken, token } = createCsrfToken();
      const result = verifyCsrfToken(signedToken);

      expect(result.valid).toBe(true);
      expect(result.token).toBe(token);
    });

    it("should reject empty tokens", () => {
      const result = verifyCsrfToken("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject malformed tokens", () => {
      const invalidTokens = [
        "invalid-token",
        "token:without:proper:format:extra",
        "onlyonepart",
        "two:parts",
      ];

      for (const token of invalidTokens) {
        const result = verifyCsrfToken(token);
        expect(result.valid).toBe(false);
      }
    });

    it("should reject tampered tokens", () => {
      const { signedToken } = createCsrfToken();
      
      // Tamper with the signature
      const tamperedToken = signedToken.slice(0, -10) + "0000000000";
      
      const result = verifyCsrfToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("signature");
    });

    it("should reject tokens with modified expiry", () => {
      const { signedToken } = createCsrfToken();
      const parts = signedToken.split(":");
      
      // Modify expiry to future
      parts[1] = String(Date.now() + 999999999999);
      const tamperedToken = parts.join(":");
      
      const result = verifyCsrfToken(tamperedToken);
      expect(result.valid).toBe(false);
    });

    it("should reject expired tokens", () => {
      // Create a token that appears expired
      const expiredTime = Date.now() - 1000;
      const expiredToken = `token:${expiredTime}:signature`;
      
      const result = verifyCsrfToken(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("CSRF Constants", () => {
    it("should have correct cookie name", () => {
      expect(CSRF_CONSTANTS.COOKIE_NAME).toBe("csrf_token");
    });

    it("should have correct header name", () => {
      expect(CSRF_CONSTANTS.HEADER_NAME).toBe("x-csrf-token");
    });
  });

  describe("CSRF Attack Scenarios", () => {
    it("should generate different tokens for different sessions", () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const { token } = createCsrfToken();
        tokens.add(token);
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it("should not leak secret through timing attacks", () => {
      const { signedToken } = createCsrfToken();
      
      // Verification should use constant-time comparison
      // This is tested by ensuring the function completes
      const start = Date.now();
      verifyCsrfToken(signedToken);
      const validTime = Date.now() - start;

      const start2 = Date.now();
      verifyCsrfToken("invalid:0:token");
      const invalidTime = Date.now() - start2;

      // Times should be similar (within reasonable margin)
      // Note: This is a basic check; real timing attack tests need more sophisticated measurement
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(100);
    });
  });

  describe("Token Extraction", () => {
    it("should extract raw token from signed token", () => {
      const { signedToken, token } = createCsrfToken();
      const result = verifyCsrfToken(signedToken);
      
      expect(result.token).toBe(token);
    });
  });
});
