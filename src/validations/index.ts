// ==================== Auth Validations ====================
export {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changeRoleSchema,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
  type ChangeRoleInput,
} from "./auth";

// ==================== Ship Validations ====================
export {
  createShipSchema,
  updateShipSchema,
  shipFilterSchema,
  type CreateShipInput,
  type UpdateShipInput,
  type ShipFilterInput,
} from "./ship";

// ==================== Port Validations ====================
export {
  createPortSchema,
  updatePortSchema,
  portFilterSchema,
  type CreatePortInput,
  type UpdatePortInput,
  type PortFilterInput,
} from "./port";

// ==================== Route Validations ====================
export {
  createRouteSchema,
  updateRouteSchema,
  routeFilterSchema,
  type CreateRouteInput,
  type UpdateRouteInput,
  type RouteFilterInput,
} from "./route";

// ==================== Schedule Validations ====================
export {
  createScheduleSchema,
  updateScheduleSchema,
  searchScheduleSchema,
  scheduleFilterSchema,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type SearchScheduleInput,
  type ScheduleFilterInput,
} from "./schedule";

// ==================== Booking Validations ====================
export {
  passengerSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  bookingSearchSchema,
  adminBookingFilterSchema,
  bookingCodeSchema,
  type PassengerInput,
  type CreateBookingInput,
  type UpdateBookingStatusInput,
  type CancelBookingInput,
  type BookingSearchInput,
  type AdminBookingFilterInput,
  type BookingCodeInput,
} from "./booking";

// ==================== Payment Validations ====================
export {
  createPaymentSchema,
  midtransWebhookSchema,
  updatePaymentStatusSchema,
  refundRequestSchema,
  paymentFilterSchema,
  type CreatePaymentInput,
  type MidtransWebhookPayload,
  type UpdatePaymentStatusInput,
  type RefundRequestInput,
  type PaymentFilterInput,
} from "./payment";

// ==================== Ticket Validations ====================
export {
  validateTicketSchema,
  checkInTicketSchema,
  updateTicketStatusSchema,
  ticketFilterSchema,
  bulkCheckInSchema,
  type ValidateTicketInput,
  type CheckInTicketInput,
  type UpdateTicketStatusInput,
  type TicketFilterInput,
  type BulkCheckInInput,
} from "./ticket";

// ==================== Common Validations ====================
export {
  idParamSchema,
  idsParamSchema,
  paginationSchema,
  searchQuerySchema,
  dateRangeSchema,
  paginatedSearchSchema,
  slugParamSchema,
  booleanQuerySchema,
  numericQuerySchema,
  emailSchema,
  indonesianPhoneSchema,
  urlSchema,
  cuidSchema,
  type IdParam,
  type IdsParam,
  type PaginationInput,
  type SearchQueryInput,
  type DateRangeInput,
  type PaginatedSearchInput,
  type SlugParam,
} from "./common";
