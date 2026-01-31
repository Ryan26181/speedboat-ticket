import { z } from "zod";

/**
 * Identity type enum
 */
const identityTypeEnum = z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE", "KTP"], {
  error: "Please select a valid identity type",
});

/**
 * Passenger category enum
 */
const passengerCategoryEnum = z.enum(["ADULT", "ELDERLY", "CHILD", "INFANT"], {
  error: "Please select a valid passenger category",
});

/**
 * Booking status enum
 */
const bookingStatusEnum = z.enum(
  ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "REFUNDED", "EXPIRED"],
  {
    error: "Please select a valid status",
  }
);

/**
 * Indonesian phone number regex
 */
const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;

/**
 * Passenger counts schema
 */
export const passengerCountsSchema = z.object({
  adults: z.number().min(0).max(20),
  elderly: z.number().min(0).max(20),
  children: z.number().min(0).max(20),
  infants: z.number().min(0).max(10),
}).refine((data) => {
  // At least 1 adult OR 1 elderly required
  return data.adults >= 1 || data.elderly >= 1;
}, {
  message: "Minimal harus ada 1 penumpang dewasa atau lansia",
});

/**
 * Passenger schema
 */
export const passengerSchema = z.object({
  name: z
    .string()
    .min(2, "Passenger name must be at least 2 characters")
    .max(100, "Passenger name must be less than 100 characters"),
  identityType: identityTypeEnum,
  identityNumber: z
    .string()
    .min(5, "Identity number must be at least 5 characters")
    .max(30, "Identity number must be less than 30 characters")
    .regex(
      /^[A-Z0-9]+$/i,
      "Identity number can only contain letters and numbers"
    ),
  phone: z
    .string()
    .regex(phoneRegex, "Please enter a valid Indonesian phone number")
    .optional()
    .or(z.literal("")),
  category: passengerCategoryEnum.default("ADULT"),
  dateOfBirth: z.coerce.date().optional(),
});

/**
 * Create booking schema
 */
export const createBookingSchema = z.object({
  scheduleId: z
    .string()
    .cuid("Invalid schedule ID"),
  passengers: z
    .array(passengerSchema)
    .min(1, "At least 1 passenger is required")
    .max(50, "Maximum 50 passengers per booking"),
  // Passenger counts for validation
  passengerCounts: passengerCountsSchema.optional(),
});

/**
 * Update booking status schema
 */
export const updateBookingStatusSchema = z.object({
  status: bookingStatusEnum,
  cancellationReason: z
    .string()
    .max(500, "Cancellation reason must be less than 500 characters")
    .optional(),
});

/**
 * Cancel booking schema
 */
export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid("Invalid booking ID"),
  reason: z
    .string()
    .min(10, "Please provide a reason (at least 10 characters)")
    .max(500, "Reason must be less than 500 characters"),
});

/**
 * Booking search schema (for user's bookings)
 */
export const bookingSearchSchema = z.object({
  status: bookingStatusEnum.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
});

/**
 * Admin booking filter schema
 */
export const adminBookingFilterSchema = z.object({
  userId: z.string().cuid().optional(),
  scheduleId: z.string().cuid().optional(),
  status: bookingStatusEnum.optional(),
  bookingCode: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Booking code lookup schema
 */
export const bookingCodeSchema = z.object({
  bookingCode: z
    .string()
    .min(6, "Booking code must be at least 6 characters")
    .max(20, "Booking code must be less than 20 characters")
    .toUpperCase(),
});

// Type exports
export type PassengerInput = z.infer<typeof passengerSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingSearchInput = z.infer<typeof bookingSearchSchema>;
export type AdminBookingFilterInput = z.infer<typeof adminBookingFilterSchema>;
export type BookingCodeInput = z.infer<typeof bookingCodeSchema>;
