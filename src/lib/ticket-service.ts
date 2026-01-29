import { prisma } from "@/lib/prisma";
import { generateTicketCode } from "@/lib/booking-utils";
import {
  generateQRDataURL,
  encodeQRData,
  createTicketQRData,
  type TicketQRData,
} from "@/lib/qr-generator";
import type { Ticket, Passenger, Booking, Schedule, Route, Port, Ship } from "@prisma/client";

/**
 * Full ticket with all relations
 */
export interface TicketWithRelations extends Ticket {
  passenger: Passenger;
  booking: Booking & {
    schedule: Schedule & {
      route: Route & {
        departurePort: Port;
        arrivalPort: Port;
      };
      ship: Ship;
    };
  };
}

/**
 * Ticket validation result
 */
export interface TicketValidationResult {
  valid: boolean;
  error?: string;
  ticket?: TicketWithRelations;
  qrDataURL?: string;
}

/**
 * Check-in result
 */
export interface CheckInResult extends TicketValidationResult {
  checkedIn?: boolean;
}

/**
 * Generate tickets for all passengers in a booking
 * Called after payment confirmation
 */
export async function generateTicketsForBooking(
  bookingId: string
): Promise<Ticket[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      passengers: true,
      schedule: {
        include: {
          route: {
            include: {
              departurePort: true,
              arrivalPort: true,
            },
          },
        },
      },
      tickets: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "CONFIRMED") {
    throw new Error("Booking must be confirmed to generate tickets");
  }

  const tickets: Ticket[] = [];

  for (let i = 0; i < booking.passengers.length; i++) {
    const passenger = booking.passengers[i];

    // Check if ticket already exists for this passenger
    const existingTicket = booking.tickets.find(
      (t) => t.passengerId === passenger.id
    );

    if (existingTicket) {
      tickets.push(existingTicket);
      continue;
    }

    // Generate unique ticket code with retry
    let ticketCode = generateTicketCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const existing = await prisma.ticket.findUnique({
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

    // Create QR data
    const qrData = createTicketQRData(
      ticketCode,
      booking.bookingCode,
      passenger.name,
      booking.scheduleId,
      booking.schedule.departureTime
    );

    // Assign seat number (row letter + seat number)
    const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        bookingId: booking.id,
        passengerId: passenger.id,
        ticketCode,
        qrData: encodeQRData(qrData),
        status: "VALID",
      },
    });

    // Update passenger with seat number
    await prisma.passenger.update({
      where: { id: passenger.id },
      data: { seatNumber },
    });

    tickets.push(ticket);
  }

  return tickets;
}

/**
 * Validate a ticket for check-in
 * Returns validation result without modifying the ticket
 */
export async function validateTicket(
  ticketCode: string
): Promise<TicketValidationResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketCode },
    include: {
      passenger: true,
      booking: {
        include: {
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
        },
      },
    },
  });

  if (!ticket) {
    return { valid: false, error: "Ticket not found" };
  }

  // Check ticket status
  if (ticket.status === "USED") {
    return {
      valid: false,
      error: `Ticket already used at ${ticket.checkedInAt?.toLocaleString("id-ID")}`,
      ticket,
    };
  }

  if (ticket.status === "CANCELLED") {
    return { valid: false, error: "Ticket has been cancelled", ticket };
  }

  // Check booking status
  if (ticket.booking.status !== "CONFIRMED") {
    return {
      valid: false,
      error: `Booking is not confirmed (status: ${ticket.booking.status})`,
      ticket,
    };
  }

  // Check schedule status
  if (ticket.booking.schedule.status === "CANCELLED") {
    return { valid: false, error: "Schedule has been cancelled", ticket };
  }

  // Check time window for check-in
  const now = new Date();
  const departureTime = new Date(ticket.booking.schedule.departureTime);

  // Check-in window: 3 hours before to 1 hour after departure
  const hoursBeforeDeparture = 3;
  const hoursAfterDeparture = 1;

  const earliestCheckIn = new Date(
    departureTime.getTime() - hoursBeforeDeparture * 60 * 60 * 1000
  );
  const latestCheckIn = new Date(
    departureTime.getTime() + hoursAfterDeparture * 60 * 60 * 1000
  );

  if (now < earliestCheckIn) {
    const hoursUntilCheckIn = Math.ceil(
      (earliestCheckIn.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    return {
      valid: false,
      error: `Check-in opens in ${hoursUntilCheckIn} hour(s). Check-in starts at ${earliestCheckIn.toLocaleString("id-ID")}`,
      ticket,
    };
  }

  if (now > latestCheckIn) {
    return {
      valid: false,
      error: "Check-in window has closed. Please contact staff for assistance.",
      ticket,
    };
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

  return { valid: true, ticket, qrDataURL };
}

/**
 * Check-in a ticket
 * Marks the ticket as USED and records check-in time and operator
 */
export async function checkInTicket(
  ticketCode: string,
  operatorId: string
): Promise<CheckInResult> {
  // First validate the ticket
  const validation = await validateTicket(ticketCode);

  if (!validation.valid) {
    return { ...validation, checkedIn: false };
  }

  // Perform check-in
  const updatedTicket = await prisma.ticket.update({
    where: { ticketCode },
    data: {
      status: "USED",
      checkedInAt: new Date(),
      checkedInById: operatorId,
    },
    include: {
      passenger: true,
      booking: {
        include: {
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
        },
      },
    },
  });

  return {
    valid: true,
    ticket: updatedTicket,
    checkedIn: true,
    qrDataURL: validation.qrDataURL,
  };
}

/**
 * Get all tickets for a booking with QR data URLs
 */
export async function getBookingTickets(bookingId: string): Promise<
  Array<{
    ticket: Ticket & { passenger: Passenger };
    qrDataURL: string;
  }>
> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tickets: {
        include: {
          passenger: true,
        },
      },
      schedule: {
        select: {
          departureTime: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

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
        ticket,
        qrDataURL,
      };
    })
  );

  return ticketsWithQR;
}

/**
 * Cancel tickets for a booking
 */
export async function cancelBookingTickets(bookingId: string): Promise<number> {
  const result = await prisma.ticket.updateMany({
    where: {
      bookingId,
      status: "VALID",
    },
    data: {
      status: "CANCELLED",
    },
  });

  return result.count;
}

/**
 * Get check-in statistics for a schedule
 */
export async function getScheduleCheckInStats(scheduleId: string): Promise<{
  totalTickets: number;
  checkedIn: number;
  pending: number;
  cancelled: number;
  checkInPercentage: number;
}> {
  const tickets = await prisma.ticket.groupBy({
    by: ["status"],
    where: {
      booking: {
        scheduleId,
        status: "CONFIRMED",
      },
    },
    _count: true,
  });

  const stats = {
    totalTickets: 0,
    checkedIn: 0,
    pending: 0,
    cancelled: 0,
    checkInPercentage: 0,
  };

  for (const group of tickets) {
    stats.totalTickets += group._count;
    if (group.status === "USED") {
      stats.checkedIn = group._count;
    } else if (group.status === "VALID") {
      stats.pending = group._count;
    } else if (group.status === "CANCELLED") {
      stats.cancelled = group._count;
    }
  }

  const validTickets = stats.checkedIn + stats.pending;
  stats.checkInPercentage =
    validTickets > 0 ? Math.round((stats.checkedIn / validTickets) * 100) : 0;

  return stats;
}
