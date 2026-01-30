import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  XCircle,
  AlertTriangle,
  Ship,
  ArrowRight,
  Calendar,
  Clock,
  Home,
  RefreshCw,
  Search,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface FailedPageProps {
  params: Promise<{
    locale: string;
    bookingCode: string;
  }>;
}

export default async function PaymentFailedPage({ params }: FailedPageProps) {
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

  // If payment is successful, redirect to success
  if (booking.payment?.status === "SUCCESS" || booking.status === "CONFIRMED") {
    redirect(`/${locale}/booking/${bookingCode}/success`);
  }

  // If still pending, redirect to pending
  if (booking.status === "PENDING" && booking.payment?.status !== "FAILED" && booking.payment?.status !== "EXPIRED") {
    redirect(`/${locale}/booking/${bookingCode}/pending`);
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

  // Determine failure reason
  const getFailureReason = () => {
    if (booking.status === "EXPIRED") {
      return {
        title: "Booking Expired",
        message:
          "Your booking has expired because payment was not completed within the time limit.",
        icon: Clock,
        color: "orange",
      };
    }
    if (booking.status === "CANCELLED") {
      return {
        title: "Booking Cancelled",
        message: "This booking has been cancelled.",
        icon: XCircle,
        color: "red",
      };
    }
    if (booking.payment?.status === "FAILED") {
      return {
        title: "Payment Failed",
        message:
          "Your payment was declined or could not be processed. Please try again with a different payment method.",
        icon: AlertTriangle,
        color: "red",
      };
    }
    if (booking.payment?.status === "EXPIRED") {
      return {
        title: "Payment Expired",
        message:
          "Your payment session has expired. Please create a new booking.",
        icon: Clock,
        color: "orange",
      };
    }
    return {
      title: "Payment Unsuccessful",
      message:
        "There was an issue with your payment. Please try booking again.",
      icon: XCircle,
      color: "red",
    };
  };

  const failure = getFailureReason();
  const IconComponent = failure.icon;
  const isExpired = booking.status === "EXPIRED" || booking.payment?.status === "EXPIRED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Failed Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 ${
              failure.color === "orange" ? "bg-orange-100" : "bg-red-100"
            } rounded-full mb-4`}
          >
            <IconComponent
              className={`h-12 w-12 ${
                failure.color === "orange" ? "text-orange-600" : "text-red-600"
              }`}
            />
          </div>
          <h1 className="text-3xl font-bold font-heading text-gray-900">
            {failure.title}
          </h1>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">{failure.message}</p>
        </div>

        {/* Booking Code Card */}
        <Card
          className={`mb-6 ${
            failure.color === "orange"
              ? "border-orange-200 bg-orange-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <p
                className={`text-sm ${
                  failure.color === "orange" ? "text-orange-700" : "text-red-700"
                } mb-1`}
              >
                Booking Code
              </p>
              <p
                className={`font-mono text-3xl font-bold ${
                  failure.color === "orange" ? "text-orange-800" : "text-red-800"
                }`}
              >
                {booking.bookingCode}
              </p>
              <Badge
                variant="secondary"
                className={`mt-2 ${
                  failure.color === "orange"
                    ? "bg-orange-200 text-orange-800"
                    : "bg-red-200 text-red-800"
                }`}
              >
                {booking.payment?.status || booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details That Was Attempted */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-gray-400" />
              Attempted Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500">From</p>
                <p className="font-semibold text-gray-600">
                  {booking.schedule.route.departurePort.name}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 text-right">
                <p className="text-sm text-gray-500">To</p>
                <p className="font-semibold text-gray-600">
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
                  <p className="font-medium text-sm text-gray-600">
                    {formatDate(booking.schedule.departureTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-sm text-gray-600">
                    {formatTime(booking.schedule.departureTime)} WIB
                  </p>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="pt-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-semibold text-gray-400 line-through">
                  {formatCurrency(booking.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What to do next */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              What To Do Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {!isExpired && (
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Try a Different Payment Method</p>
                    <p className="text-sm text-gray-500">
                      If your payment was declined, you can try using a different
                      payment method.
                    </p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">
                    {isExpired ? "1" : "2"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">Search for Available Schedules</p>
                  <p className="text-sm text-gray-500">
                    Check if there are still available seats on your preferred
                    route and date.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-semibold">
                    {isExpired ? "2" : "3"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">Contact Support</p>
                  <p className="text-sm text-gray-500">
                    If you're experiencing issues, our support team is ready to
                    help.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/${locale}/search`} className="flex-1">
            <Button className="w-full" size="lg">
              <Search className="mr-2 h-5 w-5" />
              Search New Trip
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
