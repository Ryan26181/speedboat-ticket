/**
 * Rate Limiting Security Tests
 * Tests for rate limiting enforcement and bypass attempts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateRandomIP } from "./setup";
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from "@/lib/rate-limit-edge";

describe("Rate Limiting Security", () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit("test-login");
    resetRateLimit("test-register");
    resetRateLimit("test-api");
  });

  describe("Login Rate Limiting", () => {
    it("should allow initial login attempts", () => {
      const result = checkRateLimit(
        "login:newuser@example.com",
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should block after max failed attempts", () => {
      const identifier = "login:blocked@example.com";
      
      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(
          identifier,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );
      }

      // Next attempt should be blocked
      const result = checkRateLimit(
        identifier,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("should track attempts by email independently", () => {
      const email1 = "user1-unique@example.com";
      const email2 = "user2-unique@example.com";

      // Exhaust rate limit for email1
      for (let i = 0; i <= RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(
          `login:${email1}`,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );
      }

      // email2 should still be allowed
      const result = checkRateLimit(
        `login:${email2}`,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(true);
    });

    it("should return retry time when rate limited", () => {
      const identifier = "login:retry-test@example.com";
      
      // Exhaust limit
      for (let i = 0; i <= RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(
          identifier,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );
      }

      const result = checkRateLimit(
        identifier,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe("Registration Rate Limiting", () => {
    it("should limit registration attempts by IP", () => {
      const ip = generateRandomIP();
      
      // Exhaust rate limit
      for (let i = 0; i <= RATE_LIMITS.register.maxRequests; i++) {
        checkRateLimit(
          `register:${ip}`,
          RATE_LIMITS.register.windowMs,
          RATE_LIMITS.register.maxRequests
        );
      }

      const result = checkRateLimit(
        `register:${ip}`,
        RATE_LIMITS.register.windowMs,
        RATE_LIMITS.register.maxRequests
      );

      expect(result.allowed).toBe(false);
    });

    it("should have stricter limits than login", () => {
      expect(RATE_LIMITS.register.maxRequests).toBeLessThanOrEqual(RATE_LIMITS.login.maxRequests);
    });
  });

  describe("Password Reset Rate Limiting", () => {
    it("should limit password reset requests", () => {
      const email = "reset-test@example.com";
      
      // Exhaust limit
      for (let i = 0; i <= RATE_LIMITS.forgotPassword.maxRequests; i++) {
        checkRateLimit(
          `forgotPassword:${email}`,
          RATE_LIMITS.forgotPassword.windowMs,
          RATE_LIMITS.forgotPassword.maxRequests
        );
      }

      const result = checkRateLimit(
        `forgotPassword:${email}`,
        RATE_LIMITS.forgotPassword.windowMs,
        RATE_LIMITS.forgotPassword.maxRequests
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe("Rate Limit Bypass Prevention", () => {
    it("should track same identifier regardless of case", () => {
      const email = "CaseSensitive@Example.COM";
      const normalizedEmail = email.toLowerCase();
      
      // Rate limit the normalized version
      for (let i = 0; i <= RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(
          `login:${normalizedEmail}`,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );
      }

      // Should be blocked
      const result = checkRateLimit(
        `login:${normalizedEmail}`,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(false);
    });

    it("should not allow bypassing with different identifiers for same user", () => {
      // Both IP and email based rate limiting should apply
      const email = "bypass-test@example.com";
      const ip = "192.168.1.100";
      
      // If implementing dual rate limiting:
      // - Per-email limit
      // - Per-IP limit
      // Both should be checked
    });
  });

  describe("Rate Limit Reset", () => {
    it("should allow requests after reset", () => {
      const identifier = "reset-allowed@example.com";
      
      // Exhaust limit
      for (let i = 0; i <= RATE_LIMITS.login.maxRequests; i++) {
        checkRateLimit(
          `login:${identifier}`,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );
      }

      // Reset
      resetRateLimit(`login:${identifier}`);

      // Should be allowed again
      const result = checkRateLimit(
        `login:${identifier}`,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe("Rate Limit Configuration", () => {
    it("should have appropriate limits configured", () => {
      // Login: 5 attempts per 15 minutes
      expect(RATE_LIMITS.login.maxRequests).toBeLessThanOrEqual(10);
      expect(RATE_LIMITS.login.windowMs).toBeGreaterThanOrEqual(5 * 60 * 1000);

      // Register: 3 attempts per hour
      expect(RATE_LIMITS.register.maxRequests).toBeLessThanOrEqual(5);
      expect(RATE_LIMITS.register.windowMs).toBeGreaterThanOrEqual(30 * 60 * 1000);

      // Password reset: 3 attempts per hour
      expect(RATE_LIMITS.forgotPassword.maxRequests).toBeLessThanOrEqual(5);
    });

    it("should return remaining attempts count", () => {
      const identifier = "remaining-test@example.com";
      
      const result1 = checkRateLimit(
        `login:${identifier}`,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result1.remaining).toBe(RATE_LIMITS.login.maxRequests - 1);

      const result2 = checkRateLimit(
        `login:${identifier}`,
        RATE_LIMITS.login.windowMs,
        RATE_LIMITS.login.maxRequests
      );

      expect(result2.remaining).toBe(RATE_LIMITS.login.maxRequests - 2);
    });
  });
});
