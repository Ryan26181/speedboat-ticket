import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '7');

  try {
    // Date range
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days - 1));

    // Get daily stats using Prisma (compatible with Prisma Accelerate)
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        amount: true,
        paymentType: true,
      },
    });

    // Aggregate daily stats
    const dailyStatsMap = new Map<string, {
      date: string;
      total: number;
      success: number;
      failed: number;
      expired: number;
      revenue: number;
    }>();

    payments.forEach(payment => {
      const dateKey = format(payment.createdAt, 'yyyy-MM-dd');
      
      if (!dailyStatsMap.has(dateKey)) {
        dailyStatsMap.set(dateKey, {
          date: dateKey,
          total: 0,
          success: 0,
          failed: 0,
          expired: 0,
          revenue: 0,
        });
      }

      const stats = dailyStatsMap.get(dateKey)!;
      stats.total++;
      
      if (payment.status === 'SUCCESS') {
        stats.success++;
        stats.revenue += payment.amount;
      } else if (payment.status === 'FAILED') {
        stats.failed++;
      } else if (payment.status === 'EXPIRED') {
        stats.expired++;
      }
    });

    const dailyStats = Array.from(dailyStatsMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    // Get payment method breakdown
    const paymentMethodsMap = new Map<string, { count: number; revenue: number }>();
    
    payments.forEach(payment => {
      const paymentType = payment.paymentType || 'unknown';
      
      if (!paymentMethodsMap.has(paymentType)) {
        paymentMethodsMap.set(paymentType, { count: 0, revenue: 0 });
      }

      const method = paymentMethodsMap.get(paymentType)!;
      method.count++;
      if (payment.status === 'SUCCESS') {
        method.revenue += payment.amount;
      }
    });

    const paymentMethods = Array.from(paymentMethodsMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.count - a.count);

    // Get top errors from audit logs
    const errorLogs = await prisma.paymentAuditLog.groupBy({
      by: ['action'],
      where: {
        OR: [
          { action: { contains: 'FAILED' } },
          { action: { contains: 'ERROR' } },
        ],
        processedAt: { gte: startDate },
      },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    });

    const topErrors = errorLogs.map(log => ({
      action: log.action,
      count: log._count.action,
    }));

    // Get hourly distribution for today
    const todayStart = startOfDay(new Date());
    const todayPayments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: todayStart },
      },
      select: { createdAt: true },
    });

    const hourlyMap = new Map<number, number>();
    todayPayments.forEach(payment => {
      const hour = payment.createdAt.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyMap.get(hour) || 0,
    }));

    // Calculate summary
    const totalPayments = dailyStats.reduce((sum, d) => sum + d.total, 0);
    const successPayments = dailyStats.reduce((sum, d) => sum + d.success, 0);
    const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);

    return NextResponse.json({
      summary: {
        totalPayments,
        successPayments,
        successRate: totalPayments > 0 
          ? ((successPayments / totalPayments) * 100).toFixed(2)
          : 0,
        totalRevenue,
        avgPaymentValue: successPayments > 0 
          ? Math.round(totalRevenue / successPayments)
          : 0,
      },
      dailyStats,
      paymentMethods,
      topErrors,
      hourlyDistribution,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
