import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuthUser,
  requireAdmin,
  validateRequest,
  NotFoundError,
  AuthError,
  ConflictError,
} from "@/lib/api-utils";
import { updateBookingStatusSchema } from "@/validations/booking";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]
 * Get single booking with all relations
 * USER can only access own bookings
 * ADMIN/OPERATOR can access all
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true,
                arrivalPort: true,
              },
            },
            ship: true,
          },
        },
        passengers: {
          include: {
            ticket: {
              select: {
                id: true,
                ticketCode: true,
                qrData: true,
                status: true,
                checkedInAt: true,
              },
            },
          },
        },
        payment: true,
        tickets: {
          include: {
            passenger: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Check authorization: user can only access own bookings
    const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
    if (!isAdminOrOperator && booking.userId !== user.id) {
      throw new AuthError("You don't have permission to view this booking");
    }

    return successResponse(booking);
  } catch (error) {
    return handleApiError(error, "GET_BOOKING");
  }
}

/**
 * PUT /api/bookings/[id]
 * Update a booking (mainly for admin status changes)
 * Requires ADMIN role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        schedule: { select: { id: true } },
      },
    });

    if (!existingBooking) {
      throw new NotFoundError("Booking");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(updateBookingStatusSchema, body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.errors);
    }

    const { status, cancellationReason } = validation.data;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
      CONFIRMED: ["CANCELLED", "COMPLETED", "REFUNDED"],
      CANCELLED: ["REFUNDED"],
      COMPLETED: ["REFUNDED"],
      EXPIRED: [], // Cannot transition from expired
      REFUNDED: [], // Cannot transition from refunded
    };

    if (!validTransitions[existingBooking.status]?.includes(status)) {
      throw new ConflictError(
        `Cannot change booking status from ${existingBooking.status} to ${status}`
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };

    if (status === "CONFIRMED" && !existingBooking.confirmedAt) {
      updateData.confirmedAt = new Date();
    }

    if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        schedule: {
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
              select: { id: true, name: true, code: true },
            },
          },
        },
        passengers: true,
        payment: {
          select: { id: true, status: true, amount: true },
        },
      },
    });

    return successResponse(booking, "Booking updated successfully");
  } catch (error) {
    return handleApiError(error, "UPDATE_BOOKING");
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel/delete a booking
 * - User can delete own PENDING booking
 * - Admin can delete any booking
 * Restores availableSeats to schedule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        schedule: { select: { id: true, departureTime: true } },
        _count: { select: { tickets: true } },
      },
    });

    if (!existingBooking) {
      throw new NotFoundError("Booking");
    }

    // Check authorization
    const isAdmin = user.role === "ADMIN";
    const isOwner = existingBooking.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new AuthError("You don't have permission to delete this booking");
    }

    // Non-admin can only delete PENDING bookings
    if (!isAdmin && existingBooking.status !== "PENDING") {
      throw new ConflictError(
        "You can only cancel pending bookings. Please contact support for other cases."
      );
    }

    // Check if booking can be cancelled (has tickets issued = CONFIRMED)
    if (existingBooking._count.tickets > 0 && !isAdmin) {
      throw new ConflictError(
        "Cannot delete booking with issued tickets. Please use the cancel endpoint instead."
      );
    }

    // Use transaction to restore seats
    await prisma.$transaction(async (tx) => {
      // Update booking status to CANCELLED
      await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: "Deleted by " + (isAdmin ? "admin" : "user"),
        },
      });

      // Restore seats to schedule (only for PENDING/CONFIRMED bookings)
      if (["PENDING", "CONFIRMED"].includes(existingBooking.status)) {
        await tx.schedule.update({
          where: { id: existingBooking.scheduleId },
          data: {
            availableSeats: { increment: existingBooking.totalPassengers },
          },
        });
      }
    });

    return successResponse(null, "Booking cancelled successfully");
  } catch (error) {
    return handleApiError(error, "DELETE_BOOKING");
  }
}
