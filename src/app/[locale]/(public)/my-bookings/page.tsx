"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Ship,
  MapPin,
  Calendar,
  Clock,
  Users,
  Loader2,
  AlertCircle,
  Ticket,
  CreditCard,
  XCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }> = {
  PENDING: { variant: "secondary", label: "Pending Payment", icon: <Clock className="h-3 w-3" /> },
  CONFIRMED: { variant: "default", label: "Confirmed", icon: <Ticket className="h-3 w-3" /> },
  CANCELLED: { variant: "destructive", label: "Cancelled", icon: <XCircle className="h-3 w-3" /> },
  COMPLETED: { variant: "outline", label: "Completed", icon: <Ticket className="h-3 w-3" /> },
  EXPIRED: { variant: "outline", label: "Expired", icon: <Clock className="h-3 w-3" /> },
  REFUNDED: { variant: "outline", label: "Refunded", icon: <RefreshCw className="h-3 w-3" /> },
};

function BookingCard({ booking }: { booking: Booking }) {
  const departureTime = new Date(booking.schedule.departureTime);
  const arrivalTime = new Date(booking.schedule.arrivalTime);
  const isPast = departureTime < new Date();
  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const expiresAt = new Date(booking.expiresAt);
  const isExpiringSoon = isPending && expiresAt.getTime() - Date.now() < 15 * 60 * 1000;

  const config = statusConfig[booking.status] || statusConfig.PENDING;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isPast && !isConfirmed ? "opacity-70" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left: Route & Time */}
          <div className="flex-1 space-y-3">
            {/* Status & Booking Code */}
            <div className="flex items-center justify-between">
              <Badge variant={config.variant} className="gap-1">
                {config.icon}
                {config.label}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">
                {booking.bookingCode}
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{booking.schedule.route.departurePort.name}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.schedule.route.departurePort.city}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 text-right">
                <p className="font-medium">{booking.schedule.route.arrivalPort.name}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.schedule.route.arrivalPort.city}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(departureTime, "EEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                </span>
              </div>
            </div>

            {/* Ship & Passengers */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Ship className="h-4 w-4" />
                <span>{booking.schedule.ship.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {booking.totalPassengers} passenger{booking.totalPassengers > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Price & Actions */}
          <div className="flex flex-col justify-between items-end gap-3 sm:border-l sm:pl-4 sm:min-w-40">
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{formatPrice(booking.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {booking.totalPassengers} × {formatPrice(booking.schedule.price)}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              {isPending && (
                <>
                  {isExpiringSoon && (
                    <p className="text-xs text-destructive text-center">
                      Expires soon!
                    </p>
                  )}
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href={`/payment/${booking.id}`} className="inline-flex items-center">
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pay Now
                    </Link>
                  </Button>
                </>
              )}
              {isConfirmed && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href={`/ticket/${booking.bookingCode}`} className="inline-flex items-center">
                    <Ticket className="h-4 w-4 mr-1" />
                    View Ticket
                  </Link>
                </Button>
              )}
              {(booking.status === "COMPLETED" || booking.status === "CANCELLED" || booking.status === "EXPIRED") && (
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href={`/search?from=${booking.schedule.route.departurePort.name}&to=${booking.schedule.route.arrivalPort.name}`}>
                    Book Again
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 flex-1" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-col justify-between items-end gap-3 sm:border-l sm:pl-4 sm:min-w-40">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/my-bookings");
    }
  }, [authStatus, router]);

  // Fetch bookings
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load bookings");
        }

        // Ensure we always set an array, even if the response structure is unexpected
        const bookingsData = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        setBookings(bookingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBookings();
  }, [authStatus]);

  // Filter bookings (with defensive check)
  const now = new Date();
  const bookingsArray = Array.isArray(bookings) ? bookings : [];
  
  const upcomingBookings = bookingsArray.filter((b) => {
    const departureTime = new Date(b.schedule.departureTime);
    return departureTime >= now && (b.status === "PENDING" || b.status === "CONFIRMED");
  });

  const pastBookings = bookingsArray.filter((b) => {
    const departureTime = new Date(b.schedule.departureTime);
    return departureTime < now || b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "EXPIRED" || b.status === "REFUNDED";
  });

  // Loading state
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
        <div className="space-y-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Button asChild>
          <Link href="/search">Book New Trip</Link>
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ship className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
            <p className="text-muted-foreground mb-4">
              Start your journey by searching for available routes.
            </p>
            <Button asChild>
              <Link href="/">Search Routes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" className="gap-2">
              Upcoming
              {upcomingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {upcomingBookings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              Past
              {pastBookings.length > 0 && (
                <Badge variant="outline" className="ml-1">
                  {pastBookings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No upcoming trips</h2>
                  <p className="text-muted-foreground mb-4">
                    You don&apos;t have any upcoming bookings.
                  </p>
                  <Button asChild>
                    <Link href="/">Book a Trip</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No past trips</h2>
                  <p className="text-muted-foreground">
                    Your completed trips will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
