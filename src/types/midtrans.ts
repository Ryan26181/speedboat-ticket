// ============================================
// Midtrans Type Definitions
// ============================================

/**
 * Transaction details for Snap transaction
 */
export interface TransactionDetails {
  order_id: string;
  gross_amount: number;
}

/**
 * Customer details for Snap transaction
 */
export interface CustomerDetails {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  billing_address?: Address;
  shipping_address?: Address;
}

/**
 * Address structure for billing/shipping
 */
export interface Address {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
}

/**
 * Item details for transaction
 */
export interface ItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
  brand?: string;
  category?: string;
  merchant_name?: string;
}

/**
 * Credit card specific options
 */
export interface CreditCardOptions {
  secure?: boolean;
  save_card?: boolean;
  channel?: string;
  bank?: string;
  installment?: {
    required?: boolean;
    terms?: Record<string, number[]>;
  };
  whitelist_bins?: string[];
}

/**
 * Expiry configuration for transaction
 */
export interface ExpiryConfig {
  start_time?: string;
  unit?: "minute" | "hour" | "day";
  duration?: number;
}

/**
 * Callback URLs for payment result
 */
export interface CallbackUrls {
  finish?: string;
  error?: string;
  pending?: string;
}

/**
 * Complete Snap transaction parameter
 */
export interface SnapTransactionParameter {
  transaction_details: TransactionDetails;
  customer_details?: CustomerDetails;
  item_details?: ItemDetails[];
  enabled_payments?: PaymentMethod[];
  credit_card?: CreditCardOptions;
  callbacks?: CallbackUrls;
  expiry?: ExpiryConfig;
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
}

/**
 * Response from Snap transaction creation
 */
export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

/**
 * Midtrans webhook notification payload
 */
export interface NotificationPayload {
  transaction_time: string;
  transaction_status: TransactionStatus;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: FraudStatus;
  currency: string;
  // VA specific fields
  va_numbers?: Array<{
    va_number: string;
    bank: string;
  }>;
  // Settlement time
  settlement_time?: string;
  // QRIS specific
  acquirer?: string;
  // E-wallet specific
  issuer?: string;
}

/**
 * Midtrans transaction status values
 */
export type TransactionStatus =
  | "capture"
  | "settlement"
  | "pending"
  | "deny"
  | "cancel"
  | "expire"
  | "failure"
  | "refund"
  | "partial_refund"
  | "authorize";

/**
 * Fraud detection status
 */
export type FraudStatus = "accept" | "challenge" | "deny";

/**
 * Internal payment status mapping
 */
export type PaymentStatus = 
  | "PENDING" 
  | "SUCCESS" 
  | "FAILED" 
  | "EXPIRED" 
  | "REFUND";

/**
 * Booking status values
 */
export type BookingStatus = 
  | "PENDING" 
  | "CONFIRMED" 
  | "CANCELLED" 
  | "COMPLETED"
  | "EXPIRED"
  | "REFUNDED";

/**
 * Available payment methods in Midtrans
 */
export type PaymentMethod =
  // Credit/Debit Card
  | "credit_card"
  // Bank Transfer (Virtual Account)
  | "bca_va"
  | "bni_va"
  | "bri_va"
  | "permata_va"
  | "cimb_va"
  | "other_va"
  // E-Wallets
  | "gopay"
  | "shopeepay"
  | "dana"
  | "ovo"
  | "linkaja"
  // QRIS
  | "qris"
  // Convenience Store
  | "alfamart"
  | "indomaret"
  // Others
  | "akulaku"
  | "kredivo";

/**
 * Payment method display info
 */
export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  type: "card" | "bank_transfer" | "ewallet" | "qris" | "cstore" | "paylater";
  icon?: string;
}

/**
 * All supported payment methods with display info
 */
export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  // Credit Card
  { id: "credit_card", name: "Credit/Debit Card", type: "card" },
  // Bank Transfer
  { id: "bca_va", name: "BCA Virtual Account", type: "bank_transfer" },
  { id: "bni_va", name: "BNI Virtual Account", type: "bank_transfer" },
  { id: "bri_va", name: "BRI Virtual Account", type: "bank_transfer" },
  { id: "permata_va", name: "Permata Virtual Account", type: "bank_transfer" },
  { id: "cimb_va", name: "CIMB Virtual Account", type: "bank_transfer" },
  // E-Wallets
  { id: "gopay", name: "GoPay", type: "ewallet" },
  { id: "shopeepay", name: "ShopeePay", type: "ewallet" },
  { id: "dana", name: "DANA", type: "ewallet" },
  { id: "ovo", name: "OVO", type: "ewallet" },
  { id: "linkaja", name: "LinkAja", type: "ewallet" },
  // QRIS
  { id: "qris", name: "QRIS", type: "qris" },
  // Convenience Store
  { id: "alfamart", name: "Alfamart", type: "cstore" },
  { id: "indomaret", name: "Indomaret", type: "cstore" },
  // Pay Later
  { id: "akulaku", name: "Akulaku", type: "paylater" },
  { id: "kredivo", name: "Kredivo", type: "paylater" },
];

/**
 * Get payment methods by type
 */
export function getPaymentMethodsByType(type: PaymentMethodInfo["type"]): PaymentMethodInfo[] {
  return PAYMENT_METHODS.filter((method) => method.type === type);
}

/**
 * Get payment method info by ID
 */
export function getPaymentMethodInfo(id: PaymentMethod): PaymentMethodInfo | undefined {
  return PAYMENT_METHODS.find((method) => method.id === id);
}
