import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError } from "@/lib/api-utils";
import { PaymentStatus, ScheduleStatus } from "@prisma/client";

// Type for schedule with nested relations
interface ScheduleWithRelations {
  id: string;
  totalSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
  departureTime: Date;
  arrivalTime: Date;
  route: {
    departurePort: { code: string };
    arrivalPort: { code: string };
  };
  bookings: Array<{
    id: string;
    totalAmount: number;
    totalPassengers: number;
  }>;
}

// GET /api/admin/reports/ships - Get ship utilization report
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Default to last 30 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get ships with schedule data
    const ships = await prisma.ship.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        capacity: true,
        status: true,
        schedules: {
          where: {
            departureTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            totalSeats: true,
            availableSeats: true,
            status: true,
            departureTime: true,
            arrivalTime: true,
            route: {
              select: {
                departurePort: { select: { code: true } },
                arrivalPort: { select: { code: true } },
              },
            },
            bookings: {
              where: {
                payment: {
                  status: PaymentStatus.SUCCESS,
                },
              },
              select: {
                id: true,
                totalAmount: true,
                totalPassengers: true,
              },
            },
          },
        },
      },
    });

    // Process ship data
    const shipData = ships.map((ship) => {
      const schedules = ship.schedules as ScheduleWithRelations[];
      const totalTrips = schedules.length;
      const completedTrips = schedules.filter(
        (s) => s.status === ScheduleStatus.ARRIVED
      ).length;
      const cancelledTrips = schedules.filter(
        (s) => s.status === ScheduleStatus.CANCELLED
      ).length;

      let totalRevenue = 0;
      let totalPassengers = 0;
      let totalSeats = 0;
      let bookedSeats = 0;
      let totalOperatingMinutes = 0;

      schedules.forEach((schedule) => {
        totalSeats += schedule.totalSeats;
        bookedSeats += schedule.totalSeats - schedule.availableSeats;

        // Calculate operating time
        const departure = new Date(schedule.departureTime);
        const arrival = new Date(schedule.arrivalTime);
        totalOperatingMinutes += (arrival.getTime() - departure.getTime()) / (1000 * 60);

        schedule.bookings.forEach((booking) => {
          totalRevenue += booking.totalAmount;
          totalPassengers += booking.totalPassengers;
        });
      });

      const occupancyRate = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
      const totalOperatingHours = Math.round(totalOperatingMinutes / 60);
      const revenuePerHour = totalOperatingHours > 0 ? totalRevenue / totalOperatingHours : 0;

      // Most popular routes for this ship
      type RouteCountItem = { route: string; count: number };
      const routeCounts = new Map<string, RouteCountItem>();
      schedules.forEach((schedule) => {
        const route = `${schedule.route.departurePort.code} → ${schedule.route.arrivalPort.code}`;
        const existing = routeCounts.get(route) || { route, count: 0 };
        existing.count += 1;
        routeCounts.set(route, existing);
      });

      const topRoutes = Array.from(routeCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        id: ship.id,
        name: ship.name,
        code: ship.code,
        capacity: ship.capacity,
        status: ship.status,
        totalTrips,
        completedTrips,
        cancelledTrips,
        totalRevenue,
        totalPassengers,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalOperatingHours,
        revenuePerHour: Math.round(revenuePerHour),
        topRoutes,
      };
    });

    // Sort by revenue
    shipData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Summary
    const summary = {
      totalShips: ships.length,
      activeShips: ships.filter((s) => s.status === "ACTIVE").length,
      totalRevenue: shipData.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalTrips: shipData.reduce((sum, s) => sum + s.totalTrips, 0),
      averageOccupancy:
        shipData.length > 0
          ? shipData.reduce((sum, s) => sum + s.occupancyRate, 0) / shipData.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        ships: shipData,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch ships report");
  }
}
