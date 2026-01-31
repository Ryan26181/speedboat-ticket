"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Ship,
  MapPin,
  Clock,
  Calendar,
  User,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Passenger schema
const passengerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  identityType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"]),
  identityNumber: z
    .string()
    .min(5, "ID number must be at least 5 characters")
    .max(30)
    .regex(/^[A-Z0-9]+$/i, "ID number can only contain letters and numbers"),
  phone: z.string().optional(),
});

const bookingSchema = z.object({
  passengers: z.array(passengerSchema).min(1),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface Schedule {
  id: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  route: {
    departurePort: { name: string; city: string; address?: string };
    arrivalPort: { name: string; city: string; address?: string };
    distance: number;
    estimatedDuration: number;
  };
  ship: { name: string; code: string; facilities: string[] };
}

export default function BookingPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [scheduleId, setScheduleId] = useState<string>("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Passengers, 2: Review

  const passengersCount = parseInt(searchParams.get("passengers") || "1", 10);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      passengers: Array.from({ length: passengersCount }, () => ({
        name: "",
        identityType: "NATIONAL_ID" as const,
        identityNumber: "",
        phone: "",
      })),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "passengers",
  });

  const watchedPassengers = watch("passengers");

  // Resolve params
  useEffect(() => {
    params.then((p) => setScheduleId(p.scheduleId));
  }, [params]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?callbackUrl=${currentUrl}`);
    }
  }, [authStatus, router]);

  // Fetch schedule details
  useEffect(() => {
    if (!scheduleId) return;

    async function fetchSchedule() {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Schedule not found");
        }

        setSchedule(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load schedule");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedule();
  }, [scheduleId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const onSubmit = async (data: BookingFormData) => {
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          passengers: data.passengers,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to create booking");
      }

      // Redirect to payment page
      router.push(`/payment/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  // Loading states
  if (authStatus === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error && !schedule) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/search">Back to Search</Link>
        </Button>
      </div>
    );
  }

  if (!schedule) return null;

  const totalPrice = schedule.price * passengersCount;
  const departureTime = new Date(schedule.departureTime);
  const arrivalTime = new Date(schedule.arrivalTime);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/search?passengers=${passengersCount}`} className="inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            1
          </div>
          <span className="font-medium">Passengers</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            2
          </div>
          <span className="font-medium">Review</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-muted">
            3
          </div>
          <span className="font-medium">Payment</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Passenger Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-4 pb-6 border-b last:border-0 last:pb-0">
                      <h3 className="font-medium">
                        Passenger {index + 1}
                        {index === 0 && <Badge variant="secondary" className="ml-2">Contact Person</Badge>}
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`passengers.${index}.name`}>Full Name *</Label>
                          <Input
                            {...register(`passengers.${index}.name`)}
                            placeholder="As shown on ID"
                          />
                          {errors.passengers?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {errors.passengers[index]?.name?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passengers.${index}.identityType`}>ID Type *</Label>
                          <Select
                            defaultValue="NATIONAL_ID"
                            onValueChange={(value) => {
                              const event = {
                                target: { name: `passengers.${index}.identityType`, value },
                              };
                              register(`passengers.${index}.identityType`).onChange(event);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NATIONAL_ID">KTP (National ID)</SelectItem>
                              <SelectItem value="PASSPORT">Passport</SelectItem>
                              <SelectItem value="DRIVERS_LICENSE">Driver&apos;s License</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passengers.${index}.identityNumber`}>ID Number *</Label>
                          <Input
                            {...register(`passengers.${index}.identityNumber`)}
                            placeholder="ID number"
                          />
                          {errors.passengers?.[index]?.identityNumber && (
                            <p className="text-xs text-destructive">
                              {errors.passengers[index]?.identityNumber?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`passengers.${index}.phone`}>Phone (Optional)</Label>
                          <Input
                            {...register(`passengers.${index}.phone`)}
                            placeholder="+62..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full">
                    Continue to Review
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Review Booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Passengers Summary */}
                  <div>
                    <h3 className="font-medium mb-3">Passengers ({passengersCount})</h3>
                    <div className="space-y-2">
                      {watchedPassengers.map((passenger, index) => (
                        <div key={index} className="flex justify-between text-sm p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{passenger.name || `Passenger ${index + 1}`}</p>
                            <p className="text-muted-foreground">
                              {passenger.identityType?.replace("_", " ")} - {passenger.identityNumber}
                            </p>
                          </div>
                          <p className="font-medium">{formatPrice(schedule.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Price Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ticket Price × {passengersCount}</span>
                      <span>{formatPrice(schedule.price)} × {passengersCount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(totalPrice)}</span>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Proceed to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>

        {/* Schedule Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">{schedule.route.departurePort.name}</p>
                    <p className="text-sm text-muted-foreground">{schedule.route.departurePort.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 ml-2 border-l-2 border-dashed border-muted pl-4 py-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(schedule.route.estimatedDuration)}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <p className="font-medium">{schedule.route.arrivalPort.name}</p>
                    <p className="text-sm text-muted-foreground">{schedule.route.arrivalPort.city}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date & Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(departureTime, "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(departureTime, "HH:mm")} - {format(arrivalTime, "HH:mm")}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Ship */}
              <div className="flex items-center gap-2 text-sm">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span>{schedule.ship.name}</span>
              </div>

              <Separator />

              {/* Price */}
              <div className="bg-primary/5 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {passengersCount} passenger{passengersCount > 1 ? "s" : ""}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
