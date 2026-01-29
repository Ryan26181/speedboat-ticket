import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError } from "@/lib/api-utils";
import { PaymentStatus, ScheduleStatus } from "@prisma/client";

// Type for schedule with nested relations
interface ScheduleWithBookings {
  id: string;
  totalSeats: number;
  availableSeats: number;
  status: ScheduleStatus;
  bookings: Array<{
    id: string;
    totalAmount: number;
    totalPassengers: number;
  }>;
}

// GET /api/admin/reports/routes - Get route performance report
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

    // Get routes with schedule and booking data
    const routes = await prisma.route.findMany({
      select: {
        id: true,
        departurePort: { select: { name: true, code: true } },
        arrivalPort: { select: { name: true, code: true } },
        distance: true,
        estimatedDuration: true,
        basePrice: true,
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

    // Process route data
    const routeData = routes.map((route) => {
      const schedules = route.schedules as ScheduleWithBookings[];
      const totalSchedules = schedules.length;
      const completedSchedules = schedules.filter(
        (s) => s.status === ScheduleStatus.ARRIVED || s.status === ScheduleStatus.DEPARTED
      ).length;

      let totalBookings = 0;
      let totalRevenue = 0;
      let totalPassengers = 0;
      let totalSeats = 0;
      let bookedSeats = 0;

      schedules.forEach((schedule) => {
        totalSeats += schedule.totalSeats;
        bookedSeats += schedule.totalSeats - schedule.availableSeats;

        schedule.bookings.forEach((booking) => {
          totalBookings += 1;
          totalRevenue += booking.totalAmount;
          totalPassengers += booking.totalPassengers;
        });
      });

      const occupancyRate = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
      const averageRevenuePerSchedule = totalSchedules > 0 ? totalRevenue / totalSchedules : 0;

      return {
        id: route.id,
        name: `${route.departurePort.name} → ${route.arrivalPort.name}`,
        code: `${route.departurePort.code} → ${route.arrivalPort.code}`,
        distance: route.distance,
        duration: route.estimatedDuration,
        basePrice: route.basePrice,
        status: route.status,
        totalSchedules,
        completedSchedules,
        totalBookings,
        totalRevenue,
        totalPassengers,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averageRevenuePerSchedule: Math.round(averageRevenuePerSchedule),
      };
    });

    // Sort by revenue
    routeData.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Summary
    const summary = {
      totalRoutes: routes.length,
      activeRoutes: routes.filter((r) => r.status === "ACTIVE").length,
      totalRevenue: routeData.reduce((sum, r) => sum + r.totalRevenue, 0),
      totalBookings: routeData.reduce((sum, r) => sum + r.totalBookings, 0),
      averageOccupancy:
        routeData.length > 0
          ? routeData.reduce((sum, r) => sum + r.occupancyRate, 0) / routeData.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        routes: routeData,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch routes report");
  }
}
