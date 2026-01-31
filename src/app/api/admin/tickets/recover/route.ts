/**
 * Ticket Recovery API Endpoint
 * 
 * POST /api/admin/tickets/recover
 * 
 * Finds confirmed bookings without tickets and generates them.
 * This can be called manually by admin or by a scheduled job.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recoverMissingTickets } from '@/lib/ticket-recovery';

export async function POST() {
  try {
    // Check authentication - only admin can trigger recovery
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Allow admin only
    const isAdmin = session.user.role === 'ADMIN';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Run the recovery
    const result = await recoverMissingTickets();

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[TICKET_RECOVERY_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Recovery failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing in development
export async function GET() {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Method not allowed in production' },
      { status: 405 }
    );
  }

  const result = await recoverMissingTickets();
  return NextResponse.json({
    success: true,
    ...result,
  });
}
