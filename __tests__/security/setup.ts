/**
 * Security Test Setup
 * Common utilities and mocks for security testing
 */

import { NextRequest } from "next/server";

// Mock user data
export const mockUsers = {
  admin: {
    id: "admin-user-id",
    email: "admin@test.com",
    name: "Admin User",
    role: "ADMIN" as const,
    emailVerified: new Date(),
  },
  operator: {
    id: "operator-user-id",
    email: "operator@test.com",
    name: "Operator User",
    role: "OPERATOR" as const,
    emailVerified: new Date(),
  },
  user: {
    id: "regular-user-id",
    email: "user@test.com",
    name: "Regular User",
    role: "USER" as const,
    emailVerified: new Date(),
  },
  attacker: {
    id: "attacker-user-id",
    email: "attacker@test.com",
    name: "Attacker",
    role: "USER" as const,
    emailVerified: new Date(),
  },
};

// Mock booking data
export const mockBookings = {
  userBooking: {
    id: "booking-1",
    bookingCode: "BK-ABC123",
    userId: mockUsers.user.id,
    status: "PENDING",
    totalAmount: 150000,
  },
  attackerBooking: {
    id: "booking-2",
    bookingCode: "BK-XYZ789",
    userId: mockUsers.attacker.id,
    status: "PENDING",
    totalAmount: 200000,
  },
};

// Mock payment data
export const mockPayments = {
  userPayment: {
    id: "payment-1",
    orderId: "ORDER-123",
    bookingId: mockBookings.userBooking.id,
    amount: 150000,
    status: "PENDING",
  },
};

/**
 * Create a mock NextRequest
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    ip?: string;
  } = {}
): NextRequest {
  const { method = "GET", headers = {}, body, ip = "127.0.0.1" } = options;

  const requestHeaders = new Headers(headers);
  if (ip) {
    requestHeaders.set("x-forwarded-for", ip);
  }

  const init: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    init.body = JSON.stringify(body);
    requestHeaders.set("content-type", "application/json");
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

/**
 * SQL Injection payloads for testing
 */
export const sqlInjectionPayloads = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1; SELECT * FROM users",
  "admin'--",
  "' UNION SELECT * FROM users --",
  "1' AND 1=1 --",
  "' OR 1=1 #",
  "admin' /*",
];

/**
 * XSS payloads for testing
 */
export const xssPayloads = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<svg onload=alert('XSS')>",
  "javascript:alert('XSS')",
  "<body onload=alert('XSS')>",
  "<iframe src='javascript:alert(1)'>",
  "'-alert(1)-'",
];

/**
 * NoSQL injection payloads
 */
export const noSqlInjectionPayloads = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$where": "this.password.length > 0"}',
  '{"$regex": ".*"}',
];

/**
 * Path traversal payloads
 */
export const pathTraversalPayloads = [
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32",
  "....//....//etc/passwd",
];

/**
 * Generate random IP addresses for testing
 */
export function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock session for testing
 */
export function mockSession(user: typeof mockUsers.user | null) {
  return user
    ? {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    : null;
}
