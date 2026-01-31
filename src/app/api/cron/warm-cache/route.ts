import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleCache, routeCache, portCache, CACHE_TTL } from "@/lib/cache";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/warm-cache
 * Pre-warm caches with frequently accessed data
 * Should be called by a cron job or on deployment
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify cron secret (optional security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

  try {
    // 1. Warm routes cache
    try {
      const routes = await prisma.route.findMany({
        where: { status: "ACTIVE" },
        include: {
          departurePort: { select: { id: true, name: true, code: true, city: true } },
          arrivalPort: { select: { id: true, name: true, code: true, city: true } },
          _count: { select: { schedules: true } },
        },
      });
      
      await routeCache.set("list:default", { data: routes }, CACHE_TTL.EXTENDED);
      await routeCache.set("active", routes, CACHE_TTL.EXTENDED);
      
      results.routes = { success: true, count: routes.length };
    } catch (error) {
      results.routes = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }

    // 2. Warm ports cache
    try {
      const ports = await prisma.port.findMany({
        orderBy: { name: "asc" },
      });
      
      await portCache.set("list", ports, CACHE_TTL.EXTENDED);
      await portCache.set("active", ports, CACHE_TTL.EXTENDED);
      
      results.ports = { success: true, count: ports.length };
    } catch (error) {
      results.ports = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }

    // 3. Warm schedules cache (next 7 days)
    try {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const schedules = await prisma.schedule.findMany({
        where: {
          status: "SCHEDULED",
          departureTime: {
            gte: today,
            lte: nextWeek,
          },
        },
        orderBy: { departureTime: "asc" },
        include: {
          route: {
            include: {
              departurePort: { select: { id: true, name: true, code: true, city: true } },
              arrivalPort: { select: { id: true, name: true, code: true, city: true } },
            },
          },
          ship: { select: { id: true, name: true, code: true, capacity: true, facilities: true, imageUrl: true } },
          _count: { select: { bookings: true } },
        },
      });
      
      await scheduleCache.set("list:default", { data: schedules }, CACHE_TTL.MEDIUM);
      
      // Cache by date
      const schedulesByDate = schedules.reduce((acc, schedule) => {
        const date = schedule.departureTime.toISOString().split("T")[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(schedule);
        return acc;
      }, {} as Record<string, typeof schedules>);
      
      for (const [date, daySchedules] of Object.entries(schedulesByDate)) {
        await scheduleCache.set(`date:${date}`, daySchedules, CACHE_TTL.MEDIUM);
      }
      
      results.schedules = { success: true, count: schedules.length };
    } catch (error) {
      results.schedules = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }

    const duration = Date.now() - startTime;
    
    logger.info("[CACHE_WARM] Cache warming completed", {
      duration,
      results,
    });

    return NextResponse.json({
      success: true,
      message: "Cache warmed successfully",
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    logger.error("[CACHE_WARM] Cache warming failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Cache warming failed",
        results,
      },
      { status: 500 }
    );
  }
}
