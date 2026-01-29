import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAdmin,
  validateRequest,
  NotFoundError,
  ConflictError,
} from "@/lib/api-utils";
import { updateScheduleSchema } from "@/validations/schedule";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/schedules/[id]
 * Get single schedule by ID with all relations
 * Public access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        route: {
          include: {
            departurePort: true,
            arrivalPort: true,
          },
        },
        ship: true,
        _count: {
          select: {
            bookings: true,
          },
        },
        bookings: {
          where: {
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: {
            id: true,
            bookingCode: true,
            status: true,
            totalPassengers: true,
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundError("Schedule");
    }

    return successResponse(schedule);
  } catch (error) {
    return handleApiError(error, "GET_SCHEDULE");
  }
}

/**
 * PUT /api/schedules/[id]
 * Update a schedule
 * Requires ADMIN role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        ship: { select: { capacity: true } },
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ["CONFIRMED", "PENDING"] },
              },
            },
          },
        },
      },
    });

    if (!existingSchedule) {
      throw new NotFoundError("Schedule");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(updateScheduleSchema, body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.errors);
    }

    const { departureTime, arrivalTime, price, totalSeats, availableSeats, status } = validation.data;

    // Validate totalSeats doesn't exceed ship capacity
    if (totalSeats !== undefined && totalSeats > existingSchedule.ship.capacity) {
      throw new ConflictError(
        `Total seats cannot exceed ship capacity (${existingSchedule.ship.capacity})`
      );
    }

    // Check if reducing total seats would affect existing bookings
    if (totalSeats !== undefined && totalSeats < existingSchedule.totalSeats) {
      const bookedSeats = existingSchedule.totalSeats - existingSchedule.availableSeats;
      if (totalSeats < bookedSeats) {
        throw new ConflictError(
          `Cannot reduce total seats below ${bookedSeats} (already booked seats)`
        );
      }
    }

    // Validate availableSeats
    if (availableSeats !== undefined) {
      const maxAvailable = totalSeats ?? existingSchedule.totalSeats;
      if (availableSeats > maxAvailable) {
        throw new ConflictError(
          `Available seats cannot exceed total seats (${maxAvailable})`
        );
      }
    }

    // Validate time changes if provided
    const newDepartureTime = departureTime ? new Date(departureTime) : existingSchedule.departureTime;
    const newArrivalTime = arrivalTime ? new Date(arrivalTime) : existingSchedule.arrivalTime;

    if (newArrivalTime <= newDepartureTime) {
      throw new ConflictError("Arrival time must be after departure time");
    }

    // Calculate new available seats if totalSeats changed
    let newAvailableSeats = availableSeats;
    if (totalSeats !== undefined && availableSeats === undefined) {
      const bookedSeats = existingSchedule.totalSeats - existingSchedule.availableSeats;
      newAvailableSeats = totalSeats - bookedSeats;
    }

    // Update schedule
    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...(departureTime !== undefined && { departureTime: new Date(departureTime) }),
        ...(arrivalTime !== undefined && { arrivalTime: new Date(arrivalTime) }),
        ...(price !== undefined && { price }),
        ...(totalSeats !== undefined && { totalSeats }),
        ...(newAvailableSeats !== undefined && { availableSeats: newAvailableSeats }),
        ...(status !== undefined && { status }),
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
          select: { id: true, name: true, code: true, capacity: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    return successResponse(schedule, "Schedule updated successfully");
  } catch (error) {
    return handleApiError(error, "UPDATE_SCHEDULE");
  }
}

/**
 * DELETE /api/schedules/[id]
 * Delete a schedule
 * Requires ADMIN role
 * Cannot delete if has any bookings
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if schedule exists and has bookings
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!existingSchedule) {
      throw new NotFoundError("Schedule");
    }

    // Check for existing bookings
    if (existingSchedule._count.bookings > 0) {
      throw new ConflictError(
        `Cannot delete schedule with ${existingSchedule._count.bookings} booking(s). Please cancel all bookings first.`
      );
    }

    // Delete schedule
    await prisma.schedule.delete({
      where: { id },
    });

    return successResponse(null, "Schedule deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE_SCHEDULE");
  }
}
