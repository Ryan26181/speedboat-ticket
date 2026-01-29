import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
  NotFoundError,
  AuthError,
} from "@/lib/api-utils";
import { generateQRDataURL, createTicketQRData } from "@/lib/qr-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]/tickets
 * Get all tickets for a booking with QR data URLs
 * User can access own, admin/operator can access all
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuthUser();
    const { id } = await params;

    // Get booking with tickets
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                identityType: true,
                identityNumber: true,
                phone: true,
                seatNumber: true,
              },
            },
            checkedInBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: {
            passenger: {
              name: "asc",
            },
          },
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
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    // Check authorization
    const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
    if (!isAdminOrOperator && booking.userId !== user.id) {
      throw new AuthError("You don't have permission to view these tickets");
    }

    // Check if booking is confirmed
    if (booking.status !== "CONFIRMED" && booking.status !== "COMPLETED") {
      return successResponse({
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        bookingStatus: booking.status,
        tickets: [],
        message:
          booking.status === "PENDING"
            ? "Tickets will be generated after payment confirmation"
            : `No tickets available for booking with status: ${booking.status}`,
      });
    }

    // Generate QR data URLs for each ticket
    const ticketsWithQR = await Promise.all(
      booking.tickets.map(async (ticket) => {
        const qrData = createTicketQRData(
          ticket.ticketCode,
          booking.bookingCode,
          ticket.passenger.name,
          booking.scheduleId,
          booking.schedule.departureTime
        );

        const qrDataURL = await generateQRDataURL(qrData);

        return {
          id: ticket.id,
          ticketCode: ticket.ticketCode,
          status: ticket.status,
          checkedInAt: ticket.checkedInAt,
          checkedInBy: ticket.checkedInBy,
          qrDataURL,
          passenger: ticket.passenger,
          createdAt: ticket.createdAt,
        };
      })
    );

    return successResponse({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      bookingStatus: booking.status,
      schedule: {
        id: booking.schedule.id,
        departureTime: booking.schedule.departureTime,
        arrivalTime: booking.schedule.arrivalTime,
        route: {
          departurePort: booking.schedule.route.departurePort,
          arrivalPort: booking.schedule.route.arrivalPort,
        },
        ship: booking.schedule.ship,
      },
      tickets: ticketsWithQR,
      totalTickets: ticketsWithQR.length,
      checkedInCount: ticketsWithQR.filter((t) => t.status === "USED").length,
    });
  } catch (error) {
    return handleApiError(error, "GET_BOOKING_TICKETS");
  }
}
