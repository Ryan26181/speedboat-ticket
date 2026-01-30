import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resyncBookingStatus } from '@/lib/webhook-retry';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const resyncSchema = z.object({
  bookingCode: z.string().min(1, 'Booking code is required'),
});

/**
 * Admin endpoint to manually resync payment status from Midtrans
 * Use when webhook might have been missed
 */
export async function POST(req: Request) {
  try {
    // 1. Check admin authentication
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const { bookingCode } = resyncSchema.parse(body);

    // 3. Log the action
    logger.info('[ADMIN_RESYNC_REQUEST]', {
      adminId: session.user.id,
      adminEmail: session.user.email,
      bookingCode,
    });

    // 4. Perform resync
    const result = await resyncBookingStatus(bookingCode);

    // 5. Log result
    logger.info('[ADMIN_RESYNC_RESULT]', {
      bookingCode,
      ...result,
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
        bookingCode,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        changed: result.previousStatus !== result.newStatus,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : '';
    
    logger.error('[ADMIN_RESYNC_ERROR]', { error: errorMessage });

    if (errorName === 'ZodError' && error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to resync' },
      { status: 500 }
    );
  }
}
