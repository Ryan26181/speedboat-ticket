import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { coreApi } from "@/lib/midtrans";
import { z } from "zod";

const cancelPaymentSchema = z.object({
  bookingCode: z.string().min(1, "Booking code is required"),
});

/**
 * POST /api/payments/cancel
 * Cancel a pending payment
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = cancelPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { bookingCode } = validation.data;

    // Get booking with payment
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: { 
        payment: true,
        schedule: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check ownership (or admin)
    const isAdmin = session.user.role === "ADMIN";
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if can be cancelled
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: `Cannot cancel booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Try to cancel in Midtrans (if payment exists)
    if (booking.payment?.orderId) {
      try {
        await coreApi.transaction.cancel(booking.payment.orderId);
        console.log("[CANCEL_PAYMENT] Midtrans transaction cancelled:", booking.payment.orderId);
      } catch (error) {
        // Transaction might not exist in Midtrans yet, that's ok
        console.log("[CANCEL_PAYMENT] Midtrans cancel skipped:", error);
      }
    }

    // Update local database in a transaction
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: "Cancelled by user",
        },
      });

      // Update payment status if exists
      if (booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "FAILED" },
        });
      }

      // Restore available seats
      await tx.schedule.update({
        where: { id: booking.scheduleId },
        data: {
          availableSeats: {
            increment: booking.totalPassengers,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error: unknown) {
    console.error("[CANCEL_PAYMENT_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
