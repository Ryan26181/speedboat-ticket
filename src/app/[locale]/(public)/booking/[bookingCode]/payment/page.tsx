import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { PaymentButton } from "@/components/features/payment/payment-button";
import { PaymentTimer } from "@/components/features/payment/payment-timer";
import { PaymentSummary } from "@/components/features/payment/payment-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Ship,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface PaymentPageProps {
  params: Promise<{
    locale: string;
    bookingCode: string;
  }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { bookingCode, locale } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/booking/${bookingCode}/payment`);
  }

  // Get booking details
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
      passengers: true,
      payment: true,
      user: true,
    },
  });

  // Check booking exists and belongs to user
  if (!booking || booking.userId !== session.user.id) {
    redirect(`/${locale}/my-bookings`);
  }

  // Check booking status
  if (booking.status === "CONFIRMED") {
    redirect(`/${locale}/booking/${bookingCode}/success`);
  }

  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    redirect(`/${locale}/booking/${bookingCode}/failed`);
  }

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), "HH:mm");
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "EEEE, d MMMM yyyy", { locale: idLocale });
  };

  // Check if booking is about to expire
  const isExpiringSoon = booking.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 pb-32 md:pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <Container size="lg">
          <div className="py-3 sm:py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                Complete Payment
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Confirm your booking details and pay
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-semibold">✓</div>
                <span className="hidden sm:inline">Booking</span>
              </div>
              <div className="w-6 sm:w-8 h-px bg-gray-300" />
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 font-medium">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-semibold">2</div>
                <span className="hidden sm:inline">Payment</span>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container size="lg">
        <div className="py-4 sm:py-6">
          {/* Timer */}
          <PaymentTimer 
            expiresAt={booking.expiresAt.toISOString()} 
            bookingCode={booking.bookingCode}
            locale={locale}
          />

          {/* Main Grid */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-5 mt-4 sm:mt-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-3 space-y-4">
              {/* Trip Details Card */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Ship className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Trip Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6">
                  {/* Route */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-semibold text-sm sm:text-base lg:text-lg">
                        {booking.schedule.route.departurePort.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {booking.schedule.route.departurePort.city}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 shrink-0" />
                    <div className="flex-1 text-center sm:text-right">
                      <p className="font-semibold text-sm sm:text-base lg:text-lg">
                        {booking.schedule.route.arrivalPort.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {booking.schedule.route.arrivalPort.city}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Date</p>
                        <p className="font-medium text-xs sm:text-sm">
                          {formatDate(booking.schedule.departureTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Time</p>
                        <p className="font-medium text-xs sm:text-sm">
                          {formatTime(booking.schedule.departureTime)} WIB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ship */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Ship className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-500">Ship</p>
                      <p className="font-medium text-xs sm:text-sm">{booking.schedule.ship.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Passengers Card */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Passengers ({booking.passengers.length})
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
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {passenger.identityType}: {passenger.identityNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods Info */}
              <Card className="border-0 shadow-md">
                <CardContent className="py-4 sm:py-6 px-4 sm:px-6">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Supported Payment Methods</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">Credit Card</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">Bank Transfer</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">GoPay</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">QRIS</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">OVO</Badge>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">ShopeePay</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary (Sticky on desktop) */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-20 space-y-4">
                <PaymentSummary
                  bookingCode={booking.bookingCode}
                  passengers={booking.passengers.length}
                  pricePerPerson={booking.schedule.price}
                  totalAmount={booking.totalAmount}
                />

                {/* Desktop Pay Button */}
                <div className="hidden md:block space-y-4">
                  <PaymentButton
                    bookingId={booking.id}
                    bookingCode={booking.bookingCode}
                    amount={booking.totalAmount}
                    locale={locale}
                  />
                  
                  {/* Security Badge */}
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs">Secured by 256-bit SSL encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 safe-bottom">
        <div className="px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500">Total Payment</p>
              <p className="text-base sm:text-lg font-bold text-gray-900">
                {formatCurrency(booking.totalAmount)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-[10px]">Secure</span>
            </div>
          </div>
          <PaymentButton
            bookingId={booking.id}
            bookingCode={booking.bookingCode}
            amount={booking.totalAmount}
            locale={locale}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
