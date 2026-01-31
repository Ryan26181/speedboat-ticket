import { prisma } from "@/lib/prisma";
import type { Schedule } from "@prisma/client";

/**
 * Generate unique booking code: SPD-YYYYMMDD-XXXXX
 * Format: SPD-20260128-A1B2C
 */
export function generateBookingCode(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;
  
  // Generate 5-character alphanumeric suffix
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `SPD-${dateStr}-${suffix}`;
}

/**
 * Generate ticket code: TIK-TIMESTAMP-RANDOM
 * Format: TIK-17696XXXXX-A1B2 (timestamp + 4 random chars)
 * Using timestamp ensures uniqueness even without DB checks
 */
export function generateTicketCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase(); // Base36 timestamp
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TIK-${timestamp}-${random}`;
}

/**
 * Generate QR data for ticket
 * Contains JSON with ticket verification info
 */
export function generateQRData(
  ticketCode: string,
  bookingCode: string,
  passengerName: string,
  scheduleId: string
): string {
  const qrPayload = {
    t: ticketCode,        // ticket code
    b: bookingCode,       // booking code
    p: passengerName,     // passenger name
    s: scheduleId,        // schedule id
    ts: Date.now(),       // timestamp
    v: 1,                 // version
  };
  
  // Base64 encode the JSON payload
  const jsonStr = JSON.stringify(qrPayload);
  const base64 = Buffer.from(jsonStr).toString("base64");
  
  return `SPB:${base64}`;
}

/**
 * Parse QR data back to object
 */
export function parseQRData(qrData: string): {
  ticketCode: string;
  bookingCode: string;
  passengerName: string;
  scheduleId: string;
  timestamp: number;
  version: number;
} | null {
  try {
    if (!qrData.startsWith("SPB:")) {
      return null;
    }
    
    const base64 = qrData.substring(4);
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    
    return {
      ticketCode: payload.t,
      bookingCode: payload.b,
      passengerName: payload.p,
      scheduleId: payload.s,
      timestamp: payload.ts,
      version: payload.v,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate booking expiry (15 minutes from now)
 */
export function calculateExpiryTime(minutes: number = 15): Date {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
  return expiryTime;
}

/**
 * Check if schedule has enough available seats
 */
export async function checkScheduleAvailability(
  scheduleId: string,
  passengers: number
): Promise<{
  available: boolean;
  schedule: Schedule | null;
  error?: string;
}> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });
  
  if (!schedule) {
    return {
      available: false,
      schedule: null,
      error: "Schedule not found",
    };
  }
  
  if (schedule.status !== "SCHEDULED") {
    return {
      available: false,
      schedule,
      error: `Schedule is not available for booking (status: ${schedule.status})`,
    };
  }
  
  const now = new Date();
  if (schedule.departureTime <= now) {
    return {
      available: false,
      schedule,
      error: "Schedule has already departed",
    };
  }
  
  if (schedule.availableSeats < passengers) {
    return {
      available: false,
      schedule,
      error: `Not enough seats available. Requested: ${passengers}, Available: ${schedule.availableSeats}`,
    };
  }
  
  return {
    available: true,
    schedule,
  };
}

/**
 * Format booking amount in IDR
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Price multipliers for each passenger category
 */
export const CATEGORY_PRICE_MULTIPLIERS: Record<string, number> = {
  ADULT: 1.0,      // Full price
  ELDERLY: 0.8,    // 20% discount
  CHILD: 0.5,      // 50% discount
  INFANT: 0,       // Free
};

/**
 * Calculate total booking amount (simple version for backward compatibility)
 */
export function calculateTotalAmount(pricePerSeat: number, passengers: number): number {
  return pricePerSeat * passengers;
}

/**
 * Calculate total booking amount with category-based pricing
 */
export function calculateTotalAmountWithCategories(
  pricePerSeat: number,
  passengerCounts: {
    adults?: number;
    elderly?: number;
    children?: number;
    infants?: number;
  }
): number {
  const adults = passengerCounts.adults || 0;
  const elderly = passengerCounts.elderly || 0;
  const children = passengerCounts.children || 0;
  const infants = passengerCounts.infants || 0;
  
  const total = 
    (adults * pricePerSeat * CATEGORY_PRICE_MULTIPLIERS.ADULT) +
    (elderly * pricePerSeat * CATEGORY_PRICE_MULTIPLIERS.ELDERLY) +
    (children * pricePerSeat * CATEGORY_PRICE_MULTIPLIERS.CHILD) +
    (infants * pricePerSeat * CATEGORY_PRICE_MULTIPLIERS.INFANT);
  
  return Math.round(total);
}

/**
 * Calculate price for a single passenger based on category
 */
export function calculatePassengerPrice(pricePerSeat: number, category: string): number {
  const multiplier = CATEGORY_PRICE_MULTIPLIERS[category] ?? 1.0;
  return Math.round(pricePerSeat * multiplier);
}

/**
 * Check if booking is expired
 */
export function isBookingExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Check if booking can be cancelled by user
 */
export function canUserCancelBooking(
  status: string,
  departureTime: Date,
  hoursBeforeDeparture: number = 24
): { canCancel: boolean; reason?: string } {
  // Can only cancel PENDING or CONFIRMED bookings
  if (!["PENDING", "CONFIRMED"].includes(status)) {
    return {
      canCancel: false,
      reason: `Cannot cancel booking with status: ${status}`,
    };
  }
  
  // Check if too close to departure
  const now = new Date();
  const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDeparture < hoursBeforeDeparture) {
    return {
      canCancel: false,
      reason: `Cannot cancel booking less than ${hoursBeforeDeparture} hours before departure`,
    };
  }
  
  return { canCancel: true };
}

/**
 * Get booking status display info
 */
export function getBookingStatusInfo(status: string): {
  label: string;
  color: string;
  description: string;
} {
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    PENDING: {
      label: "Pending Payment",
      color: "yellow",
      description: "Waiting for payment confirmation",
    },
    CONFIRMED: {
      label: "Confirmed",
      color: "green",
      description: "Payment confirmed, tickets issued",
    },
    CANCELLED: {
      label: "Cancelled",
      color: "red",
      description: "Booking has been cancelled",
    },
    COMPLETED: {
      label: "Completed",
      color: "blue",
      description: "Trip completed",
    },
    REFUNDED: {
      label: "Refunded",
      color: "purple",
      description: "Payment has been refunded",
    },
    EXPIRED: {
      label: "Expired",
      color: "gray",
      description: "Booking expired due to no payment",
    },
  };
  
  return statusMap[status] || {
    label: status,
    color: "gray",
    description: "Unknown status",
  };
}
