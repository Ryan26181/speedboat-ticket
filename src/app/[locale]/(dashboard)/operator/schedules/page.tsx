"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Search,
  AlertCircle,
  ArrowRight,
  Ship,
  Clock,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, Column } from "@/components/features/data-table";
import { DateRangePicker } from "@/components/ui/datetime-picker";

interface ScheduleData {
  id: string;
  route: {
    id: string;
    departurePort: { name: string; code: string };
    arrivalPort: { name: string; code: string };
  };
  ship: { id: string; name: string; code: string };
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: string;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function OperatorSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      const res = await fetch(`/api/schedules?${params}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to load schedules");
      }

      const responseData = result.data;
      setSchedules(responseData?.data || []);
      setTotalItems(responseData?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      SCHEDULED: { variant: "secondary", label: "Scheduled" },
      BOARDING: { variant: "default", label: "Boarding" },
      DEPARTED: { variant: "outline", label: "Departed" },
      ARRIVED: { variant: "outline", label: "Arrived" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const columns: Column<ScheduleData>[] = [
    {
      key: "route",
      header: "Route",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.route.departurePort.code}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.route.arrivalPort.code}</span>
        </div>
      ),
    },
    {
      key: "ship",
      header: "Ship",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Ship className="h-4 w-4 text-muted-foreground" />
          <span>{row.ship.name}</span>
        </div>
      ),
    },
    {
      key: "departureTime",
      header: "Departure",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{format(new Date(row.departureTime), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(row.departureTime), "HH:mm")}
          </p>
        </div>
      ),
    },
    {
      key: "arrivalTime",
      header: "Arrival",
      render: (row) => (
        <div>
          <p className="font-medium">{format(new Date(row.arrivalTime), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(row.arrivalTime), "HH:mm")}
          </p>
        </div>
      ),
    },
    {
      key: "seats",
      header: "Seats",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className={row.availableSeats <= 5 ? "text-destructive font-medium" : ""}>
            {row.availableSeats}
          </span>
          <span className="text-muted-foreground">/ {row.totalSeats}</span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (row) => <span className="font-medium">{formatCurrency(row.price)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => getStatusBadge(row.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Schedules
        </h1>
        <p className="text-muted-foreground">View all trip schedules</p>
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
              placeholder="Filter by date"
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="BOARDING">Boarding</SelectItem>
                <SelectItem value="DEPARTED">Departed</SelectItem>
                <SelectItem value="ARRIVED">Arrived</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={schedules}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            emptyMessage="No schedules found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
