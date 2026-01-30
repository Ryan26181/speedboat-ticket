"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxLjI1NCAwIDIuNDc4LS4xMjggMy42Ni0uMzcyIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-linear-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="relative flex flex-col gap-4">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{today}</span>
              <span className="sm:hidden">{format(new Date(), "MMM d, yyyy")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-md hidden sm:block">
              Monitor your speedboat ticket operations, track revenue, and manage bookings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm h-10 sm:h-11 text-sm">
              <Link href="/admin/reports" className="inline-flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg h-10 sm:h-11 text-sm">
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-linear-to-br from-slate-50 to-slate-100 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-linear-to-br from-blue-500/10 to-blue-600/5 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Ticket className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight">{stats?.summary.totalBookings.toLocaleString()}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
              {isLoading ? (
                <Skeleton className="h-4 sm:h-5 w-16 sm:w-24" />
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium text-emerald-600 bg-emerald-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  +{stats?.summary.todayBookings || 0} today
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-linear-to-br from-emerald-50 to-emerald-100 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-linear-to-br from-emerald-500/20 to-emerald-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-emerald-700">
              This Month Revenue
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-32" />
            ) : (
              <p className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-emerald-700">{formatCurrency(stats?.summary.thisMonthRevenue || 0)}</p>
            )}
            {!isLoading && stats && (
              <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
                <span className={`inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${
                  stats.summary.revenueChange >= 0 
                    ? "text-emerald-600 bg-emerald-200/50" 
                    : "text-red-600 bg-red-100"
                }`}>
                  {stats.summary.revenueChange >= 0 ? (
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}
                  <span className="hidden sm:inline">{Math.abs(stats.summary.revenueChange)}% vs last month</span>
                  <span className="sm:hidden">{Math.abs(stats.summary.revenueChange)}%</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-linear-to-br from-blue-50 to-blue-100 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-linear-to-br from-blue-500/20 to-blue-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-blue-700">
              Active Schedules
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            ) : (
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-blue-700">{stats?.summary.activeSchedules}</p>
            )}
            <p className="text-[9px] sm:text-xs text-blue-600/70 mt-1 sm:mt-2 hidden sm:block">
              Upcoming departures
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-linear-to-br from-amber-50 to-amber-100 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-linear-to-br from-amber-500/20 to-amber-600/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-4">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-amber-700">
              Pending Payments
            </CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            ) : (
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-amber-700">{stats?.summary.pendingPayments}</p>
            )}
            <p className="text-[9px] sm:text-xs text-amber-600/70 mt-1 sm:mt-2 hidden sm:block">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <span className="w-1 h-4 sm:h-5 bg-blue-500 rounded-full"></span>
          System Overview
        </h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-blue-600/10 group-hover:from-blue-500/10 group-hover:to-blue-600/20 transition-all duration-300"></div>
            <Link href="/admin/users" className="relative block p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Users</p>
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-7 w-10 sm:w-14 mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold">{stats?.summary.totalUsers}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-emerald-600/10 group-hover:from-emerald-500/10 group-hover:to-emerald-600/20 transition-all duration-300"></div>
            <Link href="/admin/ships" className="relative block p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Ship className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Ships</p>
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-7 w-10 sm:w-14 mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold">{stats?.summary.totalShips}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-purple-600/10 group-hover:from-purple-500/10 group-hover:to-purple-600/20 transition-all duration-300"></div>
            <Link href="/admin/routes" className="relative block p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-linear-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Route className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Total Routes</p>
                    {isLoading ? (
                      <Skeleton className="h-6 sm:h-7 w-10 sm:w-14 mt-1" />
                    ) : (
                      <p className="text-xl sm:text-2xl font-bold">{stats?.summary.totalRoutes}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="border-b bg-linear-to-r from-slate-50 to-transparent px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Bookings (Last 7 Days)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Daily booking count</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:pt-6">
            {isLoading ? (
              <Skeleton className="h-24 sm:h-32 w-full" />
            ) : stats?.charts.dailyBookings ? (
              <SimpleBarChart data={stats.charts.dailyBookings} dataKey="count" color="bg-linear-to-t from-blue-500 to-blue-400" />
            ) : (
              <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="border-b bg-linear-to-r from-emerald-50 to-transparent px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Revenue (Last 7 Days)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Daily revenue in IDR</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:pt-6">
            {isLoading ? (
              <Skeleton className="h-24 sm:h-32 w-full" />
            ) : stats?.charts.dailyRevenue ? (
              <SimpleBarChart data={stats.charts.dailyRevenue} dataKey="amount" color="bg-linear-to-t from-emerald-500 to-emerald-400" />
            ) : (
              <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg bg-linear-to-br from-slate-50 to-white">
        <CardHeader className="border-b px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Button asChild size="default" className="h-auto flex-col gap-1.5 sm:gap-2 py-3 sm:py-4 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm">
              <Link href="/admin/schedules?action=new">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Add Schedule</span>
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="h-auto flex-col gap-1.5 sm:gap-2 py-3 sm:py-4 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all text-xs sm:text-sm">
              <Link href="/admin/ships?action=new">
                <Ship className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Add Ship</span>
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="h-auto flex-col gap-1.5 sm:gap-2 py-3 sm:py-4 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all text-xs sm:text-sm">
              <Link href="/admin/ports?action=new">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Add Port</span>
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="h-auto flex-col gap-1.5 sm:gap-2 py-3 sm:py-4 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all text-xs sm:text-sm">
              <Link href="/admin/routes?action=new">
                <Route className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Add Route</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="border-0 shadow-lg bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-linear-to-r from-slate-50 to-transparent px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">Recent Bookings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest 10 bookings</CardDescription>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 h-8 sm:h-9">
            <Link href="/admin/bookings">
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 sm:h-12 w-full" />
              ))}
            </div>
          ) : !stats?.recentBookings.length ? (
            <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
              <div className="relative mx-auto w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4">
                <div className="absolute inset-0 bg-slate-100 rounded-full"></div>
                <div className="absolute inset-2 bg-slate-50 rounded-full flex items-center justify-center">
                  <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                </div>
              </div>
              <p className="text-muted-foreground text-sm">No bookings yet</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="sm:hidden p-4 space-y-3">
                {stats.recentBookings.map((booking) => (
                  <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="block">
                    <div className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-sm text-blue-600">{booking.bookingCode}</span>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{booking.user.email}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{booking.route}</span>
                        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(booking.amount)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-xs">Booking</TableHead>
                      <TableHead className="font-semibold text-xs">User</TableHead>
                      <TableHead className="hidden md:table-cell font-semibold text-xs">Route</TableHead>
                      <TableHead className="hidden lg:table-cell font-semibold text-xs">Departure</TableHead>
                      <TableHead className="font-semibold text-xs">Amount</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Payment</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-sm font-medium text-blue-600">{booking.bookingCode}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{booking.user.name || "Guest"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-32">{booking.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm font-medium">{booking.route}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {booking.departureTime ? (
                            <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-2 py-1 rounded-md w-fit">
                              <Clock className="h-3 w-3 text-blue-500" />
                              {format(new Date(booking.departureTime), "MMM d, HH:mm")}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-sm text-emerald-600">{formatCurrency(booking.amount)}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>{getPaymentBadge(booking.paymentStatus)}</TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600 h-8 w-8 p-0">
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
