# Quick Start Guide

## Setup in 5 Minutes

### 1. Install Dependencies

```bash
npm install bullmq ioredis uuid date-fns
npm install -D @types/uuid
```

### 2. Configure Environment

Add to `.env`:

```env
# Redis
REDIS_URL="redis://localhost:6379"
USE_WEBHOOK_QUEUE="true"

# Monitoring
LOG_LEVEL="info"
SERVICE_NAME="speedboat-payment"
APP_VERSION="1.0.0"
```

### 3. Run Database Migration

```bash
npx prisma db push
npx prisma generate
```

### 4. Start Redis (if not running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### 5. Start the Application

```bash
npm run dev
```

### 6. Update Midtrans Webhook URL

In [Midtrans Dashboard](https://dashboard.midtrans.com):

1. Go to Settings → Configuration
2. Set Payment Notification URL to:
   ```
   https://yourdomain.com/api/payments/notification
   ```

---

## Verify Installation

### Check Health Endpoint

```bash
curl http://localhost:3000/api/health?detailed=true
```

Expected response:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "pass" },
    "redis": { "status": "pass" },
    "midtrans": { "status": "pass" }
  }
}
```

### Test Payment Flow

1. Create a booking through your app
2. Click "Pay Now"
3. Complete payment in Midtrans sandbox
4. Verify webhook received and processed

---

## Production Checklist

- [ ] Set `MIDTRANS_IS_PRODUCTION=true`
- [ ] Use production Midtrans keys
- [ ] Enable HTTPS
- [ ] Configure alerting (Slack/Email)
- [ ] Set up log aggregation
- [ ] Monitor health endpoint
- [ ] Start background workers

---

For detailed documentation, see [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md)
