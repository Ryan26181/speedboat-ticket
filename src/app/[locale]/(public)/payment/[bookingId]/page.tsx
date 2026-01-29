"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Ship,
  Calendar,
  Users,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PaymentWidget } from "@/components/features/payment-widget";

interface Booking {
  id: string;
  bookingCode: string;
  status: string;
  totalPassengers: number;
  totalAmount: number;
  expiresAt: string;
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    route: {
      departurePort: { name: string; city: string };
      arrivalPort: { name: string; city: string };
    };
    ship: { name: string; code: string };
  };
  passengers: Array<{
    id: string;
    name: string;
    identityType: string;
    identityNumber: string;
  }>;
  payment?: {
    id: string;
    orderId: string;
    status: string;
    amount: number;
  };
}

interface PaymentData {
  paymentId: string;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  expiresAt: string;
}

export default function PaymentPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [bookingId, setBookingId] = useState<string>("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "error">("pending");

  // Resolve params
  useEffect(() => {
    params.then((p) => setBookingId(p.bookingId));
  }, [params]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      const currentUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${currentUrl}`);
    }
  }, [authStatus, router]);

  // Fetch booking details
  useEffect(() => {
    if (!bookingId || authStatus !== "authenticated") return;

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Booking not found");
        }

        setBooking(data.data);

        // Calculate time left
        const expiresAt = new Date(data.data.expiresAt).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));

        // Check if already paid
        if (data.data.status === "CONFIRMED") {
          setPaymentStatus("success");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId, authStatus]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || paymentStatus === "success") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Booking has expired. Please create a new booking.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Create payment
  const handleCreatePayment = useCallback(async () => {
    if (!bookingId || isCreatingPayment) return;

    setIsCreatingPayment(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create payment");
      }

      setPaymentData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate payment");
    } finally {
      setIsCreatingPayment(false);
    }
  }, [bookingId, isCreatingPayment]);

  // Handle payment success
  const handlePaymentSuccess = useCallback(() => {
    setPaymentStatus("success");
    // Wait a bit then redirect to ticket page
    setTimeout(() => {
      router.push(`/ticket/${booking?.bookingCode}`);
    }, 2000);
  }, [router, booking?.bookingCode]);

  // Handle payment pending
  const handlePaymentPending = useCallback(() => {
    // Refresh booking status
    router.refresh();
  }, [router]);

  // Handle payment error
  const handlePaymentError = useCallback(() => {
    setPaymentStatus("error");
    setError("Payment failed. Please try again.");
  }, []);

  // Loading states
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state (no booking)
  if (error && !booking) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/search">Back to Search</Link>
        </Button>
      </div>
    );
  }

  if (!booking) return null;

  const departureTime = new Date(booking.schedule.departureTime);
  const arrivalTime = new Date(booking.schedule.arrivalTime);

  // Payment success state
  if (paymentStatus === "success") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-6">
              Your booking has been confirmed. Redirecting to your tickets...
            </p>
            <Button asChild>
              <Link href={`/ticket/${booking.bookingCode}`}>View Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Booking not pending
  if (booking.status !== "PENDING") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Booking Status: {booking.status}</AlertTitle>
          <AlertDescription>
            {booking.status === "CONFIRMED"
              ? "This booking has already been paid."
              : `This booking cannot be paid (status: ${booking.status}).`}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-3">
          {booking.status === "CONFIRMED" && (
            <Button asChild>
              <Link href={`/ticket/${booking.bookingCode}`}>View Tickets</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/my-bookings">My Bookings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/my-bookings" className="inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          My Bookings
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Complete Payment</h1>
        {timeLeft > 0 && (
          <div className={`flex items-center gap-2 ${timeLeft < 300 ? "text-destructive" : "text-muted-foreground"}`}>
            <Timer className="h-5 w-5" />
            <span className="font-mono text-lg font-medium">{formatTimeLeft(timeLeft)}</span>
          </div>
        )}
      </div>

      {timeLeft <= 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Booking Expired</AlertTitle>
          <AlertDescription>
            Your booking has expired. Please create a new booking.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Booking Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Booking Code</span>
                  <span className="font-mono font-medium">{booking.bookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount to Pay</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(booking.totalAmount)}</span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Payment Widget or Button */}
              {paymentData?.snapToken ? (
                <PaymentWidget
                  snapToken={paymentData.snapToken}
                  onSuccess={handlePaymentSuccess}
                  onPending={handlePaymentPending}
                  onError={handlePaymentError}
                  onClose={() => {}}
                />
              ) : (
                <Button
                  onClick={handleCreatePayment}
                  disabled={isCreatingPayment || timeLeft <= 0}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingPayment ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pay Now
                </Button>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Secure payment powered by Midtrans. We accept Credit Cards, Bank Transfer, E-Wallets, and QRIS.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">{booking.schedule.route.departurePort.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.schedule.route.departurePort.city}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">{booking.schedule.route.arrivalPort.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.schedule.route.arrivalPort.city}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date & Time */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(departureTime, "EEE, MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.schedule.ship.name}</span>
                </div>
              </div>

              <Separator />

              {/* Passengers */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {booking.totalPassengers} Passenger{booking.totalPassengers > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {booking.passengers.map((p, idx) => (
                    <p key={p.id} className="text-sm text-muted-foreground">
                      {idx + 1}. {p.name}
                    </p>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center font-bold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
