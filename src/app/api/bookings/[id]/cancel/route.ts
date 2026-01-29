import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  validateRequest,
  NotFoundError,
  AuthError,
  ConflictError,
} from "@/lib/api-utils";
import { canUserCancelBooking } from "@/lib/booking-utils";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const cancelReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500, "Reason must be less than 500 characters")
    .optional(),
});

/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking
 * - User can cancel own PENDING or CONFIRMED booking (before 24h of departure)
 * - Admin can cancel any booking
 * Restores seats to schedule
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Parse optional reason
    let reason: string | undefined;
    try {
      const body = await request.json();
      const validation = await validateRequest(cancelReasonSchema, body);
      if (validation.success) {
        reason = validation.data.reason;
      }
    } catch {
      // No body provided, that's okay
    }

    // Get booking with relations
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        schedule: {
          select: {
            id: true,
            departureTime: true,
            status: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
        tickets: {
          select: { id: true, status: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Check authorization
    const isAdmin = user.role === "ADMIN";
    const isOwner = booking.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new AuthError("You don't have permission to cancel this booking");
    }

    // Check if booking can be cancelled
    if (!isAdmin) {
      const { canCancel, reason: cancelReason } = canUserCancelBooking(
        booking.status,
        booking.schedule.departureTime
      );

      if (!canCancel) {
        throw new ConflictError(cancelReason || "Cannot cancel this booking");
      }
    } else {
      // Admin can only cancel PENDING or CONFIRMED bookings
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        throw new ConflictError(
          `Cannot cancel booking with status: ${booking.status}`
        );
      }
    }

    // Use transaction for atomicity
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Update booking status
      const cancelled = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason || `Cancelled by ${isAdmin ? "admin" : "user"}`,
        },
      });

      // 2. Restore seats to schedule
      await tx.schedule.update({
        where: { id: booking.scheduleId },
        data: {
          availableSeats: { increment: booking.totalPassengers },
        },
      });

      // 3. Invalidate any issued tickets
      if (booking.tickets.length > 0) {
        await tx.ticket.updateMany({
          where: { bookingId: id },
          data: { status: "CANCELLED" },
        });
      }

      // 4. If payment exists and was successful, we need to track for refund
      // Note: Actual refund would be handled by payment system
      if (booking.payment && booking.payment.status === "SUCCESS") {
        // Mark for refund - actual refund logic would integrate with payment gateway
        // For now, we just track that a refund is needed
        await tx.booking.update({
          where: { id },
          data: {
            status: "REFUNDED", // or keep CANCELLED and track refund separately
          },
        });
      }

      return cancelled;
    });

    // Fetch updated booking with relations
    const fullBooking = await prisma.booking.findUnique({
      where: { id: updatedBooking.id },
      include: {
        schedule: {
          include: {
            route: {
              include: {
                departurePort: {
                  select: { id: true, name: true, code: true, city: true },
                },
                arrivalPort: {
                  select: { id: true, name: true, code: true, city: true },
                },
              },
            },
            ship: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        passengers: true,
        payment: true,
      },
    });

    // Determine if refund is pending
    const refundPending = booking.payment?.status === "SUCCESS";

    return successResponse(
      {
        booking: fullBooking,
        refundPending,
        message: refundPending
          ? "Booking cancelled. Refund will be processed within 3-5 business days."
          : "Booking cancelled successfully.",
      },
      "Booking cancelled successfully"
    );
  } catch (error) {
    return handleApiError(error, "CANCEL_BOOKING");
  }
}
