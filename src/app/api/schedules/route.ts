import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  paginatedResponse,
  handleApiError,
  requireAdmin,
  validateRequest,
  parsePaginationParams,
  parseStatusParam,
  ConflictError,
  NotFoundError,
} from "@/lib/api-utils";
import { createScheduleSchema } from "@/validations/schedule";
import type { ScheduleStatus } from "@prisma/client";

const VALID_STATUSES: ScheduleStatus[] = ["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED"];

/**
 * GET /api/schedules
 * Get paginated list of schedules with full relations
 * Public access (but filters by SCHEDULED status for public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);
    const status = parseStatusParam(searchParams, VALID_STATUSES);
    const departurePortId = searchParams.get("departurePortId");
    const arrivalPortId = searchParams.get("arrivalPortId");
    const date = searchParams.get("date"); // Format: YYYY-MM-DD
    const showAll = searchParams.get("showAll") === "true"; // Admin flag

    // Build where clause
    const where: Record<string, unknown> = {};

    // Status filter - default to SCHEDULED for public
    if (status) {
      where.status = status;
    } else if (!showAll) {
      where.status = "SCHEDULED";
    }

    // Port filters via route relation
    if (departurePortId || arrivalPortId) {
      where.route = {
        ...(departurePortId && { departurePortId }),
        ...(arrivalPortId && { arrivalPortId }),
      };
    }

    // Date filter - show schedules for that day
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.departureTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (!showAll) {
      // By default, only show future schedules for public
      where.departureTime = { gte: new Date() };
    }

    // If limit is -1, return all schedules
    if (limit === -1) {
      const schedules = await prisma.schedule.findMany({
        where,
        orderBy: { departureTime: "asc" },
        include: {
          route: {
            include: {
              departurePort: {
                select: { id: true, name: true, code: true, city: true },
              },
              arrivalPort: {
                select: { id: true, name: true, code: true, city: true },
              },
            },
          },
          ship: {
            select: { id: true, name: true, code: true, capacity: true, facilities: true, imageUrl: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      });

      return successResponse(schedules);
    }

    // Get paginated schedules
    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureTime: "asc" },
        include: {
          route: {
            include: {
              departurePort: {
                select: { id: true, name: true, code: true, city: true },
              },
              arrivalPort: {
                select: { id: true, name: true, code: true, city: true },
              },
            },
          },
          ship: {
            select: { id: true, name: true, code: true, capacity: true, facilities: true, imageUrl: true },
          },
          _count: {
            select: { bookings: true },
          },
        },
      }),
      prisma.schedule.count({ where }),
    ]);

    return paginatedResponse(schedules, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET_SCHEDULES");
  }
}

/**
 * POST /api/schedules
 * Create a new schedule
 * Requires ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    await requireAdmin();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createScheduleSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_SCHEDULE"
      );
    }

    const { routeId, shipId, departureTime, arrivalTime, price, totalSeats, status } = validation.data;

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        departurePort: { select: { name: true } },
        arrivalPort: { select: { name: true } },
      },
    });

    if (!route) {
      throw new NotFoundError("Route");
    }

    if (route.status !== "ACTIVE") {
      throw new ConflictError("Cannot create schedule for inactive route");
    }

    // Check if ship exists and get capacity
    const ship = await prisma.ship.findUnique({
      where: { id: shipId },
    });

    if (!ship) {
      throw new NotFoundError("Ship");
    }

    if (ship.status !== "ACTIVE") {
      throw new ConflictError("Cannot create schedule with inactive ship");
    }

    // Validate totalSeats doesn't exceed ship capacity
    if (totalSeats > ship.capacity) {
      throw new ConflictError(
        `Total seats (${totalSeats}) cannot exceed ship capacity (${ship.capacity})`
      );
    }

    // Check for overlapping schedules for the same ship
    const departureDate = new Date(departureTime);
    const arrivalDate = new Date(arrivalTime);

    const overlappingSchedule = await prisma.schedule.findFirst({
      where: {
        shipId,
        status: { in: ["SCHEDULED", "BOARDING"] },
        OR: [
          {
            // New schedule starts during existing schedule
            departureTime: { lte: departureDate },
            arrivalTime: { gte: departureDate },
          },
          {
            // New schedule ends during existing schedule
            departureTime: { lte: arrivalDate },
            arrivalTime: { gte: arrivalDate },
          },
          {
            // New schedule contains existing schedule
            departureTime: { gte: departureDate },
            arrivalTime: { lte: arrivalDate },
          },
        ],
      },
    });

    if (overlappingSchedule) {
      throw new ConflictError(
        `Ship ${ship.name} already has a schedule during this time period`
      );
    }

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        routeId,
        shipId,
        departureTime: departureDate,
        arrivalTime: arrivalDate,
        price,
        totalSeats,
        availableSeats: totalSeats, // Initially all seats available
        status: status || "SCHEDULED",
      },
      include: {
        route: {
          include: {
            departurePort: {
              select: { id: true, name: true, code: true, city: true },
            },
            arrivalPort: {
              select: { id: true, name: true, code: true, city: true },
            },
          },
        },
        ship: {
          select: { id: true, name: true, code: true, capacity: true, facilities: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return successResponse(schedule, "Schedule created successfully", 201);
  } catch (error) {
    return handleApiError(error, "CREATE_SCHEDULE");
  }
}
