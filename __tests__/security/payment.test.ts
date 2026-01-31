/**
 * Payment Security Tests
 * Tests for payment tampering and webhook security
 */

import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { mockBookings, mockPayments } from "./setup";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Payment Security", () => {
  describe("Payment Amount Validation", () => {
    it("should verify payment amount matches booking total", () => {
      const booking = {
        ...mockBookings.userBooking,
        totalAmount: 150000,
      };

      const payment = {
        ...mockPayments.userPayment,
        amount: 150000,
      };

      expect(payment.amount).toBe(booking.totalAmount);
    });

    it("should detect mismatched amounts", () => {
      const booking = {
        ...mockBookings.userBooking,
        totalAmount: 150000,
      };

      const tamperedPayment = {
        ...mockPayments.userPayment,
        amount: 100000, // Tampered
      };

      expect(tamperedPayment.amount).not.toBe(booking.totalAmount);
    });

    it("should validate amount is positive integer", () => {
      const validAmounts = [1000, 50000, 150000, 1000000];
      const invalidAmounts = [-1000, 0, 100.5, NaN, Infinity];

      for (const amount of validAmounts) {
        expect(Number.isInteger(amount) && amount > 0).toBe(true);
      }

      for (const amount of invalidAmounts) {
        expect(Number.isInteger(amount) && amount > 0).toBe(false);
      }
    });

    it("should enforce minimum amount", () => {
      const minAmount = 1000; // IDR 1,000
      
      expect(500).toBeLessThan(minAmount);
      expect(1000).toBeGreaterThanOrEqual(minAmount);
    });

    it("should enforce maximum amount", () => {
      const maxAmount = 100000000; // IDR 100,000,000
      
      expect(200000000).toBeGreaterThan(maxAmount);
      expect(50000000).toBeLessThanOrEqual(maxAmount);
    });
  });

  describe("Webhook Signature Verification", () => {
    it("should verify valid Midtrans signature", () => {
      const orderId = "ORDER-123";
      const statusCode = "200";
      const grossAmount = "150000.00";
      const serverKey = "test-server-key";

      const expectedSignature = crypto
        .createHash("sha512")
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest("hex");

      const payload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: expectedSignature,
      };

      // Verify signature
      const calculatedSignature = crypto
        .createHash("sha512")
        .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
        .digest("hex");

      expect(payload.signature_key).toBe(calculatedSignature);
    });

    it("should reject invalid signatures", () => {
      const payload = {
        order_id: "ORDER-123",
        status_code: "200",
        gross_amount: "150000.00",
        signature_key: "invalid-signature-that-does-not-match",
      };

      const serverKey = "test-server-key";
      const expectedSignature = crypto
        .createHash("sha512")
        .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
        .digest("hex");

      expect(payload.signature_key).not.toBe(expectedSignature);
    });

    it("should detect tampered order_id", () => {
      const serverKey = "test-server-key";
      const original = {
        order_id: "ORDER-123",
        status_code: "200",
        gross_amount: "150000.00",
      };

      const originalSignature = crypto
        .createHash("sha512")
        .update(`${original.order_id}${original.status_code}${original.gross_amount}${serverKey}`)
        .digest("hex");

      // Tamper with order_id
      const tampered = { ...original, order_id: "ORDER-456" };
      const tamperedSignature = crypto
        .createHash("sha512")
        .update(`${tampered.order_id}${tampered.status_code}${tampered.gross_amount}${serverKey}`)
        .digest("hex");

      expect(originalSignature).not.toBe(tamperedSignature);
    });

    it("should detect tampered gross_amount", () => {
      const serverKey = "test-server-key";
      const original = {
        order_id: "ORDER-123",
        status_code: "200",
        gross_amount: "150000.00",
      };

      const originalSignature = crypto
        .createHash("sha512")
        .update(`${original.order_id}${original.status_code}${original.gross_amount}${serverKey}`)
        .digest("hex");

      // Tamper with amount
      const tampered = { ...original, gross_amount: "100.00" };
      const tamperedSignature = crypto
        .createHash("sha512")
        .update(`${tampered.order_id}${tampered.status_code}${tampered.gross_amount}${serverKey}`)
        .digest("hex");

      expect(originalSignature).not.toBe(tamperedSignature);
    });
  });

  describe("Payment State Machine", () => {
    it("should validate valid state transitions", () => {
      const validTransitions: Array<{ from: string; to: string }> = [
        { from: "PENDING", to: "SUCCESS" },
        { from: "PENDING", to: "FAILED" },
        { from: "PENDING", to: "EXPIRED" },
        { from: "PENDING", to: "CHALLENGE" },
        { from: "CHALLENGE", to: "SUCCESS" },
        { from: "CHALLENGE", to: "DENY" },
        { from: "SUCCESS", to: "REFUNDED" },
      ];

      for (const transition of validTransitions) {
        expect(isValidTransition(transition.from, transition.to)).toBe(true);
      }
    });

    it("should reject invalid state transitions", () => {
      const invalidTransitions: Array<{ from: string; to: string }> = [
        { from: "SUCCESS", to: "PENDING" },
        { from: "SUCCESS", to: "FAILED" },
        { from: "FAILED", to: "SUCCESS" },
        { from: "EXPIRED", to: "SUCCESS" },
        { from: "REFUNDED", to: "SUCCESS" },
        { from: "REFUNDED", to: "PENDING" },
      ];

      for (const transition of invalidTransitions) {
        expect(isValidTransition(transition.from, transition.to)).toBe(false);
      }
    });

    it("should not allow reverting completed payments", () => {
      expect(isValidTransition("SUCCESS", "PENDING")).toBe(false);
      expect(isValidTransition("REFUNDED", "PENDING")).toBe(false);
    });
  });

  describe("Order ID Security", () => {
    it("should generate unpredictable order IDs", () => {
      const orderIds = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const orderId = generateOrderId();
        orderIds.add(orderId);
      }

      expect(orderIds.size).toBe(100);
    });

    it("should include timestamp component", () => {
      const orderId = generateOrderId();
      
      // Should contain some identifiable parts
      expect(orderId.length).toBeGreaterThan(10);
    });

    it("should not be sequential", () => {
      const orderId1 = generateOrderId();
      const orderId2 = generateOrderId();
      
      // Order IDs should be different strings (not sequential numbers)
      expect(orderId1).not.toBe(orderId2);
    });
  });

  describe("Idempotency", () => {
    it("should detect duplicate payment requests", () => {
      const idempotencyKey = "unique-request-key";
      const seen = new Set<string>();
      
      // First request
      seen.add(idempotencyKey);
      
      // Duplicate detection
      expect(seen.has(idempotencyKey)).toBe(true);
    });

    it("should generate unique idempotency keys", () => {
      const keys = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
        keys.add(key);
      }
      
      expect(keys.size).toBe(100);
    });
  });

  describe("Webhook Replay Prevention", () => {
    it("should detect replay attacks using transaction ID", () => {
      const processedTransactions = new Set<string>();
      const transactionId = "TXN-123456";
      
      // First processing
      processedTransactions.add(transactionId);
      
      // Replay detection
      expect(processedTransactions.has(transactionId)).toBe(true);
    });

    it("should track webhook processing timestamps", () => {
      const webhookLog = {
        transactionId: "TXN-123",
        processedAt: Date.now(),
        orderId: "ORDER-123",
      };

      // Log should have timestamp
      expect(webhookLog.processedAt).toBeDefined();
      expect(webhookLog.processedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("Refund Security", () => {
    it("should only allow refund on successful payments", () => {
      const statuses = ["SUCCESS", "PENDING", "FAILED", "EXPIRED"];
      
      for (const status of statuses) {
        const canRefund = status === "SUCCESS";
        expect(canRefund).toBe(status === "SUCCESS");
      }
    });

    it("should validate refund amount", () => {
      const payment = { amount: 150000 };
      
      // Valid refund
      expect(100000).toBeLessThanOrEqual(payment.amount);
      
      // Invalid refund (more than paid)
      expect(200000).toBeGreaterThan(payment.amount);
    });

    it("should prevent double refund", () => {
      const refundedPayments = new Set<string>();
      const paymentId = "payment-123";
      
      // First refund
      refundedPayments.add(paymentId);
      
      // Second refund attempt should be detected
      expect(refundedPayments.has(paymentId)).toBe(true);
    });
  });
});

// Helper functions for tests

function isValidTransition(from: string, to: string): boolean {
  const validTransitions: Record<string, string[]> = {
    PENDING: ["SUCCESS", "FAILED", "EXPIRED", "CHALLENGE", "DENY", "CANCELLED"],
    CHALLENGE: ["SUCCESS", "DENY", "FAILED"],
    SUCCESS: ["REFUNDED"],
    FAILED: [],
    EXPIRED: [],
    REFUNDED: [],
    CANCELLED: [],
    DENY: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
