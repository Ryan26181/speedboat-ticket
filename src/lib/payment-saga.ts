import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { logger } from './logger';
import { generateTicketCode, generateQRData } from './booking-utils';

// ============================================
// SAGA TYPES
// ============================================

interface SagaStep<T = SagaContext> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

interface SagaContext {
  bookingId: string;
  paymentId: string;
  scheduleId: string;
  passengerCount: number;
  orderId: string;
  bookingCode: string;
  payload: Record<string, unknown>;
  
  // Track completed steps for compensation
  completedSteps: string[];
  
  // Store data for compensation
  previousBookingStatus?: string;
  previousPaymentStatus?: string;
  generatedTicketIds?: string[];
  seatsDeducted?: boolean;
}

interface SagaResult {
  success: boolean;
  error?: string;
  compensated?: boolean;
  completedSteps: string[];
  failedStep?: string;
}

// ============================================
// PAYMENT SUCCESS SAGA
// ============================================

/**
 * Saga for processing successful payment
 * If any step fails, all previous steps are compensated (rolled back)
 */
export async function executePaymentSuccessSaga(
  context: SagaContext
): Promise<SagaResult> {
  const steps: SagaStep<SagaContext>[] = [
    // Step 1: Update Payment Status
    {
      name: 'UPDATE_PAYMENT',
      execute: async (ctx) => {
        const payment = await prisma.payment.findUnique({
          where: { id: ctx.paymentId },
        });
        ctx.previousPaymentStatus = payment?.status;

        await prisma.payment.update({
          where: { id: ctx.paymentId },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
            transactionId: ctx.payload.transaction_id as string,
            paymentType: ctx.payload.payment_type as string,
            rawResponse: ctx.payload as Prisma.JsonObject,
          },
        });
      },
      compensate: async (ctx) => {
        if (ctx.previousPaymentStatus) {
          await prisma.payment.update({
            where: { id: ctx.paymentId },
            data: {
              status: ctx.previousPaymentStatus as Prisma.PaymentUpdateInput['status'],
              paidAt: null,
            },
          });
        }
      },
    },

    // Step 2: Update Booking Status
    {
      name: 'UPDATE_BOOKING',
      execute: async (ctx) => {
        const booking = await prisma.booking.findUnique({
          where: { id: ctx.bookingId },
        });
        ctx.previousBookingStatus = booking?.status;

        await prisma.booking.update({
          where: { id: ctx.bookingId },
          data: { 
            status: 'CONFIRMED',
            confirmedAt: new Date(),
          },
        });
      },
      compensate: async (ctx) => {
        if (ctx.previousBookingStatus) {
          await prisma.booking.update({
            where: { id: ctx.bookingId },
            data: { 
              status: ctx.previousBookingStatus as Prisma.BookingUpdateInput['status'],
              confirmedAt: null,
            },
          });
        }
      },
    },

    // Step 3: Generate Tickets
    {
      name: 'GENERATE_TICKETS',
      execute: async (ctx) => {
        const passengers = await prisma.passenger.findMany({
          where: { bookingId: ctx.bookingId },
          include: { ticket: true },
        });

        // Filter passengers without tickets
        const passengersWithoutTickets = passengers.filter(p => !p.ticket);
        
        if (passengersWithoutTickets.length === 0) {
          ctx.generatedTicketIds = [];
          return;
        }

        // Pre-generate all ticket data without sequential DB calls
        const ticketDataList = passengersWithoutTickets.map((passenger, i) => {
          const ticketCode = generateTicketCode();
          const qrData = generateQRData(
            ticketCode,
            ctx.bookingCode,
            passenger.name,
            ctx.scheduleId
          );
          const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;
          
          return {
            passengerId: passenger.id,
            ticketCode,
            qrData,
            seatNumber,
          };
        });

        // Batch create all tickets
        await prisma.ticket.createMany({
          data: ticketDataList.map(t => ({
            bookingId: ctx.bookingId,
            passengerId: t.passengerId,
            ticketCode: t.ticketCode,
            qrData: t.qrData,
            status: 'VALID',
          })),
        });

        // Fetch created tickets to get IDs for compensation
        const createdTickets = await prisma.ticket.findMany({
          where: { 
            bookingId: ctx.bookingId,
            passengerId: { in: ticketDataList.map(t => t.passengerId) },
          },
          select: { id: true },
        });
        ctx.generatedTicketIds = createdTickets.map(t => t.id);

        // Batch update passengers with seat numbers
        await Promise.all(
          ticketDataList.map(t => 
            prisma.passenger.update({
              where: { id: t.passengerId },
              data: { seatNumber: t.seatNumber },
            })
          )
        );
      },
      compensate: async (ctx) => {
        if (ctx.generatedTicketIds && ctx.generatedTicketIds.length > 0) {
          await prisma.ticket.deleteMany({
            where: { id: { in: ctx.generatedTicketIds } },
          });
        }
      },
    },

    // Step 4: Create Audit Log
    {
      name: 'CREATE_AUDIT_LOG',
      execute: async (ctx) => {
        await prisma.paymentAuditLog.create({
          data: {
            paymentId: ctx.paymentId,
            action: 'PAYMENT_SUCCESS_SAGA',
            previousStatus: ctx.previousPaymentStatus,
            newStatus: 'SUCCESS',
            webhookPayload: ctx.payload as Prisma.JsonObject,
            metadata: {
              sagaSteps: ctx.completedSteps,
              passengerCount: ctx.passengerCount,
              ticketsGenerated: ctx.generatedTicketIds?.length || 0,
            },
          },
        });
      },
      compensate: async (ctx) => {
        // Audit logs should not be deleted for traceability
        // Instead, create a compensation audit log
        await prisma.paymentAuditLog.create({
          data: {
            paymentId: ctx.paymentId,
            action: 'PAYMENT_SUCCESS_SAGA_COMPENSATED',
            metadata: {
              compensatedSteps: ctx.completedSteps,
              reason: 'Saga execution failed',
            },
          },
        });
      },
    },
  ];

  return executeSaga(steps, context);
}

