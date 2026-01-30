'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentTimerProps {
  expiresAt: string;
  bookingCode: string;
  locale?: string;
}

export function PaymentTimer({ expiresAt, bookingCode, locale = 'en' }: PaymentTimerProps) {
  const router = useRouter();
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        router.push(`/${locale}/booking/${bookingCode}/failed`);
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
      return {
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        total: diff,
      };
    };

    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, bookingCode, locale, router]);

  const isUrgent = timeLeft.total < 10 * 60 * 1000;
  const isCritical = timeLeft.total < 5 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-colors duration-300',
        isCritical
          ? 'bg-linear-to-r from-red-500 to-red-600'
          : isUrgent
          ? 'bg-linear-to-r from-amber-500 to-orange-500'
          : 'bg-linear-to-r from-blue-500 to-blue-600'
      )}
    >
      <div className="flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={cn(
            'p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0',
            isCritical ? 'bg-red-400/30' : isUrgent ? 'bg-amber-400/30' : 'bg-blue-400/30'
          )}>
            {isCritical ? (
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium opacity-90 truncate">
              {isCritical ? 'Time almost up!' : 'Complete payment before'}
            </p>
            <p className="text-[10px] sm:text-xs opacity-75 hidden sm:block">
              Booking will be cancelled after timer ends
            </p>
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <TimeUnit value={timeLeft.hours} label="h" />
          <span className="text-lg sm:text-xl font-bold opacity-60">:</span>
          <TimeUnit value={timeLeft.minutes} label="m" />
          <span className="text-lg sm:text-xl font-bold opacity-60">:</span>
          <TimeUnit value={timeLeft.seconds} label="s" isAnimated />
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({
  value,
  label,
  isAnimated = false,
}: {
  value: number;
  label: string;
  isAnimated?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={isAnimated ? { y: -8, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={isAnimated ? { y: 8, opacity: 0 } : undefined}
          transition={{ duration: 0.15 }}
          className="text-lg sm:text-2xl md:text-3xl font-bold tabular-nums min-w-[1.5ch] sm:min-w-[2ch] text-center"
        >
          {value.toString().padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
      <span className="text-[8px] sm:text-[10px] uppercase opacity-75">{label}</span>
    </div>
  );
}
