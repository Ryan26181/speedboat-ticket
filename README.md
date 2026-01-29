# 🚤 Speedboat Ticket Booking System

A modern, full-featured speedboat and ferry ticket booking system built with Next.js 16, TypeScript, Prisma, and Tailwind CSS.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.3-2D3748)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

## ✨ Features

### Public Features

- 🔍 Search available schedules by route and date
- 🎫 Book tickets with multiple passengers
- 💳 Secure payment via Midtrans
- 📱 QR code tickets for easy check-in
- 🔐 Google OAuth authentication

### User Dashboard

- 📊 View booking history
- 📅 Upcoming trips overview
- ❌ Cancel pending bookings
- 🎟️ Download e-tickets with QR codes
- 👤 Profile management

### Operator Dashboard

- 📷 QR code scanner for ticket validation
- ✅ Check-in passengers
- 📋 View passenger manifests
- 📊 Daily schedule overview

### Admin Dashboard

- 🚢 Manage ships and fleet
- ⚓ Manage ports
- 🛤️ Configure routes
- 📅 Create and manage schedules
- 📦 View and manage all bookings
- 👥 User management with role assignment
- 📈 Reports and analytics
- ⚙️ System settings

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js v5 (Google OAuth)
- **Payment:** Midtrans Payment Gateway
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State Management:** React Query + Zustand
- **Form Handling:** React Hook Form + Zod validation

## 📁 Project Structure

```
speedboat-ticket/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── src/
│   ├── app/
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/   # Dashboard pages
│   │   │   ├── admin/     # Admin dashboard
│   │   │   ├── operator/  # Operator dashboard
│   │   │   └── user/      # User dashboard
│   │   ├── (public)/      # Public pages
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── features/      # Feature components
│   │   ├── layouts/       # Layout components
│   │   ├── providers/     # Context providers
│   │   └── ui/            # UI components (shadcn)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   └── types/             # TypeScript types
├── public/                # Static assets
└── docker-compose.yml     # Docker configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use Prisma Postgres)
- Google OAuth credentials
- Midtrans sandbox account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/speedboat-ticket.git
   cd speedboat-ticket
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your credentials.

4. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

5. **Push database schema**

   ```bash
   npx prisma db push
   ```

6. **Seed the database** (optional)

   ```bash
   npm run db:seed
   ```

7. **Start development server**

   ```bash
   npm run dev
   ```

8. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Environment Variables

| Variable                 | Description                    |
| ------------------------ | ------------------------------ |
| `DATABASE_URL`           | PostgreSQL connection string   |
| `NEXTAUTH_URL`           | Application URL                |
| `NEXTAUTH_SECRET`        | NextAuth secret (min 32 chars) |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID         |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret     |
| `MIDTRANS_SERVER_KEY`    | Midtrans server key            |
| `MIDTRANS_CLIENT_KEY`    | Midtrans client key            |
| `MIDTRANS_IS_PRODUCTION` | `true` or `false`              |

## 🗄️ Database Commands

```bash
# Push schema changes
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed

# Reset database
npm run db:reset

# Generate Prisma client
npm run db:generate
```

## 🧪 Testing Checklist

### Public Flow

- [ ] Homepage loads correctly
- [ ] Port dropdowns populate
- [ ] Search returns correct results
- [ ] Can proceed to booking (requires login)
- [ ] Login with Google works
- [ ] Booking form validates correctly
- [ ] Booking creates successfully
- [ ] Payment page shows Midtrans popup
- [ ] Payment success generates tickets
- [ ] Ticket page shows QR codes

### User Dashboard

- [ ] Dashboard shows user stats
- [ ] Booking history displays correctly
- [ ] Can view booking details
- [ ] Can cancel pending booking
- [ ] Profile update works

### Operator Dashboard

- [ ] QR scanner activates camera
- [ ] Can scan and validate ticket
- [ ] Can check-in ticket
- [ ] Manifest shows passengers
- [ ] Cannot access admin pages

### Admin Dashboard

- [ ] Stats display correctly
- [ ] Can CRUD ships
- [ ] Can CRUD ports
- [ ] Can CRUD routes
- [ ] Can CRUD schedules
- [ ] Can view all bookings
- [ ] Can change user roles
- [ ] Reports generate correctly
- [ ] Export works

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Using Docker only

```bash
# Build the image
docker build -t speedboat-ticket .

# Run the container
docker run -p 3000:3000 --env-file .env speedboat-ticket
```

## 📦 API Endpoints

### Public

- `GET /api/ports` - List ports
- `GET /api/schedules/search` - Search schedules

### Protected (requires authentication)

- `POST /api/bookings` - Create booking
- `GET /api/user/bookings` - Get user bookings
- `POST /api/bookings/:id/cancel` - Cancel booking
- `GET /api/tickets/:id` - Get ticket details

### Admin Only

- `GET /api/ships` - List/manage ships
- `GET /api/routes` - List/manage routes
- `GET /api/schedules` - List/manage schedules
- `GET /api/admin/users` - List/manage users
- `GET /api/admin/reports` - Generate reports

### Operator Only

- `POST /api/tickets/validate` - Validate ticket
- `POST /api/tickets/check-in` - Check-in ticket

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Midtrans](https://midtrans.com/)

---

Built with ❤️ for seamless sea travel booking
