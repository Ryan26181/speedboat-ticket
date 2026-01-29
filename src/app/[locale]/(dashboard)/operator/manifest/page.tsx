"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  ClipboardList,
  Printer,
  Download,
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Ship,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  UserCheck,
  ArrowRight,
  Phone,
  IdCard,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Schedule {
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
}

interface Passenger {
  id: string;
  name: string;
  identityType: string;
  identityNumber: string;
  phone: string | null;
  seatNumber: string | null;
  ticket: {
    id: string;
    ticketCode: string;
    status: string;
    checkedInAt: string | null;
  } | null;
  booking: {
    bookingCode: string;
    status: string;
  };
}

interface ManifestData {
  schedule: Schedule;
  passengers: Passenger[];
  summary: {
    total: number;
    checkedIn: number;
    notCheckedIn: number;
  };
}

export default function ManifestPage() {
  const searchParams = useSearchParams();
  const initialScheduleId = searchParams.get("scheduleId");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(initialScheduleId || "");
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "checked-in" | "not-checked-in">("all");
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  // Fetch today's schedules
  useEffect(() => {
    async function fetchSchedules() {
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const res = await fetch(
          `/api/schedules?startDate=${startOfDay}&endDate=${endOfDay}&limit=50`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load schedules");
        }

        setSchedules(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedules");
        setSchedules([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    }

    fetchSchedules();
  }, []);

  // Fetch manifest when schedule is selected
  const fetchManifest = useCallback(async (scheduleId: string) => {
    if (!scheduleId) return;

    setIsLoadingManifest(true);
    setError(null);

    try {
      const res = await fetch(`/api/schedules/${scheduleId}/manifest`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load manifest");
      }

      setManifest(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifest");
      setManifest(null);
    } finally {
      setIsLoadingManifest(false);
    }
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      fetchManifest(selectedScheduleId);
    }
  }, [selectedScheduleId, fetchManifest]);

  // Handle check-in
  const handleCheckIn = async (ticketCode: string) => {
    if (isCheckingIn) return;

    setIsCheckingIn(ticketCode);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketCode}/checkin`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Check-in failed");
      }

      // Refresh manifest
      fetchManifest(selectedScheduleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsCheckingIn(null);
    }
  };

  // Filter passengers
  const filteredPassengers = manifest?.passengers.filter((passenger) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = passenger.name.toLowerCase().includes(query);
      const matchesTicket = passenger.ticket?.ticketCode.toLowerCase().includes(query);
      const matchesId = passenger.identityNumber.toLowerCase().includes(query);
      if (!matchesName && !matchesTicket && !matchesId) return false;
    }

    // Status filter
    if (statusFilter === "checked-in" && passenger.ticket?.status !== "USED") return false;
    if (statusFilter === "not-checked-in" && passenger.ticket?.status === "USED") return false;

    return true;
  }) || [];

  // Print manifest
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!manifest) return;

    const headers = ["No", "Name", "ID Type", "ID Number", "Phone", "Ticket Code", "Seat", "Status", "Check-in Time"];
    const rows = manifest.passengers.map((p, idx) => [
      idx + 1,
      p.name,
      p.identityType.replace("_", " "),
      p.identityNumber,
      p.phone || "-",
      p.ticket?.ticketCode || "-",
      p.seatNumber || "-",
      p.ticket?.status || "-",
      p.ticket?.checkedInAt ? format(new Date(p.ticket.checkedInAt), "HH:mm") : "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manifest-${manifest.schedule.route.departurePort.code}-${manifest.schedule.route.arrivalPort.code}-${format(new Date(manifest.schedule.departureTime), "yyyy-MM-dd-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Passenger Manifest
          </h1>
          <p className="text-muted-foreground">
            View and manage passenger lists for scheduled departures
          </p>
        </div>
        {manifest && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Schedule Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Schedule</CardTitle>
          <CardDescription>Choose a schedule to view its passenger manifest</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <Skeleton className="h-10 w-full" />
          ) : (Array.isArray(schedules) ? schedules : []).length === 0 ? (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>No schedules available for today.</AlertDescription>
            </Alert>
          ) : (
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a schedule" />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(schedules) ? schedules : []).map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {format(new Date(schedule.departureTime), "HH:mm")}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span>
                        {schedule.route.departurePort.code} → {schedule.route.arrivalPort.code}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-sm text-muted-foreground">
                        {schedule.ship.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Manifest Content */}
      {isLoadingManifest && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading manifest...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {manifest && !isLoadingManifest && (
        <>
          {/* Schedule Info Card */}
          <Card className="print:shadow-none">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-semibold">
                      {manifest.schedule.route.departurePort.name}
                      <ArrowRight className="inline h-4 w-4 mx-1" />
                      {manifest.schedule.route.arrivalPort.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <p className="font-semibold">
                      {format(new Date(manifest.schedule.departureTime), "HH:mm")}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        {format(new Date(manifest.schedule.departureTime), "MMM d, yyyy")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <Ship className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ship</p>
                    <p className="font-semibold">{manifest.schedule.ship.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Passengers</p>
                    <p className="font-semibold">
                      {manifest.summary.total} total
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({manifest.summary.checkedIn} checked in)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-3 print:hidden">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Passengers</p>
                    <p className="text-2xl font-bold">{manifest.summary.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Checked In</p>
                    <p className="text-2xl font-bold text-green-600">{manifest.summary.checkedIn}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Not Checked In</p>
                    <p className="text-2xl font-bold text-amber-600">{manifest.summary.notCheckedIn}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ticket, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-full sm:w-50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Passengers</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="not-checked-in">Not Checked In</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Passenger Table */}
          <Card>
            <CardHeader className="print:pb-2">
              <CardTitle>Passenger List</CardTitle>
              <CardDescription>
                Showing {filteredPassengers.length} of {manifest.summary.total} passengers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPassengers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No passengers found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "No passengers booked for this schedule"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Passenger</TableHead>
                        <TableHead className="hidden md:table-cell">ID</TableHead>
                        <TableHead className="hidden lg:table-cell">Contact</TableHead>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="print:hidden">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((passenger, index) => (
                        <TableRow key={passenger.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{passenger.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {passenger.identityType.replace("_", " ")} - {passenger.identityNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm">
                              <IdCard className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {passenger.identityType.replace("_", " ")}
                              </span>
                            </div>
                            <p className="font-mono text-sm">{passenger.identityNumber}</p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {passenger.phone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {passenger.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {passenger.ticket ? (
                              <div>
                                <p className="font-mono text-sm">{passenger.ticket.ticketCode}</p>
                                {passenger.seatNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    Seat: {passenger.seatNumber}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No ticket</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {passenger.ticket?.status === "USED" ? (
                              <div>
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Checked In
                                </Badge>
                                {passenger.ticket.checkedInAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(passenger.ticket.checkedInAt), "HH:mm")}
                                  </p>
                                )}
                              </div>
                            ) : passenger.ticket?.status === "ACTIVE" ? (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Not Checked In
                              </Badge>
                            ) : passenger.ticket?.status === "CANCELLED" ? (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancelled
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {passenger.ticket?.status || "N/A"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="print:hidden">
                            {passenger.ticket?.status === "ACTIVE" && (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(passenger.ticket!.ticketCode)}
                                disabled={isCheckingIn === passenger.ticket.ticketCode}
                              >
                                {isCheckingIn === passenger.ticket.ticketCode ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-1" />
                                )}
                                Check In
                              </Button>
                            )}
                            {passenger.ticket?.status === "USED" && (
                              <span className="text-sm text-green-600">✓ Done</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedScheduleId && !isLoadingSchedules && schedules.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select a Schedule</h3>
            <p className="text-muted-foreground">
              Choose a schedule from the dropdown above to view its passenger manifest.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
