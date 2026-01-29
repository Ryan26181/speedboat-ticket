import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  NotFoundError,
  AuthError,
  ConflictError,
} from "@/lib/api-utils";
import {
  generateTicketCode,
  generateQRData,
} from "@/lib/booking-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/confirm
 * Confirm a booking after successful payment
 * - Changes status PENDING → CONFIRMED
 * - Generates tickets for each passenger
 * 
 * Usually called by:
 * 1. Payment webhook after successful payment
 * 2. Admin manually confirming a booking
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Only admin/operator or system (webhook) can confirm
    // For webhook, we'd use a different auth mechanism (API key)
    const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
    
    // Get booking with relations
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        passengers: true,
        schedule: {
          select: {
            id: true,
            status: true,
            departureTime: true,
          },
        },
        tickets: true,
        payment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Check authorization
    // Allow owner to confirm if they have a valid payment (for testing/manual flow)
    const isOwner = booking.userId === user.id;
    const hasValidPayment = booking.payment?.status === "SUCCESS";

    if (!isAdminOrOperator && !(isOwner && hasValidPayment)) {
      throw new AuthError("You don't have permission to confirm this booking");
    }

    // Validate booking can be confirmed
    if (booking.status !== "PENDING") {
      if (booking.status === "CONFIRMED") {
        // Already confirmed, return success with existing data
        const existingBooking = await getFullBooking(id);
        return successResponse(existingBooking, "Booking is already confirmed");
      }
      throw new ConflictError(
        `Cannot confirm booking with status: ${booking.status}`
      );
    }

    // Check if booking has expired
    if (new Date() > booking.expiresAt) {
      throw new ConflictError(
        "Booking has expired. Please create a new booking."
      );
    }

    // Check if tickets already exist (shouldn't happen, but safety check)
    if (booking.tickets.length > 0) {
      throw new ConflictError("Tickets have already been generated for this booking");
    }

    // Use transaction to confirm booking and generate tickets
    await prisma.$transaction(async (tx) => {
      // 1. Update booking status to CONFIRMED
      await tx.booking.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      // 2. Generate tickets for each passenger
      const ticketData = await Promise.all(
        booking.passengers.map(async (passenger, index) => {
          // Generate unique ticket code with retry
          let ticketCode = generateTicketCode();
          let attempts = 0;
          const maxAttempts = 5;

          while (attempts < maxAttempts) {
            const existing = await tx.ticket.findUnique({
              where: { ticketCode },
              select: { id: true },
            });

            if (!existing) break;

            ticketCode = generateTicketCode();
            attempts++;
          }

          if (attempts >= maxAttempts) {
            throw new Error("Failed to generate unique ticket code");
          }

          // Generate QR data
          const qrData = generateQRData(
            ticketCode,
            booking.bookingCode,
            passenger.name,
            booking.scheduleId
          );

          // Assign seat number (simple sequential for now)
          const seatNumber = `${String.fromCharCode(65 + Math.floor(index / 10))}${(index % 10) + 1}`;

          return {
            bookingId: booking.id,
            passengerId: passenger.id,
            ticketCode,
            qrData,
            status: "VALID" as const,
          };
        })
      );

      // 3. Create all tickets
      await tx.ticket.createMany({
        data: ticketData,
      });

      // 4. Update passengers with seat numbers
      for (let i = 0; i < booking.passengers.length; i++) {
        const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;
        await tx.passenger.update({
          where: { id: booking.passengers[i].id },
          data: { seatNumber },
        });
      }
    });

    // Fetch full booking with all relations
    const fullBooking = await getFullBooking(id);

    // TODO: Send confirmation email with tickets
    // await sendConfirmationEmail(fullBooking);

    return successResponse(
      fullBooking,
      "Booking confirmed successfully. Tickets have been generated."
    );
  } catch (error) {
    return handleApiError(error, "CONFIRM_BOOKING");
  }
}

/**
 * Helper to get full booking with all relations
 */
async function getFullBooking(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
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
          ticket: true,
        },
      },
      payment: true,
      tickets: {
        include: {
          passenger: {
            select: { id: true, name: true, seatNumber: true },
          },
        },
      },
    },
  });
}
