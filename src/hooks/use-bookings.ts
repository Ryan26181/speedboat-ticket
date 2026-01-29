import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  scheduleId: string;
  totalPassengers: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  schedule: {
    id: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
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
  passengers: Array<{
    id: string;
    name: string;
    idNumber: string;
    idType: string;
  }>;
  tickets: Array<{
    id: string;
    ticketCode: string;
    status: string;
  }>;
}

interface BookingsResponse {
  bookings: Booking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface BookingParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface CreateBookingInput {
  scheduleId: string;
  passengers: Array<{
    name: string;
    idNumber: string;
    idType: string;
  }>;
  contactEmail?: string;
  contactPhone?: string;
}

interface CancelBookingInput {
  id: string;
  reason?: string;
}

// API Functions
async function fetchBookings(params?: BookingParams): Promise<BookingsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);

  const response = await fetch(`/api/bookings?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch bookings");
  }
  return response.json();
}

async function fetchUserBookings(params?: BookingParams): Promise<BookingsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);

  const response = await fetch(`/api/user/bookings?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch bookings");
  }
  return response.json();
}

async function fetchBooking(id: string): Promise<Booking> {
  const response = await fetch(`/api/bookings/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch booking");
  }
  return response.json();
}

async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create booking");
  }
  return response.json();
}

async function cancelBooking({ id, reason }: CancelBookingInput): Promise<Booking> {
  const response = await fetch(`/api/bookings/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel booking");
  }
  return response.json();
}

// Hooks

/**
 * Hook to fetch all bookings (admin)
 */
export function useBookings(params?: BookingParams) {
  return useQuery({
    queryKey: ["bookings", params],
    queryFn: () => fetchBookings(params),
  });
}

/**
 * Hook to fetch current user's bookings
 */
export function useUserBookings(params?: BookingParams) {
  return useQuery({
    queryKey: ["user-bookings", params],
    queryFn: () => fetchUserBookings(params),
  });
}

/**
 * Hook to fetch a single booking by ID
 */
export function useBooking(id: string) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => fetchBooking(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

/**
 * Hook to cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.setQueryData(["bookings", data.id], data);
    },
  });
}
