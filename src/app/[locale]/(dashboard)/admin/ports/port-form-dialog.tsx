"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, 
  Anchor, 
  Hash, 
  Building2, 
  MapPin, 
  Navigation,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const portFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  province: z.string().min(2, "Province must be at least 2 characters"),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

type PortFormData = z.infer<typeof portFormSchema>;

interface PortFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port?: {
    id: string;
    name: string;
    code: string;
    city: string;
    province: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  onSuccess: () => void;
}

export function PortFormDialog({ open, onOpenChange, port, onSuccess }: PortFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!port;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PortFormData>({
    resolver: zodResolver(portFormSchema),
    defaultValues: {
      name: "",
      code: "",
      city: "",
      province: "",
      address: "",
      latitude: null,
      longitude: null,
    },
  });

  // Reset form when dialog opens/closes or port changes
  useEffect(() => {
    if (open && port) {
      reset({
        name: port.name,
        code: port.code,
        city: port.city,
        province: port.province,
        address: port.address || "",
        latitude: port.latitude,
        longitude: port.longitude,
      });
    } else if (open && !port) {
      reset({
        name: "",
        code: "",
        city: "",
        province: "",
        address: "",
        latitude: null,
        longitude: null,
      });
    }
    setError(null);
  }, [open, port, reset]);

  const onSubmit = async (data: PortFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...data,
        address: data.address || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };

      const url = isEdit ? `/api/ports/${port.id}` : "/api/ports";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `Failed to ${isEdit ? "update" : "create"} port`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-t-lg" />
        
        {/* Icon badge */}
        <div className="relative flex justify-center mt-6 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-800">
            <Anchor className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <DialogHeader className="relative text-center pb-2 pt-2">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Edit Port" : "Add New Port"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Update the port details below." : "Fill in the details to add a new port."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Port Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <Anchor className="w-4 h-4 text-emerald-600" />
                Port Name <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="name" 
                {...register("name")} 
                placeholder="e.g., Harbour Bay"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                  errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Port Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                Port Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="e.g., HBB"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200 uppercase",
                  "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                  errors.code ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.code && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.code.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                City <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="city" 
                {...register("city")} 
                placeholder="e.g., Batam"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                  errors.city ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.city && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="province" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Province <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="province" 
                {...register("province")} 
                placeholder="e.g., Kepulauan Riau"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                  errors.province ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.province && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.province.message}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Address
            </Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Full address of the port..."
              rows={2}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none"
            />
          </div>

          {/* Coordinates section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Navigation className="w-4 h-4 text-emerald-600" />
              GPS Coordinates (Optional)
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Latitude */}
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-sm text-muted-foreground">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                {...register("latitude", { valueAsNumber: true })}
                  placeholder="e.g., 1.0456"
                  className={cn(
                    "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                    "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                    errors.latitude ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                  )}
                />
                {errors.latitude && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-sm text-muted-foreground">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                {...register("longitude", { valueAsNumber: true })}
                  placeholder="e.g., 104.0305"
                  className={cn(
                    "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                    "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10",
                    errors.longitude ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                  )}
                />
                {errors.longitude && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.longitude.message}
                  </p>
                )}
              </div>
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
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update Port" : "Add Port"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
