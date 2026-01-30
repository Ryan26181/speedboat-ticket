import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  amber: 'text-amber-600 bg-amber-100',
  purple: 'text-purple-600 bg-purple-100',
  red: 'text-red-600 bg-red-100',
};

export function StatsCard({ label, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className={cn('p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0', colorClasses[color])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 truncate">
              {value}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">
                {label}
              </p>
              {trend && (
                <span
                  className={cn(
                    'text-[10px] sm:text-xs font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
