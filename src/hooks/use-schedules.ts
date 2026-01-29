import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface Schedule {
  id: string;
  routeId: string;
  shipId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  route: {
    id: string;
    departurePort: {
      id: string;
      name: string;
      code: string;
      city: string;
    };
    arrivalPort: {
      id: string;
      name: string;
      code: string;
      city: string;
    };
  };
  ship: {
    id: string;
    name: string;
    code: string;
    capacity: number;
  };
}

interface SchedulesResponse {
  schedules: Schedule[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ScheduleParams {
  page?: number;
  limit?: number;
  status?: string;
  routeId?: string;
  shipId?: string;
  date?: string;
  departurePortId?: string;
  arrivalPortId?: string;
}

interface CreateScheduleInput {
  routeId: string;
  shipId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  totalSeats?: number;
  status?: string;
}

interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: string;
}

// API Functions
async function fetchSchedules(params?: ScheduleParams): Promise<SchedulesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.routeId) searchParams.set("routeId", params.routeId);
  if (params?.shipId) searchParams.set("shipId", params.shipId);
  if (params?.date) searchParams.set("date", params.date);
  if (params?.departurePortId) searchParams.set("departurePortId", params.departurePortId);
  if (params?.arrivalPortId) searchParams.set("arrivalPortId", params.arrivalPortId);

  const response = await fetch(`/api/schedules?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch schedules");
  }
  return response.json();
}

async function fetchSchedule(id: string): Promise<Schedule> {
  const response = await fetch(`/api/schedules/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch schedule");
  }
  return response.json();
}

async function createSchedule(data: CreateScheduleInput): Promise<Schedule> {
  const response = await fetch("/api/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create schedule");
  }
  return response.json();
}

async function updateSchedule({ id, ...data }: UpdateScheduleInput): Promise<Schedule> {
  const response = await fetch(`/api/schedules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update schedule");
  }
  return response.json();
}

async function deleteSchedule(id: string): Promise<void> {
  const response = await fetch(`/api/schedules/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete schedule");
  }
}

// Hooks

/**
 * Hook to fetch schedules with pagination and filtering
 */
export function useSchedules(params?: ScheduleParams) {
  return useQuery({
    queryKey: ["schedules", params],
    queryFn: () => fetchSchedules(params),
  });
}

/**
 * Hook to search schedules for booking
 */
export function useSearchSchedules(params: {
  departurePortId: string;
  arrivalPortId: string;
  date: string;
}) {
  return useQuery({
    queryKey: ["schedules", "search", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        departurePortId: params.departurePortId,
        arrivalPortId: params.arrivalPortId,
        date: params.date,
        status: "ACTIVE",
      });
      const response = await fetch(`/api/schedules/search?${searchParams}`);
      if (!response.ok) throw new Error("Failed to search schedules");
      return response.json() as Promise<Schedule[]>;
    },
    enabled: !!params.departurePortId && !!params.arrivalPortId && !!params.date,
  });
}

/**
 * Hook to fetch a single schedule by ID
 */
export function useSchedule(id: string) {
  return useQuery({
    queryKey: ["schedules", id],
    queryFn: () => fetchSchedule(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new schedule
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

/**
 * Hook to update an existing schedule
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSchedule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.setQueryData(["schedules", data.id], data);
    },
  });
}

/**
 * Hook to delete a schedule
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}
