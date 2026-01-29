import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Port } from "@prisma/client";

// Types
interface PortsResponse {
  ports: Port[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface PortParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface CreatePortInput {
  name: string;
  code: string;
  city: string;
  province: string;
  address?: string;
  status?: string;
}

interface UpdatePortInput extends Partial<CreatePortInput> {
  id: string;
}

// API Functions
async function fetchPorts(params?: PortParams): Promise<PortsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);

  const response = await fetch(`/api/ports?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch ports");
  }
  return response.json();
}

async function fetchPort(id: string): Promise<Port> {
  const response = await fetch(`/api/ports/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch port");
  }
  return response.json();
}

async function createPort(data: CreatePortInput): Promise<Port> {
  const response = await fetch("/api/ports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create port");
  }
  return response.json();
}

async function updatePort({ id, ...data }: UpdatePortInput): Promise<Port> {
  const response = await fetch(`/api/ports/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update port");
  }
  return response.json();
}

async function deletePort(id: string): Promise<void> {
  const response = await fetch(`/api/ports/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete port");
  }
}

// Hooks

/**
 * Hook to fetch ports with pagination and filtering
 */
export function usePorts(params?: PortParams) {
  return useQuery({
    queryKey: ["ports", params],
    queryFn: () => fetchPorts(params),
  });
}

/**
 * Hook to fetch all active ports (for dropdowns)
 */
export function useActivePorts() {
  return useQuery({
    queryKey: ["ports", "active"],
    queryFn: async () => {
      const response = await fetch("/api/ports?status=ACTIVE&limit=100");
      if (!response.ok) throw new Error("Failed to fetch ports");
      const data = await response.json();
      return data.ports as Port[];
    },
  });
}

/**
 * Hook to fetch a single port by ID
 */
export function usePort(id: string) {
  return useQuery({
    queryKey: ["ports", id],
    queryFn: () => fetchPort(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new port
 */
export function useCreatePort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
  });
}

/**
 * Hook to update an existing port
 */
export function useUpdatePort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePort,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ports"] });
      queryClient.setQueryData(["ports", data.id], data);
    },
  });
}

/**
 * Hook to delete a port
 */
export function useDeletePort() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ports"] });
    },
  });
}
