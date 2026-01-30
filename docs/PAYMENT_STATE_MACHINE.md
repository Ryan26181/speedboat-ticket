# Payment System State Machine

This document describes the state machine implementation for the speedboat ticket booking system.

## Overview

The system uses two interconnected state machines:

1. **Booking Status** - Tracks the lifecycle of a booking
2. **Payment Status** - Tracks the lifecycle of a payment

Both state machines are designed to:

- Prevent invalid state transitions
- Support idempotency (same state → same state is always valid)
- Handle all Midtrans webhook statuses
- Provide audit trails for all transitions

---

## Booking Status States

```
                         USER_CANCELLED
                         PAYMENT_FAILED
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              │               ▼               │
              │         ┌─────────┐           │
              │         │CANCELLED│           │
              │         └─────────┘           │
              │               ▲               │
              │               │               │
    ┌─────────┴─────────┐     │ADMIN_CANCELLED
    │                   │     │
    │     ┌─────────┐   │     │
    │     │ PENDING │───┼─────┤
    │     └────┬────┘   │     │
    │          │        │     │
    │ PAYMENT_ │        │     │
    │ EXPIRED  │PAYMENT_│     │
    │          │SUCCESS │     │
    │          ▼        │     │
    │    ┌─────────┐    │     │
    │    │CONFIRMED├────┼─────┘
    │    └────┬────┘    │
    │         │         │
    │ TRIP_   │ REFUND_ │
    │COMPLETED│PROCESSED│
    │         │         │
    │         ▼         │
    │   ┌──────────┐    │
    │   │COMPLETED │────┤
    │   └────┬─────┘    │
    │        │          │
    │ REFUND_│          │
    │PROCESSED          │
    │        │          │
    │        ▼          │
    │   ┌─────────┐     │
    └──►│ EXPIRED │     │
        └─────────┘     │
              ▲         │
              │         ▼
        ┌─────────┐◄────┘
        │REFUNDED │
        └─────────┘
```

### Booking Status Transitions

| From      | To        | Trigger/Action   | Description                    |
| --------- | --------- | ---------------- | ------------------------------ |
| PENDING   | CONFIRMED | PAYMENT_SUCCESS  | Payment completed successfully |
| PENDING   | CANCELLED | PAYMENT_FAILED   | Payment failed or denied       |
| PENDING   | CANCELLED | USER_CANCELLED   | User cancelled before payment  |
| PENDING   | CANCELLED | ADMIN_CANCELLED  | Admin cancelled the booking    |
| PENDING   | EXPIRED   | PAYMENT_EXPIRED  | Payment window timed out       |
| CONFIRMED | COMPLETED | TRIP_COMPLETED   | Passenger completed the trip   |
| CONFIRMED | CANCELLED | ADMIN_CANCELLED  | Admin cancelled after payment  |
| CONFIRMED | REFUNDED  | REFUND_PROCESSED | Refund was processed           |
| COMPLETED | REFUNDED  | REFUND_PROCESSED | Post-trip refund               |

### Terminal States (No exit)

- **CANCELLED** - Booking was cancelled
- **EXPIRED** - Payment window expired
- **REFUNDED** - Payment was refunded

---

## Payment Status States

```
                              FRAUD_REVIEW
                                   │
                                   ▼
                            ┌───────────┐
              ┌─────────────│ CHALLENGE │─────────────┐
              │             └─────┬─────┘             │
              │                   │                   │
              │          FRAUD_   │  FRAUD_           │
              │         ACCEPTED  │ REJECTED          │
              │                   │                   │
              │                   ▼                   │
              │             ┌─────────┐               │
              │             │  DENY   │               │
              │             └─────────┘               │
              │                   ▲                   │
              │                   │ FRAUD_DENIED      │
              │                   │                   │
         ┌────┴────┐              │              ┌────┴────┐
         │ SUCCESS │◄─────────────┼──────────────│ PENDING │
         └────┬────┘              │              └────┬────┘
              │           PAYMENT_│                   │
              │           CAPTURED│             ┌─────┼─────┐
              │           SETTLED │             │     │     │
         REFUND                   │    PAYMENT_ │     │     │ PAYMENT_
         CHARGEBACK               │    DENIED   │     │     │ EXPIRED
              │                   │    CANCELLED│     │     │
              ▼                   │             │     │     │
        ┌─────────┐               │             ▼     │     ▼
        │REFUNDED │               │      ┌──────────┐ │ ┌─────────┐
        └─────────┘               │      │ FAILED   │ │ │ EXPIRED │
                                  │      └──────────┘ │ └─────────┘
                                  │                   │
                                  │                   ▼
                                  │            ┌───────────┐
                                  └────────────│ CANCELLED │
                                               └───────────┘
```

### Payment Status Transitions

