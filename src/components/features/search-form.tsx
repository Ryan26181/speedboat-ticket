"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Search, Users, MapPin, ArrowRight, Loader2, ArrowLeftRight, Ship } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Search form schema
const searchSchema = z.object({
  departurePortId: z.string().min(1, "Please select departure port"),
  arrivalPortId: z.string().min(1, "Please select arrival port"),
  date: z.date({ error: "Please select a date" }),
  passengers: z.number().min(1, "At least 1 passenger").max(50, "Maximum 50 passengers"),
}).refine((data) => data.departurePortId !== data.arrivalPortId, {
  message: "Departure and arrival ports must be different",
  path: ["arrivalPortId"],
});

type SearchFormData = z.infer<typeof searchSchema>;

interface Port {
  id: string;
  name: string;
  code: string;
  city: string;
}

interface SearchFormProps {
  variant?: "hero" | "compact";
  className?: string;
  defaultValues?: Partial<SearchFormData>;
}

export function SearchForm({ variant = "hero", className, defaultValues }: SearchFormProps) {
  const router = useRouter();
  const [ports, setPorts] = useState<Port[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      departurePortId: defaultValues?.departurePortId || "",
      arrivalPortId: defaultValues?.arrivalPortId || "",
      date: defaultValues?.date || undefined,
      passengers: defaultValues?.passengers || 1,
    },
  });

  const departurePortId = watch("departurePortId");
  const arrivalPortId = watch("arrivalPortId");
  const selectedDate = watch("date");
  const passengers = watch("passengers");

  // Fetch ports on mount
  useEffect(() => {
    async function fetchPorts() {
      try {
        const res = await fetch("/api/ports?limit=-1&status=ACTIVE");
        const data = await res.json();
        if (data.success) {
          setPorts(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch ports:", error);
      } finally {
        setIsLoadingPorts(false);
      }
    }
    fetchPorts();
  }, []);

  const onSubmit = (data: SearchFormData) => {
    const searchParams = new URLSearchParams({
      departurePortId: data.departurePortId,
      arrivalPortId: data.arrivalPortId,
      date: format(data.date, "yyyy-MM-dd"),
      passengers: data.passengers.toString(),
    });

    router.push(`/search?${searchParams.toString()}`);
  };

  // Get available arrival ports (exclude selected departure)
  const availableArrivalPorts = ports.filter((p) => p.id !== departurePortId);

  // Swap ports function
  const handleSwapPorts = () => {
    if (departurePortId && arrivalPortId) {
      const tempDeparture = departurePortId;
      setValue("departurePortId", arrivalPortId, { shouldValidate: true });
      setValue("arrivalPortId", tempDeparture, { shouldValidate: true });
    }
  };

  const isHero = variant === "hero";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn(
        "rounded-2xl bg-white dark:bg-slate-900 shadow-2xl",
        isHero ? "p-6 md:p-8" : "p-5",
        className
      )}
    >
      <div
        className={cn(
          "grid gap-4",
          isHero ? "md:grid-cols-2 lg:grid-cols-[1fr,auto,1fr,1fr,1fr,auto]" : "md:grid-cols-5"
        )}
      >
        {/* Departure Port */}
        <div className={cn("space-y-2", isHero && "lg:col-span-1")}>
          <Label htmlFor="departurePortId" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            From
          </Label>
          <Select
            value={departurePortId}
            onValueChange={(value) => setValue("departurePortId", value, { shouldValidate: true })}
            disabled={isLoadingPorts}
          >
            <SelectTrigger 
              id="departurePortId" 
              className={cn(
                "h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-400 focus:border-primary-500 transition-colors",
                errors.departurePortId && "border-destructive"
              )}
            >
              <SelectValue placeholder={isLoadingPorts ? "Loading..." : "Select port"} />
            </SelectTrigger>
            <SelectContent>
              {ports.map((port) => (
                <SelectItem key={port.id} value={port.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{port.name}</span>
                    <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{port.city}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departurePortId && (
            <p className="text-xs text-destructive">{errors.departurePortId.message}</p>
          )}
        </div>

        {/* Swap Button (hero only) */}
        {isHero && (
          <div className="hidden lg:flex items-end justify-center pb-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon"
              onClick={handleSwapPorts}
              disabled={!departurePortId || !arrivalPortId}
              className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 border-2 border-slate-200 dark:border-slate-700 hover:border-primary-300 transition-all duration-300 disabled:opacity-40"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Arrival Port */}
        <div className={cn("space-y-2", isHero && "lg:col-span-1")}>
          <Label htmlFor="arrivalPortId" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary-100 dark:bg-primary-900/30">
              <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
            </div>
            To
          </Label>
          <Select
            value={arrivalPortId}
            onValueChange={(value) => setValue("arrivalPortId", value, { shouldValidate: true })}
            disabled={isLoadingPorts || !departurePortId}
          >
            <SelectTrigger 
              id="arrivalPortId" 
              className={cn(
                "h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-400 focus:border-primary-500 transition-colors",
                errors.arrivalPortId && "border-destructive"
              )}
            >
              <SelectValue placeholder={!departurePortId ? "Select departure first" : "Select destination"} />
            </SelectTrigger>
            <SelectContent>
              {availableArrivalPorts.map((port) => (
                <SelectItem key={port.id} value={port.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{port.name}</span>
                    <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{port.city}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.arrivalPortId && (
            <p className="text-xs text-destructive">{errors.arrivalPortId.message}</p>
          )}
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <CalendarIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                  !selectedDate && "text-muted-foreground",
                  errors.date && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                {selectedDate ? format(selectedDate, "EEE, MMM d") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => date && setValue("date", date, { shouldValidate: true })}
                disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <Label htmlFor="passengers" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            Passengers
          </Label>
          <div className="relative">
            <Input
              id="passengers"
              type="number"
              min={1}
              max={50}
              value={passengers}
              onChange={(e) => setValue("passengers", parseInt(e.target.value) || 1, { shouldValidate: true })}
              className={cn(
                "h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-400 focus:border-primary-500 transition-colors pl-4 pr-12",
                errors.passengers && "border-destructive"
              )}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">pax</span>
          </div>
          {errors.passengers && (
            <p className="text-xs text-destructive">{errors.passengers.message}</p>
          )}
        </div>

        {/* Search Button */}
        <div className={cn("flex items-end", isHero && "lg:col-span-1")}>
          <Button
            type="submit"
            className={cn(
              "w-full gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300",
              isHero ? "h-12" : "h-10"
            )}
            size={isHero ? "lg" : "default"}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-5 w-5" />
                <span className="font-semibold">Search</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
