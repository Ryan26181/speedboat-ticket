import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  validateRequest,
} from "@/lib/api-utils";
import { searchScheduleSchema } from "@/validations/schedule";

/**
 * GET /api/schedules/search
 * Optimized search endpoint for public booking
 * Returns available schedules for specific route and date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate query params
    const queryData = {
      departurePortId: searchParams.get("departurePortId") || "",
      arrivalPortId: searchParams.get("arrivalPortId") || "",
      departureDate: searchParams.get("date") || "",
      passengers: parseInt(searchParams.get("passengers") || "1", 10),
    };

    const validation = await validateRequest(searchScheduleSchema, queryData);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Invalid search parameters", errors: validation.errors },
        "SEARCH_SCHEDULES"
      );
    }

    const { departurePortId, arrivalPortId, departureDate, passengers } = validation.data;

    // Calculate date range for the search day
    const startOfDay = new Date(`${departureDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${departureDate}T23:59:59.999Z`);
    const now = new Date();

    // Find available schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        // Filter by route (through relation)
        route: {
          departurePortId,
          arrivalPortId,
          status: "ACTIVE", // Only active routes
        },
        // Only SCHEDULED status
        status: "SCHEDULED",
        // Within the specified date
        departureTime: {
          gte: now > startOfDay ? now : startOfDay, // Don't show past schedules
          lte: endOfDay,
        },
        // Has enough available seats
        availableSeats: {
          gte: passengers,
        },
        // Ship must be active
        ship: {
          status: "ACTIVE",
        },
      },
      orderBy: { departureTime: "asc" },
      include: {
        route: {
          include: {
            departurePort: {
              select: {
                id: true,
                name: true,
                code: true,
                city: true,
                province: true,
                address: true,
              },
            },
            arrivalPort: {
              select: {
                id: true,
                name: true,
                code: true,
                city: true,
                province: true,
                address: true,
              },
            },
          },
        },
        ship: {
          select: {
            id: true,
            name: true,
            code: true,
            capacity: true,
            facilities: true,
            imageUrl: true,
          },
        },
      },
    });

    // Transform the data for easier frontend consumption
    const results = schedules.map((schedule) => ({
      id: schedule.id,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      price: schedule.price,
      priceFormatted: formatPrice(schedule.price),
      totalSeats: schedule.totalSeats,
      availableSeats: schedule.availableSeats,
      status: schedule.status,
      duration: calculateDuration(schedule.departureTime, schedule.arrivalTime),
      route: {
        id: schedule.route.id,
        distance: schedule.route.distance,
        estimatedDuration: schedule.route.estimatedDuration,
        basePrice: schedule.route.basePrice,
        departurePort: schedule.route.departurePort,
        arrivalPort: schedule.route.arrivalPort,
      },
      ship: schedule.ship,
    }));

    // Also fetch alternative dates if no schedules found
    let alternatives: { date: string; count: number }[] = [];
    
    if (results.length === 0) {
      // Find next available dates
      const nextSchedules = await prisma.schedule.groupBy({
        by: ["departureTime"],
        where: {
          route: {
            departurePortId,
            arrivalPortId,
            status: "ACTIVE",
          },
          status: "SCHEDULED",
          departureTime: { gte: now },
          availableSeats: { gte: passengers },
          ship: { status: "ACTIVE" },
        },
        _count: true,
        orderBy: { departureTime: "asc" },
        take: 5,
      });

      alternatives = nextSchedules.map((s) => ({
        date: s.departureTime.toISOString().split("T")[0],
        count: s._count,
      }));
    }

    return successResponse({
      schedules: results,
      searchParams: {
        departurePortId,
        arrivalPortId,
        departureDate,
        passengers,
      },
      totalResults: results.length,
      alternatives: results.length === 0 ? alternatives : undefined,
    });
  } catch (error) {
    return handleApiError(error, "SEARCH_SCHEDULES");
  }
}

/**
 * Format price in IDR
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(
  departure: Date,
  arrival: Date
): { hours: number; minutes: number; formatted: string } {
  const diffMs = arrival.getTime() - departure.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  let formatted = "";
  if (hours > 0) {
    formatted += `${hours}h `;
  }
  if (minutes > 0 || hours === 0) {
    formatted += `${minutes}m`;
  }

  return { hours, minutes, formatted: formatted.trim() };
}
