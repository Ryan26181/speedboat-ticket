import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperator, handleApiError, successResponse, errorResponse } from "@/lib/api-utils";
import { Passenger, Ticket, Booking, BookingStatus } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Type for passenger with ticket relation
type PassengerWithTicket = Passenger & {
  ticket: Ticket | null;
};

// Type for booking with passengers
type BookingWithPassengers = Booking & {
  passengers: PassengerWithTicket[];
};

// GET /api/schedules/[id]/manifest - Get passenger manifest for a schedule
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Require OPERATOR or ADMIN role
    await requireOperator();

    const { id: scheduleId } = await context.params;

    // Get schedule with all tickets and passengers
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        route: {
          include: {
            departurePort: true,
            arrivalPort: true,
          },
        },
        ship: true,
      },
    });

    if (!schedule) {
      return errorResponse("Schedule not found", 404);
    }

    // Get all confirmed bookings with passengers and tickets for this schedule
    const bookings = await prisma.booking.findMany({
      where: {
        scheduleId,
        status: {
          in: ["CONFIRMED", "COMPLETED"] as BookingStatus[],
        },
      },
      include: {
        passengers: {
          include: {
            ticket: true,
          },
        },
      },
    }) as BookingWithPassengers[];

    // Flatten passengers from all bookings
    const passengers = bookings.flatMap((booking: BookingWithPassengers) =>
      booking.passengers.map((passenger: PassengerWithTicket) => ({
        id: passenger.id,
        name: passenger.name,
        identityType: passenger.identityType,
        identityNumber: passenger.identityNumber,
        phone: passenger.phone,
        seatNumber: passenger.seatNumber,
        ticket: passenger.ticket
          ? {
              id: passenger.ticket.id,
              ticketCode: passenger.ticket.ticketCode,
              status: passenger.ticket.status,
              checkedInAt: passenger.ticket.checkedInAt,
            }
          : null,
        booking: {
          bookingCode: booking.bookingCode,
          status: booking.status,
        },
      }))
    );

    // Sort by name
    passengers.sort((a, b) => a.name.localeCompare(b.name));

    // Calculate summary
    const total = passengers.length;
    const checkedIn = passengers.filter((p) => p.ticket?.status === "USED").length;
    const notCheckedIn = total - checkedIn;

    const manifestData = {
      schedule: {
        id: schedule.id,
        departureTime: schedule.departureTime,
        arrivalTime: schedule.arrivalTime,
        status: schedule.status,
        totalSeats: schedule.ship.capacity,
        availableSeats: schedule.availableSeats,
        route: {
          departurePort: {
            name: schedule.route.departurePort.name,
            code: schedule.route.departurePort.code,
          },
          arrivalPort: {
            name: schedule.route.arrivalPort.name,
            code: schedule.route.arrivalPort.code,
          },
        },
        ship: {
          name: schedule.ship.name,
          code: schedule.ship.code,
        },
      },
      passengers,
      summary: {
        total,
        checkedIn,
        notCheckedIn,
      },
    };

    return successResponse(manifestData, "Manifest retrieved successfully");
  } catch (error) {
    return handleApiError(error, "GET /api/schedules/[id]/manifest");
  }
}
