import { NextRequest } from "next/server";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  AuthError,
} from "@/lib/api-utils";
import { checkInTicket } from "@/lib/ticket-service";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * POST /api/tickets/[code]/checkin
 * Check-in a ticket
 * Requires OPERATOR or ADMIN role
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require operator or admin
    const user = await requireAuthUser();

    if (user.role !== "OPERATOR" && user.role !== "ADMIN") {
      throw new AuthError("Only operators and admins can check-in tickets");
    }

    const { code } = await params;

    const result = await checkInTicket(code, user.id);

    if (!result.valid) {
      return successResponse({
        success: false,
        error: result.error,
        ticket: result.ticket
          ? {
              id: result.ticket.id,
              ticketCode: result.ticket.ticketCode,
              status: result.ticket.status,
              checkedInAt: result.ticket.checkedInAt,
              passenger: {
                name: result.ticket.passenger.name,
                seatNumber: result.ticket.passenger.seatNumber,
              },
            }
          : null,
      });
    }

    const ticket = result.ticket!;

    return successResponse(
      {
        success: true,
        checkedIn: true,
        ticket: {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          checkedInAt: ticket.checkedInAt,
          passenger: {
            id: ticket.passenger.id,
            name: ticket.passenger.name,
            identityType: ticket.passenger.identityType,
            identityNumber: ticket.passenger.identityNumber,
            seatNumber: ticket.passenger.seatNumber,
          },
          booking: {
            id: ticket.booking.id,
            bookingCode: ticket.booking.bookingCode,
          },
          schedule: {
            departureTime: ticket.booking.schedule.departureTime,
            route: {
              departurePort: {
                name: ticket.booking.schedule.route.departurePort.name,
              },
              arrivalPort: {
                name: ticket.booking.schedule.route.arrivalPort.name,
              },
            },
            ship: {
              name: ticket.booking.schedule.ship.name,
            },
          },
        },
      },
      `Check-in successful for ${ticket.passenger.name}`
    );
  } catch (error) {
    return handleApiError(error, "CHECKIN_TICKET");
  }
}
