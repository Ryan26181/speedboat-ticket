'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Receipt, Users } from 'lucide-react';

interface PaymentSummaryProps {
  bookingCode: string;
  passengers: number;
  pricePerPerson: number;
  totalAmount: number;
}

export function PaymentSummary({
  bookingCode,
  passengers,
  pricePerPerson,
  totalAmount,
}: PaymentSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          Payment Summary
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Booking Code */}
        <div className="p-2.5 sm:p-3 bg-linear-to-r from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl text-center">
          <p className="text-[10px] sm:text-xs text-blue-600 uppercase tracking-wide font-medium">
            Booking Code
          </p>
          <p className="font-mono text-lg sm:text-xl font-bold text-blue-700 mt-0.5">
            {bookingCode}
          </p>
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">
                {formatCurrency(pricePerPerson)} × {passengers}
              </span>
            </div>
            <span className="font-medium text-xs sm:text-sm">
              {formatCurrency(pricePerPerson * passengers)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-gray-900 font-semibold text-sm sm:text-base">
            Total
          </span>
          <span className="text-xl sm:text-2xl font-bold text-blue-600">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <p className="text-[10px] sm:text-xs text-gray-500 text-center">
          Price includes all taxes and fees
        </p>
      </CardContent>
    </Card>
  );
}
