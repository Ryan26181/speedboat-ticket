import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  NotFoundError,
  AuthError,
} from "@/lib/api-utils";
import { formatPaymentAmount, getPaymentTypeDisplay } from "@/lib/midtrans";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]
 * Get payment details
 * - Include booking info
 * - User can only access their own payments
 * - Admin/Operator can access all
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Get payment with relations
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
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
            passengers: {
              select: {
                id: true,
                name: true,
                identityType: true,
                identityNumber: true,
              },
            },
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
      throw new AuthError("You don't have permission to view this payment");
    }

    // Format response
    const response = {
      id: payment.id,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      amountFormatted: formatPaymentAmount(payment.amount),
      status: payment.status,
      paymentType: payment.paymentType,
      paymentTypeDisplay: payment.paymentType
        ? getPaymentTypeDisplay(payment.paymentType)
        : null,
      paymentChannel: payment.paymentChannel,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      vaNumber: payment.vaNumber,
      bank: payment.bank,
      qrisUrl: payment.qrisUrl,
      deeplinkUrl: payment.deeplinkUrl,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      booking: {
        id: payment.booking.id,
        bookingCode: payment.booking.bookingCode,
        status: payment.booking.status,
        totalPassengers: payment.booking.totalPassengers,
        totalAmount: payment.booking.totalAmount,
        totalAmountFormatted: formatPaymentAmount(payment.booking.totalAmount),
        expiresAt: payment.booking.expiresAt,
        schedule: {
          id: payment.booking.schedule.id,
          departureTime: payment.booking.schedule.departureTime,
          arrivalTime: payment.booking.schedule.arrivalTime,
          price: payment.booking.schedule.price,
          route: {
            departurePort: payment.booking.schedule.route.departurePort,
            arrivalPort: payment.booking.schedule.route.arrivalPort,
          },
          ship: payment.booking.schedule.ship,
        },
        passengers: payment.booking.passengers,
        user: payment.booking.user,
      },
    };

    return successResponse(response);
  } catch (error) {
    return handleApiError(error, "GET_PAYMENT");
  }
}
