"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Ticket,
  Ship,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/datetime-picker";
import {
  downloadCSV,
  generateCSV,
  formatCurrencyForExport,
  formatDateForExport,
  generateFilename,
} from "@/lib/export-utils";

interface SalesReportData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    totalPassengers: number;
    averageOrderValue: number;
  };
  chartData: Array<{ date: string; revenue: number; bookings: number; passengers: number }>;
  topRoutes: Array<{ route: string; revenue: number; bookings: number }>;
  period: { startDate: string; endDate: string; groupBy: string };
}

interface RouteReportData {
  summary: {
    totalRoutes: number;
    activeRoutes: number;
    totalRevenue: number;
    totalBookings: number;
    averageOccupancy: number;
  };
  routes: Array<{
    id: string;
    name: string;
    code: string;
    distance: number;
    duration: number;
    basePrice: number;
    status: string;
    totalSchedules: number;
    completedSchedules: number;
    totalBookings: number;
    totalRevenue: number;
    totalPassengers: number;
    occupancyRate: number;
    averageRevenuePerSchedule: number;
  }>;
  period: { startDate: string; endDate: string };
}

interface ShipReportData {
  summary: {
    totalShips: number;
    activeShips: number;
    totalRevenue: number;
    totalTrips: number;
    averageOccupancy: number;
  };
  ships: Array<{
    id: string;
    name: string;
    code: string;
    capacity: number;
    status: string;
    totalTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    totalRevenue: number;
    totalPassengers: number;
    occupancyRate: number;
    totalOperatingHours: number;
    revenuePerHour: number;
    topRoutes: Array<{ route: string; count: number }>;
  }>;
  period: { startDate: string; endDate: string };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Simple Bar Chart Component
function SimpleBarChart({
  data,
  dataKey,
  label,
}: {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  label: string;
}) {
  if (!data || data.length === 0) {
    return <div className="text-muted-foreground text-center py-8">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => Number(d[dataKey]) || 0));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-4">{label}</p>
      <div className="space-y-2">
        {data.slice(-14).map((item, index) => {
          const value = Number(item[dataKey]) || 0;
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const dateStr = item.date as string;

          return (
            <div key={index} className="flex items-center gap-2">
              <span className="w-20 text-xs text-muted-foreground truncate">
                {format(new Date(dateStr), "MMM d")}
              </span>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-24 text-xs text-right">
                {dataKey === "revenue" ? formatCurrency(value) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [groupBy, setGroupBy] = useState("day");

  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [routesData, setRoutesData] = useState<RouteReportData | null>(null);
  const [shipsData, setShipsData] = useState<ShipReportData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (activeTab === "sales") params.append("groupBy", groupBy);

      const endpoint = `/api/admin/reports/${activeTab}?${params}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load report");
      }

      if (activeTab === "sales") {
        setSalesData(data.data);
      } else if (activeTab === "routes") {
        setRoutesData(data.data);
      } else if (activeTab === "ships") {
        setShipsData(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate, groupBy]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      let rows: Record<string, string | number>[] = [];
      let headers: { key: string; label: string }[] = [];
      let filename = "";

      if (activeTab === "sales" && salesData) {
        rows = salesData.chartData.map((item) => ({
          date: formatDateForExport(new Date(item.date)),
          revenue: formatCurrencyForExport(item.revenue),
          bookings: item.bookings,
          passengers: item.passengers,
        }));
        headers = [
          { key: "date", label: "Date" },
          { key: "revenue", label: "Revenue" },
          { key: "bookings", label: "Bookings" },
          { key: "passengers", label: "Passengers" },
        ];
        filename = generateFilename("sales-report");
      } else if (activeTab === "routes" && routesData) {
        rows = routesData.routes.map((route) => ({
          route: route.name,
          code: route.code,
          distance: route.distance,
          duration: route.duration,
          basePrice: formatCurrencyForExport(route.basePrice),
          status: route.status,
          schedules: route.totalSchedules,
          bookings: route.totalBookings,
          revenue: formatCurrencyForExport(route.totalRevenue),
          passengers: route.totalPassengers,
          occupancyRate: `${route.occupancyRate.toFixed(1)}%`,
        }));
        headers = [
          { key: "route", label: "Route" },
          { key: "code", label: "Code" },
          { key: "distance", label: "Distance (km)" },
          { key: "duration", label: "Duration (min)" },
          { key: "basePrice", label: "Base Price" },
          { key: "status", label: "Status" },
          { key: "schedules", label: "Schedules" },
          { key: "bookings", label: "Bookings" },
          { key: "revenue", label: "Revenue" },
          { key: "passengers", label: "Passengers" },
          { key: "occupancyRate", label: "Occupancy Rate" },
        ];
        filename = generateFilename("routes-report");
      } else if (activeTab === "ships" && shipsData) {
        rows = shipsData.ships.map((ship) => ({
          name: ship.name,
          code: ship.code,
          capacity: ship.capacity,
          status: ship.status,
          totalTrips: ship.totalTrips,
          completedTrips: ship.completedTrips,
          cancelledTrips: ship.cancelledTrips,
          revenue: formatCurrencyForExport(ship.totalRevenue),
          passengers: ship.totalPassengers,
          occupancyRate: `${ship.occupancyRate.toFixed(1)}%`,
          operatingHours: ship.totalOperatingHours,
        }));
        headers = [
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          { key: "capacity", label: "Capacity" },
          { key: "status", label: "Status" },
          { key: "totalTrips", label: "Total Trips" },
          { key: "completedTrips", label: "Completed Trips" },
          { key: "cancelledTrips", label: "Cancelled Trips" },
          { key: "revenue", label: "Revenue" },
          { key: "passengers", label: "Passengers" },
          { key: "occupancyRate", label: "Occupancy Rate" },
          { key: "operatingHours", label: "Operating Hours" },
        ];
        filename = generateFilename("ships-report");
      }

      if (rows.length > 0 && headers.length > 0) {
        const csv = generateCSV(rows, headers);
        downloadCSV(csv, filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      ACTIVE: { variant: "default", label: "Active" },
      INACTIVE: { variant: "secondary", label: "Inactive" },
      MAINTENANCE: { variant: "destructive", label: "Maintenance" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Reports
          </h1>
          <p className="text-muted-foreground">Analytics and performance reports</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting || isLoading} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              placeholder="Select date range"
              className="flex-1"
            />
            {activeTab === "sales" && (
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-full lg:w-37.5">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="routes">Route Performance</TabsTrigger>
          <TabsTrigger value="ships">Ship Utilization</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : salesData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(salesData.summary.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{salesData.summary.totalBookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{salesData.summary.totalPassengers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {formatCurrency(salesData.summary.averageOrderValue)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={salesData.chartData}
                      dataKey="revenue"
                      label="Revenue"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Bookings Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart
                      data={salesData.chartData}
                      dataKey="bookings"
                      label="Bookings"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Top Routes */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.topRoutes.map((route, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{route.route}</TableCell>
                          <TableCell className="text-right">{route.bookings}</TableCell>
                          <TableCell className="text-right">{formatCurrency(route.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Routes Report */}
        <TabsContent value="routes" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : routesData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{routesData.summary.totalRoutes}</p>
                    <p className="text-xs text-muted-foreground">
                      {routesData.summary.activeRoutes} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(routesData.summary.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{routesData.summary.totalBookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Occupancy</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {routesData.summary.averageOccupancy.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Routes Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Route Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Schedules</TableHead>
                          <TableHead className="text-right">Bookings</TableHead>
                          <TableHead className="text-right">Passengers</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Occupancy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routesData.routes.map((route) => (
                          <TableRow key={route.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{route.code}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(route.status)}</TableCell>
                            <TableCell className="text-right">{route.totalSchedules}</TableCell>
                            <TableCell className="text-right">{route.totalBookings}</TableCell>
                            <TableCell className="text-right">{route.totalPassengers}</TableCell>
                            <TableCell className="text-right">{formatCurrency(route.totalRevenue)}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  route.occupancyRate >= 70
                                    ? "text-green-600"
                                    : route.occupancyRate >= 40
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }
                              >
                                {route.occupancyRate.toFixed(1)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Ships Report */}
        <TabsContent value="ships" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : shipsData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Ships</CardTitle>
                    <Ship className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{shipsData.summary.totalShips}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipsData.summary.activeShips} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{shipsData.summary.totalTrips}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(shipsData.summary.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Occupancy</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {shipsData.summary.averageOccupancy.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Ships Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Ship Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ship</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Capacity</TableHead>
                          <TableHead className="text-right">Trips</TableHead>
                          <TableHead className="text-right">Passengers</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Occupancy</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shipsData.ships.map((ship) => (
                          <TableRow key={ship.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{ship.name}</p>
                                <p className="text-xs text-muted-foreground">{ship.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(ship.status)}</TableCell>
                            <TableCell className="text-right">{ship.capacity}</TableCell>
                            <TableCell className="text-right">
                              {ship.totalTrips}
                              {ship.cancelledTrips > 0 && (
                                <span className="text-xs text-destructive ml-1">
                                  ({ship.cancelledTrips} cancelled)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{ship.totalPassengers}</TableCell>
                            <TableCell className="text-right">{formatCurrency(ship.totalRevenue)}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  ship.occupancyRate >= 70
                                    ? "text-green-600"
                                    : ship.occupancyRate >= 40
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }
                              >
                                {ship.occupancyRate.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{ship.totalOperatingHours}h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
