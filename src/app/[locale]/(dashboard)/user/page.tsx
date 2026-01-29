"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Ticket,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  Ship,
  MapPin,
  Loader2,
  AlertCircle,
  Plus,
  Users,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalBookings: number;
  upcomingTrips: number;
  completedTrips: number;
  pendingPayments: number;
}

interface UpcomingBooking {
  id: string;
  bookingCode: string;
  status: string;
  totalPassengers: number;
  totalAmount: number;
  schedule: {
    departureTime: string;
    arrivalTime: string;
    route: {
      departurePort: { name: string; city: string };
      arrivalPort: { name: string; city: string };
    };
    ship: { name: string };
  };
}

export default function UserDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch user's bookings
        const res = await fetch("/api/bookings?limit=100");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load dashboard data");
        }

        // Ensure bookings is always an array
        const bookings = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        const now = new Date();

        // Calculate stats
        const upcoming = bookings.filter((b: UpcomingBooking) => {
          const departureTime = new Date(b.schedule.departureTime);
          return departureTime >= now && (b.status === "CONFIRMED" || b.status === "PENDING");
        });

        const completed = bookings.filter(
          (b: UpcomingBooking) => b.status === "COMPLETED"
        );

        const pending = bookings.filter(
          (b: UpcomingBooking) => b.status === "PENDING"
        );

        setStats({
          totalBookings: bookings.length,
          upcomingTrips: upcoming.filter((b: UpcomingBooking) => b.status === "CONFIRMED").length,
          completedTrips: completed.length,
          pendingPayments: pending.length,
        });

        // Get next 5 upcoming bookings
        setUpcomingBookings(
          upcoming
            .sort((a: UpcomingBooking, b: UpcomingBooking) => 
              new Date(a.schedule.departureTime).getTime() - new Date(b.schedule.departureTime).getTime()
            )
            .slice(0, 5)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const userName = session?.user?.name?.split(" ")[0] || "User";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      {/* Welcome Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxLjI1NCAwIDIuNDc4LS4xMjggMy42Ni0uMzcyIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-primary-100 text-sm font-medium">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {userName}! 👋</h1>
            <p className="text-primary-100 max-w-md">
              Here&apos;s an overview of your travel activity. Plan your next adventure today.
            </p>
          </div>
          <Button asChild size="lg" className="bg-white text-primary-600 hover:bg-primary-50 shadow-md hover:shadow-lg transition-all duration-200">
            <Link href="/" className="inline-flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Book New Trip
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Ticket className="h-4 w-4 text-primary-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight">{stats?.totalBookings || 0}</p>
                <p className="text-xs text-muted-foreground">All time bookings</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Upcoming Trips
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">{stats?.upcomingTrips || 0}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Ready to travel</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Completed Trips
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{stats?.completedTrips || 0}</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Journeys completed</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Pending Payments
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300">{stats?.pendingPayments || 0}</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Awaiting payment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800 dark:to-transparent">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary-500" />
              Upcoming Trips
            </CardTitle>
            <CardDescription>Your next scheduled journeys</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-300 transition-colors">
            <Link href="/user/bookings">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-primary-100 dark:bg-primary-900/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-primary-50 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                  <Ship className="h-10 w-10 text-primary-500" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">No upcoming trips</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Your next adventure awaits! Browse our routes and book your journey today.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link href="/">
                  <Search className="h-4 w-4" />
                  Search Routes
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const departureTime = new Date(booking.schedule.departureTime);
                const arrivalTime = new Date(booking.schedule.arrivalTime);

                return (
                  <Link
                    key={booking.id}
                    href={`/user/bookings/${booking.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary-300 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent dark:hover:from-primary-950/30 dark:hover:to-transparent transition-all duration-300 hover:shadow-md"
                  >
                    {/* Date Box */}
                    <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0 text-center bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-xl sm:min-w-[4.5rem] shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                      <span className="text-xs text-primary-100 font-semibold uppercase tracking-wider">
                        {format(departureTime, "MMM")}
                      </span>
                      <span className="text-2xl font-bold text-white">
                        {format(departureTime, "dd")}
                      </span>
                      <span className="text-xs text-primary-100 font-medium">
                        {format(departureTime, "EEE")}
                      </span>
                    </div>

                    {/* Trip Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          </span>
                          <span className="font-semibold">
                            {booking.schedule.route.departurePort.name}
                          </span>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-600 mx-2 relative">
                          <Ship className="h-4 w-4 text-primary-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900" />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30">
                            <MapPin className="h-3 w-3 text-red-600 dark:text-red-400" />
                          </span>
                          <span className="font-semibold">
                            {booking.schedule.route.arrivalPort.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          <Clock className="h-3.5 w-3.5" />
                          {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                        </span>
                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          <Ship className="h-3.5 w-3.5" />
                          {booking.schedule.ship.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                          {booking.bookingCode}
                        </span>
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:min-w-[120px] sm:border-l sm:pl-4 border-slate-200 dark:border-slate-700">
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatPrice(booking.totalAmount)}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {booking.totalPassengers} passenger{booking.totalPassengers > 1 ? "s" : ""}
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full"></span>
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/10 group-hover:from-primary-500/10 group-hover:to-primary-600/20 transition-all duration-300"></div>
            <Link href="/" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Ship className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Book a Trip</h3>
                    <p className="text-sm text-muted-foreground">Search available routes</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 group-hover:from-blue-500/10 group-hover:to-blue-600/20 transition-all duration-300"></div>
            <Link href="/user/bookings" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Ticket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">My Bookings</h3>
                    <p className="text-sm text-muted-foreground">View all your bookings</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 group-hover:from-emerald-500/10 group-hover:to-emerald-600/20 transition-all duration-300"></div>
            <Link href="/user/profile" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Profile Settings</h3>
                    <p className="text-sm text-muted-foreground">Update your information</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
