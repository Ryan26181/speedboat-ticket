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
import {
  createSnapTransaction,
  generateOrderId,
  formatPaymentAmount,
} from "@/lib/midtrans";
import { z } from "zod";

/**
 * Schema for creating a payment
 */
const createPaymentSchema = z.object({
  bookingId: z.string().cuid("Invalid booking ID"),
  forceNewToken: z.boolean().optional().default(false),
});

/**
 * POST /api/payments
 * Create a payment for a booking
 * - Require authenticated user (booking owner)
 * - Validate booking is PENDING and not expired
 * - Generate unique orderId
 * - Call Midtrans createSnapTransaction
 * - Save payment record with PENDING status
 * - Return Snap token and redirect URL
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthUser();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createPaymentSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_PAYMENT"
      );
    }

    const { bookingId, forceNewToken } = validation.data;

    // Get booking with user info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        schedule: {
          include: {
            route: {
              include: {
                departurePort: { select: { name: true, city: true } },
                arrivalPort: { select: { name: true, city: true } },
              },
            },
            ship: { select: { name: true } },
          },
        },
        passengers: {
          select: { name: true },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Verify booking belongs to user
    if (booking.userId !== user.id) {
      throw new AuthError("You don't have permission to pay for this booking");
    }

    // Check booking status
    if (booking.status !== "PENDING") {
      throw new ConflictError(
        `Cannot create payment for booking with status: ${booking.status}`
      );
    }

    // Check if booking has expired
    if (new Date() > booking.expiresAt) {
      throw new ConflictError(
        "Booking has expired. Please create a new booking."
      );
    }

    // Check if payment already exists
    if (booking.payment) {
      // If already paid, reject
      if (booking.payment.status === "SUCCESS") {
        throw new ConflictError("Booking has already been paid");
      }
      
      // If existing payment is still pending and valid, and not forcing new token
      if (booking.payment.status === "PENDING" && !forceNewToken) {
        // Check if Midtrans payment token is still valid
        if (
          booking.payment.expiredAt && 
          new Date() < booking.payment.expiredAt &&
          booking.payment.midtransToken
        ) {
          return successResponse({
            paymentId: booking.payment.id,
            orderId: booking.payment.orderId,
            snapToken: booking.payment.midtransToken,
            redirectUrl: booking.payment.midtransRedirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking.id}/payment`,
            message: "Payment already initiated. Please complete your payment.",
          });
        }
        // Token expired or missing, will create a new one below
      }
      // If forceNewToken is true, we continue to create a new token with new order ID
    }

    // Generate unique order ID (with timestamp suffix when forcing new token to avoid "order_id already used" error)
    const orderId = forceNewToken 
      ? `${booking.bookingCode}-${Date.now()}`
      : generateOrderId(booking.bookingCode);

    // Calculate expiry (sync with booking expiry, max 15 minutes)
    const now = new Date();
    const bookingExpiryMs = booking.expiresAt.getTime() - now.getTime();
    const expiryMinutes = Math.min(Math.floor(bookingExpiryMs / 60000), 15);

    if (expiryMinutes < 1) {
      throw new ConflictError(
        "Booking is about to expire. Please create a new booking."
      );
    }

    // Prepare item details for Midtrans
    const routeName = `${booking.schedule.route.departurePort.name} → ${booking.schedule.route.arrivalPort.name}`;
    const departureDate = booking.schedule.departureTime.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const itemDetails = [
      {
        id: booking.scheduleId,
        name: `Speedboat Ticket: ${routeName}`,
        price: booking.schedule.price,
        quantity: booking.totalPassengers,
      },
    ];

    // Create Midtrans Snap transaction
    const snapResponse = await createSnapTransaction({
      orderId,
      amount: booking.totalAmount,
      customerName: booking.user.name || "Customer",
      customerEmail: booking.user.email || "",
      customerPhone: booking.user.phone || undefined,
      itemDetails,
      expiryMinutes,
    });

    // Calculate payment expiry time
    const paymentExpiry = new Date();
    paymentExpiry.setMinutes(paymentExpiry.getMinutes() + expiryMinutes);

    // Create or update payment record (save the Snap token for reuse)
    const payment = await prisma.payment.upsert({
      where: { bookingId },
      update: {
        orderId,
        amount: booking.totalAmount,
        status: "PENDING",
        expiredAt: paymentExpiry,
        midtransToken: snapResponse.token,
        midtransRedirectUrl: snapResponse.redirect_url,
        rawResponse: snapResponse as object,
      },
      create: {
        bookingId,
        orderId,
        amount: booking.totalAmount,
        status: "PENDING",
        expiredAt: paymentExpiry,
        midtransToken: snapResponse.token,
        midtransRedirectUrl: snapResponse.redirect_url,
        rawResponse: snapResponse as object,
      },
    });

    return successResponse(
      {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        amountFormatted: formatPaymentAmount(payment.amount),
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
        expiresAt: paymentExpiry.toISOString(),
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          route: routeName,
          departureDate,
          departureTime: booking.schedule.departureTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          ship: booking.schedule.ship.name,
          passengers: booking.passengers.map((p) => p.name),
        },
      },
      "Payment initiated successfully"
    );
  } catch (error) {
    return handleApiError(error, "CREATE_PAYMENT");
  }
}
