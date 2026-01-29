"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2, 
  Plus, 
  X, 
  Ship, 
  Hash, 
  Users, 
  Settings, 
  FileText,
  Sparkles,
  CheckCircle2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const shipFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").max(10, "Code must be at most 10 characters"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]),
  description: z.string().optional(),
});

type ShipFormData = z.infer<typeof shipFormSchema>;

interface ShipFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ship?: {
    id: string;
    name: string;
    code: string;
    capacity: number;
    facilities: string[];
    status: string;
    description: string | null;
  } | null;
  onSuccess: () => void;
}

const COMMON_FACILITIES = [
  "Air Conditioning",
  "WiFi",
  "Toilet",
  "Life Jackets",
  "First Aid Kit",
  "Entertainment System",
  "Snack Bar",
  "Luggage Storage",
  "USB Charging",
  "Seat Belts",
];

export function ShipFormDialog({ open, onOpenChange, ship, onSuccess }: ShipFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [newFacility, setNewFacility] = useState("");

  const isEdit = !!ship;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ShipFormData>({
    resolver: zodResolver(shipFormSchema),
    defaultValues: {
      name: "",
      code: "",
      capacity: 30,
      status: "ACTIVE",
      description: "",
    },
  });

  // Reset form when dialog opens/closes or ship changes
  useEffect(() => {
    if (open && ship) {
      reset({
        name: ship.name,
        code: ship.code,
        capacity: ship.capacity,
        status: ship.status as "ACTIVE" | "MAINTENANCE" | "INACTIVE",
        description: ship.description || "",
      });
      setFacilities(ship.facilities || []);
    } else if (open && !ship) {
      reset({
        name: "",
        code: "",
        capacity: 30,
        status: "ACTIVE",
        description: "",
      });
      setFacilities([]);
    }
    setError(null);
  }, [open, ship, reset]);

  const addFacility = (facility: string) => {
    if (facility && !facilities.includes(facility)) {
      setFacilities([...facilities, facility]);
    }
    setNewFacility("");
  };

  const removeFacility = (facility: string) => {
    setFacilities(facilities.filter((f) => f !== facility));
  };

  const onSubmit = async (data: ShipFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...data,
        facilities,
      };

      const url = isEdit ? `/api/ships/${ship.id}` : "/api/ships";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `Failed to ${isEdit ? "update" : "create"} ship`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConfig = {
    ACTIVE: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
    MAINTENANCE: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Settings },
    INACTIVE: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400", icon: AlertCircle },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-br from-cyan-500 via-blue-500 to-blue-600 rounded-t-lg" />
        
        {/* Icon badge */}
        <div className="relative flex justify-center mt-6 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-800">
            <Ship className="w-8 h-8 text-cyan-600" />
          </div>
        </div>

        <DialogHeader className="relative text-center pb-2 pt-2">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Edit Ship" : "Add New Ship"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit ? "Update the ship details below." : "Fill in the details to add a new ship to your fleet."}
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
            {/* Ship Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <Ship className="w-4 h-4 text-cyan-600" />
                Ship Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input 
                  id="name" 
                  {...register("name")} 
                  placeholder="e.g., Sea Eagle" 
                  className={cn(
                    "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                    "focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10",
                    errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                  )}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Ship Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-600" />
                Ship Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="e.g., SE-001"
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200 uppercase",
                  "focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10",
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
            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600" />
                Capacity (seats) <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="capacity" 
                type="number" 
                {...register("capacity", { valueAsNumber: true })} 
                min={1}
                className={cn(
                  "h-11 pl-4 rounded-xl border-2 transition-all duration-200",
                  "focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10",
                  errors.capacity ? "border-red-300 focus:border-red-500 focus:ring-red-500/10" : "border-slate-200 dark:border-slate-700"
                )}
              />
              {errors.capacity && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.capacity.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-600" />
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ShipFormData["status"])}>
                <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(["ACTIVE", "MAINTENANCE", "INACTIVE"] as const).map((status) => {
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

          {/* Facilities */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              Facilities
            </Label>
            
            {/* Selected facilities */}
            {facilities.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                {facilities.map((facility) => (
                  <Badge 
                    key={facility} 
                    variant="secondary" 
                    className="gap-1.5 px-3 py-1.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 rounded-lg"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {facility}
                    <button
                      type="button"
                      onClick={() => removeFacility(facility)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Add from common facilities */}
            <div className="flex gap-2">
              <Select onValueChange={addFacility}>
                <SelectTrigger className="flex-1 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10">
                  <SelectValue placeholder="Add common facility..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {COMMON_FACILITIES.filter((f) => !facilities.includes(f)).map((facility) => (
                    <SelectItem key={facility} value={facility} className="rounded-lg">
                      {facility}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom facility input */}
            <div className="flex gap-2">
              <Input
                placeholder="Or type custom facility..."
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFacility(newFacility);
                  }
                }}
                className="h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => addFacility(newFacility)}
                className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600" />
              Description
            </Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description about the ship..."
              rows={3}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 resize-none"
            />
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
              className="h-11 px-6 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 transition-all duration-200"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Update Ship" : "Add Ship"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
