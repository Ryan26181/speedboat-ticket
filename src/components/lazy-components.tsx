"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

// ==================== QR Scanner Lazy Loader ====================
export const LazyQRScanner = dynamic(
  () => import("@/components/features/qr-scanner").then((mod) => ({ default: mod.QRScanner })),
  {
    loading: () => (
      <div className="relative aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading camera...</p>
        </div>
      </div>
    ),
    ssr: false, // Camera requires client-side
  }
);

// ==================== Data Table Lazy Loader ====================
export const LazyDataTable = dynamic(
  () => import("@/components/features/data-table").then((mod) => ({ default: mod.DataTable })),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <div className="flex gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b">
              <div className="flex gap-4">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

// ==================== Search Form Lazy Loader ====================
export const LazySearchForm = dynamic(
  () => import("@/components/features/search-form").then((mod) => ({ default: mod.SearchForm })),
  {
    loading: () => (
      <div className="space-y-4 p-6 bg-card rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    ),
  }
);

// ==================== Schedule Card Lazy Loader ====================
export const LazyScheduleCard = dynamic(
  () => import("@/components/features/schedule-card").then((mod) => ({ default: mod.ScheduleCard })),
  {
    loading: () => (
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    ),
  }
);

// ==================== Payment Widget Lazy Loader ====================
export const LazyPaymentWidget = dynamic(
  () => import("@/components/features/payment-widget").then((mod) => ({ default: mod.PaymentWidget })),
  {
    loading: () => (
      <div className="p-6 bg-card rounded-lg border space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    ),
    ssr: false, // Payment requires client-side
  }
);

// Re-export types for type-safe usage
export type { DataTableProps, Column } from "@/components/features/data-table";
