import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { metrics } from '@/lib/metrics';
import { prisma } from '@/lib/prisma';
import { webhookQueue, emailQueue } from '@/lib/queue/payment-queue';
import { Queue } from 'bullmq';

export async function GET() {
  // Check admin authentication
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    // Get Redis metrics
    const redisMetrics = await metrics.getAllMetrics();

    // Get database stats
    const [
      totalPayments,
      pendingPayments,
      successPayments,
      failedPayments,
      todayPayments,
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'SUCCESS' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Get queue stats (with error handling for when Redis is unavailable)
    let webhookQueueStats: Record<string, unknown> = { error: 'Queue not available' };
    let emailQueueStats: Record<string, unknown> = { error: 'Queue not available' };
    
    try {
      [webhookQueueStats, emailQueueStats] = await Promise.all([
        getQueueStats(webhookQueue.get()),
        getQueueStats(emailQueue.get()),
      ]);
    } catch {
      // Redis unavailable - continue with error state
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        success: successPayments,
        failed: failedPayments,
        today: todayPayments,
        successRate: totalPayments > 0 
          ? ((successPayments / totalPayments) * 100).toFixed(2) + '%'
          : 'N/A',
      },
      queues: {
        webhook: webhookQueueStats,
        email: emailQueueStats,
      },
      metrics: redisMetrics,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function getQueueStats(queue: Queue): Promise<Record<string, unknown>> {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  } catch {
    return { error: 'Failed to get queue stats' };
  }
}
