"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Ticket,
  Calendar,
  Clock,
  Ship,
  MapPin,
  ArrowRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  XCircle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Booking {
  id: string;
  bookingCode: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED" | "REFUNDED";
  totalPassengers: number;
  totalAmount: number;
  expiresAt: string;
  createdAt: string;
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    route: {
      departurePort: { name: string; city: string };
      arrivalPort: { name: string; city: string };
    };
    ship: { name: string };
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

export default function UserBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const currentStatus = searchParams.get("status") || "all";
  const limit = 10;

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (currentStatus !== "all") {
        params.append("status", currentStatus);
      }
      if (searchQuery) {
        params.append("bookingCode", searchQuery);
      }

      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load bookings");
      }

      // API returns { success, data: { data: [...], pagination: {...} } }
      setBookings(data.data?.data || []);
      setMeta(data.data?.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentStatus, searchQuery]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handle filter change
  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`/user/bookings?${params}`);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/user/bookings?${params}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending Payment" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      COMPLETED: { variant: "outline", label: "Completed" },
      EXPIRED: { variant: "outline", label: "Expired" },
      REFUNDED: { variant: "outline", label: "Refunded" },
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">View and manage all your bookings</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            {/* Status Filter */}
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && bookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No bookings found</h2>
            <p className="text-muted-foreground mb-4">
              {currentStatus !== "all" || searchQuery
                ? "Try adjusting your filters or search query."
                : "You haven't made any bookings yet."}
            </p>
            <Button asChild>
              <Link href="/">Book a Trip</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {!isLoading && !error && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const departureTime = new Date(booking.schedule.departureTime);
            const arrivalTime = new Date(booking.schedule.arrivalTime);
            const isPast = departureTime < new Date();
            const canCancel = booking.status === "PENDING" || (booking.status === "CONFIRMED" && !isPast);
            const canPay = booking.status === "PENDING";

            return (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Date Column */}
                    <div className="flex lg:flex-col items-center justify-center gap-2 lg:gap-0 p-4 lg:p-6 bg-primary/5 lg:min-w-25">
                      <span className="text-sm text-primary font-medium uppercase">
                        {format(departureTime, "MMM")}
                      </span>
                      <span className="text-3xl font-bold text-primary">
                        {format(departureTime, "dd")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(departureTime, "yyyy")}
                      </span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-4 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Trip Info */}
                        <div className="space-y-3">
                          {/* Route */}
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {booking.schedule.route.departurePort.name}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {booking.schedule.route.arrivalPort.name}
                            </span>
                          </div>

                          {/* Time & Ship */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ship className="h-4 w-4" />
                              {booking.schedule.ship.name}
                            </span>
                          </div>

                          {/* Booking Code & Status */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground font-mono">
                              {booking.bookingCode}
                            </span>
                            {getStatusBadge(booking.status)}
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">{formatPrice(booking.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.totalPassengers} passenger{booking.totalPassengers > 1 ? "s" : ""}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {canPay && (
                              <Button size="sm" asChild>
                                <Link href={`/payment/${booking.id}`} className="inline-flex items-center">
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Pay
                                </Link>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/user/bookings/${booking.id}`} className="inline-flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * limit + 1} to{" "}
                {Math.min(currentPage * limit, meta.total)} of {meta.total} bookings
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= meta.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
