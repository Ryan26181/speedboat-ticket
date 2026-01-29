import { z } from "zod";

/**
 * Ticket status enum
 */
const ticketStatusEnum = z.enum(["VALID", "USED", "CANCELLED"], {
  error: "Please select a valid status",
});

/**
 * Validate ticket schema (for QR code scanning)
 */
export const validateTicketSchema = z.object({
  ticketCode: z
    .string()
    .min(6, "Ticket code must be at least 6 characters")
    .max(50, "Ticket code must be less than 50 characters"),
});

/**
 * Check-in ticket schema
 */
export const checkInTicketSchema = z.object({
  ticketCode: z
    .string()
    .min(6, "Ticket code must be at least 6 characters")
    .max(50, "Ticket code must be less than 50 characters"),
  operatorId: z.string().cuid("Invalid operator ID"),
});

/**
 * Update ticket status schema
 */
export const updateTicketStatusSchema = z.object({
  ticketId: z.string().cuid("Invalid ticket ID"),
  status: ticketStatusEnum,
});

/**
 * Ticket search/filter schema
 */
export const ticketFilterSchema = z.object({
  status: ticketStatusEnum.optional(),
  bookingId: z.string().cuid().optional(),
  scheduleId: z.string().cuid().optional(),
  ticketCode: z.string().optional(),
  checkedIn: z.boolean().optional(),
});

/**
 * Bulk ticket check-in schema
 */
export const bulkCheckInSchema = z.object({
  ticketCodes: z
    .array(z.string().min(6).max(50))
    .min(1, "At least one ticket code is required")
    .max(50, "Maximum 50 tickets per batch"),
  operatorId: z.string().cuid("Invalid operator ID"),
});

// Type exports
export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
export type CheckInTicketInput = z.infer<typeof checkInTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type TicketFilterInput = z.infer<typeof ticketFilterSchema>;
export type BulkCheckInInput = z.infer<typeof bulkCheckInSchema>;
