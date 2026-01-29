"use client";

import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

// Extend Window interface for Midtrans Snap
declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
      hide: () => void;
    };
  }
}

interface PaymentWidgetProps {
  snapToken: string;
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
  autoOpen?: boolean;
}

const SNAP_URL = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

export function PaymentWidget({
  snapToken,
  onSuccess,
  onPending,
  onError,
  onClose,
  autoOpen = false,
}: PaymentWidgetProps) {
  const [isSnapReady, setIsSnapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  // Open Snap payment popup
  const openSnapPopup = useCallback(() => {
    if (!window.snap || !snapToken) return;

    setIsLoading(true);

    window.snap.pay(snapToken, {
      onSuccess: (result) => {
        console.log("[PAYMENT] Success:", result);
        setIsLoading(false);
        onSuccess?.(result);
      },
      onPending: (result) => {
        console.log("[PAYMENT] Pending:", result);
        setIsLoading(false);
        onPending?.(result);
      },
      onError: (result) => {
        console.log("[PAYMENT] Error:", result);
        setIsLoading(false);
        onError?.(result);
      },
      onClose: () => {
        console.log("[PAYMENT] Popup closed");
        setIsLoading(false);
        onClose?.();
      },
    });
  }, [snapToken, onSuccess, onPending, onError, onClose]);

  // Auto-open on mount if enabled
  useEffect(() => {
    if (autoOpen && isSnapReady && snapToken && !hasOpened) {
      setHasOpened(true);
      openSnapPopup();
    }
  }, [autoOpen, isSnapReady, snapToken, hasOpened, openSnapPopup]);

  const handleScriptLoad = () => {
    setIsSnapReady(true);
  };

  const handleScriptError = () => {
    console.error("[PAYMENT] Failed to load Midtrans Snap script");
  };

  return (
    <div className="space-y-4">
      {/* Load Midtrans Snap Script */}
      <Script
        src={SNAP_URL}
        data-client-key={CLIENT_KEY}
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        strategy="lazyOnload"
      />

      {/* Pay Button */}
      <Button
        onClick={openSnapPopup}
        disabled={!isSnapReady || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading || !isSnapReady ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-5 w-5 mr-2" />
        )}
        {isLoading ? "Processing..." : !isSnapReady ? "Loading..." : "Pay Now"}
      </Button>

      {/* Payment Methods Info */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">Accepted payment methods:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Credit Card", "BCA", "BNI", "BRI", "Mandiri", "GoPay", "ShopeePay", "QRIS"].map(
            (method) => (
              <span
                key={method}
                className="inline-block px-2 py-1 text-xs bg-muted rounded"
              >
                {method}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
