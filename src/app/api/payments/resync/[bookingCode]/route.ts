import { NextRequest, NextResponse } from 'next/server';
import { resyncBookingStatus } from '@/lib/webhook-retry';

/**
 * GET /api/payments/resync/[bookingCode]
 * Public endpoint to resync payment status from Midtrans
 * For development/testing - in production, use admin endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingCode: string }> }
) {
  const { bookingCode } = await params;

  if (!bookingCode) {
    return NextResponse.json(
      { success: false, error: 'Booking code is required' },
      { status: 400 }
    );
  }

  try {
    const result = await resyncBookingStatus(bookingCode);
    
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
