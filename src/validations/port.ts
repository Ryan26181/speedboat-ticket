import { z } from "zod";

/**
 * Latitude validation (-90 to 90)
 */
const latitudeSchema = z
  .number()
  .min(-90, "Latitude must be between -90 and 90")
  .max(90, "Latitude must be between -90 and 90")
  .optional()
  .nullable();

/**
 * Longitude validation (-180 to 180)
 */
const longitudeSchema = z
  .number()
  .min(-180, "Longitude must be between -180 and 180")
  .max(180, "Longitude must be between -180 and 180")
  .optional()
  .nullable();

/**
 * Create port schema
 */
export const createPortSchema = z.object({
  name: z
    .string()
    .min(2, "Port name must be at least 2 characters")
    .max(100, "Port name must be less than 100 characters"),
  code: z
    .string()
    .min(2, "Port code must be at least 2 characters")
    .max(10, "Port code must be less than 10 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Port code can only contain letters and numbers"),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be less than 100 characters"),
  province: z
    .string()
    .min(2, "Province must be at least 2 characters")
    .max(100, "Province must be less than 100 characters"),
  address: z
    .string()
    .max(255, "Address must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  imageUrl: z
    .string()
    .refine(
      (val) => !val || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
      "Must be a valid URL or path"
    )
    .optional()
    .or(z.literal("")),
});

/**
 * Update port schema - all fields optional
 */
export const updatePortSchema = z.object({
  name: z
    .string()
    .min(2, "Port name must be at least 2 characters")
    .max(100, "Port name must be less than 100 characters")
    .optional(),
  code: z
    .string()
    .min(2, "Port code must be at least 2 characters")
    .max(10, "Port code must be less than 10 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Port code can only contain letters and numbers")
    .optional(),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be less than 100 characters")
    .optional(),
  province: z
    .string()
    .min(2, "Province must be at least 2 characters")
    .max(100, "Province must be less than 100 characters")
    .optional(),
  address: z
    .string()
    .max(255, "Address must be less than 255 characters")
    .optional()
    .nullable(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  imageUrl: z
    .string()
    .refine(
      (val) => !val || val.startsWith("/") || val.startsWith("http://") || val.startsWith("https://"),
      "Must be a valid URL or path"
    )
    .optional()
    .nullable(),
});

/**
 * Port search/filter schema
 */
export const portFilterSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
});

// Type exports
export type CreatePortInput = z.infer<typeof createPortSchema>;
export type UpdatePortInput = z.infer<typeof updatePortSchema>;
export type PortFilterInput = z.infer<typeof portFilterSchema>;
