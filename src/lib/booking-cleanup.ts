import { prisma } from "@/lib/prisma";

export interface CleanupResult {
  processedCount: number;
  expiredBookingIds: string[];
  restoredSeats: { scheduleId: string; seats: number }[];
  errors: { bookingId: string; error: string }[];
}

/**
 * Cleanup expired bookings
 * - Finds PENDING bookings past expiresAt
 * - Updates status to EXPIRED
 * - Restores seats to schedules
 */
export async function cleanupExpiredBookings(): Promise<CleanupResult> {
  const result: CleanupResult = {
    processedCount: 0,
    expiredBookingIds: [],
    restoredSeats: [],
    errors: [],
  };

  try {
    // Find all expired PENDING bookings
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      select: {
        id: true,
        bookingCode: true,
        scheduleId: true,
        totalPassengers: true,
      },
    });

    if (expiredBookings.length === 0) {
      return result;
    }

    // Process each expired booking
    for (const booking of expiredBookings) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update booking status to EXPIRED
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "EXPIRED",
              cancelledAt: new Date(),
              cancellationReason: "Booking expired due to no payment",
            },
          });

          // Restore seats to schedule
          await tx.schedule.update({
            where: { id: booking.scheduleId },
            data: {
              availableSeats: { increment: booking.totalPassengers },
            },
          });
        });

        result.expiredBookingIds.push(booking.id);
        result.restoredSeats.push({
          scheduleId: booking.scheduleId,
          seats: booking.totalPassengers,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        result.errors.push({
          bookingId: booking.id,
          error: errorMessage,
        });
      }
    }

    result.processedCount = expiredBookings.length;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    result.errors.push({
      bookingId: "GENERAL",
      error: `Failed to fetch expired bookings: ${errorMessage}`,
    });
    return result;
  }
}

/**
 * Cleanup old completed/cancelled bookings (for archiving)
 * Soft cleanup - just marks as archived, doesn't delete
 */
export async function archiveOldBookings(olderThanDays: number = 90): Promise<{
  archivedCount: number;
  error?: string;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Note: This would require an 'archived' field in schema
    // For now, we just return the count of bookings that would be archived
    const oldBookingsCount = await prisma.booking.count({
      where: {
        status: { in: ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"] },
        updatedAt: { lt: cutoffDate },
      },
    });

    return { archivedCount: oldBookingsCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      archivedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Get cleanup statistics
 */
export async function getCleanupStats(): Promise<{
  pendingExpired: number;
  pendingActive: number;
  totalPending: number;
}> {
  const now = new Date();

  const [pendingExpired, pendingActive] = await Promise.all([
    prisma.booking.count({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    }),
    prisma.booking.count({
      where: {
        status: "PENDING",
        expiresAt: { gte: now },
      },
    }),
  ]);

  return {
    pendingExpired,
    pendingActive,
    totalPending: pendingExpired + pendingActive,
  };
}
