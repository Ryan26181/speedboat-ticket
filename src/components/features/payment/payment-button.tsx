"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { PaymentWidget } from "@/components/features/payment-widget";
import { cn } from "@/lib/utils";

interface PaymentButtonProps {
  bookingId: string;
  bookingCode: string;
  amount: number;
  locale?: string;
  className?: string;
  disabled?: boolean;
}

// Generate a unique ID for idempotency key
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function PaymentButton({
  bookingId,
  bookingCode,
  amount,
  locale = "en",
  className,
  disabled = false,
}: PaymentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);

  // Generate idempotency key once per component mount
  // This ensures double-clicks produce same result
  const idempotencyKeyRef = useRef<string>(`pay_${bookingId}_${generateUniqueId()}`);

  // Track if payment was initiated to prevent re-trigger
  const paymentInitiatedRef = useRef(false);

  const handleCreatePayment = async () => {
    // Prevent double-click
    if (paymentInitiatedRef.current || isLoading) {
      console.log("[PaymentButton] Payment already initiated, skipping");
      return;
    }

    paymentInitiatedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          bookingId,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create payment");
      }

      // If this is a cached response, log it
      if (data.cached) {
        console.log("[PaymentButton] Using cached payment token");
      }

      // Set the snap token to show payment widget
      setSnapToken(data.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
      // Generate new idempotency key for retry
      idempotencyKeyRef.current = `pay_${bookingId}_${generateUniqueId()}`;
      paymentInitiatedRef.current = false;
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (result: unknown) => {
    console.log("[PaymentButton] Success:", result);
    router.push(`/${locale}/booking/${bookingCode}/success`);
  };

  const handlePaymentPending = (result: unknown) => {
    console.log("[PaymentButton] Pending:", result);
    router.push(`/${locale}/booking/${bookingCode}/pending`);
  };

  const handlePaymentError = (result: unknown) => {
    console.log("[PaymentButton] Error:", result);
    setError("Payment failed. Please try again.");
    setSnapToken(null);
    // Generate new idempotency key for retry
    idempotencyKeyRef.current = `pay_${bookingId}_${generateUniqueId()}`;
    paymentInitiatedRef.current = false;
    setIsLoading(false);
  };

  const handlePaymentClose = () => {
    console.log("[PaymentButton] Closed");
    setSnapToken(null);
    // User closed without completing - allow retry with new key
    idempotencyKeyRef.current = `pay_${bookingId}_${generateUniqueId()}`;
    paymentInitiatedRef.current = false;
    setIsLoading(false);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // If we have a snap token, show the payment widget
  if (snapToken) {
    return (
      <PaymentWidget
        snapToken={snapToken}
        onSuccess={handlePaymentSuccess}
        onPending={handlePaymentPending}
        onError={handlePaymentError}
        onClose={handlePaymentClose}
        autoOpen={true}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs sm:text-sm">{error}</span>
        </div>
      )}

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleCreatePayment}
          disabled={disabled || isLoading}
          size="lg"
          className={cn(
            "relative w-full h-12 sm:h-14 text-sm sm:text-base font-semibold rounded-xl overflow-hidden",
            "bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
            "shadow-lg shadow-blue-500/30",
            className
          )}
        >
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Pay {formatCurrency(amount)}</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </>
            )}
          </span>
        </Button>
      </motion.div>
    </div>
  );
}
