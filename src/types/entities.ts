import type { Prisma } from "@prisma/client";

// ==================== User Types ====================

/**
 * User with all relations
 */
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    accounts: true;
    sessions: true;
    bookings: true;
    checkedTickets: true;
  };
}>;

/**
 * User with bookings
 */
export type UserWithBookings = Prisma.UserGetPayload<{
  include: {
    bookings: {
      include: {
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true;
                arrivalPort: true;
              };
            };
            ship: true;
          };
        };
        passengers: true;
        payment: true;
      };
    };
  };
}>;

/**
 * Basic user info (for display)
 */
export type UserBasic = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    image: true;
    role: true;
  };
}>;

// ==================== Ship Types ====================

/**
 * Ship with schedules
 */
export type ShipWithRelations = Prisma.ShipGetPayload<{
  include: {
    schedules: true;
  };
}>;

/**
 * Ship with schedule count
 */
export type ShipWithScheduleCount = Prisma.ShipGetPayload<{
  include: {
    _count: {
      select: {
        schedules: true;
      };
    };
  };
}>;

// ==================== Port Types ====================

/**
 * Port with all routes
 */
export type PortWithRelations = Prisma.PortGetPayload<{
  include: {
    departureRoutes: true;
    arrivalRoutes: true;
  };
}>;

/**
 * Port with route counts
 */
export type PortWithRouteCounts = Prisma.PortGetPayload<{
  include: {
    _count: {
      select: {
        departureRoutes: true;
        arrivalRoutes: true;
      };
    };
  };
}>;

// ==================== Route Types ====================

/**
 * Route with ports
 */
export type RouteWithPorts = Prisma.RouteGetPayload<{
  include: {
    departurePort: true;
    arrivalPort: true;
  };
}>;

/**
 * Route with all relations
 */
export type RouteWithRelations = Prisma.RouteGetPayload<{
  include: {
    departurePort: true;
    arrivalPort: true;
    schedules: true;
  };
}>;

// ==================== Schedule Types ====================

/**
 * Schedule with route and ship
 */
export type ScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: {
    route: {
      include: {
        departurePort: true;
        arrivalPort: true;
      };
    };
    ship: true;
  };
}>;

/**
 * Schedule with all relations including bookings
 */
export type ScheduleWithBookings = Prisma.ScheduleGetPayload<{
  include: {
    route: {
      include: {
        departurePort: true;
        arrivalPort: true;
      };
    };
    ship: true;
    bookings: {
      include: {
        passengers: true;
        user: true;
      };
    };
  };
}>;

/**
 * Schedule for search results (optimized)
 */
export type ScheduleSearchResult = Prisma.ScheduleGetPayload<{
  select: {
    id: true;
    departureTime: true;
    arrivalTime: true;
    price: true;
    availableSeats: true;
    totalSeats: true;
    status: true;
    route: {
      select: {
        id: true;
        distance: true;
        estimatedDuration: true;
        departurePort: {
          select: {
            id: true;
            name: true;
            code: true;
            city: true;
          };
        };
        arrivalPort: {
          select: {
            id: true;
            name: true;
            code: true;
            city: true;
          };
        };
      };
    };
    ship: {
      select: {
        id: true;
        name: true;
        code: true;
        facilities: true;
      };
    };
  };
}>;

// ==================== Booking Types ====================

/**
 * Booking with all relations
 */
export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    user: true;
    schedule: {
      include: {
        route: {
          include: {
            departurePort: true;
            arrivalPort: true;
          };
        };
        ship: true;
      };
    };
    passengers: {
      include: {
        ticket: true;
      };
    };
    payment: true;
    tickets: true;
  };
}>;

/**
 * Booking summary (for lists)
 */
export type BookingSummary = Prisma.BookingGetPayload<{
  select: {
    id: true;
    bookingCode: true;
    totalPassengers: true;
    totalAmount: true;
    status: true;
    expiresAt: true;
    createdAt: true;
    schedule: {
      select: {
        departureTime: true;
        arrivalTime: true;
        route: {
          select: {
            departurePort: {
              select: {
                name: true;
                code: true;
              };
            };
            arrivalPort: {
              select: {
                name: true;
                code: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * Booking with payment status
 */
export type BookingWithPayment = Prisma.BookingGetPayload<{
  include: {
    payment: true;
    schedule: {
      include: {
        route: {
          include: {
            departurePort: true;
            arrivalPort: true;
          };
        };
      };
    };
  };
}>;

// ==================== Passenger Types ====================

/**
 * Passenger category type
 */
export type PassengerCategory = "ADULT" | "ELDERLY" | "CHILD" | "INFANT";

/**
 * Passenger counts by category
 */
export interface PassengerCounts {
  adults: number;    // ADULT - Dewasa (5+ years)
  elderly: number;   // ELDERLY - Lansia (60+ years)
  children: number;  // CHILD - Anak (2-5 years)
  infants: number;   // INFANT - Bayi (under 2 years)
}

/**
 * Passenger with ticket
 */
export type PassengerWithTicket = Prisma.PassengerGetPayload<{
  include: {
    ticket: true;
  };
}>;

/**
 * Passenger with booking info
 */
export type PassengerWithBooking = Prisma.PassengerGetPayload<{
  include: {
    booking: {
      include: {
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true;
                arrivalPort: true;
              };
            };
          };
        };
      };
    };
    ticket: true;
  };
}>;

// ==================== Payment Types ====================

/**
 * Payment with booking
 */
export type PaymentWithBooking = Prisma.PaymentGetPayload<{
  include: {
    booking: {
      include: {
        user: true;
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true;
                arrivalPort: true;
              };
            };
          };
        };
      };
    };
  };
}>;

// ==================== Ticket Types ====================

/**
 * Ticket with all relations
 */
export type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    booking: {
      include: {
        schedule: {
          include: {
            route: {
              include: {
                departurePort: true;
                arrivalPort: true;
              };
            };
            ship: true;
          };
        };
      };
    };
    passenger: true;
    checkedInBy: true;
  };
}>;

/**
 * Ticket for QR validation
 */
export type TicketForValidation = Prisma.TicketGetPayload<{
  select: {
    id: true;
    ticketCode: true;
    status: true;
    checkedInAt: true;
    passenger: {
      select: {
        name: true;
        identityType: true;
        identityNumber: true;
        seatNumber: true;
      };
    };
    booking: {
      select: {
        bookingCode: true;
        status: true;
        schedule: {
          select: {
            departureTime: true;
            arrivalTime: true;
            status: true;
            ship: {
              select: {
                name: true;
                code: true;
              };
            };
            route: {
              select: {
                departurePort: {
                  select: {
                    name: true;
                    code: true;
                  };
                };
                arrivalPort: {
                  select: {
                    name: true;
                    code: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

// ==================== Dashboard Stats Types ====================

/**
 * Admin dashboard statistics
 */
export interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  totalSchedules: number;
  pendingBookings: number;
  todayBookings: number;
  activeShips: number;
  activeRoutes: number;
}

/**
 * Booking statistics by status
 */
export interface BookingStatsByStatus {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  refunded: number;
  expired: number;
}

/**
 * Revenue statistics
 */
export interface RevenueStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}
