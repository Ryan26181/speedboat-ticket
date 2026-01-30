import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRedisConnection } from '@/lib/queue/connection';
import { coreApi } from '@/lib/midtrans';
import { logger } from '@/lib/logger';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    midtrans: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  responseTime?: number;
  error?: string;
}

const startTime = Date.now();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'pass' },
      redis: { status: 'pass' },
      midtrans: { status: 'pass' },
    },
  };

  // Check Database
  const dbCheck = await checkDatabase();
  health.checks.database = dbCheck;

  // Check Redis
  const redisCheck = await checkRedis();
  health.checks.redis = redisCheck;

  // Check Midtrans (only if detailed)
  if (detailed) {
    const midtransCheck = await checkMidtrans();
    health.checks.midtrans = midtransCheck;
  }

  // Determine overall status
  const checks = Object.values(health.checks);
  const failedChecks = checks.filter(c => c.status === 'fail');

  if (failedChecks.length === checks.length) {
    health.status = 'unhealthy';
  } else if (failedChecks.length > 0) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'pass',
      responseTime: Date.now() - start,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[HEALTH_CHECK_DB_FAIL]', { error: errorMessage });
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      error: errorMessage,
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const redis = getRedisConnection();
    await redis.ping();
    return {
      status: 'pass',
      responseTime: Date.now() - start,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[HEALTH_CHECK_REDIS_FAIL]', { error: errorMessage });
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      error: errorMessage,
    };
  }
}

async function checkMidtrans(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Try to get status of a known non-existent order
    // This will return 404 but proves API is reachable
    await coreApi.transaction.status('HEALTH_CHECK_' + Date.now());
    return {
      status: 'pass',
      responseTime: Date.now() - start,
    };
  } catch (error: unknown) {
    // 404 is expected and means API is working
    const httpStatusCode = (error as { httpStatusCode?: number }).httpStatusCode;
    if (httpStatusCode === 404) {
      return {
        status: 'pass',
        responseTime: Date.now() - start,
      };
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[HEALTH_CHECK_MIDTRANS_FAIL]', { error: errorMessage });
    return {
      status: 'fail',
      responseTime: Date.now() - start,
      error: errorMessage,
    };
  }
}
