import { prisma } from './prisma';
import { snap, formatAmountForMidtrans, getEnabledPaymentMethods } from './midtrans';
import { Prisma } from '@prisma/client';
import { logger } from './logger';
import crypto from 'crypto';
import { format } from 'date-fns';

// ============================================
// TYPES
// ============================================

interface CreatePaymentParams {
  bookingId: string;
  userId: string;
  idempotencyKey: string; // Client-generated unique key
}

interface PaymentResponseData {
  token: string;
  redirectUrl: string;
  paymentId: string;
}

interface CreatePaymentResult {
  success: boolean;
  data?: PaymentResponseData;
  error?: string;
  existingPayment?: boolean;
}

// ============================================
// IDEMPOTENT PAYMENT CREATION
// ============================================

/**
 * Create payment with idempotency guarantee
 * Same idempotencyKey will return same result
 */
export async function createPaymentIdempotent(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  const { bookingId, userId, idempotencyKey } = params;
  const requestId = generateRequestId();

  logger.info('[PAYMENT_CREATE_START]', { requestId, bookingId, idempotencyKey });

  try {
    // Use transaction for atomic check-and-create
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check for existing idempotency record
      const existingIdempotency = await tx.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingIdempotency) {
        logger.info('[PAYMENT_IDEMPOTENT_HIT]', { requestId, idempotencyKey });
        
        // Return cached result
        return {
          success: true,
          data: existingIdempotency.response as unknown as PaymentResponseData,
          existingPayment: true,
        };
      }

      // 2. Find booking with user validation
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          userId: userId,
        },
        include: {
          user: true,
          schedule: {
            include: {
              route: {
                include: {
                  departurePort: true,
                  arrivalPort: true,
                },
              },
            },
          },
          passengers: true,
        },
      });

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      // 3. Check booking status
      if (booking.status === 'CONFIRMED') {
        return { success: false, error: 'Booking already confirmed' };
      }

      if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
        return { success: false, error: 'Booking is no longer valid' };
      }

      // 4. Check for existing PENDING payment with valid token
      const existingPayment = await tx.payment.findUnique({
        where: { bookingId },
      });

      if (existingPayment) {
        // If existing payment is still valid, return it
        if (
          existingPayment.status === 'PENDING' &&
          existingPayment.midtransToken &&
          existingPayment.expiredAt &&
          existingPayment.expiredAt > new Date()
        ) {
          const response: PaymentResponseData = {
            token: existingPayment.midtransToken,
            redirectUrl: existingPayment.midtransRedirectUrl || '',
            paymentId: existingPayment.id,
          };

          // Save idempotency record
          await tx.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              response: response as unknown as Prisma.JsonObject,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            },
          });

          return { success: true, data: response, existingPayment: true };
        }

        // Existing payment is expired or failed, check if can retry
        if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(existingPayment.status)) {
          // Reset payment for retry
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: 'PENDING',
              midtransToken: null,
              midtransRedirectUrl: null,
              transactionId: null,
            },
          });
        }
      }

      // 5. Get passenger count
      const passengerCount = booking.passengers.length;

      // 6. Create Midtrans transaction
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const expiryMinutes = 60 * 24; // 24 hours
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      const midtransParams = {
        transaction_details: {
          order_id: booking.bookingCode,
          gross_amount: formatAmountForMidtrans(booking.totalAmount),
        },
        customer_details: {
          first_name: booking.user.name || 'Customer',
          email: booking.user.email,
          phone: booking.user.phone || '',
        },
        item_details: [
          {
            id: bookingId,
            price: formatAmountForMidtrans(booking.schedule.price),
            quantity: passengerCount,
            name: `${booking.schedule.route.departurePort.name} → ${booking.schedule.route.arrivalPort.name}`.substring(0, 50),
          },
        ],
        callbacks: {
          finish: `${appUrl}/booking/${booking.bookingCode}/success`,
          error: `${appUrl}/booking/${booking.bookingCode}/failed`,
          pending: `${appUrl}/booking/${booking.bookingCode}/pending`,
        },
        expiry: {
          start_time: format(new Date(), "yyyy-MM-dd HH:mm:ss '+0700'"),
          unit: 'minutes' as const,
          duration: expiryMinutes,
        },
        enabled_payments: getEnabledPaymentMethods(),
      };

      // Call Midtrans API
      const transaction = await snap.createTransaction(midtransParams);

      // 7. Upsert payment record
      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              midtransToken: transaction.token,
              midtransRedirectUrl: transaction.redirect_url,
              expiredAt: expiresAt,
              status: 'PENDING',
              orderId: booking.bookingCode, // Ensure orderId is set
            },
          })
        : await tx.payment.create({
            data: {
              bookingId,
              orderId: booking.bookingCode,
              amount: booking.totalAmount,
              status: 'PENDING',
              midtransToken: transaction.token,
              midtransRedirectUrl: transaction.redirect_url,
              expiredAt: expiresAt,
            },
          });

      const response: PaymentResponseData = {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        paymentId: payment.id,
      };

      // 8. Save idempotency record
      await tx.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          response: response as unknown as Prisma.JsonObject,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // 9. Create audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'PAYMENT_CREATED',
          newStatus: 'PENDING',
          idempotencyKey,
          requestId,
          actorType: 'USER',
          actorId: userId,
          metadata: {
            midtransOrderId: booking.bookingCode,
            amount: booking.totalAmount,
          } as unknown as Prisma.JsonObject,
        },
      });

      return { success: true, data: response };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 30000, // Longer timeout for Midtrans API call
    });

    logger.info('[PAYMENT_CREATE_COMPLETE]', { 
      requestId, 
      bookingId, 
      success: result.success,
      existingPayment: result.existingPayment,
    });

    return result;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;

    // Handle lock timeout
    if (errorCode === 'P2034' || errorMessage.includes('could not obtain lock')) {
      logger.warn('[PAYMENT_CREATE_LOCK_TIMEOUT]', { requestId, bookingId });
      return { 
        success: false, 
        error: 'Payment is being processed, please wait' 
      };
    }

    logger.error('[PAYMENT_CREATE_ERROR]', { 
      requestId, 
      bookingId, 
      error: errorMessage 
    });

    return { success: false, error: 'Failed to create payment' };
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
