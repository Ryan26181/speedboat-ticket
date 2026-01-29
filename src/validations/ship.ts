import { z } from "zod";

/**
 * Ship facilities schema
 */
const facilitiesSchema = z.array(z.string()).default([]);

/**
 * Ship status enum
 */
const shipStatusEnum = z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"], {
  error: "Please select a valid status",
});

/**
 * Create ship schema
 */
export const createShipSchema = z.object({
  name: z
    .string()
    .min(2, "Ship name must be at least 2 characters")
    .max(100, "Ship name must be less than 100 characters"),
  code: z
    .string()
    .min(2, "Ship code must be at least 2 characters")
    .max(20, "Ship code must be less than 20 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, "Ship code can only contain letters, numbers, and hyphens"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(1000, "Capacity must be less than 1000"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  facilities: facilitiesSchema,
  imageUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  status: shipStatusEnum.default("ACTIVE"),
});

/**
 * Update ship schema - all fields optional except id
 */
export const updateShipSchema = z.object({
  name: z
    .string()
    .min(2, "Ship name must be at least 2 characters")
    .max(100, "Ship name must be less than 100 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Ship code must be at least 2 characters")
    .max(20, "Ship code must be less than 20 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, "Ship code can only contain letters, numbers, and hyphens")
    .optional(),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(1000, "Capacity must be less than 1000")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  facilities: facilitiesSchema.optional(),
  imageUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .nullable(),
  status: shipStatusEnum.optional(),
});

/**
 * Ship search/filter schema
 */
export const shipFilterSchema = z.object({
  query: z.string().optional(),
  status: shipStatusEnum.optional(),
  minCapacity: z.number().int().min(0).optional(),
  maxCapacity: z.number().int().min(0).optional(),
});

// Type exports
export type CreateShipInput = z.infer<typeof createShipSchema>;
export type UpdateShipInput = z.infer<typeof updateShipSchema>;
export type ShipFilterInput = z.infer<typeof shipFilterSchema>;
