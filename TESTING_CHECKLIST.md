# Testing Checklist - Speedboat Ticket System

Use this checklist to manually test all features of the application.

## Prerequisites

- [ ] `.env` file configured with all required variables
- [ ] Database running and connected
- [ ] `npx prisma db push` executed successfully
- [ ] `npm run db:seed` executed (optional, for sample data)
- [ ] Application running (`npm run dev`)

---

## Public Flow

### Homepage

- [ ] Page loads without errors
- [ ] Header navigation displays correctly
- [ ] Hero section renders with search form
- [ ] Port dropdowns populate with data from database
- [ ] Date picker works correctly
- [ ] Passenger count selector works
- [ ] Search button redirects to search results

### Search Results

- [ ] Search results load based on query parameters
- [ ] Results display correct route information
- [ ] Departure/arrival times display correctly
- [ ] Prices formatted correctly in IDR
- [ ] Available seats count shown
- [ ] "Book Now" button visible
- [ ] Empty state shown when no results
- [ ] Filter/sort options work (if implemented)

### Booking Flow (Requires Login)

- [ ] Clicking "Book Now" redirects to login if not authenticated
- [ ] After login, booking form displays
- [ ] Schedule details shown correctly
- [ ] Can add multiple passengers
- [ ] Passenger form validates (name, ID type, ID number)
- [ ] Can remove passengers
- [ ] Total price calculates correctly
- [ ] Contact information fields work
- [ ] Proceed to payment button works

### Payment

- [ ] Payment page loads with Midtrans popup
- [ ] Booking details displayed correctly
- [ ] Midtrans sandbox payment works
- [ ] Successful payment redirects to confirmation
- [ ] Failed payment shows error message
- [ ] Expired payment handled correctly

### Ticket Page

- [ ] Confirmation page shows booking details
- [ ] QR codes generated for each ticket
- [ ] Passenger information displayed
- [ ] Can download/print tickets
- [ ] Booking code displayed prominently

---

## Authentication

### Google OAuth

- [ ] Login page loads correctly
- [ ] Google login button visible
- [ ] Clicking Google login opens OAuth popup
- [ ] Successful login redirects to dashboard
- [ ] User session persists across page refreshes
- [ ] Logout functionality works
- [ ] User profile picture displays in header

### Authorization

- [ ] Unauthenticated users redirected to login for protected routes
- [ ] USER role can only access user dashboard
- [ ] OPERATOR role can access operator dashboard
- [ ] ADMIN role can access admin dashboard
- [ ] Unauthorized access shows appropriate error

---

## User Dashboard

### Main Dashboard

- [ ] Welcome message with user name
- [ ] User stats display (total bookings, upcoming trips)
- [ ] Quick actions available
- [ ] Navigation sidebar works

### Bookings

- [ ] Booking history loads
- [ ] Pagination works
- [ ] Can filter by status
- [ ] Can search bookings
- [ ] Booking details viewable
- [ ] Can cancel pending bookings
- [ ] Cancel confirmation dialog appears
- [ ] Cancelled bookings update status

### Profile

- [ ] Profile page loads user data
- [ ] Can update name
- [ ] Can update phone number
- [ ] Save changes button works
- [ ] Success/error toasts appear

---

## Operator Dashboard

### QR Scanner

- [ ] Scanner page loads
- [ ] Camera permission requested
- [ ] Camera activates (requires HTTPS or localhost)
- [ ] Can scan QR code from ticket
- [ ] Valid ticket shows passenger details
- [ ] Invalid/used ticket shows error
- [ ] Check-in button works
- [ ] Success message after check-in

### Manifest

- [ ] Today's schedules displayed
- [ ] Can select specific schedule
- [ ] Passenger list loads
- [ ] Checked-in status shown
- [ ] Can manually search passenger
- [ ] Stats show checked-in vs total

### Navigation

- [ ] Cannot access admin routes
- [ ] User dashboard accessible
- [ ] Logout works

---

## Admin Dashboard

### Overview

- [ ] Stats cards load (bookings, revenue, users)
- [ ] Recent bookings list displays
- [ ] Charts render (if implemented)
- [ ] Quick action links work

### Ships Management

- [ ] Ships list loads
- [ ] Pagination works
- [ ] Search/filter works
- [ ] Can create new ship
  - [ ] Form validation works
  - [ ] Success message appears
  - [ ] List updates
- [ ] Can edit ship
- [ ] Can view ship details
- [ ] Can change ship status
- [ ] Delete confirmation appears

### Ports Management

- [ ] Ports list loads
- [ ] Can create new port
- [ ] Can edit port
- [ ] Can delete port (if no routes)
- [ ] Port code unique constraint enforced

### Routes Management

- [ ] Routes list loads with port details
- [ ] Can create new route
  - [ ] Port dropdowns populate
  - [ ] Same port validation (departure != arrival)
  - [ ] Duration/distance fields work
  - [ ] Base price field works
- [ ] Can edit route
- [ ] Can delete route (if no schedules)

### Schedules Management

- [ ] Schedules list loads
- [ ] Filters work (date, route, ship, status)
- [ ] Can create new schedule
  - [ ] Route dropdown populates
  - [ ] Ship dropdown populates
  - [ ] DateTime pickers work
  - [ ] Price defaults from route
  - [ ] Total seats from ship capacity
- [ ] Can edit schedule
- [ ] Can update status
- [ ] Cannot delete schedule with bookings

### Bookings Management

- [ ] All bookings load
- [ ] Pagination works
- [ ] Filters work (status, payment status, date range)
- [ ] Search works (booking code, user email)
- [ ] Can view booking details
- [ ] Can update booking status (if applicable)
- [ ] Export to CSV works

### Users Management

- [ ] Users list loads with avatars
- [ ] Role filter works
- [ ] Search works
- [ ] Can change user role
  - [ ] Confirmation dialog appears
  - [ ] Role updates in list
- [ ] Cannot demote own account from admin
- [ ] Booking count shows per user

### Reports

- [ ] Report page loads
- [ ] Date range picker works
- [ ] Revenue report generates
- [ ] Booking statistics display
- [ ] Route performance data shows
- [ ] Export options work

### Settings

- [ ] Settings tabs work
- [ ] General settings load
- [ ] Booking settings configurable
- [ ] Payment settings accessible
- [ ] Notification settings work
- [ ] Save changes persists

---

## Error Handling

- [ ] 404 page displays for invalid routes
- [ ] Error boundary catches component errors
- [ ] API errors show toast notifications
- [ ] Form validation errors display inline
- [ ] Network errors handled gracefully
- [ ] Loading states appear during operations

---

## Responsive Design

- [ ] Mobile: Navigation menu works
- [ ] Mobile: Tables scroll horizontally
- [ ] Mobile: Forms fit screen
- [ ] Tablet: Layout adapts
- [ ] Desktop: Full layout displays

---

## Performance

- [ ] Pages load within acceptable time
- [ ] Images optimized
- [ ] No console errors in production build
- [ ] Lighthouse score acceptable

---

## Security

- [ ] Cannot access API routes without auth (protected)
- [ ] Cannot access admin routes as user
- [ ] CSRF protection works
- [ ] XSS inputs sanitized
- [ ] SQL injection prevented (Prisma)

---

## Sign-off

| Tester | Date | Environment | Notes |
| ------ | ---- | ----------- | ----- |
|        |      |             |       |
|        |      |             |       |
