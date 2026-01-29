import { z } from "zod";

/**
 * Payment status enum
 */
const paymentStatusEnum = z.enum(
  ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "REFUND"],
  {
    error: "Please select a valid status",
  }
);

/**
 * Create payment schema
 */
export const createPaymentSchema = z.object({
  bookingId: z.string().cuid("Invalid booking ID"),
  paymentType: z.enum(["bank_transfer", "gopay", "qris", "shopeepay"], {
    error: "Please select a valid payment type",
  }),
  bank: z
    .enum(["bca", "bni", "bri", "mandiri", "permata"])
    .optional(),
});

/**
 * Midtrans webhook notification schema
 * Based on Midtrans Core API notification structure
 */
export const midtransWebhookSchema = z.object({
  transaction_time: z.string(),
  transaction_status: z.enum([
    "capture",
    "settlement",
    "pending",
    "deny",
    "cancel",
    "expire",
    "refund",
    "partial_refund",
    "failure",
  ]),
  transaction_id: z.string(),
  status_message: z.string().optional(),
  status_code: z.string(),
  signature_key: z.string(),
  settlement_time: z.string().optional(),
  payment_type: z.string(),
  order_id: z.string(),
  merchant_id: z.string().optional(),
  gross_amount: z.string(),
  fraud_status: z.enum(["accept", "challenge", "deny"]).optional(),
  currency: z.string().optional(),
  // Bank transfer specific
  va_numbers: z
    .array(
      z.object({
        va_number: z.string(),
        bank: z.string(),
      })
    )
    .optional(),
  // QRIS/E-wallet specific
  acquirer: z.string().optional(),
  issuer: z.string().optional(),
  // Additional fields
  approval_code: z.string().optional(),
  channel_response_code: z.string().optional(),
  channel_response_message: z.string().optional(),
});

/**
 * Payment status update schema (internal)
 */
export const updatePaymentStatusSchema = z.object({
  paymentId: z.string().cuid("Invalid payment ID"),
  status: paymentStatusEnum,
  transactionId: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

/**
 * Refund request schema
 */
export const refundRequestSchema = z.object({
  paymentId: z.string().cuid("Invalid payment ID"),
  reason: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500, "Reason must be less than 500 characters"),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .positive("Amount must be positive")
    .optional(), // If not provided, full refund
});

/**
 * Payment search/filter schema
 */
export const paymentFilterSchema = z.object({
  status: paymentStatusEnum.optional(),
  paymentType: z.string().optional(),
  orderId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().int().min(0).optional(),
  maxAmount: z.number().int().min(0).optional(),
});

// Type exports
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type MidtransWebhookPayload = z.infer<typeof midtransWebhookSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;
