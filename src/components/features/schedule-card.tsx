'use client';

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Clock, Ship as ShipIcon, Users, ArrowRight, Wifi, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ScheduleCardProps {
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    priceFormatted?: string;
    availableSeats: number;
    totalSeats: number;
    duration?: {
      hours: number;
      minutes: number;
      formatted: string;
    };
    route: {
      departurePort: {
        name: string;
        city: string;
        code?: string;
      };
      arrivalPort: {
        name: string;
        city: string;
        code?: string;
      };
      distance?: number;
    };
    ship: {
      name: string;
      code?: string;
      facilities?: string[];
    };
  };
  passengers: number;
  className?: string;
}

export function ScheduleCard({ schedule, passengers, className }: ScheduleCardProps) {
  const t = useTranslations('search');
  
  const departureTime = new Date(schedule.departureTime);
  const arrivalTime = new Date(schedule.arrivalTime);

  // Calculate duration if not provided
  const duration = schedule.duration || (() => {
    const diffMs = arrivalTime.getTime() - departureTime.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return {
      hours,
      minutes: remainingMinutes,
      formatted: hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`,
    };
  })();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const isSoldOut = schedule.availableSeats === 0;
  const isLimitedSeats = schedule.availableSeats <= 5 && !isSoldOut;
  const facilities = schedule.ship.facilities as string[] | undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        'overflow-hidden transition-shadow hover:shadow-lg border-0 shadow-md',
        isSoldOut && 'opacity-60',
        className
      )}>
        <CardContent className="p-0">
          {/* ========== MOBILE LAYOUT ========== */}
          <div className="md:hidden">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b bg-linear-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShipIcon className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm text-gray-900">
                    {schedule.ship.name}
                  </span>
                </div>
                {isLimitedSeats && (
                  <Badge variant="destructive" className="text-[10px] px-2">
                    {schedule.availableSeats} left
                  </Badge>
                )}
                {isSoldOut && (
                  <Badge variant="secondary" className="text-[10px] px-2">
                    Sold Out
                  </Badge>
                )}
              </div>
            </div>

            {/* Route & Time */}
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                {/* Departure */}
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {format(departureTime, 'HH:mm')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {schedule.route.departurePort.code || schedule.route.departurePort.city.slice(0, 3).toUpperCase()}
                  </p>
                </div>

                {/* Duration */}
                <div className="flex-1 px-2 sm:px-4">
                  <div className="flex items-center justify-center">
                    <div className="flex-1 h-px bg-gray-200" />
                    <div className="px-2 flex flex-col items-center">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                        {duration.formatted}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {format(arrivalTime, 'HH:mm')}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {schedule.route.arrivalPort.code || schedule.route.arrivalPort.city.slice(0, 3).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Route Names */}
              <div className="flex items-center justify-between mt-2 text-[10px] sm:text-xs text-gray-600">
                <span className="truncate max-w-24 sm:max-w-32">
                  {schedule.route.departurePort.name}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-400 shrink-0 mx-1" />
                <span className="truncate max-w-24 sm:max-w-32 text-right">
                  {schedule.route.arrivalPort.name}
                </span>
              </div>
            </div>

            {/* Footer - Price & Book */}
            <div className="p-3 sm:p-4 pt-2 sm:pt-3 border-t bg-gray-50 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg sm:text-xl font-bold text-blue-600">
                  {formatPrice(schedule.price)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  /person
                </p>
              </div>

              <Link
                href={`/booking/new/${schedule.id}?passengers=${passengers}`}
                className={cn(isSoldOut && 'pointer-events-none')}
              >
                <Button
                  disabled={isSoldOut}
                  size="sm"
                  className="min-w-24 sm:min-w-28 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {isSoldOut ? 'Sold Out' : 'Book Now'}
                </Button>
              </Link>
            </div>
          </div>

          {/* ========== DESKTOP LAYOUT ========== */}
          <div className="hidden md:block p-4 lg:p-5">
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Ship Info */}
              <div className="w-32 lg:w-40 shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShipIcon className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-sm lg:text-base text-gray-900 truncate">
                    {schedule.ship.name}
                  </span>
                </div>
                {facilities && facilities.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {facilities.slice(0, 3).map((facility, idx) => (
                      <span
                        key={idx}
                        className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"
                        title={facility}
                      >
                        {facility.toLowerCase().includes('wifi') && <Wifi className="h-3 w-3 text-gray-500" />}
                        {facility.toLowerCase().includes('snack') && <Coffee className="h-3 w-3 text-gray-500" />}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Route & Time */}
              <div className="flex-1 flex items-center gap-3 lg:gap-4">
                {/* Departure */}
                <div className="text-center min-w-20 lg:min-w-28">
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {format(departureTime, 'HH:mm')}
                  </p>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {schedule.route.departurePort.code || schedule.route.departurePort.city.slice(0, 3).toUpperCase()}
                  </p>
                  <p className="text-[10px] lg:text-xs text-gray-500 truncate max-w-20 lg:max-w-28">
                    {schedule.route.departurePort.name}
                  </p>
                </div>

                {/* Duration Line */}
                <div className="flex-1 flex items-center min-w-28">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1 h-0.5 bg-linear-to-r from-blue-500 to-cyan-500 mx-1 lg:mx-2 relative">
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] lg:text-xs text-gray-500 whitespace-nowrap">
                      {duration.formatted}
                    </span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                </div>

                {/* Arrival */}
                <div className="text-center min-w-20 lg:min-w-28">
                  <p className="text-xl lg:text-2xl font-bold text-gray-900">
                    {format(arrivalTime, 'HH:mm')}
                  </p>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {schedule.route.arrivalPort.code || schedule.route.arrivalPort.city.slice(0, 3).toUpperCase()}
                  </p>
                  <p className="text-[10px] lg:text-xs text-gray-500 truncate max-w-20 lg:max-w-28">
                    {schedule.route.arrivalPort.name}
                  </p>
                </div>
              </div>

              {/* Seats */}
              <div className="text-center w-20 lg:w-24 shrink-0">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className={cn(
                    'text-sm font-medium',
                    isSoldOut ? 'text-red-600' : isLimitedSeats ? 'text-amber-600' : 'text-gray-600'
                  )}>
                    {schedule.availableSeats}
                  </span>
                </div>
                <p className="text-[10px] lg:text-xs text-gray-500">seats left</p>
              </div>

              {/* Price & Book */}
              <div className="text-right w-28 lg:w-36 shrink-0">
                <p className="text-xl lg:text-2xl font-bold text-blue-600">
                  {formatPrice(schedule.price)}
                </p>
                <p className="text-[10px] lg:text-xs text-gray-500 mb-2">/person</p>
                <Link
                  href={`/booking/new/${schedule.id}?passengers=${passengers}`}
                  className={cn(isSoldOut && 'pointer-events-none')}
                >
                  <Button disabled={isSoldOut} className="w-full h-9 lg:h-10 text-sm">
                    {isSoldOut ? 'Sold Out' : 'Book Now'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Skeleton loader for schedule card
export function ScheduleCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <CardContent className="p-0">
        {/* Mobile Skeleton */}
        <div className="md:hidden">
          <div className="p-3 sm:p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="text-center space-y-1">
                <div className="h-7 w-14 bg-gray-200 rounded animate-pulse mx-auto" />
                <div className="h-3 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
              <div className="flex-1 px-4">
                <div className="h-px bg-gray-200" />
              </div>
              <div className="text-center space-y-1">
                <div className="h-7 w-14 bg-gray-200 rounded animate-pulse mx-auto" />
                <div className="h-3 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Desktop Skeleton */}
        <div className="hidden md:block p-4 lg:p-5">
          <div className="flex items-center gap-6">
            <div className="w-32 lg:w-40 space-y-2">
              <div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-1">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex-1 flex items-center gap-4">
              <div className="text-center space-y-1 min-w-20">
                <div className="h-7 w-14 bg-gray-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 rounded" />
              <div className="text-center space-y-1 min-w-20">
                <div className="h-7 w-14 bg-gray-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-10 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
            </div>
            <div className="w-20 text-center space-y-1">
              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
            <div className="w-28 lg:w-36 space-y-2">
              <div className="h-7 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