/**
 * Saga for processing payment failure/cancellation
 * Releases held resources
 */
export async function executePaymentFailureSaga(
  context: SagaContext
): Promise<SagaResult> {
  const steps: SagaStep<SagaContext>[] = [
    // Step 1: Update Payment Status
    {
      name: 'UPDATE_PAYMENT_FAILED',
      execute: async (ctx) => {
        const payment = await prisma.payment.findUnique({
          where: { id: ctx.paymentId },
        });
        ctx.previousPaymentStatus = payment?.status;

        await prisma.payment.update({
          where: { id: ctx.paymentId },
          data: {
            status: 'FAILED',
            rawResponse: ctx.payload as Prisma.JsonObject,
          },
        });
      },
      compensate: async (ctx) => {
        if (ctx.previousPaymentStatus) {
          await prisma.payment.update({
            where: { id: ctx.paymentId },
            data: {
              status: ctx.previousPaymentStatus as Prisma.PaymentUpdateInput['status'],
            },
          });
        }
      },
    },

    // Step 2: Update Booking Status
    {
      name: 'UPDATE_BOOKING_CANCELLED',
      execute: async (ctx) => {
        const booking = await prisma.booking.findUnique({
          where: { id: ctx.bookingId },
        });
        ctx.previousBookingStatus = booking?.status;

        await prisma.booking.update({
          where: { id: ctx.bookingId },
          data: { 
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: 'Payment failed or cancelled',
          },
        });
      },
      compensate: async (ctx) => {
        if (ctx.previousBookingStatus) {
          await prisma.booking.update({
            where: { id: ctx.bookingId },
            data: { 
              status: ctx.previousBookingStatus as Prisma.BookingUpdateInput['status'],
              cancelledAt: null,
              cancellationReason: null,
            },
          });
        }
      },
    },

    // Step 3: Release Seats
    {
      name: 'RELEASE_SEATS',
      execute: async (ctx) => {
        await prisma.schedule.update({
          where: { id: ctx.scheduleId },
          data: {
            availableSeats: { increment: ctx.passengerCount },
          },
        });
        ctx.seatsDeducted = false; // Seats were released
      },
      compensate: async (ctx) => {
        // If seats were released, we need to deduct them again
        if (ctx.seatsDeducted === false) {
          await prisma.schedule.update({
            where: { id: ctx.scheduleId },
            data: {
              availableSeats: { decrement: ctx.passengerCount },
            },
          });
        }
      },
    },

    // Step 4: Create Audit Log
    {
      name: 'CREATE_FAILURE_AUDIT_LOG',
      execute: async (ctx) => {
        await prisma.paymentAuditLog.create({
          data: {
            paymentId: ctx.paymentId,
            action: 'PAYMENT_FAILURE_SAGA',
            previousStatus: ctx.previousPaymentStatus,
            newStatus: 'FAILED',
            webhookPayload: ctx.payload as Prisma.JsonObject,
            metadata: {
              sagaSteps: ctx.completedSteps,
              seatsReleased: ctx.passengerCount,
            },
          },
        });
      },
      compensate: async (ctx) => {
        await prisma.paymentAuditLog.create({
          data: {
            paymentId: ctx.paymentId,
            action: 'PAYMENT_FAILURE_SAGA_COMPENSATED',
            metadata: {
              compensatedSteps: ctx.completedSteps,
              reason: 'Saga execution failed',
            },
          },
        });
      },
    },
  ];

  return executeSaga(steps, context);
}