| From      | To        | Trigger/Action    | Description                    |
| --------- | --------- | ----------------- | ------------------------------ |
| PENDING   | SUCCESS   | PAYMENT_CAPTURED  | Credit card payment captured   |
| PENDING   | SUCCESS   | PAYMENT_SETTLED   | Bank transfer/e-wallet settled |
| PENDING   | FAILED    | PAYMENT_DENIED    | Payment denied by bank         |
| PENDING   | FAILED    | PAYMENT_CANCELLED | Payment cancelled              |
| PENDING   | EXPIRED   | PAYMENT_EXPIRED   | Payment window timed out       |
| PENDING   | CANCELLED | USER_CANCELLED    | User cancelled payment         |
| PENDING   | CHALLENGE | FRAUD_REVIEW      | Credit card under fraud review |
| PENDING   | DENY      | FRAUD_DENIED      | Immediate fraud rejection      |
| CHALLENGE | SUCCESS   | FRAUD_ACCEPTED    | Fraud review passed            |
| CHALLENGE | DENY      | FRAUD_REJECTED    | Fraud review failed            |
| CHALLENGE | CANCELLED | USER_CANCELLED    | User cancelled during review   |
| SUCCESS   | REFUNDED  | REFUND_FULL       | Full refund processed          |
| SUCCESS   | REFUNDED  | REFUND_PARTIAL    | Partial refund processed       |
| SUCCESS   | REFUNDED  | CHARGEBACK        | Chargeback initiated           |

### Terminal States (No exit)

- **FAILED** - Payment failed
- **EXPIRED** - Payment window expired
- **REFUNDED** - Payment was refunded
- **CANCELLED** - Payment was cancelled
- **DENY** - Payment denied due to fraud

---

## Midtrans Status Mapping

| Midtrans Status  | Fraud Status | Payment Status | Booking Status | Action  |
| ---------------- | ------------ | -------------- | -------------- | ------- |
| `capture`        | `accept`     | SUCCESS        | CONFIRMED      | CONFIRM |
| `capture`        | `challenge`  | CHALLENGE      | PENDING        | HOLD    |
| `capture`        | `deny`       | DENY           | CANCELLED      | CANCEL  |
| `settlement`     | -            | SUCCESS        | CONFIRMED      | CONFIRM |
| `pending`        | -            | PENDING        | PENDING        | NONE    |
| `deny`           | -            | DENY           | CANCELLED      | CANCEL  |
| `cancel`         | -            | CANCELLED      | CANCELLED      | CANCEL  |
| `expire`         | -            | EXPIRED        | EXPIRED        | EXPIRE  |
| `failure`        | -            | FAILED         | CANCELLED      | CANCEL  |
| `refund`         | -            | REFUNDED       | REFUNDED       | REFUND  |
| `partial_refund` | -            | REFUNDED       | REFUNDED       | REFUND  |
| `authorize`      | -            | PENDING        | PENDING        | HOLD    |
| `chargeback`     | -            | REFUNDED       | CANCELLED      | CANCEL  |

---

## Implementation Details

### State Machine Class

```typescript
// Create a state machine for a booking
const machine = createBookingStateMachine("PENDING");

// Check if transition is valid
const canConfirm = machine.canTransition("CONFIRMED", "PAYMENT_SUCCESS");

// Perform transition
const result = machine.transition("CONFIRMED", "PAYMENT_SUCCESS");
if (!result.success) {
  console.error(result.error);
}

// Get valid next states
const nextStates = machine.getValidNextStates();

// Check if terminal
const isTerminal = machine.isTerminal();
```

### Validation Functions

```typescript
// Validate a transition before applying
const validation = validateBookingTransition(
  "PENDING", // from
  "CONFIRMED", // to
  "PAYMENT_SUCCESS", // action
);

if (!validation.valid) {
  console.error(validation.error);
}
```

### Status Info

```typescript
// Get human-readable status information
const info = getBookingStatusInfo("CONFIRMED");
console.log(info.label); // "Confirmed"
console.log(info.description); // "Payment received, booking confirmed"
console.log(info.canRefund); // true
console.log(info.canCancel); // true
console.log(info.isTerminal); // false
```

---

## Error Handling

Invalid transitions are:

1. **Logged** with warning level
2. **Skipped** (not crashed) to handle out-of-order webhooks
3. **Recorded** in audit logs for investigation

Example log:

```
[STATE_MACHINE_INVALID_TRANSITION] {
  from: "CANCELLED",
  to: "CONFIRMED",
  action: "PAYMENT_SUCCESS"
}
```

---

## Best Practices

1. **Always validate before transitioning** - Use `canTransition()` or `validateBookingTransition()`
2. **Include action context** - Helps with debugging and audit trails
3. **Handle idempotency** - Same state → same state is always valid
4. **Log all transitions** - Both successful and failed
5. **Use terminal state checks** - Prevent operations on completed bookings

---

## Related Files

- `src/lib/state-machine.ts` - State machine implementation
- `src/lib/webhook-status-handlers.ts` - Midtrans status mapping
- `src/lib/payment-service.ts` - Webhook processing with state validation
- `src/lib/payment-utils.ts` - Payment utility functions
