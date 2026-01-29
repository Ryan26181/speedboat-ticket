import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  NotFoundError,
  AuthError,
} from "@/lib/api-utils";
import {
  getTransactionStatus,
  mapMidtransStatus,
  isPaymentSuccess,
  isPaymentFailed,
  formatPaymentAmount,
  getPaymentTypeDisplay,
} from "@/lib/midtrans";
import {
  generateTicketCode,
  generateQRData,
} from "@/lib/booking-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]/status
 * Check payment status from Midtrans
 * - Update local status if changed
 * - Return current status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Get payment
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            bookingCode: true,
            userId: true,
            status: true,
            scheduleId: true,
            totalPassengers: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError("Payment");
    }

    // Check authorization
    const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
    if (!isAdminOrOperator && payment.booking.userId !== user.id) {
      throw new AuthError("You don't have permission to check this payment");
    }

    // If payment is already in a final state, just return current status
    if (["SUCCESS", "FAILED", "REFUND"].includes(payment.status)) {
      return successResponse({
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        statusChanged: false,
        paidAt: payment.paidAt,
        paymentType: payment.paymentType,
        paymentTypeDisplay: payment.paymentType
          ? getPaymentTypeDisplay(payment.paymentType)
          : null,
        amount: payment.amount,
        amountFormatted: formatPaymentAmount(payment.amount),
        bookingStatus: payment.booking.status,
      });
    }

    // Fetch status from Midtrans
    let midtransStatus;
    try {
      midtransStatus = await getTransactionStatus(payment.orderId);
    } catch (error) {
      // If Midtrans returns error (e.g., transaction not found), return current status
      console.error("[PAYMENT_STATUS] Midtrans error:", error);
      return successResponse({
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        statusChanged: false,
        error: "Unable to fetch status from payment gateway",
        amount: payment.amount,
        amountFormatted: formatPaymentAmount(payment.amount),
        bookingStatus: payment.booking.status,
      });
    }

    // Map Midtrans status to our status
    const newStatus = mapMidtransStatus(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status
    );

    // Check if status changed
    const statusChanged = newStatus !== payment.status;

    if (statusChanged) {
      // Update payment record
      await prisma.$transaction(async (tx) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus,
            transactionId: midtransStatus.transaction_id || payment.transactionId,
            paymentType: midtransStatus.payment_type || payment.paymentType,
            paidAt: isPaymentSuccess(newStatus)
              ? midtransStatus.settlement_time
                ? new Date(midtransStatus.settlement_time)
                : new Date()
              : payment.paidAt,
            vaNumber: midtransStatus.va_numbers?.[0]?.va_number || payment.vaNumber,
            bank: midtransStatus.va_numbers?.[0]?.bank || payment.bank,
            rawResponse: midtransStatus as object,
          },
        });

        // Handle status-specific logic
        if (isPaymentSuccess(newStatus)) {
          // Confirm booking
          const booking = await tx.booking.update({
            where: { id: payment.booking.id },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
            },
            include: {
              passengers: true,
            },
          });

          // Generate tickets if not already generated
          const existingTickets = await tx.ticket.count({
            where: { bookingId: booking.id },
          });

          if (existingTickets === 0) {
            // Generate tickets for each passenger
            for (let i = 0; i < booking.passengers.length; i++) {
              const passenger = booking.passengers[i];
              
              // Generate unique ticket code
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
        } else if (isPaymentFailed(newStatus)) {
          // Restore seats and update booking status
          if (payment.booking.status === "PENDING") {
            await tx.booking.update({
              where: { id: payment.booking.id },
              data: {
                status: newStatus === "EXPIRED" ? "EXPIRED" : "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason:
                  newStatus === "EXPIRED"
                    ? "Payment expired"
                    : "Payment failed",
              },
            });

            // Restore available seats
            await tx.schedule.update({
              where: { id: payment.booking.scheduleId },
              data: {
                availableSeats: { increment: payment.booking.totalPassengers },
              },
            });
          }
        }
      });
    }

    // Fetch updated booking status
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: payment.booking.id },
      select: { status: true },
    });

    return successResponse({
      paymentId: payment.id,
      orderId: payment.orderId,
      status: newStatus,
      statusChanged,
      previousStatus: statusChanged ? payment.status : undefined,
      paidAt: isPaymentSuccess(newStatus)
        ? midtransStatus.settlement_time || new Date().toISOString()
        : null,
      paymentType: midtransStatus.payment_type,
      paymentTypeDisplay: midtransStatus.payment_type
        ? getPaymentTypeDisplay(midtransStatus.payment_type)
        : null,
      amount: payment.amount,
      amountFormatted: formatPaymentAmount(payment.amount),
      bookingStatus: updatedBooking?.status || payment.booking.status,
      midtransStatus: midtransStatus.transaction_status,
    });
  } catch (error) {
    return handleApiError(error, "CHECK_PAYMENT_STATUS");
  }
}
