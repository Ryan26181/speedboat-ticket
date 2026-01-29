import { useQuery, useMutation } from "@tanstack/react-query";

// Types
interface Ticket {
  id: string;
  ticketCode: string;
  bookingId: string;
  passengerId: string;
  qrCode: string;
  status: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
  updatedAt: string;
  passenger: {
    id: string;
    name: string;
    idNumber: string;
    idType: string;
  };
  booking: {
    id: string;
    bookingCode: string;
    schedule: {
      departureTime: string;
      arrivalTime: string;
      route: {
        departurePort: {
          name: string;
          code: string;
        };
        arrivalPort: {
          name: string;
          code: string;
        };
      };
      ship: {
        name: string;
        code: string;
      };
    };
  };
}

interface ValidateTicketResult {
  valid: boolean;
  ticket?: Ticket;
  message: string;
}

interface CheckInTicketResult {
  success: boolean;
  ticket?: Ticket;
  message: string;
}

// API Functions
async function fetchTicket(id: string): Promise<Ticket> {
  const response = await fetch(`/api/tickets/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ticket");
  }
  return response.json();
}

async function fetchTicketByCode(code: string): Promise<Ticket> {
  const response = await fetch(`/api/tickets/code/${code}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ticket");
  }
  return response.json();
}

async function validateTicket(ticketCode: string): Promise<ValidateTicketResult> {
  const response = await fetch(`/api/tickets/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketCode }),
  });
  return response.json();
}

async function checkInTicket(ticketCode: string): Promise<CheckInTicketResult> {
  const response = await fetch(`/api/tickets/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketCode }),
  });
  return response.json();
}

// Hooks

/**
 * Hook to fetch a single ticket by ID
 */
export function useTicket(id: string) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch a ticket by code
 */
export function useTicketByCode(code: string) {
  return useQuery({
    queryKey: ["tickets", "code", code],
    queryFn: () => fetchTicketByCode(code),
    enabled: !!code,
  });
}

/**
 * Hook to validate a ticket
 */
export function useValidateTicket() {
  return useMutation({
    mutationFn: validateTicket,
  });
}

/**
 * Hook to check-in a ticket
 */
export function useCheckInTicket() {
  return useMutation({
    mutationFn: checkInTicket,
  });
}
