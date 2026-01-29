"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Ticket,
  ArrowLeft,
  AlertCircle,
  Loader2,
  User,
  Ship,
  MapPin,
  Clock,
  CreditCard,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  QrCode,
  Copy,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "@/hooks/use-toast";

interface PassengerData {
  id: string;
  name: string;
  idNumber: string;
  idType: string;
  seatNumber: string | null;
  ticket: {
    id: string;
    ticketCode: string;
    status: string;
    qrCode: string | null;
  } | null;
}

interface PaymentData {
  id: string;
  amount: number;
  method: string | null;
  status: string;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface BookingDetailData {
  id: string;
  bookingCode: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
  };
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    route: {
      id: string;
      departurePort: { id: string; name: string; code: string; city: string };
      arrivalPort: { id: string; name: string; code: string; city: string };
    };
    ship: {
      id: string;
      name: string;
      code: string;
    };
  };
  passengers: PassengerData[];
  payment: PaymentData | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BookingDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const [booking, setBooking] = useState<BookingDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${resolvedParams.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load booking");
        }

        setBooking(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooking();
  }, [resolvedParams.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update status");
      }

      setBooking({ ...booking, status: newStatus });
      toast({ title: "Booking status updated" });
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied to clipboard` });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      COMPLETED: { variant: "outline", label: "Completed" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending" },
      PAID: { variant: "default", label: "Paid" },
      FAILED: { variant: "destructive", label: "Failed" },
      REFUNDED: { variant: "outline", label: "Refunded" },
      EXPIRED: { variant: "destructive", label: "Expired" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTicketStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      ACTIVE: { variant: "default", label: "Active" },
      USED: { variant: "outline", label: "Used" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      EXPIRED: { variant: "secondary", label: "Expired" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Booking not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/admin/bookings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Ticket className="h-6 w-6" />
              Booking Details
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono">{booking.bookingCode}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(booking.bookingCode, "Booking code")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={booking.status}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold">{booking.schedule.route.departurePort.code}</p>
                  <p className="text-muted-foreground">{booking.schedule.route.departurePort.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.schedule.route.departurePort.city}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <Badge variant="secondary">{booking.schedule.ship.name}</Badge>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{booking.schedule.route.arrivalPort.code}</p>
                  <p className="text-muted-foreground">{booking.schedule.route.arrivalPort.name}</p>
                  <p className="text-sm text-muted-foreground">{booking.schedule.route.arrivalPort.city}</p>
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Departure
                  </p>
                  <p className="font-medium">{format(new Date(booking.schedule.departureTime), "EEEE, MMM d, yyyy")}</p>
                  <p className="text-lg font-bold">{format(new Date(booking.schedule.departureTime), "HH:mm")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Arrival
                  </p>
                  <p className="font-medium">{format(new Date(booking.schedule.arrivalTime), "EEEE, MMM d, yyyy")}</p>
                  <p className="text-lg font-bold">{format(new Date(booking.schedule.arrivalTime), "HH:mm")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passengers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Passengers ({booking.passengers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID Type</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.passengers.map((passenger) => (
                    <TableRow key={passenger.id}>
                      <TableCell className="font-medium">{passenger.name}</TableCell>
                      <TableCell>{passenger.idType}</TableCell>
                      <TableCell className="font-mono">{passenger.idNumber}</TableCell>
                      <TableCell>{passenger.seatNumber || "-"}</TableCell>
                      <TableCell>
                        {passenger.ticket ? (
                          <span className="font-mono text-sm">{passenger.ticket.ticketCode}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {passenger.ticket ? getTicketStatusBadge(passenger.ticket.status) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Side Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {booking.user.image ? (
                  <img
                    src={booking.user.image}
                    alt={booking.user.name || ""}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{booking.user.name || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{booking.user.email}</p>
                </div>
              </div>
              {booking.user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{booking.user.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {getPaymentBadge(booking.paymentStatus)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{booking.payment?.method || "N/A"}</span>
              </div>
              {booking.payment?.transactionId && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">{booking.payment.transactionId}</span>
                </div>
              )}
              {booking.payment?.paidAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid At</span>
                  <span className="text-sm">{format(new Date(booking.payment.paidAt), "MMM d, HH:mm")}</span>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price per passenger</span>
                  <span>{formatCurrency(booking.schedule.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Passengers</span>
                  <span>× {booking.passengers.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold">{formatCurrency(booking.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(booking.createdAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{format(new Date(booking.updatedAt), "MMM d, yyyy HH:mm")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
