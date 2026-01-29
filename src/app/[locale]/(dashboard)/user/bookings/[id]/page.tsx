"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import {
  ArrowLeft,
  Ticket,
  Calendar,
  Clock,
  Ship,
  MapPin,
  Users,
  CreditCard,
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Passenger {
  id: string;
  name: string;
  identityType: string;
  identityNumber: string;
  phone: string | null;
}

interface TicketData {
  id: string;
  ticketCode: string;
  status: string;
  seatNumber: string | null;
  qrCode: string;
  checkedInAt: string | null;
  passenger: Passenger;
}

interface Payment {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  paymentMethod: string | null;
  paidAt: string | null;
}

interface Booking {
  id: string;
  bookingCode: string;
  status: string;
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
      departurePort: { name: string; city: string; code: string };
      arrivalPort: { name: string; city: string; code: string };
      estimatedDuration: number;
    };
    ship: { name: string; code: string; facilities: string[] };
  };
  passengers: Passenger[];
  payment: Payment | null;
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState<string>("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setBookingId(p.id));
  }, [params]);

  // Fetch booking details
  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [bookingRes, ticketsRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`),
        fetch(`/api/bookings/${bookingId}/tickets`),
      ]);

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        throw new Error(bookingData.message || "Booking not found");
      }

      setBooking(bookingData.data);

      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!bookingId || isCancelling) return;

    setIsCancelling(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel booking");
      }

      setCancelDialogOpen(false);
      await fetchBooking();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }> = {
      PENDING: { variant: "secondary", label: "Pending Payment", icon: <Clock className="h-3 w-3" /> },
      CONFIRMED: { variant: "default", label: "Confirmed", icon: <CheckCircle className="h-3 w-3" /> },
      CANCELLED: { variant: "destructive", label: "Cancelled", icon: <XCircle className="h-3 w-3" /> },
      COMPLETED: { variant: "outline", label: "Completed", icon: <CheckCircle className="h-3 w-3" /> },
      EXPIRED: { variant: "outline", label: "Expired", icon: <Clock className="h-3 w-3" /> },
      REFUNDED: { variant: "outline", label: "Refunded", icon: <CreditCard className="h-3 w-3" /> },
    };
    const { variant, label, icon } = config[status] || { variant: "outline" as const, label: status, icon: null };
    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      SUCCESS: { variant: "default", label: "Paid" },
      FAILED: { variant: "destructive", label: "Failed" },
      EXPIRED: { variant: "outline", label: "Expired" },
      REFUNDED: { variant: "outline", label: "Refunded" },
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/user/bookings" className="inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Booking not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const departureTime = new Date(booking.schedule.departureTime);
  const arrivalTime = new Date(booking.schedule.arrivalTime);
  const isPast = departureTime < new Date();
  const canCancel = (booking.status === "PENDING" || booking.status === "CONFIRMED") && !isPast;
  const canPay = booking.status === "PENDING" && new Date(booking.expiresAt) > new Date();
  const hasTickets = booking.status === "CONFIRMED" && tickets.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/user/bookings" className="inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Link>
        </Button>
        <div className="flex gap-2">
          {canPay && (
            <Button asChild>
              <Link href={`/payment/${booking.id}`} className="inline-flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Link>
            </Button>
          )}
          {hasTickets && (
            <Button variant="outline" asChild>
              <Link href={`/ticket/${booking.bookingCode}`} className="inline-flex items-center">
                <QrCode className="h-4 w-4 mr-2" />
                View Tickets
              </Link>
            </Button>
          )}
          {canCancel && (
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Booking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Booking</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel this booking? This action cannot be undone.
                    {booking.status === "CONFIRMED" && (
                      <span className="block mt-2 text-amber-600">
                        Note: Refund policy may apply for confirmed bookings.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                    Keep Booking
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelBooking}
                    disabled={isCancelling}
                  >
                    {isCancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Yes, Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Booking Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <span className="font-mono">{booking.bookingCode}</span>
                {getStatusBadge(booking.status)}
              </CardTitle>
              <CardDescription>
                Booked on {format(new Date(booking.createdAt), "MMMM d, yyyy 'at' HH:mm")}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatPrice(booking.totalAmount)}</p>
              <p className="text-sm text-muted-foreground">
                {booking.totalPassengers} passenger{booking.totalPassengers > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Route */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-semibold text-lg">{booking.schedule.route.departurePort.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.schedule.route.departurePort.city}</p>
                </div>
                <div className="text-center px-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-px w-8 bg-border" />
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{formatDuration(booking.schedule.route.estimatedDuration)}</span>
                    <div className="h-px w-8 bg-border" />
                  </div>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-semibold text-lg">{booking.schedule.route.arrivalPort.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.schedule.route.arrivalPort.city}</p>
                </div>
              </div>

              <Separator />

              {/* Date & Time */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(departureTime, "EEE, MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departure</p>
                  <p className="font-medium">{format(departureTime, "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arrival</p>
                  <p className="font-medium">{format(arrivalTime, "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ship</p>
                  <p className="font-medium">{booking.schedule.ship.name}</p>
                </div>
              </div>

              {/* Facilities */}
              {booking.schedule.ship.facilities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.schedule.ship.facilities.map((facility) => (
                        <Badge key={facility} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Passengers ({booking.passengers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {booking.passengers.map((passenger, index) => (
                  <div key={passenger.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{passenger.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {passenger.identityType.replace("_", " ")} - {passenger.identityNumber}
                        </p>
                        {passenger.phone && (
                          <p className="text-sm text-muted-foreground">{passenger.phone}</p>
                        )}
                      </div>
                      <Badge variant="outline">Passenger {index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          {hasTickets && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm">{ticket.ticketCode}</p>
                        <Badge variant={ticket.status === "ACTIVE" ? "default" : "secondary"}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <p className="font-medium">{ticket.passenger.name}</p>
                      {ticket.qrCode && (
                        <div className="flex justify-center">
                          <Image
                            src={ticket.qrCode}
                            alt={`QR Code for ${ticket.ticketCode}`}
                            width={120}
                            height={120}
                            className="rounded"
                          />
                        </div>
                      )}
                      {ticket.checkedInAt && (
                        <p className="text-xs text-green-600 text-center">
                          ✓ Checked in at {format(new Date(ticket.checkedInAt), "HH:mm")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline" asChild>
                    <Link href={`/ticket/${booking.bookingCode}`} className="inline-flex items-center">
                      <Printer className="h-4 w-4 mr-2" />
                      View & Print Tickets
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.payment ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getPaymentStatusBadge(booking.payment.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Order ID</span>
                    <span className="text-sm font-mono">{booking.payment.orderId}</span>
                  </div>
                  {booking.payment.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Method</span>
                      <span className="text-sm">{booking.payment.paymentMethod}</span>
                    </div>
                  )}
                  {booking.payment.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Paid At</span>
                      <span className="text-sm">
                        {format(new Date(booking.payment.paidAt), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Amount</span>
                    <span className="text-primary">{formatPrice(booking.payment.amount)}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No payment recorded yet.</p>
                  {canPay && (
                    <Button className="w-full" asChild>
                      <Link href={`/payment/${booking.id}`} className="inline-flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay Now
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Ticket Price × {booking.totalPassengers}
                </span>
                <span>
                  {formatPrice(booking.schedule.price)} × {booking.totalPassengers}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Expiry Warning */}
          {booking.status === "PENDING" && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Payment Required</AlertTitle>
              <AlertDescription>
                This booking expires on{" "}
                {format(new Date(booking.expiresAt), "MMM d, yyyy 'at' HH:mm")}.
                Please complete payment before expiry.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
