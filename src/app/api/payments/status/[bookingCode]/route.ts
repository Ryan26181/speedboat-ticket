import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPaymentStatus } from "@/lib/payment-service";
import { formatPaymentAmount, getPaymentTypeDisplay } from "@/lib/midtrans";

interface RouteParams {
  params: Promise<{ bookingCode: string }>;
}

/**
 * GET /api/payments/status/[bookingCode]
 * Check payment status by booking code
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { bookingCode } = await params;

    // Get booking with payment and all details
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        payment: true,
        passengers: {
          include: {
            ticket: true,
          },
        },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if user owns this booking (or is admin/operator)
    const isAdminOrOperator =
      session.user.role === "ADMIN" || session.user.role === "OPERATOR";
    if (booking.userId !== session.user.id && !isAdminOrOperator) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Try to get fresh status from Midtrans (if payment exists)
    let midtransStatus = null;
    if (booking.payment?.orderId) {
      const statusResult = await checkPaymentStatus(booking.payment.orderId);
      if (statusResult.success) {
        midtransStatus = statusResult.status;
      }
    }

    // Format response
    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          totalAmount: booking.totalAmount,
          totalAmountFormatted: formatPaymentAmount(booking.totalAmount),
          expiresAt: booking.expiresAt,
          createdAt: booking.createdAt,
          confirmedAt: booking.confirmedAt,
          schedule: {
            departureTime: booking.schedule.departureTime,
            arrivalTime: booking.schedule.arrivalTime,
            route: {
              from: booking.schedule.route.departurePort.name,
              fromCity: booking.schedule.route.departurePort.city,
              to: booking.schedule.route.arrivalPort.name,
              toCity: booking.schedule.route.arrivalPort.city,
            },
            ship: {
              name: booking.schedule.ship.name,
              code: booking.schedule.ship.code,
            },
          },
          passengers: booking.passengers.map((p) => ({
            id: p.id,
            name: p.name,
            identityType: p.identityType,
            seatNumber: p.seatNumber,
            ticket: p.ticket
              ? {
                  ticketCode: p.ticket.ticketCode,
                  status: p.ticket.status,
                  qrData: p.ticket.qrData,
                }
              : null,
          })),
          customer: {
            name: booking.user.name,
            email: booking.user.email,
          },
        },
        payment: booking.payment
          ? {
              id: booking.payment.id,
              orderId: booking.payment.orderId,
              status: booking.payment.status,
              amount: booking.payment.amount,
              amountFormatted: formatPaymentAmount(booking.payment.amount),
              method: booking.payment.method,
              paymentType: booking.payment.paymentType,
              paymentTypeDisplay: booking.payment.paymentType
                ? getPaymentTypeDisplay(booking.payment.paymentType)
                : null,
              paidAt: booking.payment.paidAt,
              expiredAt: booking.payment.expiredAt,
              vaNumber: booking.payment.vaNumber,
              bank: booking.payment.bank,
              midtransToken: booking.payment.midtransToken,
              midtransRedirectUrl: booking.payment.midtransRedirectUrl,
            }
          : null,
        midtrans: midtransStatus,
      },
    });
  } catch (error: unknown) {
    console.error("[CHECK_STATUS_ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to check status" },
      { status: 500 }
    );
  }
}
