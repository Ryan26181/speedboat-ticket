import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Comprehensive Audit Logging Service
 * 
 * Tracks security-relevant events:
 * - Authentication events (login, logout, failed attempts)
 * - User management (create, update, delete, role changes)
 * - Booking operations (create, cancel, modify)
 * - Payment events (initiate, complete, fail, refund)
 * - Admin actions (impersonation, data access, configuration)
 * 
 * Each audit log includes:
 * - Timestamp
 * - User ID (if authenticated)
 * - Action type
 * - Resource type and ID
 * - IP address
 * - User agent
 * - Request details (sanitized)
 * - Status (success/failure)
 */

// Audit action types
export type AuditAction =
  // Authentication
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_LOGOUT_ALL_DEVICES'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_PASSWORD_RESET_COMPLETE'
  | 'AUTH_EMAIL_VERIFICATION'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_UNLOCKED'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_DISABLED'
  // User Management
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_ROLE_CHANGE'
  | 'USER_PROFILE_VIEW'
  | 'USER_DATA_EXPORT'
  // Booking
  | 'BOOKING_CREATE'
  | 'BOOKING_UPDATE'
  | 'BOOKING_CANCEL'
  | 'BOOKING_VIEW'
  | 'BOOKING_SEARCH'
  // Payment
  | 'PAYMENT_INITIATE'
  | 'PAYMENT_COMPLETE'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUND'
  | 'PAYMENT_WEBHOOK_RECEIVED'
  | 'PAYMENT_WEBHOOK_VERIFIED'
  | 'PAYMENT_WEBHOOK_INVALID'
  // Ticket
  | 'TICKET_GENERATE'
  | 'TICKET_VALIDATE'
  | 'TICKET_CHECK_IN'
  | 'TICKET_DOWNLOAD'
  // Admin
  | 'ADMIN_USER_IMPERSONATE'
  | 'ADMIN_DATA_ACCESS'
  | 'ADMIN_CONFIG_CHANGE'
  | 'ADMIN_REPORT_GENERATE'
  | 'ADMIN_BULK_OPERATION';

// Resource types
export type ResourceType =
  | 'user'
  | 'booking'
  | 'payment'
  | 'ticket'
  | 'schedule'
  | 'route'
  | 'port'
  | 'ship'
  | 'config';

// Audit log entry
export interface AuditLogEntry {
  action: AuditAction;
  userId?: string | null;
  resourceType?: ResourceType;
  resourceId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

// Request context for audit logging
export interface AuditContext {
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Sanitize details to remove sensitive data
    const sanitizedDetails = sanitizeDetails(entry.details);

    // Log to database
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        userAgent: truncateUserAgent(entry.userAgent),
        details: sanitizedDetails as object,
        status: entry.status,
        errorMessage: entry.errorMessage,
        timestamp: new Date(),
      },
    });

    // Also log to application logger for real-time monitoring
    logger.info('[AUDIT]', {
      action: entry.action,
      userId: entry.userId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      status: entry.status,
    });
  } catch (error) {
    // Never fail the main operation due to audit logging failure
    logger.error('[AUDIT_ERROR]', {
      action: entry.action,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Extract audit context from request headers
 */
export function getAuditContext(headers: Headers): AuditContext {
  return {
    ipAddress: 
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      null,
    userAgent: headers.get('user-agent'),
    sessionId: headers.get('x-session-id'),
  };
}

/**
 * Sanitize audit details to remove sensitive information
 */
function sanitizeDetails(
  details?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'idNumber',
    'phone',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncate user agent to reasonable length
 */
function truncateUserAgent(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  return userAgent.length > 500 ? userAgent.substring(0, 500) : userAgent;
}

// ============================================
// TYPED AUDIT HELPERS
// ============================================

/**
 * Audit authentication events
 */
export async function auditAuth(
  action: Extract<AuditAction, `AUTH_${string}`>,
  ctx: AuditContext & { userId?: string | null; email?: string },
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId: ctx.userId,
    resourceType: 'user',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    details: { email: ctx.email, ...details },
    status,
  });
}

/**
 * Audit user management events
 */
export async function auditUser(
  action: Extract<AuditAction, `USER_${string}`>,
  ctx: AuditContext,
  targetUserId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId: ctx.userId,
    resourceType: 'user',
    resourceId: targetUserId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    details,
    status: 'SUCCESS',
  });
}

/**
 * Audit booking events
 */
export async function auditBooking(
  action: Extract<AuditAction, `BOOKING_${string}`>,
  ctx: AuditContext,
  bookingId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId: ctx.userId,
    resourceType: 'booking',
    resourceId: bookingId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    details,
    status: 'SUCCESS',
  });
}

/**
 * Audit payment events
 */
export async function auditPayment(
  action: Extract<AuditAction, `PAYMENT_${string}`>,
  ctx: AuditContext,
  paymentId: string,
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId: ctx.userId,
    resourceType: 'payment',
    resourceId: paymentId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    details,
    status,
  });
}

/**
 * Audit admin actions
 */
export async function auditAdmin(
  action: Extract<AuditAction, `ADMIN_${string}`>,
  ctx: AuditContext,
  resourceType: ResourceType,
  resourceId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action,
    userId: ctx.userId,
    resourceType,
    resourceId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    details,
    status: 'SUCCESS',
  });
}

// ============================================
// AUDIT LOG QUERIES
// ============================================

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  userId?: string;
  action?: AuditAction | AuditAction[];
  resourceType?: ResourceType;
  resourceId?: string;
  status?: 'SUCCESS' | 'FAILURE';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) {
    where.action = Array.isArray(filters.action)
      ? { in: filters.action }
      : filters.action;
  }
  if (filters.resourceType) where.resourceType = filters.resourceType;
  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.status) where.status = filters.status;
  if (filters.startDate || filters.endDate) {
    where.timestamp = {};
    if (filters.startDate) {
      (where.timestamp as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.timestamp as Record<string, Date>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
