import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentIdempotent } from "@/lib/payment-creation";
import { z } from "zod";

// Request validation schema
const createPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  idempotencyKey: z.string().min(1).optional(),
});

/**
 * POST /api/payments/create
 * Create a new payment for a booking using the payment service
 */
export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { bookingId, idempotencyKey } = validation.data;

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || 
      `auto_${session.user.id}_${bookingId}_${Date.now()}`;

    // Get booking to validate ownership and status
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
        userId: session.user.id, // Ensure user owns this booking
      },
      include: {
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true,
                arrivalPort: true,
              },
            },
            ship: true,
          },
        },
        passengers: true,
        user: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check booking status
    if (booking.status === "CONFIRMED") {
      return NextResponse.json(
        { success: false, error: "Booking is already confirmed" },
        { status: 400 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Booking has been cancelled" },
        { status: 400 }
      );
    }

    if (booking.status === "EXPIRED") {
      return NextResponse.json(
        { success: false, error: "Booking has expired" },
        { status: 400 }
      );
    }

    // Check if booking has expired
    if (new Date() > booking.expiresAt) {
      // Update booking status to expired
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { success: false, error: "Booking has expired. Please create a new booking." },
        { status: 400 }
      );
    }

    // Calculate remaining time for payment expiry
    const now = new Date();
    const bookingExpiryMs = booking.expiresAt.getTime() - now.getTime();
    const expiryMinutes = Math.min(Math.floor(bookingExpiryMs / 60000), 60); // Max 60 minutes

    if (expiryMinutes < 1) {
      return NextResponse.json(
        { success: false, error: "Booking is about to expire. Please create a new booking." },
        { status: 400 }
      );
    }

    // Create payment using idempotent payment creation
    const result = await createPaymentIdempotent({
      bookingId: booking.id,
      userId: session.user.id,
      idempotencyKey: finalIdempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: result.data?.token,
        redirectUrl: result.data?.redirectUrl,
        paymentId: result.data?.paymentId,
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          totalAmount: booking.totalAmount,
          route: `${booking.schedule.route.departurePort.name} → ${booking.schedule.route.arrivalPort.name}`,
          departureTime: booking.schedule.departureTime,
          ship: booking.schedule.ship.name,
          passengers: booking.passengers.length,
        },
      },
      cached: result.existingPayment || false,
    });
  } catch (error: unknown) {
    console.error("[CREATE_PAYMENT_API_ERROR]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
