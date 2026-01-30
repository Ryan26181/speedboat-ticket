import { z } from "zod";

/**
 * Route status enum
 */
const routeStatusEnum = z.enum(["ACTIVE", "INACTIVE"], {
  error: "Please select a valid status",
});

/**
 * Create route schema
 */
export const createRouteSchema = z
  .object({
    departurePortId: z
      .string()
      .cuid("Invalid departure port ID"),
    arrivalPortId: z
      .string()
      .cuid("Invalid arrival port ID"),
    distance: z
      .number()
      .positive("Distance must be a positive number")
      .max(100000, "Distance seems too large (max 100,000 km)"),
    estimatedDuration: z
      .number()
      .int("Duration must be a whole number")
      .positive("Duration must be a positive number")
      .max(1440, "Duration cannot exceed 24 hours (1440 minutes)"),
    basePrice: z
      .number()
      .int("Price must be a whole number")
      .positive("Price must be a positive number")
      .max(100000000, "Price seems too large"),
    status: routeStatusEnum.default("ACTIVE"),
  })
  .refine((data) => data.departurePortId !== data.arrivalPortId, {
    message: "Departure and arrival ports must be different",
    path: ["arrivalPortId"],
  });

/**
 * Update route schema
 */
export const updateRouteSchema = z.object({
  distance: z
    .number()
    .positive("Distance must be a positive number")
    .max(100000, "Distance seems too large (max 100,000 km)")
    .optional(),
  estimatedDuration: z
    .number()
    .int("Duration must be a whole number")
    .positive("Duration must be a positive number")
    .max(1440, "Duration cannot exceed 24 hours (1440 minutes)")
    .optional(),
  basePrice: z
    .number()
    .int("Price must be a whole number")
    .positive("Price must be a positive number")
    .max(100000000, "Price seems too large")
    .optional(),
  status: routeStatusEnum.optional(),
});

/**
 * Route search/filter schema
 */
export const routeFilterSchema = z.object({
  departurePortId: z.string().cuid().optional(),
  arrivalPortId: z.string().cuid().optional(),
  status: routeStatusEnum.optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
});

// Type exports
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type RouteFilterInput = z.infer<typeof routeFilterSchema>;
