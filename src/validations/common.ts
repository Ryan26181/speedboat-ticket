import { z } from "zod";

/**
 * ID parameter schema - validates CUID format
 */
export const idParamSchema = z.object({
  id: z.string().cuid("Invalid ID format"),
});

/**
 * Multiple IDs schema
 */
export const idsParamSchema = z.object({
  ids: z.array(z.string().cuid("Invalid ID format")).min(1, "At least one ID is required"),
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query must be less than 100 characters")
    .optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Date range schema
 */
export const dateRangeSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

/**
 * Combined pagination and search schema
 */
export const paginatedSearchSchema = paginationSchema.merge(searchQuerySchema);

/**
 * Slug parameter schema
 */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug must be less than 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

/**
 * Boolean query parameter schema
 */
export const booleanQuerySchema = z
  .string()
  .optional()
  .transform((val) => val === "true" || val === "1");

/**
 * Numeric query parameter schema
 */
export const numericQuerySchema = z
  .string()
  .optional()
  .transform((val) => (val ? parseInt(val, 10) : undefined))
  .pipe(z.number().optional());

/**
 * Email schema (reusable)
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

/**
 * Indonesian phone number schema (reusable)
 */
export const indonesianPhoneSchema = z
  .string()
  .regex(
    /^(\+62|62|0)[0-9]{9,12}$/,
    "Please enter a valid Indonesian phone number"
  );

/**
 * URL schema (reusable)
 */
export const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .optional()
  .or(z.literal(""));

/**
 * CUID schema (reusable)
 */
export const cuidSchema = z.string().cuid("Invalid ID format");

// Type exports
export type IdParam = z.infer<typeof idParamSchema>;
export type IdsParam = z.infer<typeof idsParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type PaginatedSearchInput = z.infer<typeof paginatedSearchSchema>;
export type SlugParam = z.infer<typeof slugParamSchema>;
