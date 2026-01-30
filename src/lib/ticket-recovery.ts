/**
 * Ticket Recovery Job
 * 
 * Finds confirmed bookings that don't have tickets (due to webhook timeout)
 * and generates tickets for them.
 * 
 * This should be run periodically (e.g., every 5 minutes) to catch any
 * bookings where ticket generation failed during webhook processing.
 */

import { prisma } from './prisma';
import { generateTicketCode, generateQRData } from './booking-utils';
import { logger } from './logger';

export interface TicketRecoveryResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ bookingCode: string; error: string }>;
}

/**
 * Find and fix confirmed bookings without tickets
 */
export async function recoverMissingTickets(): Promise<TicketRecoveryResult> {
  const result: TicketRecoveryResult = {
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    // Find confirmed bookings without tickets
    const bookingsWithoutTickets = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        tickets: {
          none: {},
        },
      },
      include: {
        passengers: true,
        payment: true,
      },
      take: 50, // Process in batches
    });

    logger.info('[TICKET_RECOVERY_START]', {
      bookingsFound: bookingsWithoutTickets.length,
    });

    for (const booking of bookingsWithoutTickets) {
      result.processedCount++;

      try {
        // Double-check no tickets exist
        const existingCount = await prisma.ticket.count({
          where: { bookingId: booking.id },
        });

        if (existingCount > 0) {
          logger.info('[TICKET_RECOVERY_SKIP]', {
            bookingCode: booking.bookingCode,
            reason: 'Tickets already exist',
          });
          continue;
        }

        // Generate tickets
        const ticketDataList = booking.passengers.map((passenger, i) => {
          const ticketCode = generateTicketCode();
          const qrData = generateQRData(
            ticketCode,
            booking.bookingCode,
            passenger.name,
            booking.scheduleId
          );
          const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;

          return {
            ticketCode,
            qrData,
            passengerId: passenger.id,
            seatNumber,
          };
        });

        // Batch create tickets
        await prisma.ticket.createMany({
          data: ticketDataList.map(t => ({
            bookingId: booking.id,
            passengerId: t.passengerId,
            ticketCode: t.ticketCode,
            qrData: t.qrData,
            status: 'VALID',
          })),
        });

        // Update passengers with seat numbers
        await Promise.all(
          ticketDataList.map(t =>
            prisma.passenger.update({
              where: { id: t.passengerId },
              data: { seatNumber: t.seatNumber },
            })
          )
        );

        result.successCount++;
        logger.info('[TICKET_RECOVERY_SUCCESS]', {
          bookingCode: booking.bookingCode,
          ticketsCreated: ticketDataList.length,
        });

      } catch (error) {
        result.failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          bookingCode: booking.bookingCode,
          error: errorMessage,
        });

        logger.error('[TICKET_RECOVERY_ERROR]', {
          bookingCode: booking.bookingCode,
          error: errorMessage,
        });
      }
    }

    logger.info('[TICKET_RECOVERY_COMPLETE]', {
      processedCount: result.processedCount,
      successCount: result.successCount,
      failedCount: result.failedCount,
      errorCount: result.errors.length,
    });

  } catch (error) {
    logger.error('[TICKET_RECOVERY_FATAL]', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * API endpoint handler for manual recovery trigger
 */
export async function handleRecoveryRequest(): Promise<TicketRecoveryResult> {
  return recoverMissingTickets();
}
