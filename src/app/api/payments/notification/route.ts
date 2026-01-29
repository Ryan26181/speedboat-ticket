import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifySignature,
  mapMidtransStatus,
  isPaymentSuccess,
  isPaymentFailed,
  type MidtransNotification,
} from "@/lib/midtrans";
import {
  generateTicketCode,
  generateQRData,
} from "@/lib/booking-utils";

/**
 * POST /api/payments/notification
 * Receive Midtrans webhook notification
 * - Verify signature (IMPORTANT for security)
 * - Parse notification data
 * - Handle transaction statuses
 * - Update payment record
 * - Make handler idempotent
 * - Return 200 OK (Midtrans expects this)
 */
export async function POST(request: NextRequest) {
  try {
    const body: MidtransNotification = await request.json();

    // Log incoming notification (for debugging)
    console.log("[PAYMENT_WEBHOOK] Received notification:", {
      order_id: body.order_id,
      transaction_status: body.transaction_status,
      fraud_status: body.fraud_status,
      payment_type: body.payment_type,
    });

    // Verify signature
    const isValid = verifySignature(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key
    );

    if (!isValid) {
      console.error("[PAYMENT_WEBHOOK] Invalid signature for order:", body.order_id);
      return new Response("Invalid signature", { status: 403 });
    }

    // Find payment by orderId
    const payment = await prisma.payment.findUnique({
      where: { orderId: body.order_id },
      include: {
        booking: {
          include: {
            passengers: true,
          },
        },
      },
    });

    if (!payment) {
      console.error("[PAYMENT_WEBHOOK] Payment not found:", body.order_id);
      // Still return 200 to prevent Midtrans from retrying
      return new Response("Payment not found", { status: 200 });
    }

    // Map Midtrans status to our status
    const newStatus = mapMidtransStatus(
      body.transaction_status,
      body.fraud_status
    );

    // Check if already processed (idempotency)
    // If payment is already in a final state that matches, skip processing
    if (payment.status === newStatus) {
      console.log("[PAYMENT_WEBHOOK] Already processed:", body.order_id);
      return new Response("OK", { status: 200 });
    }

    // Don't allow reverting from SUCCESS status
    if (payment.status === "SUCCESS" && newStatus !== "REFUND") {
      console.log("[PAYMENT_WEBHOOK] Ignoring status change from SUCCESS:", body.order_id);
      return new Response("OK", { status: 200 });
    }

    // Process the status change in a transaction
    await prisma.$transaction(async (tx) => {
      // Extract payment details from notification
      const paymentDetails: Record<string, unknown> = {
        status: newStatus,
        transactionId: body.transaction_id,
        paymentType: body.payment_type,
        rawResponse: body as object,
      };

      // Handle VA (Virtual Account) payments
      if (body.va_numbers && body.va_numbers.length > 0) {
        paymentDetails.vaNumber = body.va_numbers[0].va_number;
        paymentDetails.bank = body.va_numbers[0].bank;
        paymentDetails.paymentChannel = body.va_numbers[0].bank;
      }

      // Handle settlement time
      if (isPaymentSuccess(newStatus) && body.settlement_time) {
        paymentDetails.paidAt = new Date(body.settlement_time);
      }

      // Update payment record
      await tx.payment.update({
        where: { id: payment.id },
        data: paymentDetails,
      });

      // Handle status-specific logic
      if (isPaymentSuccess(newStatus)) {
        // Only process if booking is still PENDING
        if (payment.booking.status === "PENDING") {
          // Confirm booking
          const booking = await tx.booking.update({
            where: { id: payment.booking.id },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
            },
          });

          // Check if tickets already exist
          const existingTicketsCount = await tx.ticket.count({
            where: { bookingId: booking.id },
          });

          if (existingTicketsCount === 0) {
            // Generate tickets for each passenger
            for (let i = 0; i < payment.booking.passengers.length; i++) {
              const passenger = payment.booking.passengers[i];

              // Generate unique ticket code with retry
              let ticketCode = generateTicketCode();
              let attempts = 0;
              while (attempts < 5) {
                const existing = await tx.ticket.findUnique({
                  where: { ticketCode },
                  select: { id: true },
                });
                if (!existing) break;
                ticketCode = generateTicketCode();
                attempts++;
              }

              // Generate QR data
              const qrData = generateQRData(
                ticketCode,
                payment.booking.bookingCode,
                passenger.name,
                payment.booking.scheduleId
              );

              // Create ticket
              await tx.ticket.create({
                data: {
                  bookingId: booking.id,
                  passengerId: passenger.id,
                  ticketCode,
                  qrData,
                  status: "VALID",
                },
              });

              // Assign seat number
              const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;
              await tx.passenger.update({
                where: { id: passenger.id },
                data: { seatNumber },
              });
            }
          }

          console.log("[PAYMENT_WEBHOOK] Booking confirmed:", payment.booking.bookingCode);
        }
      } else if (isPaymentFailed(newStatus)) {
        // Only process if booking is still PENDING
        if (payment.booking.status === "PENDING") {
          // Update booking status
          await tx.booking.update({
            where: { id: payment.booking.id },
            data: {
              status: newStatus === "EXPIRED" ? "EXPIRED" : "CANCELLED",
              cancelledAt: new Date(),
              cancellationReason:
                newStatus === "EXPIRED"
                  ? "Payment expired"
                  : "Payment failed or cancelled",
            },
          });

          // Restore available seats
          await tx.schedule.update({
            where: { id: payment.booking.scheduleId },
            data: {
              availableSeats: { increment: payment.booking.totalPassengers },
            },
          });

          console.log(
            "[PAYMENT_WEBHOOK] Booking cancelled, seats restored:",
            payment.booking.bookingCode
          );
        }
      } else if (newStatus === "REFUND") {
        // Handle refund
        await tx.booking.update({
          where: { id: payment.booking.id },
          data: {
            status: "REFUNDED",
          },
        });

        // Invalidate tickets
        await tx.ticket.updateMany({
          where: { bookingId: payment.booking.id },
          data: { status: "CANCELLED" },
        });

        console.log("[PAYMENT_WEBHOOK] Booking refunded:", payment.booking.bookingCode);
      }
    });

    console.log("[PAYMENT_WEBHOOK] Processed successfully:", body.order_id, "->", newStatus);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[PAYMENT_WEBHOOK] Error:", error);
    // Return 200 to prevent Midtrans from excessive retries
    // The error is logged for manual investigation
    return new Response("Error processed", { status: 200 });
  }
}

/**
 * GET /api/payments/notification
 * Health check endpoint for webhook URL verification
 */
export async function GET() {
  return new Response("Webhook endpoint active", { status: 200 });
}
