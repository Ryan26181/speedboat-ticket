import crypto from "crypto";

/**
 * Midtrans API Configuration
 * Using direct API calls instead of SDK for better control
 */

// Environment-based URLs
const MIDTRANS_SNAP_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

const MIDTRANS_API_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

/**
 * Get Base64 encoded authorization header
 */
function getAuthHeader(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured");
  }
  const encoded = Buffer.from(`${serverKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Item details for Midtrans transaction
 */
export interface MidtransItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Parameters for creating a Snap transaction
 */
export interface CreateSnapTransactionParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemDetails: MidtransItemDetail[];
  expiryMinutes?: number;
}

/**
 * Response from Snap transaction creation
 */
export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

/**
 * Midtrans notification/webhook payload
 */
export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  settlement_time?: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  // VA specific fields
  va_numbers?: Array<{ va_number: string; bank: string }>;
  // QRIS specific fields
  acquirer?: string;
  // E-wallet specific fields
  issuer?: string;
}

/**
 * Transaction status response from Midtrans
 */
export interface TransactionStatusResponse {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  settlement_time?: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  va_numbers?: Array<{ va_number: string; bank: string }>;
}

/**
 * Create a Snap transaction for payment
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams
): Promise<SnapTransactionResponse> {
  const {
    orderId,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    itemDetails,
    expiryMinutes = 15,
  } = params;

  // Calculate expiry time
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + expiryMinutes);

  const requestBody = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: customerName.split(" ")[0],
      last_name: customerName.split(" ").slice(1).join(" ") || undefined,
      email: customerEmail,
      phone: customerPhone || undefined,
    },
    item_details: itemDetails.map((item) => ({
      id: item.id,
      name: item.name.substring(0, 50), // Midtrans has 50 char limit
      price: item.price,
      quantity: item.quantity,
    })),
    expiry: {
      unit: "minutes",
      duration: expiryMinutes,
    },
    // Enable all payment methods
    enabled_payments: [
      "credit_card",
      "bca_va",
      "bni_va",
      "bri_va",
      "permata_va",
      "other_va",
      "gopay",
      "shopeepay",
      "qris",
    ],
    // Callbacks
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/success`,
      error: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/failed`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/pending`,
    },
  };

  const response = await fetch(MIDTRANS_SNAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[MIDTRANS] Create transaction failed:", errorData);
    throw new MidtransError(
      `Failed to create Midtrans transaction: ${response.status}`,
      response.status,
      errorData
    );
  }

  const data = await response.json();
  return data as SnapTransactionResponse;
}

/**
 * Verify Midtrans webhook signature
 * Signature = SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error("[MIDTRANS] Server key not configured");
    return false;
  }

  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const calculatedSignature = crypto
    .createHash("sha512")
    .update(payload)
    .digest("hex");

  return calculatedSignature === signatureKey;
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(
  orderId: string
): Promise<TransactionStatusResponse> {
  const response = await fetch(`${MIDTRANS_API_URL}/${orderId}/status`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new MidtransError(
      `Failed to get transaction status: ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * Cancel a transaction
 */
export async function cancelTransaction(orderId: string): Promise<void> {
  const response = await fetch(`${MIDTRANS_API_URL}/${orderId}/cancel`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new MidtransError(
      `Failed to cancel transaction: ${response.status}`,
      response.status,
      errorData
    );
  }
}

/**
 * Map Midtrans transaction status to our PaymentStatus enum
 */
export type PaymentStatusType = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "REFUND";

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): PaymentStatusType {
  // Handle capture (credit card) - check fraud status
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "SUCCESS" : "PENDING";
  }

  switch (transactionStatus) {
    case "settlement":
      return "SUCCESS";
    case "pending":
      return "PENDING";
    case "deny":
    case "cancel":
      return "FAILED";
    case "expire":
      return "EXPIRED";
    case "refund":
    case "partial_refund":
      return "REFUND";
    default:
      return "PENDING";
  }
}

/**
 * Check if a status indicates successful payment
 */
export function isPaymentSuccess(status: PaymentStatusType): boolean {
  return status === "SUCCESS";
}

/**
 * Check if a status indicates payment failure or cancellation
 */
export function isPaymentFailed(status: PaymentStatusType): boolean {
  return status === "FAILED" || status === "EXPIRED";
}

/**
 * Generate unique order ID for Midtrans
 * Format: SPB-{bookingCode}-{timestamp}
 */
export function generateOrderId(bookingCode: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `SPB-${bookingCode}-${timestamp}`;
}

/**
 * Extract booking code from order ID
 */
export function extractBookingCode(orderId: string): string | null {
  const match = orderId.match(/^SPB-(.+)-[A-Z0-9]+$/);
  return match ? match[1] : null;
}

/**
 * Custom error class for Midtrans errors
 */
export class MidtransError extends Error {
  public statusCode: number;
  public data: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "MidtransError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Format payment amount for display
 */
export function formatPaymentAmount(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get payment type display name
 */
export function getPaymentTypeDisplay(paymentType: string): string {
  const typeMap: Record<string, string> = {
    credit_card: "Credit Card",
    bank_transfer: "Bank Transfer",
    bca_va: "BCA Virtual Account",
    bni_va: "BNI Virtual Account",
    bri_va: "BRI Virtual Account",
    permata_va: "Permata Virtual Account",
    other_va: "Virtual Account",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    cstore: "Convenience Store",
    akulaku: "Akulaku",
  };

  return typeMap[paymentType] || paymentType;
}
