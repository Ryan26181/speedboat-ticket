// ==================== API Response Types ====================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Pagination input params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ==================== Search & Filter Types ====================

/**
 * Base search parameters
 */
export interface SearchParams extends PaginationParams {
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Schedule search parameters
 */
export interface ScheduleSearchParams extends PaginationParams {
  departurePortId?: string;
  arrivalPortId?: string;
  departureDate?: string;
  passengers?: number;
}

/**
 * Booking search parameters
 */
export interface BookingSearchParams extends PaginationParams {
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// ==================== Common Utility Types ====================

/**
 * Make selected properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make selected properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract non-nullable type
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * ID parameter type
 */
export interface IdParam {
  id: string;
}

/**
 * Async function return type
 */
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

// ==================== Form State Types ====================

/**
 * Form state for handling submissions
 */
export interface FormState<T = unknown> {
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
}

/**
 * Action result type for server actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; errors?: Record<string, string[]> };

// ==================== Session & Auth Types ====================

/**
 * Session user type
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: "ADMIN" | "OPERATOR" | "USER";
}

/**
 * Extended session type
 */
export interface ExtendedSession {
  user: SessionUser;
  expires: string;
}

// ==================== Select Option Type ====================

/**
 * Generic select option for dropdowns
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

// ==================== Table Types ====================

/**
 * Table column definition
 */
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

/**
 * Table sort state
 */
export interface TableSortState {
  column: string;
  direction: "asc" | "desc";
}

// ==================== Re-exports ====================

export * from "./entities";
