import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  AlertCircle,
  Ship,
  ArrowRight,
  Calendar,
  RefreshCw,
  CreditCard,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PaymentStatus } from "@/components/features/payment/payment-status";

interface PendingPageProps {
  params: Promise<{
    locale: string;
    bookingCode: string;
  }>;
}

export default async function PaymentPendingPage({ params }: PendingPageProps) {
  const { bookingCode, locale } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/login`);
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

  if (!booking || booking.userId !== session.user.id) {
    redirect(`/${locale}/my-bookings`);
  }

  // If payment is already successful, redirect to success
  if (booking.payment?.status === "SUCCESS" || booking.status === "CONFIRMED") {
    redirect(`/${locale}/booking/${bookingCode}/success`);
  }

  // If booking cancelled or expired, redirect to failed
  if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
    redirect(`/${locale}/booking/${bookingCode}/failed`);
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
    format(new Date(date), "EEEE, d MMMM yyyy", { locale: idLocale });

  // Calculate time remaining for payment
  const expiresAt = booking.payment?.expiredAt || booking.expiresAt;
  const now = new Date();
  const timeRemaining = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - now.getTime())
    : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor(
    (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Pending Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
            <Clock className="h-12 w-12 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">
            Payment Pending
          </h1>
          <p className="text-gray-600 mt-2">
            Please complete your payment to confirm your booking.
          </p>
        </div>

        {/* Time Remaining Alert */}
        {timeRemaining > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Time Remaining</p>
              <p className="text-yellow-700">
                Complete your payment within{" "}
                <strong>
                  {hoursRemaining > 0 && `${hoursRemaining} hours `}
                  {minutesRemaining} minutes
                </strong>{" "}
                or your booking will expire.
              </p>
            </div>
          </div>
        )}

        {/* Booking Code Card */}
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-yellow-700 mb-1">Booking Code</p>
              <p className="font-mono text-3xl font-bold text-yellow-800">
                {booking.bookingCode}
              </p>
              <Badge variant="secondary" className="mt-2 bg-yellow-200 text-yellow-800">
                {booking.payment?.status || booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Component - Auto refreshing */}
        <div className="mb-6">
          <PaymentStatus
            bookingCode={bookingCode}
            locale={locale}
            autoRefresh={true}
            refreshInterval={10000}
          />
        </div>

        {/* Payment Instructions */}
        {booking.payment?.method && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Please complete your payment via{" "}
                    <strong>{booking.payment.paymentType || booking.payment.method}</strong>
                  </p>
                  {booking.payment.midtransRedirectUrl && (
                    <a
                      href={booking.payment.midtransRedirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-blue-600 underline hover:text-blue-800"
                    >
                      Open Payment Page →
                    </a>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount to Pay</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(booking.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-blue-600" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500">From</p>
                <p className="font-semibold">
                  {booking.schedule.route.departurePort.name}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 text-right">
                <p className="text-sm text-gray-500">To</p>
                <p className="font-semibold">
                  {booking.schedule.route.arrivalPort.name}
                </p>
              </div>
            </div>

            <Separator />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-sm">
                    {formatDate(booking.schedule.departureTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-sm">
                    {formatTime(booking.schedule.departureTime)} WIB
                  </p>
                </div>
              </div>
            </div>

            {/* Passengers */}
            <div className="pt-2">
              <p className="text-sm text-gray-500 mb-2">Passengers</p>
              <div className="flex flex-wrap gap-2">
                {booking.passengers.map((passenger, index) => (
                  <Badge key={passenger.id} variant="outline">
                    {index + 1}. {passenger.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/${locale}/booking/${bookingCode}/payment`} className="flex-1">
            <Button className="w-full" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" />
              Retry Payment
            </Button>
          </Link>
          <Link href={`/${locale}/my-bookings`} className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="mr-2 h-5 w-5" />
              My Bookings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
