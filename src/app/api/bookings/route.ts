import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  paginatedResponse,
  handleApiError,
  requireAuthUser,
  validateRequest,
  parsePaginationParams,
  parseStatusParam,
  ConflictError,
  NotFoundError,
} from "@/lib/api-utils";
import { createBookingSchema } from "@/validations/booking";
import {
  generateBookingCode,
  calculateExpiryTime,
  calculateTotalAmount,
} from "@/lib/booking-utils";
import type { BookingStatus, Prisma } from "@prisma/client";

const VALID_STATUSES: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "REFUNDED",
  "EXPIRED",
];

/**
 * GET /api/bookings
 * For USER: return only their bookings
 * For ADMIN/OPERATOR: return all bookings with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Require authenticated user
    const user = await requireAuthUser();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);
    const status = parseStatusParam(searchParams, VALID_STATUSES);
    const userId = searchParams.get("userId");
    const scheduleId = searchParams.get("scheduleId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const bookingCode = searchParams.get("bookingCode");

    // Build where clause based on user role
    const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";

    const where: Prisma.BookingWhereInput = {
      // Regular users can only see their own bookings
      ...(!isAdminOrOperator && { userId: user.id }),
      // Admin/Operator can filter by userId
      ...(isAdminOrOperator && userId && { userId }),
      ...(status && { status }),
      ...(scheduleId && { scheduleId }),
      ...(bookingCode && {
        bookingCode: { contains: bookingCode, mode: "insensitive" },
      }),
    };

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(`${dateFrom}T00:00:00.000Z`) }),
        ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
      };
    }

    // Include relations
    const include = {
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
            select: { id: true, name: true, code: true, facilities: true, imageUrl: true },
          },
        },
      },
      passengers: {
        select: {
          id: true,
          name: true,
          identityType: true,
          identityNumber: true,
          phone: true,
          seatNumber: true,
        },
      },
      payment: {
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          paymentType: true,
          paymentChannel: true,
          paidAt: true,
        },
      },
      _count: {
        select: { tickets: true },
      },
    };

    // Get paginated bookings
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include,
      }),
      prisma.booking.count({ where }),
    ]);

    return paginatedResponse(bookings, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET_BOOKINGS");
  }
}

/**
 * POST /api/bookings
 * Create a new booking
 * Requires authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Require authenticated user
    const user = await requireAuthUser();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createBookingSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_BOOKING"
      );
    }

    const { scheduleId, passengers } = validation.data;
    const totalPassengers = passengers.length;

    // Use transaction for atomicity
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Verify and lock schedule (using findFirst with forUpdate would be ideal)
      const schedule = await tx.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          route: {
            include: {
              departurePort: { select: { name: true } },
              arrivalPort: { select: { name: true } },
            },
          },
          ship: { select: { name: true, status: true } },
        },
      });

      if (!schedule) {
        throw new NotFoundError("Schedule");
      }

      if (schedule.status !== "SCHEDULED") {
        throw new ConflictError(
          `Schedule is not available for booking (status: ${schedule.status})`
        );
      }

      // Check if schedule is in the past
      if (schedule.departureTime <= new Date()) {
        throw new ConflictError("Cannot book a schedule that has already departed");
      }

      // Check if ship is active
      if (schedule.ship.status !== "ACTIVE") {
        throw new ConflictError("Ship is not available for booking");
      }

      // 2. Check seat availability
      if (schedule.availableSeats < totalPassengers) {
        throw new ConflictError(
          `Not enough seats available. Requested: ${totalPassengers}, Available: ${schedule.availableSeats}`
        );
      }

      // 3. Calculate total amount
      const totalAmount = calculateTotalAmount(schedule.price, totalPassengers);

      // 4. Generate unique booking code (with retry for uniqueness)
      let bookingCode = generateBookingCode();
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const existing = await tx.booking.findUnique({
          where: { bookingCode },
          select: { id: true },
        });

        if (!existing) break;

        bookingCode = generateBookingCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new ConflictError("Failed to generate unique booking code. Please try again.");
      }

      // 5. Create booking
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId: user.id,
          scheduleId,
          totalPassengers,
          totalAmount,
          status: "PENDING",
          expiresAt: calculateExpiryTime(15), // 15 minutes to pay
        },
      });

      // 6. Create passenger records
      await tx.passenger.createMany({
        data: passengers.map((p) => ({
          bookingId: newBooking.id,
          name: p.name,
          identityType: p.identityType,
          identityNumber: p.identityNumber,
          phone: p.phone || null,
        })),
      });

      // 7. Update available seats (atomic decrement)
      await tx.schedule.update({
        where: { id: scheduleId },
        data: {
          availableSeats: { decrement: totalPassengers },
        },
      });

      return newBooking;
    });

    // Fetch full booking with relations for response
    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
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
              select: { id: true, name: true, code: true, facilities: true, imageUrl: true },
            },
          },
        },
        passengers: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return successResponse(
      fullBooking,
      "Booking created successfully. Please complete payment within 15 minutes.",
      201
    );
  } catch (error) {
    return handleApiError(error, "CREATE_BOOKING");
  }
}
