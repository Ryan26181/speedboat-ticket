"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, 
  Route, 
  Anchor, 
  MapPin, 
  Clock, 
  Wallet,
  ArrowRight,
  Settings,
  AlertCircle,
  CheckCircle2
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
import { cn } from "@/lib/utils";

const routeFormSchema = z.object({
  departurePortId: z.string().min(1, "Departure port is required"),
  arrivalPortId: z.string().min(1, "Arrival port is required"),
  distance: z.number().positive("Distance must be positive"),
  estimatedDuration: z.number().int().positive("Duration must be positive"),
  basePrice: z.number().int().positive("Price must be positive"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
}).refine((data) => data.departurePortId !== data.arrivalPortId, {
  message: "Departure and arrival ports must be different",
  path: ["arrivalPortId"],
});

type RouteFormData = z.infer<typeof routeFormSchema>;

interface Port {
  id: string;
  name: string;
  code: string;
}

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: {
    id: string;
    departurePort: { id: string; name: string; code: string };
    arrivalPort: { id: string; name: string; code: string };
    distance: number;
    estimatedDuration: number;
    basePrice: number;
    status: string;
  } | null;
  onSuccess: () => void;
}

export function RouteFormDialog({ open, onOpenChange, route, onSuccess }: RouteFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ports, setPorts] = useState<Port[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(true);

  const isEdit = !!route;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      departurePortId: "",
      arrivalPortId: "",
      distance: 0,
      estimatedDuration: 60,
      basePrice: 100000,
      status: "ACTIVE",
    },
  });

  const selectedDeparturePort = watch("departurePortId");

  // Fetch ports
  useEffect(() => {
    async function fetchPorts() {
      try {
        const res = await fetch("/api/ports?limit=100");
        const result = await res.json();
        if (res.ok) {
          // API returns { success, data: { data: [...], pagination } } or { success, data: [...] }
          const portsData = result.data?.data || result.data || [];
          setPorts(Array.isArray(portsData) ? portsData : []);
        }
      } catch {
        console.error("Failed to load ports");
        setPorts([]);
      } finally {
        setIsLoadingPorts(false);
      }
    }
    fetchPorts();
  }, []);

  // Reset form when dialog opens/closes or route changes
  useEffect(() => {
    if (open && route) {
      reset({
        departurePortId: route.departurePort.id,
        arrivalPortId: route.arrivalPort.id,
        distance: route.distance,
        estimatedDuration: route.estimatedDuration,
        basePrice: route.basePrice,
        status: route.status as "ACTIVE" | "INACTIVE",
      });
    } else if (open && !route) {
      reset({
        departurePortId: "",
        arrivalPortId: "",
        distance: 0,
        estimatedDuration: 60,
        basePrice: 100000,
        status: "ACTIVE",
      });
    }
    setError(null);
  }, [open, route, reset]);

  const onSubmit = async (data: RouteFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/routes/${route.id}` : "/api/routes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `Failed to ${isEdit ? "update" : "create"} route`);
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

  const statusConfig = {
    ACTIVE: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
    INACTIVE: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400", icon: AlertCircle },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-t-lg" />
        
        {/* Icon badge */}
        <div className="relative flex justify-center mt-6 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-800">
            <Route className="w-8 h-8 text-violet-600" />
          </div>
        </div>

        <DialogHeader className="relative text-center pb-2 pt-2">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Edit Route" : "Add New Route"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Update the route details below." : "Fill in the details to add a new route."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Route Visual */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Anchor className="w-4 h-4 text-violet-600" />
                    From <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch("departurePortId")}
                    onValueChange={(v) => setValue("departurePortId", v)}
                    disabled={isLoadingPorts}
                  >
                    <SelectTrigger className={cn(
                      "h-11 rounded-xl border-2 transition-all duration-200",
                      "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10",
                      errors.departurePortId ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                    )}>
                      <SelectValue placeholder="Departure" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Array.isArray(ports) ? ports : []).map((port) => (
                        <SelectItem key={port.id} value={port.id} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <Anchor className="w-3 h-3 text-violet-500" />
                            {port.name} ({port.code})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departurePortId && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.departurePortId.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="shrink-0 flex flex-col items-center gap-1 pt-6">
                <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-violet-600" />
                    To <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watch("arrivalPortId")}
                    onValueChange={(v) => setValue("arrivalPortId", v)}
                    disabled={isLoadingPorts}
                  >
                    <SelectTrigger className={cn(
                      "h-11 rounded-xl border-2 transition-all duration-200",
                      "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10",
                      errors.arrivalPortId ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                    )}>
                      <SelectValue placeholder="Arrival" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Array.isArray(ports) ? ports : [])
                        .filter((port) => port.id !== selectedDeparturePort)
                        .map((port) => (
                          <SelectItem key={port.id} value={port.id} className="rounded-lg">
                            <span className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-violet-500" />
                              {port.name} ({port.code})
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.arrivalPortId && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.arrivalPortId.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Distance */}
            <div className="space-y-2">
              <Label htmlFor="distance" className="text-sm font-medium flex items-center gap-2">
                <Route className="w-4 h-4 text-violet-600" />
                Distance (km) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                {...register("distance", { valueAsNumber: true })}
                placeholder="e.g., 25.5"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10",
                  errors.distance ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.distance && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.distance.message}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration" className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600" />
                Duration (min) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="estimatedDuration"
                type="number"
                {...register("estimatedDuration", { valueAsNumber: true })}
                placeholder="e.g., 90"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10",
                  errors.estimatedDuration ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.estimatedDuration && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.estimatedDuration.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Base Price */}
            <div className="space-y-2">
              <Label htmlFor="basePrice" className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 text-violet-600" />
                Base Price (IDR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="basePrice"
                type="number"
                {...register("basePrice", { valueAsNumber: true })}
                placeholder="e.g., 150000"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10",
                  errors.basePrice ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {watch("basePrice") > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  Rp {formatCurrency(watch("basePrice"))}
                </p>
              )}
              {errors.basePrice && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.basePrice.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-600" />
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(["ACTIVE", "INACTIVE"] as const).map((status) => {
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
          </div>

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
              disabled={isSubmitting || isLoadingPorts}
              className="h-11 px-6 rounded-xl bg-linear-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 transition-all duration-200"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update Route" : "Add Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
