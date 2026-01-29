import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Ship } from "@prisma/client";

// Types
interface ShipsResponse {
  ships: Ship[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ShipParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface CreateShipInput {
  name: string;
  code: string;
  capacity: number;
  facilities?: string[];
  description?: string;
  status?: string;
}

interface UpdateShipInput extends Partial<CreateShipInput> {
  id: string;
}

// API Functions
async function fetchShips(params?: ShipParams): Promise<ShipsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);

  const response = await fetch(`/api/ships?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ships");
  }
  return response.json();
}

async function fetchShip(id: string): Promise<Ship> {
  const response = await fetch(`/api/ships/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ship");
  }
  return response.json();
}

async function createShip(data: CreateShipInput): Promise<Ship> {
  const response = await fetch("/api/ships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create ship");
  }
  return response.json();
}

async function updateShip({ id, ...data }: UpdateShipInput): Promise<Ship> {
  const response = await fetch(`/api/ships/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update ship");
  }
  return response.json();
}

async function deleteShip(id: string): Promise<void> {
  const response = await fetch(`/api/ships/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete ship");
  }
}

// Hooks

/**
 * Hook to fetch ships with pagination and filtering
 */
export function useShips(params?: ShipParams) {
  return useQuery({
    queryKey: ["ships", params],
    queryFn: () => fetchShips(params),
  });
}

/**
 * Hook to fetch a single ship by ID
 */
export function useShip(id: string) {
  return useQuery({
    queryKey: ["ships", id],
    queryFn: () => fetchShip(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new ship
 */
export function useCreateShip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ships"] });
    },
  });
}

/**
 * Hook to update an existing ship
 */
export function useUpdateShip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateShip,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ships"] });
      queryClient.setQueryData(["ships", data.id], data);
    },
  });
}

/**
 * Hook to delete a ship
 */
export function useDeleteShip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ships"] });
    },
  });
}
