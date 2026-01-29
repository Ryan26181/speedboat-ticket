"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Ship,
  QrCode,
  Users,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface TodaySchedule {
  id: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  totalSeats: number;
  availableSeats: number;
  route: {
    departurePort: { name: string; code: string };
    arrivalPort: { name: string; code: string };
  };
  ship: { name: string; code: string };
  _count: {
    bookings: number;
  };
  checkedInCount?: number;
}

interface DashboardStats {
  totalSchedulesToday: number;
  totalPassengersToday: number;
  checkedInToday: number;
  pendingCheckIn: number;
}

export default function OperatorDashboardPage() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<TodaySchedule[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // Fetch today's schedules
        const scheduleRes = await fetch(
          `/api/schedules?startDate=${startOfDay}&endDate=${endOfDay}&limit=50`
        );
        const scheduleData = await scheduleRes.json();

        if (!scheduleRes.ok) {
          throw new Error(scheduleData.message || "Failed to load schedules");
        }

        const todaySchedules = Array.isArray(scheduleData.data) 
          ? scheduleData.data 
          : Array.isArray(scheduleData) 
            ? scheduleData 
            : [];
        setSchedules(todaySchedules);

        // Calculate stats
        let totalPassengers = 0;
        let checkedIn = 0;

        // For each schedule, we'd need to fetch manifest to get check-in counts
        // For now, estimate based on booked seats
        for (const schedule of todaySchedules) {
          const bookedSeats = schedule.totalSeats - schedule.availableSeats;
          totalPassengers += bookedSeats;
          // checkedIn would come from manifest data
        }

        setStats({
          totalSchedulesToday: todaySchedules.length,
          totalPassengersToday: totalPassengers,
          checkedInToday: checkedIn, // This would need manifest API
          pendingCheckIn: totalPassengers - checkedIn,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      SCHEDULED: { variant: "secondary", label: "Scheduled" },
      BOARDING: { variant: "default", label: "Boarding" },
      DEPARTED: { variant: "outline", label: "Departed" },
      ARRIVED: { variant: "outline", label: "Arrived" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = config[status] || { variant: "outline" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const userName = session?.user?.name?.split(" ")[0] || "Operator";

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operator Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {userName}! Here&apos;s your overview for today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/operator/validate" className="inline-flex items-center">
              <QrCode className="h-4 w-4 mr-2" />
              Scan Ticket
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Schedules
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalSchedulesToday || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Passengers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats?.totalPassengersToday || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked In
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-green-600">{stats?.checkedInToday || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Check-in
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{stats?.pendingCheckIn || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <Link href="/operator/validate" className="block p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Validate Ticket</h3>
                <p className="text-sm text-muted-foreground">Scan QR or enter code</p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <Link href="/operator/manifest" className="block p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <ClipboardList className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Passenger Manifest</h3>
                <p className="text-sm text-muted-foreground">View & print lists</p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <Link href="/operator/schedules" className="block p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Ship className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Schedules</h3>
                <p className="text-sm text-muted-foreground">Manage departures</p>
              </div>
            </div>
          </Link>
        </Card>
      </div>

      {/* Today's Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Today&apos;s Schedules</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/operator/schedules">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
          ) : (Array.isArray(schedules) ? schedules : []).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No schedules today</h3>
              <p className="text-muted-foreground">
                There are no scheduled departures for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(Array.isArray(schedules) ? schedules : []).map((schedule) => {
                const departureTime = new Date(schedule.departureTime);
                const bookedSeats = schedule.totalSeats - schedule.availableSeats;
                const occupancyPercent = (bookedSeats / schedule.totalSeats) * 100;
                const isPast = departureTime < new Date();

                return (
                  <div
                    key={schedule.id}
                    className={`flex flex-col lg:flex-row lg:items-center gap-4 p-4 border rounded-lg ${
                      isPast ? "bg-muted/50 opacity-70" : ""
                    }`}
                  >
                    {/* Time */}
                    <div className="flex lg:flex-col items-center lg:items-center gap-2 lg:gap-0 text-center lg:min-w-20">
                      <span className="text-2xl font-bold">{format(departureTime, "HH:mm")}</span>
                      <span className="text-xs text-muted-foreground">{format(departureTime, "a")}</span>
                    </div>

                    {/* Route */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{schedule.route.departurePort.name}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{schedule.route.arrivalPort.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ship className="h-3 w-3" />
                          {schedule.ship.name}
                        </span>
                        {getStatusBadge(schedule.status)}
                      </div>
                    </div>

                    {/* Occupancy */}
                    <div className="lg:min-w-37.5">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium">{bookedSeats}/{schedule.totalSeats}</span>
                      </div>
                      <Progress value={occupancyPercent} className="h-2" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/operator/manifest?scheduleId=${schedule.id}`} className="inline-flex items-center">
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Manifest
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
