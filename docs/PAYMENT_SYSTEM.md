# Enterprise-Grade Payment System Documentation

> **Version:** 1.0.0  
> **Last Updated:** January 29, 2026  
> **Platform:** Midtrans Payment Gateway

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Issues Addressed](#issues-addressed)
4. [File Structure](#file-structure)
5. [Configuration](#configuration)
6. [Deployment Checklist](#deployment-checklist)
7. [Scheduled Jobs](#scheduled-jobs)
8. [Testing Scenarios](#testing-scenarios)
9. [State Machine](#state-machine)
10. [Webhook Flow](#webhook-flow)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This payment system is built for **enterprise-grade reliability** with the Indonesian Midtrans payment gateway. It handles all edge cases including race conditions, double payments, webhook security, and provides comprehensive monitoring.

### Key Features

| Feature                   | Implementation                             |
| ------------------------- | ------------------------------------------ |
| Race Condition Prevention | Database-level locking (SELECT FOR UPDATE) |
| Double Payment Prevention | Idempotency keys + deduplication           |
| Secure Webhooks           | Signature verification + rate limiting     |
| Complete Status Handling  | All 11 Midtrans statuses mapped            |
| State Machine             | Valid status transitions only              |
| Saga Pattern              | Compensation on failure                    |
| Retry Logic               | Exponential backoff with jitter            |
| Circuit Breaker           | Fail fast on outages                       |
| Queue Processing          | BullMQ for scalable architecture           |
| Caching                   | Redis-based caching layer                  |
| Rate Limiting             | Protection from abuse                      |
| Structured Logging        | JSON logging with async context            |
| Metrics Collection        | Redis-based metrics                        |
| Alerting                  | Slack/Email/PagerDuty integration          |
| Health Checks             | Infrastructure monitoring                  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ /payments/  │  │ /payments/  │  │ /admin/dashboard/stats  │  │
│  │   create    │  │ notification│  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Payment    │  │   Webhook   │  │      State Machine      │  │
│  │  Service    │  │  Processor  │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Saga      │  │   Circuit   │  │         Retry           │  │
│  │  Pattern    │  │   Breaker   │  │         Logic           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL │  │    Redis    │  │       BullMQ            │  │
│  │  (Prisma)   │  │   (Cache)   │  │       (Queue)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MIDTRANS                                   │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │    Snap     │  │   Core API  │                               │
│  │   (Token)   │  │  (Status)   │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issues Addressed

| Issue                   | Problem                                      | Solution                                        | Step |
| ----------------------- | -------------------------------------------- | ----------------------------------------------- | ---- |
| Race Condition          | Multiple webhooks processed simultaneously   | Database locking (SELECT FOR UPDATE)            | 1    |
| Double Payment          | User clicks pay button multiple times        | Idempotency keys + deduplication                | 2    |
| Webhook Security        | Forged webhook attacks                       | Signature verification + timing-safe comparison | 3    |
| Missing Status Handling | Some Midtrans statuses not handled           | Complete status mapping (11 statuses)           | 3    |
| No State Machine        | Invalid status transitions allowed           | Booking/Payment state machine                   | 4    |
| No Compensation         | Failed transactions leave inconsistent state | Saga pattern with rollback                      | 5    |
| No Retry Logic          | Single failure causes permanent failure      | Exponential backoff + circuit breaker           | 5    |
| Scalability             | Webhook processing blocks response           | Queue-based processing + caching                | 6    |
| No Monitoring           | No visibility into system health             | Structured logging + metrics + alerts           | 7    |

---

## File Structure

### Core Payment Service

```
src/lib/
├── payment-service.ts        # Main processing with locking
├── payment-creation.ts       # Idempotent payment creation
├── payment-saga.ts           # Saga pattern for transactions
├── payment-events.ts         # Async event handling
├── midtrans.ts               # Enhanced Midtrans client
├── state-machine.ts          # Status state machine
├── webhook-status-handlers.ts # Complete status mapping
├── webhook-retry.ts          # Retry mechanism
├── retry.ts                  # Exponential backoff
├── circuit-breaker.ts        # Circuit breaker pattern
├── errors.ts                 # Custom error classes
├── logger.ts                 # Structured logging
├── metrics.ts                # Metrics collection
├── alerts.ts                 # Alert service
├── cache.ts                  # Caching layer
├── rate-limit.ts             # Rate limiting
└── prisma.ts                 # Optimized Prisma client
```

### Queue System

```
src/lib/queue/
├── connection.ts             # Redis connection
├── payment-queue.ts          # Queue definitions
└── workers.ts                # Background workers
```

### Background Jobs

```
src/lib/jobs/
├── payment-recovery.ts       # Stuck payment recovery
├── cleanup-idempotency.ts    # Cleanup expired records
└── monitoring-job.ts         # Health monitoring
```

### API Routes

```
src/app/api/
├── payments/
│   ├── create/route.ts       # Idempotent creation
│   ├── notification/route.ts # Hardened webhook
│   └── status/[bookingCode]/route.ts
├── admin/
│   ├── payments/resync/route.ts
│   └── dashboard/stats/route.ts
├── health/route.ts           # Health check
└── metrics/route.ts          # Metrics endpoint
```

### Database Schema

```
prisma/schema.prisma
├── Payment (updated with idempotency fields)
├── PaymentAuditLog (new)
├── IdempotencyRecord (new)
├── WebhookLock (new)
└── Optimized indexes
```

---

## Configuration

### Environment Variables

```env
# ===========================================
# DATABASE
# ===========================================
DATABASE_URL="postgresql://user:password@host:5432/dbname?connection_limit=20&pool_timeout=10"

# ===========================================
# REDIS (Required for queue & cache)
# ===========================================
REDIS_URL="redis://localhost:6379"
USE_WEBHOOK_QUEUE="true"

# ===========================================
# MIDTRANS
# ===========================================
MIDTRANS_SERVER_KEY="SB-Mid-server-xxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxx"
MIDTRANS_IS_PRODUCTION="false"

# ===========================================
# MONITORING
# ===========================================
LOG_LEVEL="info"                    # debug, info, warn, error
SERVICE_NAME="speedboat-payment"
APP_VERSION="1.0.0"

# ===========================================
# ALERTING (Optional)
# ===========================================
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx"
ALERT_EMAIL="alerts@yourdomain.com"
PAGERDUTY_ROUTING_KEY="your-routing-key"
```

### Dependencies

```bash
# Install required packages
npm install bullmq ioredis uuid date-fns

# Install dev dependencies
npm install -D @types/uuid
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Redis server running and accessible
- [ ] Database migrations applied (`npx prisma db push`)
- [ ] Connection pool settings optimized
- [ ] Dependencies installed

### Webhook Configuration

- [ ] Webhook URL updated in Midtrans Dashboard
- [ ] URL: `https://yourdomain.com/api/payments/notification`
- [ ] URL uses HTTPS (required by Midtrans)
- [ ] Firewall allows Midtrans IPs

### Background Workers

- [ ] Workers started in production
- [ ] Worker process monitored (PM2, Docker, etc.)
- [ ] Auto-restart on failure configured
- [ ] Separate process from web server (recommended)

### Monitoring

- [ ] Health check endpoint monitored (`/api/health`)
- [ ] Slack webhook configured for alerts
- [ ] Log aggregation configured (e.g., Datadog, Logtail)
- [ ] Metrics dashboard set up

### Testing

- [ ] Load test webhook endpoint
- [ ] Test concurrent payments
- [ ] Test payment recovery job
- [ ] Verify circuit breaker works
- [ ] Test all 11 Midtrans statuses

---

## Scheduled Jobs

| Job                 | Schedule          | Purpose                        |
| ------------------- | ----------------- | ------------------------------ |
| Payment Recovery    | Every 15 min      | Recover stuck payments         |
| Expire Old Payments | Every 1 hour      | Mark expired payments          |
| Cleanup Idempotency | Every 1 hour      | Remove old idempotency records |
| Monitoring Check    | Every 5 min       | Check system health            |
| Daily Summary       | Daily at midnight | Generate daily report          |
| Cleanup Job         | Weekly            | Remove old logs and records    |

### Cron Configuration

```typescript
// src/lib/jobs/scheduler.ts
import cron from "node-cron";
import { recoverStuckPayments, expireOldPayments } from "./payment-recovery";
import { cleanupExpiredIdempotencyRecords } from "./cleanup-idempotency";
import {
  runMonitoringChecks,
  runDailySummary,
  runCleanupJob,
} from "./monitoring-job";

export function startScheduledJobs() {
  // Every 15 minutes - Recover stuck payments
  cron.schedule("*/15 * * * *", () => {
    recoverStuckPayments().catch(console.error);
  });

  // Every hour at minute 0 - Expire old payments
  cron.schedule("0 * * * *", () => {
    expireOldPayments().catch(console.error);
  });

  // Every hour at minute 5 - Cleanup idempotency records
  cron.schedule("5 * * * *", () => {
    cleanupExpiredIdempotencyRecords().catch(console.error);
  });

  // Every 5 minutes - Monitoring checks
  cron.schedule("*/5 * * * *", () => {
    runMonitoringChecks().catch(console.error);
  });

  // Daily at midnight - Daily summary
  cron.schedule("0 0 * * *", () => {
    runDailySummary().catch(console.error);
  });

  // Weekly on Sunday at 3 AM - Cleanup old data
  cron.schedule("0 3 * * 0", () => {
    runCleanupJob().catch(console.error);
  });

  console.log("Scheduled jobs started");
}
```

---

## Testing Scenarios

### 1. Race Condition Test

```bash
# Send 10 concurrent webhooks for same order
for i in {1..10}; do
  curl -X POST https://yourdomain.com/api/payments/notification \
    -H "Content-Type: application/json" \
    -d '{"order_id":"TEST-001","transaction_status":"settlement",...}' &
done
wait

# Expected: Only 1 ticket generated, 9 requests deduplicated
# Check: SELECT COUNT(*) FROM "Ticket" WHERE "bookingId" = 'xxx';
```

### 2. Double Payment Test

```javascript
// Frontend: Rapidly click pay button
for (let i = 0; i < 5; i++) {
  fetch("/api/payments/create", {
    method: "POST",
    headers: { "Idempotency-Key": "same-key-123" },
    body: JSON.stringify({ bookingCode: "BOOK-001" }),
  });
}

// Expected: Same Midtrans token returned for all requests
// Check: Only 1 transaction in Midtrans dashboard
```

### 3. Circuit Breaker Test

```typescript
// Temporarily break Midtrans connection
// Make 5+ payment requests
// Expected: After threshold, circuit opens
// Subsequent requests fail fast with CircuitOpenError

// Wait 60 seconds
// Make another request
// Expected: Circuit half-opens, allows test request
```

### 4. Recovery Job Test

```sql
-- Create stuck payment manually
UPDATE "Payment"
SET status = 'PENDING',
    "createdAt" = NOW() - INTERVAL '1 hour'
WHERE "bookingCode" = 'TEST-001';

-- Run recovery job
-- Expected: Payment status synced from Midtrans
```

### 5. Webhook Signature Test

```bash
# Send webhook with invalid signature
curl -X POST https://yourdomain.com/api/payments/notification \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST-001","signature_key":"invalid"}'

# Expected: 401 Unauthorized response
```

---

## State Machine

### Booking States

```
                    ┌──────────────┐
                    │   PENDING    │
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │CANCELLED │ │CONFIRMED │ │ EXPIRED  │
       └──────────┘ └──────────┘ └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   REFUNDED   │
                    └──────────────┘
```

### Payment States

```
                    ┌──────────────┐
                    │   PENDING    │
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │  FAILED  │ │ SUCCESS  │ │ EXPIRED  │
       └──────────┘ └──────────┘ └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   REFUNDED   │
                    └──────────────┘
```

### Valid Transitions

| From State | Allowed To States                   |
| ---------- | ----------------------------------- |
| PENDING    | SUCCESS, FAILED, EXPIRED, CANCELLED |
| SUCCESS    | REFUNDED                            |
| FAILED     | PENDING (retry)                     |
| EXPIRED    | _(terminal)_                        |
| CANCELLED  | _(terminal)_                        |
| REFUNDED   | _(terminal)_                        |

---

## Webhook Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK REQUEST                               │
│              POST /api/payments/notification                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 1. Validate      │
                    │    Signature     │──── Invalid ────► 401
                    └──────────────────┘
                              │ Valid
                              ▼
                    ┌──────────────────┐
                    │ 2. Check Rate    │
                    │    Limit         │──── Exceeded ───► 429
                    └──────────────────┘
                              │ OK
                              ▼
                    ┌──────────────────┐
                    │ 3. Queue for     │
                    │    Processing    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 4. Lock Booking  │
                    │    Row (FOR      │
                    │    UPDATE)       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 5. Check         │
                    │    Idempotency   │──── Duplicate ──► Skip
                    └──────────────────┘
                              │ New
                              ▼
                    ┌──────────────────┐
                    │ 6. Validate      │
                    │    State         │──── Invalid ────► Log & Skip
                    │    Transition    │
                    └──────────────────┘
                              │ Valid
                              ▼
                    ┌──────────────────┐
                    │ 7. Update        │
                    │    Payment +     │
                    │    Booking       │
                    │    (Atomic)      │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 8. Generate      │
                    │    Tickets       │──── Only if SUCCESS
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 9. Emit Events   │
                    │    (Email,       │
                    │    Analytics)    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 10. Return       │
                    │     200 OK       │
                    └──────────────────┘
```

---

## Troubleshooting

### Common Issues

#### 1. Webhook Not Received

**Symptoms:** Payment stuck in PENDING, no webhook logs

**Checks:**

```bash
# Check webhook URL in Midtrans Dashboard
# Verify HTTPS is configured
# Check firewall rules

# Test endpoint manually
curl -X POST https://yourdomain.com/api/payments/notification \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solution:** Update webhook URL in Midtrans Dashboard, ensure HTTPS

#### 2. Duplicate Tickets Generated

**Symptoms:** Multiple tickets for same booking

**Checks:**

```sql
SELECT "bookingId", COUNT(*)
FROM "Ticket"
GROUP BY "bookingId"
HAVING COUNT(*) > 1;
```

**Solution:** Ensure webhook processing uses database locking

#### 3. Circuit Breaker Open

**Symptoms:** Payments failing with "Circuit breaker is open"

**Checks:**

```typescript
// Check circuit breaker state
import { midtransCircuitBreaker } from "@/lib/circuit-breaker";
console.log(midtransCircuitBreaker.getState());
```

**Solution:** Wait for circuit to half-open, or manually reset if Midtrans is back online

#### 4. Redis Connection Failed

**Symptoms:** Queue processing not working, cache misses

**Checks:**

```bash
# Test Redis connection
redis-cli ping

# Check connection URL
echo $REDIS_URL
```

**Solution:** Restart Redis, verify connection URL, check firewall

#### 5. High Webhook Processing Time

**Symptoms:** Webhook responses slow (>5s)

**Checks:**

```sql
-- Check average processing time
SELECT AVG(EXTRACT(EPOCH FROM ("processedAt" - "receivedAt")))
FROM "PaymentAuditLog"
WHERE "processedAt" IS NOT NULL;
```

**Solution:** Enable queue-based processing (`USE_WEBHOOK_QUEUE=true`)

### Log Queries

```bash
# Find failed webhooks
grep "WEBHOOK_FAILED" /var/log/app.log | tail -20

# Find payment errors
grep "PAYMENT_ERROR" /var/log/app.log | tail -20

# Find circuit breaker events
grep "CIRCUIT" /var/log/app.log | tail -20
```

### Health Check

```bash
# Check system health
curl https://yourdomain.com/api/health?detailed=true

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": { "status": "pass", "responseTime": 5 },
    "redis": { "status": "pass", "responseTime": 2 },
    "midtrans": { "status": "pass", "responseTime": 150 }
  }
}
```

---

## API Reference

### POST /api/payments/create

Create a new payment with idempotency.

**Headers:**

```
Idempotency-Key: unique-key-123 (optional but recommended)
```

**Request:**

```json
{
  "bookingCode": "BOOK-001"
}
```

**Response:**

```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "bookingCode": "BOOK-001",
    "midtransToken": "snap-token-xxx",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/xxx"
  }
}
```

### POST /api/payments/notification

Webhook endpoint for Midtrans notifications.

**Request:** (from Midtrans)

```json
{
  "transaction_time": "2026-01-29 10:00:00",
  "transaction_status": "settlement",
  "transaction_id": "xxx",
  "order_id": "BOOK-001",
  "gross_amount": "150000.00",
  "signature_key": "xxx"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Webhook processed"
}
```

### GET /api/health

Health check endpoint.

**Query Parameters:**

- `detailed=true` - Include Midtrans API check

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": { "status": "pass", "responseTime": 5 },
    "redis": { "status": "pass", "responseTime": 2 },
    "midtrans": { "status": "pass", "responseTime": 150 }
  }
}
```

### GET /api/metrics

Metrics endpoint (admin only).

**Response:**

```json
{
  "timestamp": "2026-01-29T10:00:00.000Z",
  "payments": {
    "total": 1000,
    "pending": 10,
    "success": 950,
    "failed": 40,
    "successRate": "95.00%"
  },
  "queues": {
    "webhook": { "waiting": 0, "active": 1, "failed": 0 },
    "email": { "waiting": 5, "active": 0, "failed": 0 }
  }
}
```

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs
3. Check Midtrans Dashboard for transaction status
4. Contact the development team

---

_Documentation generated for enterprise payment system v1.0.0_
