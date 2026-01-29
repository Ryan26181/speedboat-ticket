"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BarChart3,
  Ship,
  MapPin,
  Route,
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Ticket,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Plus,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DailyData {
  date: string;
  count?: number;
  amount?: number;
}

interface RecentBooking {
  id: string;
  bookingCode: string;
  user: { name: string | null; email: string };
  route: string;
  departureTime: string;
  passengers: number;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface DashboardStats {
  summary: {
    totalBookings: number;
    todayBookings: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueChange: number;
    activeSchedules: number;
    pendingPayments: number;
    totalUsers: number;
    totalShips: number;
    totalRoutes: number;
  };
  charts: {
    dailyBookings: DailyData[];
    dailyRevenue: DailyData[];
  };
  recentBookings: RecentBooking[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SimpleBarChart({ data, dataKey, color }: { data: DailyData[]; dataKey: "count" | "amount"; color: string }) {
  const maxValue = Math.max(...data.map((d) => d[dataKey] || 0), 1);
  
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, idx) => {
        const value = item[dataKey] || 0;
        const height = (value / maxValue) * 100;
        const dayName = format(new Date(item.date), "EEE");
        
        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-1">
                {dataKey === "count" ? value : formatCurrency(value).replace("Rp", "")}
              </span>
              <div
                className={`w-full rounded-t transition-all ${color}`}
                style={{ height: `${Math.max(height, 4)}%`, minHeight: "4px" }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{dayName}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load stats");
        }

        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      COMPLETED: { variant: "outline", label: "Completed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      EXPIRED: { variant: "destructive", label: "Expired" },
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      SUCCESS: { variant: "default", label: "Paid" },
      FAILED: { variant: "destructive", label: "Failed" },
      EXPIRED: { variant: "destructive", label: "Expired" },
      REFUNDED: { variant: "outline", label: "Refunded" },
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-8">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxLjI1NCAwIDIuNDc4LS4xMjggMy42Ni0uMzcyIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Calendar className="h-4 w-4" />
              {today}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-300 max-w-md">
              Monitor your speedboat ticket operations, track revenue, and manage bookings.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
              <Link href="/admin/reports" className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg">
              <Link href="/admin/schedules?action=new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Schedule
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-500/10 to-primary-600/5 rounded-bl-full"></div>
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
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{stats?.summary.totalBookings.toLocaleString()}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  +{stats?.summary.todayBookings || 0} today
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              This Month Revenue
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{formatCurrency(stats?.summary.thisMonthRevenue || 0)}</p>
            )}
            {!isLoading && stats && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  stats.summary.revenueChange >= 0 
                    ? "text-emerald-600 bg-emerald-200/50 dark:bg-emerald-800/50" 
                    : "text-red-600 bg-red-100 dark:bg-red-900/30"
                }`}>
                  {stats.summary.revenueChange >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(stats.summary.revenueChange)}% vs last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Active Schedules
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">{stats?.summary.activeSchedules}</p>
            )}
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
              Upcoming departures
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Pending Payments
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300">{stats?.summary.pendingPayments}</p>
            )}
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full"></span>
          System Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 group-hover:from-blue-500/10 group-hover:to-blue-600/20 transition-all duration-300"></div>
            <Link href="/admin/users" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-14 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats?.summary.totalUsers}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 group-hover:from-emerald-500/10 group-hover:to-emerald-600/20 transition-all duration-300"></div>
            <Link href="/admin/ships" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Ship className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Ships</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-14 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats?.summary.totalShips}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10 group-hover:from-purple-500/10 group-hover:to-purple-600/20 transition-all duration-300"></div>
            <Link href="/admin/routes" className="relative block p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Route className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Routes</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-14 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats?.summary.totalRoutes}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-purple-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <BarChart3 className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle>Bookings (Last 7 Days)</CardTitle>
                <CardDescription>Daily booking count</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats?.charts.dailyBookings ? (
              <SimpleBarChart data={stats.charts.dailyBookings} dataKey="count" color="bg-gradient-to-t from-primary-500 to-primary-400" />
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/30 dark:to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Revenue (Last 7 Days)</CardTitle>
                <CardDescription>Daily revenue in IDR</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : stats?.charts.dailyRevenue ? (
              <SimpleBarChart data={stats.charts.dailyRevenue} dataKey="amount" color="bg-gradient-to-t from-emerald-500 to-emerald-400" />
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Plus className="h-5 w-5 text-primary-600" />
            </div>
            <CardTitle>Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button asChild size="lg" className="h-auto flex-col gap-2 py-4 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md hover:shadow-lg transition-all">
              <Link href="/admin/schedules?action=new">
                <Calendar className="h-6 w-6" />
                <span className="text-sm">Add Schedule</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950/30 transition-all">
              <Link href="/admin/ships?action=new">
                <Ship className="h-6 w-6" />
                <span className="text-sm">Add Ship</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/30 transition-all">
              <Link href="/admin/ports?action=new">
                <MapPin className="h-6 w-6" />
                <span className="text-sm">Add Port</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 dark:hover:bg-purple-950/30 transition-all">
              <Link href="/admin/routes?action=new">
                <Route className="h-6 w-6" />
                <span className="text-sm">Add Route</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Ticket className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest 10 bookings</CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-300">
            <Link href="/admin/bookings">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !stats?.recentBookings.length ? (
            <div className="text-center py-12 px-6">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                <div className="absolute inset-2 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-slate-400" />
                </div>
              </div>
              <p className="text-muted-foreground">No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead className="font-semibold">Booking</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Route</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Departure</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Payment</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono text-sm font-medium text-primary-600">{booking.bookingCode}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.user.name || "Guest"}</p>
                          <p className="text-xs text-muted-foreground">{booking.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-medium">{booking.route}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.departureTime ? (
                          <div className="flex items-center gap-1.5 text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md w-fit">
                            <Clock className="h-3.5 w-3.5 text-primary-500" />
                            {format(new Date(booking.departureTime), "MMM d, HH:mm")}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(booking.amount)}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{getPaymentBadge(booking.paymentStatus)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm" className="hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/30">
                          <Link href={`/admin/bookings/${booking.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
