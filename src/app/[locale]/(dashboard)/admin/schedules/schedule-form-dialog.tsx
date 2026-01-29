"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, 
  Calendar, 
  Route, 
  Ship, 
  Clock, 
  Wallet, 
  Users,
  Settings,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  LogOut,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { cn } from "@/lib/utils";

const scheduleFormSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  shipId: z.string().min(1, "Ship is required"),
  departureTime: z.date({ error: "Departure time is required" }),
  arrivalTime: z.date({ error: "Arrival time is required" }),
  price: z.number().int().positive("Price must be positive"),
  totalSeats: z.number().int().positive("Total seats must be positive"),
  status: z.enum(["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED"]).optional(),
}).refine((data) => data.arrivalTime > data.departureTime, {
  message: "Arrival time must be after departure time",
  path: ["arrivalTime"],
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface RouteOption {
  id: string;
  departurePort: { name: string; code: string };
  arrivalPort: { name: string; code: string };
  estimatedDuration: number;
  basePrice: number;
}

interface ShipOption {
  id: string;
  name: string;
  code: string;
  capacity: number;
}

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: {
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
    status: string;
  } | null;
  onSuccess: () => void;
}

const statusConfig = {
  SCHEDULED: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: Calendar },
  BOARDING: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: LogIn },
  DEPARTED: { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: PlayCircle },
  ARRIVED: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  CANCELLED: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

