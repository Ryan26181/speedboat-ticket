import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface Route {
  id: string;
  departurePortId: string;
  arrivalPortId: string;
  distance: number | null;
  estimatedDuration: number;
  basePrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
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
}

interface RoutesResponse {
  routes: Route[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface RouteParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departurePortId?: string;
  arrivalPortId?: string;
}

interface CreateRouteInput {
  departurePortId: string;
  arrivalPortId: string;
  distance?: number;
  estimatedDuration: number;
  basePrice: number;
  status?: string;
}

interface UpdateRouteInput extends Partial<CreateRouteInput> {
  id: string;
}

// API Functions
async function fetchRoutes(params?: RouteParams): Promise<RoutesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.departurePortId) searchParams.set("departurePortId", params.departurePortId);
  if (params?.arrivalPortId) searchParams.set("arrivalPortId", params.arrivalPortId);

  const response = await fetch(`/api/routes?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch routes");
  }
  return response.json();
}

async function fetchRoute(id: string): Promise<Route> {
  const response = await fetch(`/api/routes/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch route");
  }
  return response.json();
}

async function createRoute(data: CreateRouteInput): Promise<Route> {
  const response = await fetch("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create route");
  }
  return response.json();
}

async function updateRoute({ id, ...data }: UpdateRouteInput): Promise<Route> {
  const response = await fetch(`/api/routes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update route");
  }
  return response.json();
}

async function deleteRoute(id: string): Promise<void> {
  const response = await fetch(`/api/routes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete route");
  }
}

// Hooks

/**
 * Hook to fetch routes with pagination and filtering
 */
export function useRoutes(params?: RouteParams) {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: () => fetchRoutes(params),
  });
}

/**
 * Hook to fetch all active routes
 */
export function useActiveRoutes() {
  return useQuery({
    queryKey: ["routes", "active"],
    queryFn: async () => {
      const response = await fetch("/api/routes?status=ACTIVE&limit=100");
      if (!response.ok) throw new Error("Failed to fetch routes");
      const data = await response.json();
      return data.routes as Route[];
    },
  });
}

/**
 * Hook to fetch a single route by ID
 */
export function useRoute(id: string) {
  return useQuery({
    queryKey: ["routes", id],
    queryFn: () => fetchRoute(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new route
 */
export function useCreateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

/**
 * Hook to update an existing route
 */
export function useUpdateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRoute,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.setQueryData(["routes", data.id], data);
    },
  });
}

/**
 * Hook to delete a route
 */
export function useDeleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}
