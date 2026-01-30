// Type declarations for midtrans-client
// Based on official Midtrans Node.js SDK

declare module "midtrans-client" {
  interface MidtransClientConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    billing_address?: Address;
    shipping_address?: Address;
  }

  interface Address {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
  }

  interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
  }

  interface SnapTransactionParameter {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetails[];
    enabled_payments?: string[];
    credit_card?: {
      secure?: boolean;
      save_card?: boolean;
      channel?: string;
      bank?: string;
      installment?: {
        required?: boolean;
        terms?: Record<string, number[]>;
      };
      whitelist_bins?: string[];
    };
    callbacks?: {
      finish?: string;
      error?: string;
      pending?: string;
    };
    expiry?: {
      start_time?: string;
      unit?: "minute" | "minutes" | "hour" | "hours" | "day" | "days";
      duration?: number;
    };
    custom_field1?: string;
    custom_field2?: string;
    custom_field3?: string;
  }

  interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  interface TransactionStatusResponse {
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
    acquirer?: string;
    issuer?: string;
  }

  interface RefundParameter {
    amount?: number;
    reason?: string;
  }

  interface ChargeParameter {
    payment_type: string;
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetails[];
    [key: string]: unknown;
  }

  class Snap {
    constructor(config: MidtransClientConfig);
    createTransaction(
      parameter: SnapTransactionParameter
    ): Promise<SnapTransactionResponse>;
    createTransactionToken(parameter: SnapTransactionParameter): Promise<string>;
    createTransactionRedirectUrl(
      parameter: SnapTransactionParameter
    ): Promise<string>;
  }

  class CoreApi {
    constructor(config: MidtransClientConfig);
    charge(parameter: ChargeParameter): Promise<TransactionStatusResponse>;
    capture(transactionId: string): Promise<TransactionStatusResponse>;
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
      statusb2b(orderId: string): Promise<TransactionStatusResponse>;
      approve(orderId: string): Promise<TransactionStatusResponse>;
      deny(orderId: string): Promise<TransactionStatusResponse>;
      cancel(orderId: string): Promise<TransactionStatusResponse>;
      expire(orderId: string): Promise<TransactionStatusResponse>;
      refund(
        orderId: string,
        parameter?: RefundParameter
      ): Promise<TransactionStatusResponse>;
      refundDirect(
        orderId: string,
        parameter?: RefundParameter
      ): Promise<TransactionStatusResponse>;
    };
  }

  class Iris {
    constructor(config: { isProduction: boolean; serverKey: string });
    ping(): Promise<string>;
    getBalance(): Promise<{ balance: string }>;
    createBeneficiaries(
      parameter: unknown
    ): Promise<{ status: string; beneficiaries: unknown[] }>;
    updateBeneficiaries(
      aliasName: string,
      parameter: unknown
    ): Promise<{ status: string }>;
    getBeneficiaries(): Promise<unknown[]>;
    createPayouts(
      parameter: unknown
    ): Promise<{ payouts: unknown[]; error_message: string }>;
    approvePayouts(parameter: { reference_nos: string[] }): Promise<unknown>;
    rejectPayouts(parameter: {
      reference_nos: string[];
      reject_reason: string;
    }): Promise<unknown>;
    getPayoutDetails(referenceNo: string): Promise<unknown>;
    getTransactionHistory(
      parameter?: unknown
    ): Promise<{ transactions: unknown[] }>;
    getTopupChannels(): Promise<unknown[]>;
    getBankAccounts(): Promise<unknown[]>;
    validateBankAccount(
      bank: string,
      account: string
    ): Promise<{
      account_no: string;
      account_name: string;
      bank_name: string;
    }>;
  }

  export { Snap, CoreApi, Iris };
  export default { Snap, CoreApi, Iris };
}
