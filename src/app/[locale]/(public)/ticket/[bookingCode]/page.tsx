"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Ship,
  Calendar,
  Download,
  CheckCircle,
  QrCode,
  Loader2,
  AlertCircle,
  Printer,
  Share2,
  User,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TicketData {
  id: string;
  ticketCode: string;
  status: string;
  seatNumber: string | null;
  qrDataURL: string;
  checkedInAt: string | null;
  passenger: {
    name: string;
    identityType: string;
    identityNumber: string;
    phone: string | null;
    category?: string;
  };
}

// Category display config
const CATEGORY_LABELS: Record<string, { label: string; badge?: string }> = {
  ADULT: { label: "Dewasa" },
  ELDERLY: { label: "Lansia", badge: "20% off" },
  CHILD: { label: "Anak", badge: "50% off" },
  INFANT: { label: "Bayi", badge: "Gratis" },
};

interface BookingData {
  id: string;
  bookingCode: string;
  status: string;
  totalPassengers: number;
  totalAmount: number;
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
    ship: { name: string; code: string };
  };
  tickets: TicketData[];
}

export default function TicketPage({ params }: { params: Promise<{ bookingCode: string }> }) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [bookingCode, setBookingCode] = useState<string>("");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);

  // Resolve params
  useEffect(() => {
    params.then((p) => setBookingCode(p.bookingCode));
  }, [params]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      const currentUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${currentUrl}`);
    }
  }, [authStatus, router]);

  // Fetch booking with tickets
  useEffect(() => {
    if (!bookingCode || authStatus !== "authenticated") return;

    async function fetchBooking() {
      try {
        // First, find booking by code
        const searchRes = await fetch(`/api/bookings?bookingCode=${bookingCode}`);
        const searchData = await searchRes.json();
        
        console.log("=== TICKET PAGE DEBUG ===");
        console.log("searchData:", searchData);

        // Handle nested paginated response
        const bookingsArray = searchData.data?.data || searchData.data || [];
        
        if (!searchRes.ok || !bookingsArray.length) {
          throw new Error("Booking not found");
        }

        const bookingId = bookingsArray[0].id;
        console.log("bookingId:", bookingId);
        console.log("=== END DEBUG ===");

        // Fetch full booking details with tickets
        const [bookingRes, ticketsRes] = await Promise.all([
          fetch(`/api/bookings/${bookingId}`),
          fetch(`/api/bookings/${bookingId}/tickets`),
        ]);

        const bookingData = await bookingRes.json();
        const ticketsData = await ticketsRes.json();
        
        console.log("bookingData:", bookingData);
        console.log("ticketsData:", ticketsData);

        if (!bookingRes.ok) {
          throw new Error(bookingData.message || "Failed to load booking");
        }

        // Handle nested response for tickets - API returns { success, data: { tickets: [...] } }
        const ticketsArray = ticketsData.data?.tickets || ticketsData.data?.data || ticketsData.data || [];
        console.log("ticketsArray:", ticketsArray);
        
        setBooking({
          ...bookingData.data,
          tickets: Array.isArray(ticketsArray) ? ticketsArray : [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tickets");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [bookingCode, authStatus]);

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
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      ACTIVE: { variant: "default", label: "Active" },
      USED: { variant: "secondary", label: "Used" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      EXPIRED: { variant: "outline", label: "Expired" },
    };
    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket - ${booking?.bookingCode}`,
          text: `My speedboat ticket from ${booking?.schedule.route.departurePort.name} to ${booking?.schedule.route.arrivalPort.name}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Loading states
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Booking not found"}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/my-bookings">My Bookings</Link>
        </Button>
      </div>
    );
  }

  // Booking not confirmed
  if (booking.status !== "CONFIRMED") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tickets Not Available</AlertTitle>
          <AlertDescription>
            Tickets are only available for confirmed bookings. Current status: {booking.status}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-3">
          {booking.status === "PENDING" && (
            <Button asChild>
              <Link href={`/payment/${booking.id}`}>Complete Payment</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/my-bookings">My Bookings</Link>
          </Button>
        </div>
      </div>
    );
  }

  const departureTime = new Date(booking.schedule.departureTime);
  const arrivalTime = new Date(booking.schedule.arrivalTime);
  const selectedTicket = booking.tickets[selectedTicketIndex];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-bookings" className="inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Bookings
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      <Card className="mb-6 bg-green-50 border-green-200 print:hidden">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Booking Confirmed!</p>
              <p className="text-sm text-green-600">
                Your tickets are ready. Show the QR code at check-in.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ticket Display */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            {/* Ticket Header */}
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Ship className="h-6 w-6" />
                  <span className="font-semibold">SpeedBoat Ticket</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  {selectedTicket?.status || "ACTIVE"}
                </Badge>
              </div>
              <div className="text-3xl font-bold tracking-wide">
                {booking.schedule.route.departurePort.code} → {booking.schedule.route.arrivalPort.code}
              </div>
            </div>

            <CardContent className="p-6">
              {/* Tabs for multiple passengers */}
              {booking.tickets.length > 1 && (
                <Tabs
                  value={selectedTicketIndex.toString()}
                  onValueChange={(v) => setSelectedTicketIndex(parseInt(v, 10))}
                  className="mb-6"
                >
                  <TabsList className="w-full">
                    {booking.tickets.map((ticket, idx) => (
                      <TabsTrigger key={ticket.id} value={idx.toString()} className="flex-1">
                        <User className="h-4 w-4 mr-1" />
                        {idx + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* QR Code */}
              {selectedTicket?.qrDataURL && (
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-white rounded-lg border-2 border-dashed">
                    <Image
                      src={selectedTicket.qrDataURL}
                      alt="Ticket QR Code"
                      width={180}
                      height={180}
                      className="mx-auto"
                    />
                    <p className="text-center mt-2 font-mono text-sm font-medium">
                      {selectedTicket.ticketCode}
                    </p>
                  </div>
                </div>
              )}

              {/* Passenger Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Passenger</p>
                  <p className="font-semibold text-lg">{selectedTicket?.passenger.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket?.passenger.identityType.replace("_", " ")} -{" "}
                    {selectedTicket?.passenger.identityNumber}
                  </p>
                </div>

                <Separator />

                {/* Route Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">From</p>
                    <p className="font-medium">{booking.schedule.route.departurePort.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.schedule.route.departurePort.city}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">To</p>
                    <p className="font-medium">{booking.schedule.route.arrivalPort.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.schedule.route.arrivalPort.city}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Date</p>
                    <p className="font-medium">{format(departureTime, "EEE, MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Time</p>
                    <p className="font-medium">
                      {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Ship & Seat */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Ship</p>
                    <p className="font-medium">{booking.schedule.ship.name}</p>
                  </div>
                  {selectedTicket?.seatNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Seat</p>
                      <p className="font-medium">{selectedTicket.seatNumber}</p>
                    </div>
                  )}
                </div>

                {/* Check-in Status */}
                {selectedTicket?.checkedInAt && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Checked in at {format(new Date(selectedTicket.checkedInAt), "HH:mm")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>

            {/* Ticket Footer */}
            <div className="bg-muted/50 px-6 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                Booking Code: <span className="font-mono font-medium">{booking.bookingCode}</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Booking Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trip Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{booking.schedule.route.departurePort.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(departureTime, "HH:mm")}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">DEPARTURE</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-2">
                <div className="w-0.5 h-8 bg-border" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDuration(booking.schedule.route.estimatedDuration)}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{booking.schedule.route.arrivalPort.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(arrivalTime, "HH:mm")}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">ARRIVAL</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Passengers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Passengers ({booking.totalPassengers})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {booking.tickets.map((ticket, idx) => (
                <div
                  key={ticket.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTicketIndex === idx
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTicketIndex(idx)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{ticket.passenger.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {ticket.ticketCode}
                      </p>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ticket Price × {booking.totalPassengers}</span>
                <span>
                  {formatPrice(booking.schedule.price)} × {booking.totalPassengers}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total Paid</span>
                <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Important Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Please arrive at the port at least 30 minutes before departure.</p>
              <p>• Bring a valid ID that matches your booking information.</p>
              <p>• Show the QR code to the staff for check-in.</p>
              <p>• Boarding will close 10 minutes before departure.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
