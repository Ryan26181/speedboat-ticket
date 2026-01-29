import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  NotFoundError,
} from "@/lib/api-utils";
import { generateQRDataURL, createTicketQRData } from "@/lib/qr-generator";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/tickets/[code]
 * Get ticket by ticketCode
 * Public access (for scanning)
 * Returns ticket with booking and schedule details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            identityType: true,
            identityNumber: true,
            seatNumber: true,
          },
        },
        booking: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            schedule: {
              include: {
                route: {
                  include: {
                    departurePort: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                        address: true,
                      },
                    },
                    arrivalPort: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                        address: true,
                      },
                    },
                  },
                },
                ship: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    facilities: true,
                  },
                },
              },
            },
          },
        },
        checkedInBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError("Ticket");
    }

    // Generate QR data URL for display
    const qrData = createTicketQRData(
      ticket.ticketCode,
      ticket.booking.bookingCode,
      ticket.passenger.name,
      ticket.booking.scheduleId,
      ticket.booking.schedule.departureTime
    );
    const qrDataURL = await generateQRDataURL(qrData);

    // Format response
    const response = {
      id: ticket.id,
      ticketCode: ticket.ticketCode,
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      checkedInBy: ticket.checkedInBy,
      qrDataURL,
      passenger: ticket.passenger,
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
          departurePort: ticket.booking.schedule.route.departurePort,
          arrivalPort: ticket.booking.schedule.route.arrivalPort,
          distance: ticket.booking.schedule.route.distance,
          estimatedDuration: ticket.booking.schedule.route.estimatedDuration,
        },
        ship: ticket.booking.schedule.ship,
      },
      createdAt: ticket.createdAt,
    };

    return successResponse(response);
  } catch (error) {
    return handleApiError(error, "GET_TICKET");
  }
}
