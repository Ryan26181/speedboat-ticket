import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, successResponse } from "@/lib/api-utils";

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    // Get date boundaries
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Execute all queries in parallel using $transaction
    const [
      totalBookings,
      todayBookings,
      thisMonthRevenue,
      lastMonthRevenue,
      activeSchedules,
      pendingPayments,
      totalUsers,
      totalShips,
      totalRoutes,
      bookingsLast7DaysRaw,
      recentBookings,
    ] = await prisma.$transaction([
      // Total bookings (all time)
      prisma.booking.count(),

      // Today's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfToday,
          },
        },
      }),

      // This month's revenue (successful payments)
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          paidAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Last month's revenue for comparison
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          paidAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Active schedules (scheduled or boarding)
      prisma.schedule.count({
        where: {
          status: {
            in: ["SCHEDULED", "BOARDING"],
          },
          departureTime: {
            gte: now,
          },
        },
      }),

      // Pending payments
      prisma.payment.count({
        where: {
          status: "PENDING",
        },
      }),

      // Total users
      prisma.user.count(),

      // Total ships
      prisma.ship.count(),

      // Total routes
      prisma.route.count(),

      // Bookings per day (last 7 days) - get raw bookings for client-side aggregation
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        select: {
          createdAt: true,
        },
      }),

      // Recent bookings (last 10)
      prisma.booking.findMany({
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          schedule: {
            include: {
              route: {
                include: {
                  departurePort: true,
                  arrivalPort: true,
                },
              },
            },
          },
          payment: {
            select: {
              status: true,
            },
          },
        },
      }),
    ]);

    // Process bookings per day for chart
    const dailyBookingsMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyBookingsMap.set(dateKey, 0);
    }

    bookingsLast7DaysRaw.forEach((b) => {
      const dateKey = new Date(b.createdAt).toISOString().split("T")[0];
      dailyBookingsMap.set(dateKey, (dailyBookingsMap.get(dateKey) || 0) + 1);
    });

    const dailyBookings = Array.from(dailyBookingsMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Get daily revenue for chart (need separate query)
    const dailyRevenueData = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        paidAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        paidAt: true,
        amount: true,
      },
    });

    const dailyRevenueMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyRevenueMap.set(dateKey, 0);
    }

    dailyRevenueData.forEach((p) => {
      if (p.paidAt) {
        const dateKey = p.paidAt.toISOString().split("T")[0];
        dailyRevenueMap.set(dateKey, (dailyRevenueMap.get(dateKey) || 0) + p.amount);
      }
    });

    const dailyRevenue = Array.from(dailyRevenueMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    // Calculate revenue change percentage
    const thisMonthRevenueTotal = thisMonthRevenue._sum.amount || 0;
    const lastMonthRevenueTotal = lastMonthRevenue._sum.amount || 0;
    const revenueChange =
      lastMonthRevenueTotal > 0
        ? ((thisMonthRevenueTotal - lastMonthRevenueTotal) / lastMonthRevenueTotal) * 100
        : 0;

    const stats = {
      summary: {
        totalBookings,
        todayBookings,
        thisMonthRevenue: thisMonthRevenueTotal,
        lastMonthRevenue: lastMonthRevenueTotal,
        revenueChange: Math.round(revenueChange * 10) / 10,
        activeSchedules,
        pendingPayments,
        totalUsers,
        totalShips,
        totalRoutes,
      },
      charts: {
        dailyBookings,
        dailyRevenue,
      },
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        bookingCode: booking.bookingCode,
        user: booking.user,
        route: booking.schedule
          ? `${booking.schedule.route.departurePort.code} → ${booking.schedule.route.arrivalPort.code}`
          : "N/A",
        departureTime: booking.schedule?.departureTime,
        passengers: booking.totalPassengers,
        amount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.payment?.status || "N/A",
        createdAt: booking.createdAt,
      })),
    };

    return successResponse(stats, "Stats retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/admin/stats");
  }
}
