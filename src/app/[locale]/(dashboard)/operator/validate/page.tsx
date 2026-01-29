"use client";

import { useState, useCallback, useEffect } from "react";
import {
  QrCode,
  Keyboard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Ticket,
  Ship,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  Camera,
  CameraOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRScanner } from "@/components/features/qr-scanner";
import { format } from "date-fns";

interface ValidationResult {
  valid: boolean;
  message: string;
  ticket?: {
    id: string;
    ticketCode: string;
    status: string;
    seatNumber: string | null;
    checkedInAt: string | null;
    passenger: {
      name: string;
      identityType: string;
      identityNumber: string;
    };
    booking: {
      bookingCode: string;
      schedule: {
        departureTime: string;
        arrivalTime: string;
        route: {
          departurePort: { name: string };
          arrivalPort: { name: string };
        };
        ship: { name: string };
      };
    };
  };
}

interface RecentValidation {
  ticketCode: string;
  passengerName: string;
  status: "success" | "error" | "already_checked_in";
  time: Date;
  message: string;
}

export default function ValidateTicketPage() {
  const [manualCode, setManualCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentValidations, setRecentValidations] = useState<RecentValidation[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("scanner");

  // Validate ticket
  const validateTicket = useCallback(async (code: string) => {
    if (!code || isValidating) return;

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const res = await fetch(`/api/tickets/${code}/validate`);
      const data = await res.json();

      const result: ValidationResult = {
        valid: res.ok && data.data?.isValid,
        message: data.message || (res.ok ? "Ticket validated" : "Invalid ticket"),
        ticket: data.data?.ticket,
      };

      setValidationResult(result);

      // Add to recent validations
      const validation: RecentValidation = {
        ticketCode: code,
        passengerName: data.data?.ticket?.passenger?.name || "Unknown",
        status: result.valid
          ? data.data?.ticket?.status === "USED"
            ? "already_checked_in"
            : "success"
          : "error",
        time: new Date(),
        message: result.message,
      };

      setRecentValidations((prev) => [validation, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  }, [isValidating]);

  // Handle QR scan
  const handleQRScan = useCallback((data: string) => {
    // Temporarily disable scanner to prevent multiple scans
    setScannerEnabled(false);
    validateTicket(data);

    // Re-enable scanner after delay
    setTimeout(() => setScannerEnabled(true), 3000);
  }, [validateTicket]);

  // Handle manual submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      validateTicket(manualCode.trim());
    }
  };

  // Check-in ticket
  const handleCheckIn = async () => {
    if (!validationResult?.ticket || isCheckingIn) return;

    setIsCheckingIn(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${validationResult.ticket.ticketCode}/checkin`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Check-in failed");
      }

      // Update validation result
      setValidationResult((prev) => {
        if (!prev?.ticket) return prev;
        return {
          ...prev,
          message: "Passenger checked in successfully!",
          ticket: {
            ...prev.ticket,
            status: "USED",
            checkedInAt: new Date().toISOString(),
          },
        };
      });

      // Update recent validations
      setRecentValidations((prev) =>
        prev.map((v) =>
          v.ticketCode === validationResult.ticket?.ticketCode
            ? { ...v, status: "success" as const, message: "Checked in" }
            : v
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Reset validation
  const handleReset = () => {
    setValidationResult(null);
    setError(null);
    setManualCode("");
    setScannerEnabled(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Ticket Validation</h1>
        <p className="text-muted-foreground">
          Scan QR code or enter ticket code manually to validate
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scanner/Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Validate Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="scanner" className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    QR Scanner
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">
                    <Keyboard className="h-4 w-4 mr-2" />
                    Manual Entry
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scanner" className="mt-4">
                  <div className="space-y-4">
                    {scannerEnabled ? (
                      <div className="aspect-square max-w-md mx-auto bg-muted rounded-lg overflow-hidden">
                        <QRScanner onScan={handleQRScan} />
                      </div>
                    ) : (
                      <div className="aspect-square max-w-md mx-auto bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <CameraOff className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Scanner paused</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setScannerEnabled(true)}
                            className="mt-2"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-center text-sm text-muted-foreground">
                      Point your camera at the QR code on the ticket
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-4">
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticketCode">Ticket Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="ticketCode"
                          placeholder="Enter ticket code (e.g., TKT-ABC123)"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                        <Button type="submit" disabled={!manualCode.trim() || isValidating}>
                          {isValidating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                          Validate
                        </Button>
                      </div>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Validation Result */}
          {(validationResult || error || isValidating) && (
            <Card>
              <CardHeader>
                <CardTitle>Validation Result</CardTitle>
              </CardHeader>
              <CardContent>
                {isValidating && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Validating ticket...</span>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {validationResult && !isValidating && (
                  <div className="space-y-6">
                    {/* Status Banner */}
                    <div
                      className={`p-4 rounded-lg flex items-center gap-4 ${
                        validationResult.valid
                          ? validationResult.ticket?.status === "USED"
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {validationResult.valid ? (
                        validationResult.ticket?.status === "USED" ? (
                          <AlertCircle className="h-8 w-8 text-amber-600" />
                        ) : (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        )
                      ) : (
                        <XCircle className="h-8 w-8 text-red-600" />
                      )}
                      <div>
                        <p
                          className={`font-semibold ${
                            validationResult.valid
                              ? validationResult.ticket?.status === "USED"
                                ? "text-amber-800"
                                : "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {validationResult.valid
                            ? validationResult.ticket?.status === "USED"
                              ? "Already Checked In"
                              : "Valid Ticket"
                            : "Invalid Ticket"}
                        </p>
                        <p
                          className={`text-sm ${
                            validationResult.valid
                              ? validationResult.ticket?.status === "USED"
                                ? "text-amber-600"
                                : "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {validationResult.message}
                        </p>
                      </div>
                    </div>

                    {/* Ticket Details */}
                    {validationResult.ticket && (
                      <div className="space-y-4">
                        {/* Passenger Info */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-4 w-4" /> Passenger
                            </p>
                            <p className="font-semibold text-lg">
                              {validationResult.ticket.passenger.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {validationResult.ticket.passenger.identityType.replace("_", " ")} -{" "}
                              {validationResult.ticket.passenger.identityNumber}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Ticket className="h-4 w-4" /> Ticket
                            </p>
                            <p className="font-mono font-semibold">
                              {validationResult.ticket.ticketCode}
                            </p>
                            <Badge
                              variant={
                                validationResult.ticket.status === "ACTIVE"
                                  ? "default"
                                  : validationResult.ticket.status === "USED"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {validationResult.ticket.status}
                            </Badge>
                          </div>
                        </div>

                        <Separator />

                        {/* Trip Info */}
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Ship className="h-4 w-4" /> Trip Details
                          </p>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {validationResult.ticket.booking.schedule.route.departurePort.name}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">
                              {validationResult.ticket.booking.schedule.route.arrivalPort.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(
                                new Date(validationResult.ticket.booking.schedule.departureTime),
                                "MMM d, yyyy"
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {format(
                                new Date(validationResult.ticket.booking.schedule.departureTime),
                                "HH:mm"
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Ship className="h-4 w-4" />
                              {validationResult.ticket.booking.schedule.ship.name}
                            </span>
                          </div>
                        </div>

                        {validationResult.ticket.checkedInAt && (
                          <>
                            <Separator />
                            <p className="text-sm text-muted-foreground">
                              Checked in at{" "}
                              {format(new Date(validationResult.ticket.checkedInAt), "HH:mm")}
                            </p>
                          </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          {validationResult.valid &&
                            validationResult.ticket.status === "ACTIVE" && (
                              <Button
                                onClick={handleCheckIn}
                                disabled={isCheckingIn}
                                className="flex-1"
                              >
                                {isCheckingIn ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Check In Passenger
                              </Button>
                            )}
                          <Button variant="outline" onClick={handleReset}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Scan Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Validations Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Recent Validations</CardTitle>
              <CardDescription>Last 10 scanned tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {recentValidations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No validations yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentValidations.map((validation, index) => (
                    <div
                      key={`${validation.ticketCode}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      {validation.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      ) : validation.status === "already_checked_in" ? (
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {validation.passengerName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {validation.ticketCode}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(validation.time, "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
