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
  Shield,
  Sparkles,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [showChangeMethodOption, setShowChangeMethodOption] = useState(false);

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

  // Create payment (with option to force new token)
  const handleCreatePayment = useCallback(async (forceNew: boolean = false) => {
    if (!bookingId) return;

    console.log("[PAYMENT_PAGE] Creating payment, forceNew:", forceNew);
    
    // Prevent double-click but don't use isCreatingPayment in dependency
    setIsCreatingPayment(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, forceNewToken: forceNew }),
      });

      const data = await res.json();
      console.log("[PAYMENT_PAGE] Payment response:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to create payment");
      }

      console.log("[PAYMENT_PAGE] Setting paymentData with snapToken:", data.data?.snapToken);
      setPaymentData(data.data);
    } catch (err) {
      console.error("[PAYMENT_PAGE] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to initiate payment");
    } finally {
      setIsCreatingPayment(false);
    }
  }, [bookingId]);

  // Handle change payment method (generate new token)
  const handleChangePaymentMethod = useCallback(() => {
    console.log("[PAYMENT_PAGE] Change payment method clicked, isCreatingPayment:", isCreatingPayment);
    if (isCreatingPayment) return; // Prevent double-click
    setPaymentData(null);
    setShowChangeMethodOption(false);
    handleCreatePayment(true);
  }, [handleCreatePayment, isCreatingPayment]);

  // Handle popup close - show option to change payment method
  const handlePaymentClose = useCallback(() => {
    setShowChangeMethodOption(true);
  }, []);

  // Handle payment success
  const handlePaymentSuccess = useCallback(() => {
    setPaymentStatus("success");
    // Wait a bit then redirect to ticket page
    setTimeout(() => {
      router.push(`/ticket/${booking?.bookingCode}`);
    }, 2000);
  }, [router, booking?.bookingCode]);

  // Handle payment pending (bank transfer, VA selected but not yet paid)
  const handlePaymentPending = useCallback(() => {
    // Show option to change payment method since user might want different method
    setShowChangeMethodOption(true);
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary-500 to-cyan-500 animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-white" />
        </div>
        <p className="mt-4 text-muted-foreground">Loading payment details...</p>
      </div>
    );
  }

  // Error state (no booking)
  if (error && !booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold font-heading mb-2">Oops! Something went wrong</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild className="gap-2">
            <Link href="/search">
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const departureTime = new Date(booking.schedule.departureTime);
  const arrivalTime = new Date(booking.schedule.arrivalTime);

  // Payment success state
  if (paymentStatus === "success") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <Card className="overflow-hidden border-0 shadow-2xl">
            <div className="bg-linear-to-br from-emerald-500 to-green-600 p-8 text-center text-white">
              <div className="relative inline-flex">
                <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                <div className="relative w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12" />
                </div>
              </div>
              <h1 className="mt-6 text-3xl font-bold font-heading">Payment Successful!</h1>
              <p className="mt-2 text-white/80">Your booking has been confirmed</p>
            </div>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-1">Booking Code</p>
                <p className="text-2xl font-mono font-bold text-primary">{booking.bookingCode}</p>
              </div>
              <p className="text-muted-foreground mb-6">
                A confirmation email has been sent to your email address. You can view and download your e-tickets now.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="gap-2 bg-linear-to-r from-primary-500 to-cyan-500 hover:from-primary-600 hover:to-cyan-600">
                  <Link href={`/ticket/${booking.bookingCode}`}>
                    <Sparkles className="h-4 w-4" />
                    View E-Tickets
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/my-bookings">Go to My Bookings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Booking not pending
  if (booking.status !== "PENDING") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold font-heading mb-2">Booking Status: {booking.status}</h2>
          <p className="text-muted-foreground mb-6">
            {booking.status === "CONFIRMED"
              ? "This booking has already been paid."
              : `This booking cannot be paid (status: ${booking.status}).`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {booking.status === "CONFIRMED" && (
              <Button asChild className="gap-2">
                <Link href={`/ticket/${booking.bookingCode}`}>
                  <Sparkles className="h-4 w-4" />
                  View Tickets
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/my-bookings">My Bookings</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="bg-linear-to-r from-primary-600 via-primary-500 to-cyan-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" asChild className="mb-4 text-white/80 hover:text-white hover:bg-white/10">
            <Link href="/my-bookings" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to My Bookings
            </Link>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-heading">Complete Payment</h1>
              <p className="mt-1 text-white/80">Secure your booking before time runs out</p>
            </div>
            
            {/* Timer */}
            {timeLeft > 0 && (
              <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl ${
                timeLeft < 300 
                  ? "bg-red-500/20 border border-red-400/30" 
                  : "bg-white/10 border border-white/20"
              }`}>
                <Timer className={`h-6 w-6 ${timeLeft < 300 ? "text-red-300 animate-pulse" : "text-white/70"}`} />
                <div>
                  <p className="text-xs text-white/60">Time Remaining</p>
                  <p className={`text-2xl font-mono font-bold ${timeLeft < 300 ? "text-red-300" : ""}`}>
                    {formatTimeLeft(timeLeft)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {timeLeft <= 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Booking Expired</AlertTitle>
            <AlertDescription>
              Your booking has expired. Please create a new booking.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Payment Section - Main */}
          <div className="lg:col-span-3 space-y-6">
            {/* Payment Card */}
            <Card className="overflow-hidden border-0 shadow-xl">
              <div className="bg-linear-to-r from-slate-800 to-slate-900 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-400 to-cyan-400 flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-heading">Payment Details</h2>
                    <p className="text-sm text-white/60">Complete your payment securely</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-6">
                {/* Amount Card */}
                <div className="bg-linear-to-br from-primary-50 to-cyan-50 dark:from-primary-950/50 dark:to-cyan-950/50 rounded-2xl p-6 border border-primary-100 dark:border-primary-900">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking Code</p>
                      <p className="text-lg font-mono font-bold">{booking.bookingCode}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="border-t border-primary-200/50 dark:border-primary-800/50 pt-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-4xl font-bold font-heading text-primary-600">
                      {formatPrice(booking.totalAmount)}
                    </p>
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
                  <div className="space-y-4">
                    {showChangeMethodOption && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">Want to use a different payment method?</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300">
                          Click &quot;Continue Payment&quot; to complete with current method, or &quot;Change Payment Method&quot; to select a different option.
                        </AlertDescription>
                      </Alert>
                    )}
                    <PaymentWidget
                      snapToken={paymentData.snapToken}
                      onSuccess={handlePaymentSuccess}
                      onPending={handlePaymentPending}
                      onError={handlePaymentError}
                      onClose={handlePaymentClose}
                      autoOpen={true}
                    />
                    <Button
                      variant="outline"
                      onClick={handleChangePaymentMethod}
                      disabled={isCreatingPayment}
                      className="w-full"
                    >
                      {isCreatingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating new payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Change Payment Method
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleCreatePayment(false)}
                    disabled={isCreatingPayment || timeLeft <= 0}
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-linear-to-r from-primary-500 to-cyan-500 hover:from-primary-600 hover:to-cyan-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300"
                  >
                    {isCreatingPayment ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay Now
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                {/* Payment Methods */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-center text-muted-foreground mb-4">Accepted Payment Methods</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Credit Card",
                      "BCA",
                      "BNI",
                      "BRI",
                      "Mandiri",
                      "GoPay",
                      "ShopeePay",
                      "OVO",
                      "DANA",
                      "QRIS",
                    ].map((method) => (
                      <span
                        key={method}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs text-muted-foreground">
                    Secured by <span className="font-semibold">Midtrans</span> Payment Gateway
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24 overflow-hidden border-0 shadow-xl">
              <div className="bg-linear-to-r from-slate-800 to-slate-900 p-5 text-white">
                <h3 className="text-lg font-bold font-heading">Trip Summary</h3>
              </div>
              
              <CardContent className="p-0">
                {/* Route Visualization */}
                <div className="p-5 bg-linear-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800">
                  <div className="relative">
                    {/* Departure */}
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="w-0.5 h-12 bg-linear-to-b from-emerald-500 to-primary-500 my-2" />
                      </div>
                      <div className="pt-1">
                        <p className="font-bold">{booking.schedule.route.departurePort.name}</p>
                        <p className="text-sm text-muted-foreground">{booking.schedule.route.departurePort.city}</p>
                      </div>
                    </div>
                    
                    {/* Arrival */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div className="pt-1">
                        <p className="font-bold">{booking.schedule.route.arrivalPort.name}</p>
                        <p className="text-sm text-muted-foreground">{booking.schedule.route.arrivalPort.city}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-4">
                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <Calendar className="h-5 w-5 text-primary-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-sm">{format(departureTime, "EEE, MMM d")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <Clock className="h-5 w-5 text-primary-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium text-sm">{format(departureTime, "HH:mm")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ship */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Ship className="h-5 w-5 text-primary-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ship</p>
                      <p className="font-medium">{booking.schedule.ship.name}</p>
                    </div>
                  </div>

                  {/* Passengers */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-primary-500" />
                      <span className="font-semibold">
                        {booking.totalPassengers} Passenger{booking.totalPassengers > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {booking.passengers.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold font-heading text-primary-600">
                        {formatPrice(booking.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
