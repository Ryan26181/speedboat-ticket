import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api-utils";
import { validateTicket } from "@/lib/ticket-service";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/tickets/[code]/validate
 * Validate ticket without check-in
 * For operators to preview ticket details before confirming check-in
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const result = await validateTicket(code);

    if (!result.valid) {
      return successResponse({
        valid: false,
        error: result.error,
        ticket: result.ticket
          ? {
              id: result.ticket.id,
              ticketCode: result.ticket.ticketCode,
              status: result.ticket.status,
              checkedInAt: result.ticket.checkedInAt,
              passenger: {
                name: result.ticket.passenger.name,
                identityType: result.ticket.passenger.identityType,
                identityNumber: result.ticket.passenger.identityNumber,
                seatNumber: result.ticket.passenger.seatNumber,
              },
              booking: {
                bookingCode: result.ticket.booking.bookingCode,
                status: result.ticket.booking.status,
              },
              schedule: {
                departureTime: result.ticket.booking.schedule.departureTime,
                arrivalTime: result.ticket.booking.schedule.arrivalTime,
                status: result.ticket.booking.schedule.status,
                route: {
                  departurePort: {
                    name: result.ticket.booking.schedule.route.departurePort.name,
                    city: result.ticket.booking.schedule.route.departurePort.city,
                  },
                  arrivalPort: {
                    name: result.ticket.booking.schedule.route.arrivalPort.name,
                    city: result.ticket.booking.schedule.route.arrivalPort.city,
                  },
                },
                ship: {
                  name: result.ticket.booking.schedule.ship.name,
                  code: result.ticket.booking.schedule.ship.code,
                },
              },
            }
          : null,
      });
    }

    // Return validated ticket details
    const ticket = result.ticket!;

    return successResponse({
      valid: true,
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: ticket.status,
        qrDataURL: result.qrDataURL,
        passenger: {
          id: ticket.passenger.id,
          name: ticket.passenger.name,
          identityType: ticket.passenger.identityType,
          identityNumber: ticket.passenger.identityNumber,
          seatNumber: ticket.passenger.seatNumber,
          phone: ticket.passenger.phone,
        },
        booking: {
          id: ticket.booking.id,
          bookingCode: ticket.booking.bookingCode,
          status: ticket.booking.status,
          totalPassengers: ticket.booking.totalPassengers,
        },
        schedule: {
          id: ticket.booking.schedule.id,
          departureTime: ticket.booking.schedule.departureTime,
          arrivalTime: ticket.booking.schedule.arrivalTime,
          status: ticket.booking.schedule.status,
          route: {
            departurePort: {
              id: ticket.booking.schedule.route.departurePort.id,
              name: ticket.booking.schedule.route.departurePort.name,
              code: ticket.booking.schedule.route.departurePort.code,
              city: ticket.booking.schedule.route.departurePort.city,
              address: ticket.booking.schedule.route.departurePort.address,
            },
            arrivalPort: {
              id: ticket.booking.schedule.route.arrivalPort.id,
              name: ticket.booking.schedule.route.arrivalPort.name,
              code: ticket.booking.schedule.route.arrivalPort.code,
              city: ticket.booking.schedule.route.arrivalPort.city,
              address: ticket.booking.schedule.route.arrivalPort.address,
            },
            distance: ticket.booking.schedule.route.distance,
            estimatedDuration: ticket.booking.schedule.route.estimatedDuration,
          },
          ship: {
            id: ticket.booking.schedule.ship.id,
            name: ticket.booking.schedule.ship.name,
            code: ticket.booking.schedule.ship.code,
            facilities: ticket.booking.schedule.ship.facilities,
          },
        },
      },
      message: "Ticket is valid and ready for check-in",
    });
  } catch (error) {
    return handleApiError(error, "VALIDATE_TICKET");
  }
}
