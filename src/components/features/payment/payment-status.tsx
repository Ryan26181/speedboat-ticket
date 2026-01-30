"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStatusProps {
  bookingCode: string;
  locale?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatusChange?: (status: string) => void;
  className?: string;
}

interface StatusData {
  booking: {
    status: string;
    bookingCode: string;
  };
  payment: {
    status: string;
    method?: string;
    paidAt?: string;
  } | null;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    iconColor: "text-yellow-600",
  },
  SUCCESS: {
    label: "Paid",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
  },
  FAILED: {
    label: "Failed",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    iconColor: "text-red-600",
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: AlertCircle,
    iconColor: "text-gray-600",
  },
  REFUNDED: {
    label: "Refunded",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: RefreshCw,
    iconColor: "text-purple-600",
  },
};

export function PaymentStatus({
  bookingCode,
  locale = "en",
  autoRefresh = false,
  refreshInterval = 5000,
  onStatusChange,
  className,
}: PaymentStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/payments/status/${bookingCode}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch status");
      }

      const newStatus = data.data;
      setStatus(newStatus);
      setError(null);
      setLastRefresh(new Date());

      // Notify parent of status change
      if (onStatusChange) {
        onStatusChange(newStatus.payment?.status || newStatus.booking.status);
      }

      // Handle redirects based on status
      const paymentStatus = newStatus.payment?.status;
      const bookingStatus = newStatus.booking.status;

      if (paymentStatus === "SUCCESS" || bookingStatus === "CONFIRMED") {
        router.push(`/${locale}/booking/${bookingCode}/success`);
      } else if (paymentStatus === "FAILED" || bookingStatus === "CANCELLED") {
        router.push(`/${locale}/booking/${bookingCode}/failed`);
      } else if (paymentStatus === "EXPIRED" || bookingStatus === "EXPIRED") {
        router.push(`/${locale}/booking/${bookingCode}/failed`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [bookingCode, locale, onStatusChange, router]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStatus]);

  const handleManualRefresh = () => {
    fetchStatus(true);
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paymentStatus = status?.payment?.status || "PENDING";
  const config = STATUS_CONFIG[paymentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Payment Status</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-center">
          <div className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-lg border",
            config.color
          )}>
            <StatusIcon className={cn("h-8 w-8", config.iconColor)} />
            <div>
              <p className="font-semibold text-lg">{config.label}</p>
              {status?.payment?.method && (
                <p className="text-sm opacity-75">via {status.payment.method}</p>
              )}
            </div>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && (
          <div className="text-center text-xs text-gray-500">
            {isRefreshing ? (
              <span className="flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing...
              </span>
            ) : (
              <span>
                Last updated: {lastRefresh.toLocaleTimeString()}
                {" · "}Auto-refreshing every {refreshInterval / 1000}s
              </span>
            )}
          </div>
        )}

        {/* Payment details */}
        {status?.payment?.paidAt && (
          <div className="text-center text-sm text-gray-600">
            Paid at: {new Date(status.payment.paidAt).toLocaleString("id-ID")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
