import Link from "next/link";
import { Clock, MapPin, Ship as ShipIcon, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const departureTime = new Date(schedule.departureTime);
  const arrivalTime = new Date(schedule.arrivalTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

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

  const isLowSeats = schedule.availableSeats < 10;
  const totalPrice = schedule.price * passengers;
  const facilities = schedule.ship.facilities as string[] | undefined;

  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Main Content */}
          <div className="flex-1 p-4 md:p-6">
            {/* Route and Time */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              {/* Departure */}
              <div className="text-center md:text-left">
                <p className="text-2xl font-bold">{formatTime(departureTime)}</p>
                <p className="text-sm font-medium">{schedule.route.departurePort.name}</p>
                <p className="text-xs text-muted-foreground">{schedule.route.departurePort.city}</p>
              </div>

              {/* Duration Line */}
              <div className="flex-1 flex items-center gap-2 px-4">
                <div className="hidden md:block h-px flex-1 bg-border" />
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {duration.formatted}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="hidden md:block h-px flex-1 bg-border" />
              </div>

              {/* Arrival */}
              <div className="text-center md:text-right">
                <p className="text-2xl font-bold">{formatTime(arrivalTime)}</p>
                <p className="text-sm font-medium">{schedule.route.arrivalPort.name}</p>
                <p className="text-xs text-muted-foreground">{schedule.route.arrivalPort.city}</p>
              </div>
            </div>

            {/* Ship Info & Facilities */}
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShipIcon className="h-4 w-4" />
                <span className="font-medium">{schedule.ship.name}</span>
              </div>

              {facilities && facilities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {facilities.slice(0, 4).map((facility, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {facility}
                    </Badge>
                  ))}
                  {facilities.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{facilities.length - 4} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className={cn(isLowSeats && "text-orange-600 font-medium")}>
                  {schedule.availableSeats} seats left
                </span>
              </div>
            </div>
          </div>

          {/* Price & Book Section */}
          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 p-4 md:p-6 bg-muted/30 md:w-48 md:border-l">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {passengers > 1 ? `${passengers} passengers` : "per person"}
              </p>
              <p className="text-2xl font-bold text-primary">
                {schedule.priceFormatted || formatPrice(passengers > 1 ? totalPrice : schedule.price)}
              </p>
              {passengers > 1 && (
                <p className="text-xs text-muted-foreground">
                  {formatPrice(schedule.price)}/person
                </p>
              )}
            </div>

            <Button asChild className="w-full md:w-auto">
              <Link href={`/booking/${schedule.id}?passengers=${passengers}`}>
                Book Now
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton loader for schedule card
export function ScheduleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-px flex-1 bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex gap-4">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 p-4 md:p-6 bg-muted/30 md:w-48 md:border-l">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
