import { Redis } from 'ioredis';
import { logger } from '../logger';

// ============================================
// REDIS CONNECTION
// ============================================

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('[REDIS_CONNECTION_FAILED]', { attempts: times });
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisConnection.on('connect', () => {
      logger.info('[REDIS_CONNECTED]');
    });

    redisConnection.on('error', (error) => {
      logger.error('[REDIS_ERROR]', { error: error.message });
    });
  }

  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
