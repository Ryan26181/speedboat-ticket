import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError } from "@/lib/api-utils";
import { PaymentStatus } from "@prisma/client";

// GET /api/admin/reports/sales - Get sales report data
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    // Default to last 30 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get bookings with payments that are paid (via payment relation)
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        payment: {
          status: PaymentStatus.SUCCESS,
        },
      },
      include: {
        schedule: {
          select: {
            route: {
              select: {
                departurePort: { select: { name: true, code: true } },
                arrivalPort: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate by time period
    type SalesDataItem = { date: string; revenue: number; bookings: number; passengers: number };
    const salesByPeriod = new Map<string, SalesDataItem>();

    bookings.forEach((booking) => {
      let key: string;
      const date = new Date(booking.createdAt);

      if (groupBy === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = date.toISOString().split("T")[0];
      }

      const existing = salesByPeriod.get(key) || { date: key, revenue: 0, bookings: 0, passengers: 0 };
      existing.revenue += booking.totalAmount;
      existing.bookings += 1;
      existing.passengers += booking.totalPassengers;
      salesByPeriod.set(key, existing);
    });

    // Summary stats
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalBookings = bookings.length;
    const totalPassengers = bookings.reduce((sum, b) => sum + b.totalPassengers, 0);
    const averageOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Top routes
    type RouteStatsItem = { route: string; revenue: number; bookings: number };
    const routeStats = new Map<string, RouteStatsItem>();
    bookings.forEach((booking) => {
      const route = `${booking.schedule.route.departurePort.code} → ${booking.schedule.route.arrivalPort.code}`;
      const existing = routeStats.get(route) || { route, revenue: 0, bookings: 0 };
      existing.revenue += booking.totalAmount;
      existing.bookings += 1;
      routeStats.set(route, existing);
    });

    const topRoutes = Array.from(routeStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalBookings,
          totalPassengers,
          averageOrderValue,
        },
        chartData: Array.from(salesByPeriod.values()),
        topRoutes,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch sales report");
  }
}