// ============================================
// SAGA EXECUTOR
// ============================================

async function executeSaga<T extends { completedSteps: string[] }>(
  steps: SagaStep<T>[],
  context: T
): Promise<SagaResult> {
  const result: SagaResult = {
    success: false,
    completedSteps: [],
  };

  for (const step of steps) {
    try {
      logger.info('[SAGA_STEP_START]', { step: step.name });
      
      await step.execute(context);
      
      context.completedSteps.push(step.name);
      result.completedSteps.push(step.name);
      
      logger.info('[SAGA_STEP_COMPLETE]', { step: step.name });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('[SAGA_STEP_FAILED]', { 
        step: step.name, 
        error: errorMessage,
        completedSteps: result.completedSteps,
      });

      result.failedStep = step.name;
      result.error = errorMessage;

      // Compensate in reverse order
      await compensateSaga(steps, context, result.completedSteps);
      result.compensated = true;

      return result;
    }
  }

  result.success = true;
  return result;
}

async function compensateSaga<T extends { completedSteps: string[] }>(
  steps: SagaStep<T>[],
  context: T,
  completedSteps: string[]
): Promise<void> {
  logger.info('[SAGA_COMPENSATION_START]', { 
    stepsToCompensate: completedSteps 
  });

  // Compensate in reverse order
  const stepsToCompensate = [...completedSteps].reverse();

  for (const stepName of stepsToCompensate) {
    const step = steps.find(s => s.name === stepName);
    
    if (step) {
      try {
        logger.info('[SAGA_COMPENSATE_STEP]', { step: stepName });
        await step.compensate(context);
        logger.info('[SAGA_COMPENSATE_COMPLETE]', { step: stepName });
      } catch (compensateError: unknown) {
        // Log but continue - we want to try compensating all steps
        const errorMessage = compensateError instanceof Error ? compensateError.message : 'Unknown error';
        logger.error('[SAGA_COMPENSATE_FAILED]', { 
          step: stepName, 
          error: errorMessage 
        });
      }
    }
  }

  logger.info('[SAGA_COMPENSATION_COMPLETE]');
}

// ============================================
// SAGA CONTEXT FACTORY
// ============================================

export function createSagaContext(params: {
  bookingId: string;
  paymentId: string;
  scheduleId: string;
  passengerCount: number;
  orderId: string;
  bookingCode: string;
  payload: Record<string, unknown>;
}): SagaContext {
  return {
    ...params,
    completedSteps: [],
  };
}

export type { SagaContext, SagaResult, SagaStep };
