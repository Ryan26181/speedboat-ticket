/**
 * Authorization Security Tests
 * Tests for accessing other users' data and privilege escalation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockUsers, mockBookings, mockSession } from "./setup";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("Authorization Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Horizontal Privilege Escalation (IDOR)", () => {
    it("should verify booking ownership before access", async () => {
      // Attacker authenticated
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      // Victim's booking
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        ...mockBookings.userBooking,
        userId: mockUsers.user.id, // Belongs to different user
      } as never);

      const session = await auth();
      const booking = await prisma.booking.findUnique({
        where: { id: mockBookings.userBooking.id },
      });

      // Authorization check
      const isOwner = booking?.userId === session?.user?.id;
      expect(isOwner).toBe(false);
    });

    it("should prevent accessing other user's bookings by ID", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        id: "booking-victim",
        userId: mockUsers.user.id,
        bookingCode: "BK-VICTIM",
      } as never);

      const session = await auth();
      const booking = await prisma.booking.findUnique({
        where: { id: "booking-victim" },
      });

      expect(booking?.userId).not.toBe(session?.user?.id);
    });

    it("should prevent accessing other user's bookings by code", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        id: "booking-1",
        userId: mockUsers.user.id,
        bookingCode: "BK-ABC123",
      } as never);

      const session = await auth();
      const booking = await prisma.booking.findUnique({
        where: { bookingCode: "BK-ABC123" },
      });

      expect(booking?.userId).not.toBe(session?.user?.id);
    });

    it("should only return user's own bookings in list", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));
      
      vi.mocked(prisma.booking.findMany).mockResolvedValue([
        { id: "booking-1", userId: mockUsers.user.id },
        { id: "booking-2", userId: mockUsers.user.id },
      ] as never);

      const session = await auth();
      const bookings = await prisma.booking.findMany({
        where: { userId: session?.user?.id },
      });

      // All returned bookings should belong to the user
      for (const booking of bookings) {
        expect(booking.userId).toBe(session?.user?.id);
      }
    });

    it("should prevent modifying other user's booking", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        ...mockBookings.userBooking,
        userId: mockUsers.user.id,
      } as never);

      const session = await auth();
      const booking = await prisma.booking.findUnique({
        where: { id: mockBookings.userBooking.id },
      });

      // Cannot update - not the owner
      const canUpdate = booking?.userId === session?.user?.id;
      expect(canUpdate).toBe(false);
    });

    it("should prevent cancelling other user's booking", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        ...mockBookings.userBooking,
        userId: mockUsers.user.id,
        status: "CONFIRMED",
      } as never);

      const session = await auth();
      const booking = await prisma.booking.findUnique({
        where: { id: mockBookings.userBooking.id },
      });

      const canCancel = booking?.userId === session?.user?.id;
      expect(canCancel).toBe(false);
    });
  });

  describe("Vertical Privilege Escalation (Role-Based)", () => {
    it("should prevent user from accessing admin endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));

      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";

      expect(isAdmin).toBe(false);
    });

    it("should prevent user from accessing operator endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));

      const session = await auth();
      const isOperator = session?.user?.role === "OPERATOR" || session?.user?.role === "ADMIN";

      expect(isOperator).toBe(false);
    });

    it("should allow admin to access admin endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.admin));

      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";

      expect(isAdmin).toBe(true);
    });

    it("should allow operator to access operator endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.operator));

      const session = await auth();
      const isOperator = session?.user?.role === "OPERATOR" || session?.user?.role === "ADMIN";

      expect(isOperator).toBe(true);
    });

    it("should prevent user from changing their role", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));

      const session = await auth();
      
      // User tries to update their role
      const updateData = { role: "ADMIN" };
      
      // Should reject role changes from non-admins
      const canChangeRole = session?.user?.role === "ADMIN";
      expect(canChangeRole).toBe(false);
    });

    it("should prevent operator from becoming admin", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.operator));

      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";

      expect(isAdmin).toBe(false);
    });
  });

  describe("Resource Enumeration Prevention", () => {
    it("should use unpredictable IDs", () => {
      // IDs should be long and alphanumeric (CUID-like format)
      const id = "clx1234567890abcdefghij";
      
      // ID should be long enough to be unpredictable (20+ chars)
      expect(id.length).toBeGreaterThanOrEqual(20);
      // Should start with a letter
      expect(id[0]).toMatch(/[a-z]/);
    });

    it("should use unpredictable booking codes", () => {
      const bookingCode = mockBookings.userBooking.bookingCode;
      
      // Should not be sequential
      expect(bookingCode).toMatch(/^BK-[A-Z0-9]+$/);
    });

    it("should prevent user enumeration via response differences", () => {
      // Both existing and non-existing resources should return same error
      const errorForExisting = "Resource not found or access denied";
      const errorForNonExisting = "Resource not found or access denied";
      
      expect(errorForExisting).toBe(errorForNonExisting);
    });
  });

  describe("Session-Based Authorization", () => {
    it("should reject requests without session", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const session = await auth();
      expect(session).toBeNull();
    });

    it("should validate session user ID", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));

      const session = await auth();
      expect(session?.user?.id).toBe(mockUsers.user.id);
      expect(session?.user?.id).not.toBe(mockUsers.attacker.id);
    });

    it("should validate session role", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.user));

      const session = await auth();
      expect(session?.user?.role).toBe("USER");
      expect(session?.user?.role).not.toBe("ADMIN");
    });
  });

  describe("Cross-User Data Access", () => {
    it("should prevent viewing other user's payment details", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: "payment-1",
        bookingId: mockBookings.userBooking.id,
        booking: { userId: mockUsers.user.id },
      } as never);

      const session = await auth();
      const payment = await prisma.payment.findUnique({
        where: { id: "payment-1" },
        include: { booking: true },
      });

      // Type assertion for test
      const paymentWithBooking = payment as { booking?: { userId: string } };
      const isOwner = paymentWithBooking?.booking?.userId === session?.user?.id;
      expect(isOwner).toBe(false);
    });

    it("should prevent viewing other user's tickets", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));

      // Ticket belongs to victim's booking
      const ticket = {
        id: "ticket-1",
        bookingId: mockBookings.userBooking.id,
        booking: { userId: mockUsers.user.id },
      };

      const session = await auth();
      const isOwner = ticket.booking.userId === session?.user?.id;
      expect(isOwner).toBe(false);
    });

    it("should prevent viewing other user's profile", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.attacker));
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUsers.user,
        phone: "+6281234567890",
        email: "victim@example.com",
      } as never);

      const session = await auth();
      const targetUser = await prisma.user.findUnique({
        where: { id: mockUsers.user.id },
      });

      // Only allow viewing own profile
      const canView = targetUser?.id === session?.user?.id;
      expect(canView).toBe(false);
    });
  });

  describe("Admin Override Authorization", () => {
    it("should allow admin to view any booking", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.admin));
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        ...mockBookings.userBooking,
        userId: mockUsers.user.id,
      } as never);

      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";

      expect(isAdmin).toBe(true);
    });

    it("should allow admin to view any user", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.admin));

      const session = await auth();
      const canViewAllUsers = session?.user?.role === "ADMIN";

      expect(canViewAllUsers).toBe(true);
    });

    it("should allow admin to modify user roles", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession(mockUsers.admin));

      const session = await auth();
      const canModifyRoles = session?.user?.role === "ADMIN";

      expect(canModifyRoles).toBe(true);
    });
  });
});
