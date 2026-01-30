import { redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Mail,
  Ticket,
  Calendar,
  Clock,
  Ship,
  ArrowRight,
  Home,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface SuccessPageProps {
  params: Promise<{
    locale: string;
    bookingCode: string;
  }>;
}

export default async function PaymentSuccessPage({ params }: SuccessPageProps) {
  const { bookingCode, locale } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Get booking with tickets
  const booking = await prisma.booking.findUnique({
    where: { bookingCode },
    include: {
      schedule: {
        include: {
          route: {
            include: {
              departurePort: true,
              arrivalPort: true,
            },
          },
          ship: true,
        },
      },
      passengers: {
        include: {
          ticket: true,
        },
      },
      payment: true,
      user: true,
    },
  });

  // Debug: log booking and session info
  console.log("=== SUCCESS PAGE DEBUG ===");
  console.log("bookingCode from URL:", bookingCode);
  console.log("booking found:", !!booking);
  console.log("session.user:", JSON.stringify(session.user, null, 2));
  console.log("booking?.userId:", booking?.userId);
  console.log("booking?.user?.email:", booking?.user?.email);
  console.log("session.user.id === booking?.userId:", session.user.id === booking?.userId);
  console.log("=== END DEBUG ===");

  if (!booking) {
    console.log("[SUCCESS_PAGE] Booking not found, redirecting to my-bookings");
    redirect(`/${locale}/my-bookings`);
  }

  if (booking.userId !== session.user.id) {
    console.log("[SUCCESS_PAGE] User ID mismatch, redirecting to my-bookings");
    redirect(`/${locale}/my-bookings`);
  }

  // If payment not success, redirect appropriately
  if (booking.payment?.status !== "SUCCESS" && booking.status !== "CONFIRMED") {
    if (booking.status === "PENDING") {
      redirect(`/${locale}/booking/${bookingCode}/payment`);
    } else {
      redirect(`/${locale}/booking/${bookingCode}/failed`);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (date: Date) => format(new Date(date), "HH:mm");
  const formatDate = (date: Date) =>
    format(new Date(date), "dd MMM yyyy", { locale: idLocale });

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white py-6 sm:py-8 md:py-12">
      <Container size="sm">
        {/* Success Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Your booking has been confirmed
          </p>
        </div>

        {/* Booking Code Card */}
        <Card className="mb-4 sm:mb-6 border-green-200 bg-green-50">
          <CardContent className="py-4 sm:py-6 text-center">
            <p className="text-xs sm:text-sm text-green-700 mb-1">Booking Code</p>
            <p className="font-mono text-2xl sm:text-3xl font-bold text-green-800">
              {booking.bookingCode}
            </p>
            <p className="text-xs sm:text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Confirmation sent to {booking.user.email}
            </p>
          </CardContent>
        </Card>

        {/* Trip Details Card */}
        <Card className="mb-4 sm:mb-6 border-0 shadow-md">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Ship className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
            {/* Route */}
            <div className="flex items-center gap-2 sm:gap-4 text-sm sm:text-base">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold">{booking.schedule.route.departurePort.name}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 text-center sm:text-right">
                <p className="font-semibold">{booking.schedule.route.arrivalPort.name}</p>
              </div>
            </div>

            <Separator />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">
                    {formatDate(booking.schedule.departureTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium">
                    {formatTime(booking.schedule.departureTime)} WIB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Card */}
        <Card className="mb-4 sm:mb-6 border-0 shadow-md">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              E-Tickets ({booking.passengers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-2 sm:space-y-3">
              {booking.passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs sm:text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {passenger.name}
                      </p>
                      {passenger.ticket && (
                        <p className="text-[10px] sm:text-xs text-gray-500 font-mono">
                          {passenger.ticket.ticketCode}
                        </p>
                      )}
                    </div>
                  </div>
                  {passenger.ticket && (
                    <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs border-0">
                      Valid
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary Card */}
        <Card className="mb-6 sm:mb-8 border-0 shadow-md">
          <CardContent className="py-4 sm:py-6 px-4 sm:px-6 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span>{booking.payment?.paymentType || booking.payment?.method || "N/A"}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Payment Date</span>
              <span>
                {booking.payment?.paidAt
                  ? format(new Date(booking.payment.paidAt), "dd/MM/yyyy HH:mm")
                  : "N/A"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-sm sm:text-base">
              <span>Total Paid</span>
              <span className="text-green-600">{formatCurrency(booking.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/ticket/${bookingCode}`} className="flex-1">
            <Button className="w-full h-11 sm:h-12 text-sm sm:text-base">
              <QrCode className="mr-2 h-4 w-4" />
              View E-Tickets
            </Button>
          </Link>
          <Link href="/my-bookings" className="flex-1">
            <Button variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base">
              <Home className="mr-2 h-4 w-4" />
              My Bookings
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
