import { z } from "zod";

/**
 * Schedule status enum
 */
const scheduleStatusEnum = z.enum(
  ["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED"],
  {
    error: "Please select a valid status",
  }
);

/**
 * Create schedule schema
 */
export const createScheduleSchema = z
  .object({
    routeId: z
      .string()
      .cuid("Invalid route ID"),
    shipId: z
      .string()
      .cuid("Invalid ship ID"),
    departureTime: z
      .string()
      .datetime("Invalid departure time format")
      .refine(
        (date) => new Date(date) > new Date(),
        "Departure time must be in the future"
      ),
    arrivalTime: z
      .string()
      .datetime("Invalid arrival time format"),
    price: z
      .number()
      .int("Price must be a whole number")
      .positive("Price must be a positive number")
      .max(100000000, "Price seems too large"),
    totalSeats: z
      .number()
      .int("Total seats must be a whole number")
      .positive("Total seats must be a positive number")
      .max(1000, "Total seats seems too large"),
    status: scheduleStatusEnum.default("SCHEDULED"),
  })
  .refine(
    (data) => new Date(data.arrivalTime) > new Date(data.departureTime),
    {
      message: "Arrival time must be after departure time",
      path: ["arrivalTime"],
    }
  );

/**
 * Update schedule schema
 */
export const updateScheduleSchema = z
  .object({
    departureTime: z
      .string()
      .datetime("Invalid departure time format")
      .optional(),
    arrivalTime: z
      .string()
      .datetime("Invalid arrival time format")
      .optional(),
    price: z
      .number()
      .int("Price must be a whole number")
      .positive("Price must be a positive number")
      .max(100000000, "Price seems too large")
      .optional(),
    totalSeats: z
      .number()
      .int("Total seats must be a whole number")
      .positive("Total seats must be a positive number")
      .max(1000, "Total seats seems too large")
      .optional(),
    availableSeats: z
      .number()
      .int("Available seats must be a whole number")
      .min(0, "Available seats cannot be negative")
      .optional(),
    status: scheduleStatusEnum.optional(),
  })
  .refine(
    (data) => {
      if (data.departureTime && data.arrivalTime) {
        return new Date(data.arrivalTime) > new Date(data.departureTime);
      }
      return true;
    },
    {
      message: "Arrival time must be after departure time",
      path: ["arrivalTime"],
    }
  );

/**
 * Search schedule schema (for public search)
 */
export const searchScheduleSchema = z.object({
  departurePortId: z
    .string()
    .cuid("Invalid departure port ID"),
  arrivalPortId: z
    .string()
    .cuid("Invalid arrival port ID"),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  passengers: z
    .number()
    .int("Passengers must be a whole number")
    .min(1, "At least 1 passenger is required")
    .max(50, "Maximum 50 passengers per search")
    .default(1),
});

/**
 * Schedule filter schema (for admin)
 */
export const scheduleFilterSchema = z.object({
  routeId: z.string().cuid().optional(),
  shipId: z.string().cuid().optional(),
  status: scheduleStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
});

// Type exports
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type SearchScheduleInput = z.infer<typeof searchScheduleSchema>;
export type ScheduleFilterInput = z.infer<typeof scheduleFilterSchema>;