export function ScheduleFormDialog({ open, onOpenChange, schedule, onSuccess }: ScheduleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const isEdit = !!schedule;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      routeId: "",
      shipId: "",
      departureTime: undefined,
      arrivalTime: undefined,
      price: 0,
      totalSeats: 0,
      status: "SCHEDULED",
    },
  });

  const selectedRouteId = watch("routeId");
  const selectedShipId = watch("shipId");
  const departureTime = watch("departureTime");

  // Fetch routes and ships
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [routesRes, shipsRes] = await Promise.all([
          fetch("/api/routes?status=ACTIVE&limit=100"),
          fetch("/api/ships?status=ACTIVE&limit=100"),
        ]);

        const routesResult = await routesRes.json();
        const shipsResult = await shipsRes.json();

        if (routesRes.ok) {
          // API returns { success, data: { data: [...], pagination } } or { success, data: [...] }
          const routesData = routesResult.data?.data || routesResult.data || [];
          setRoutes(Array.isArray(routesData) ? routesData : []);
        }
        if (shipsRes.ok) {
          const shipsData = shipsResult.data?.data || shipsResult.data || [];
          setShips(Array.isArray(shipsData) ? shipsData : []);
        }
      } catch {
        console.error("Failed to load options");
        setRoutes([]);
        setShips([]);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

  // Auto-fill arrival time based on route duration
  useEffect(() => {
    if (departureTime && selectedRouteId) {
      const route = routes.find((r) => r.id === selectedRouteId);
      if (route) {
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + route.estimatedDuration);
        setValue("arrivalTime", arrivalTime);
      }
    }
  }, [departureTime, selectedRouteId, routes, setValue]);

  // Auto-fill price based on route
  useEffect(() => {
    if (selectedRouteId && !isEdit) {
      const route = routes.find((r) => r.id === selectedRouteId);
      if (route) {
        setValue("price", route.basePrice);
      }
    }
  }, [selectedRouteId, routes, isEdit, setValue]);

  // Auto-fill seats based on ship
  useEffect(() => {
    if (selectedShipId && !isEdit) {
      const ship = ships.find((s) => s.id === selectedShipId);
      if (ship) {
        setValue("totalSeats", ship.capacity);
      }
    }
  }, [selectedShipId, ships, isEdit, setValue]);

  // Reset form when dialog opens/closes or schedule changes
  useEffect(() => {
    if (open && schedule) {
      reset({
        routeId: schedule.route.id,
        shipId: schedule.ship.id,
        departureTime: new Date(schedule.departureTime),
        arrivalTime: new Date(schedule.arrivalTime),
        price: schedule.price,
        totalSeats: schedule.totalSeats,
        status: schedule.status as ScheduleFormData["status"],
      });
    } else if (open && !schedule) {
      reset({
        routeId: "",
        shipId: "",
        departureTime: undefined,
        arrivalTime: undefined,
        price: 0,
        totalSeats: 0,
        status: "SCHEDULED",
      });
    }
    setError(null);
  }, [open, schedule, reset]);

  const onSubmit = async (data: ScheduleFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        routeId: data.routeId,
        shipId: data.shipId,
        departureTime: data.departureTime.toISOString(),
        arrivalTime: data.arrivalTime.toISOString(),
        price: data.price,
        totalSeats: data.totalSeats,
        ...(isEdit && data.status ? { status: data.status } : {}),
      };

      const url = isEdit ? `/api/schedules/${schedule.id}` : "/api/schedules";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `Failed to ${isEdit ? "update" : "create"} schedule`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-br from-orange-500 via-rose-500 to-pink-600 rounded-t-lg" />
        
        {/* Icon badge */}
        <div className="relative flex justify-center mt-6 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-800">
            <Calendar className="w-8 h-8 text-rose-600" />
          </div>
        </div>

        <DialogHeader className="relative text-center pb-2 pt-2">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Edit Schedule" : "Add New Schedule"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Update the schedule details below." : "Fill in the details to add a new schedule."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Route Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Route className="w-4 h-4 text-rose-600" />
              Route <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch("routeId")}
              onValueChange={(v) => setValue("routeId", v)}
              disabled={isLoadingOptions}
            >
              <SelectTrigger className={cn(
                "h-11 rounded-xl border-2 transition-all duration-200",
                "focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10",
                errors.routeId ? "border-red-300" : "border-slate-200 dark:border-slate-700"
              )}>
                <SelectValue placeholder="Select route" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(Array.isArray(routes) ? routes : []).map((route) => (
                  <SelectItem key={route.id} value={route.id} className="rounded-lg">
                    <span className="flex items-center gap-2">
                      <Route className="w-3 h-3 text-rose-500" />
                      {route.departurePort.name} → {route.arrivalPort.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.routeId && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.routeId.message}
              </p>
            )}
          </div>

          {/* Ship Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Ship className="w-4 h-4 text-rose-600" />
              Ship <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch("shipId")}
              onValueChange={(v) => setValue("shipId", v)}
              disabled={isLoadingOptions}
            >
              <SelectTrigger className={cn(
                "h-11 rounded-xl border-2 transition-all duration-200",
                "focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10",
                errors.shipId ? "border-red-300" : "border-slate-200 dark:border-slate-700"
              )}>
                <SelectValue placeholder="Select ship" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(Array.isArray(ships) ? ships : []).map((ship) => (
                  <SelectItem key={ship.id} value={ship.id} className="rounded-lg">
                    <span className="flex items-center gap-2">
                      <Ship className="w-3 h-3 text-rose-500" />
                      {ship.name} ({ship.code}) - {ship.capacity} seats
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.shipId && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.shipId.message}
              </p>
            )}
          </div>

          {/* Time Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-rose-600" />
              Schedule Time
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <LogOut className="w-3 h-3" />
                  Departure <span className="text-red-500">*</span>
                </Label>
                <DateTimePicker
                  value={watch("departureTime")}
                  onChange={(date) => setValue("departureTime", date as Date)}
                  placeholder="Select departure"
                  minDate={new Date()}
                />
                {errors.departureTime && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.departureTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  Arrival <span className="text-red-500">*</span>
                </Label>
                <DateTimePicker
                  value={watch("arrivalTime")}
                  onChange={(date) => setValue("arrivalTime", date as Date)}
                  placeholder="Select arrival"
                  minDate={departureTime}
                />
                {errors.arrivalTime && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.arrivalTime.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 text-rose-600" />
                Price (IDR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                {...register("price", { valueAsNumber: true })}
                placeholder="e.g., 150000"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10",
                  errors.price ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {watch("price") > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  Rp {formatCurrency(watch("price"))}
                </p>
              )}
              {errors.price && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Total Seats */}
            <div className="space-y-2">
              <Label htmlFor="totalSeats" className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" />
                Total Seats <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalSeats"
                type="number"
                {...register("totalSeats", { valueAsNumber: true })}
                placeholder="e.g., 30"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10",
                  errors.totalSeats ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.totalSeats && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.totalSeats.message}
                </p>
              )}
            </div>
          </div>

          {/* Status (only for edit) */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-rose-600" />
                Status
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as ScheduleFormData["status"])}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED"] as const).map((status) => {
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    return (
                      <SelectItem key={status} value={status} className="rounded-lg">
                        <span className={cn("inline-flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium", config.color)}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Footer buttons */}
          <DialogFooter className="gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isLoadingOptions}
              className="h-11 px-6 rounded-xl bg-linear-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-lg shadow-rose-500/25 transition-all duration-200"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update Schedule" : "Add Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
