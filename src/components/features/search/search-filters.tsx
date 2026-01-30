'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, X } from 'lucide-react';

interface SearchFiltersProps {
  variant?: 'default' | 'mobile';
  onFilterChange?: (filters: FilterState) => void;
}

interface FilterState {
  priceRange: number[];
  selectedTimes: string[];
}

export function SearchFilters({ variant = 'default', onFilterChange }: SearchFiltersProps) {
  const t = useTranslations('search');
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const timeOptions = [
    { id: 'morning', label: 'Morning', time: '06:00 - 12:00' },
    { id: 'afternoon', label: 'Afternoon', time: '12:00 - 18:00' },
    { id: 'evening', label: 'Evening', time: '18:00 - 24:00' },
  ];

  const handleTimeChange = (timeId: string, checked: boolean) => {
    const newTimes = checked
      ? [...selectedTimes, timeId]
      : selectedTimes.filter(id => id !== timeId);
    setSelectedTimes(newTimes);
    onFilterChange?.({ priceRange, selectedTimes: newTimes });
  };

  const hasActiveFilters = selectedTimes.length > 0;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Time Filter */}
      <div>
        <h4 className="font-semibold text-sm mb-3">Departure Time</h4>
        <div className="space-y-3">
          {timeOptions.map((option) => (
            <div key={option.id} className="flex items-center gap-3">
              <Checkbox
                id={option.id}
                checked={selectedTimes.includes(option.id)}
                onCheckedChange={(checked) => handleTimeChange(option.id, !!checked)}
              />
              <Label htmlFor={option.id} className="text-sm cursor-pointer flex-1">
                <span className="block">{option.label}</span>
                <span className="text-xs text-gray-500">{option.time}</span>
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Mobile: Modal/Drawer using simple state
  if (variant === 'mobile') {
    return (
      <>
        <Button 
          variant="outline" 
          className="w-full h-11 justify-between"
          onClick={() => setIsOpen(true)}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </Button>

        {/* Simple overlay modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Filter Results</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <FilterContent />
              <Button 
                className="w-full h-11 mt-6" 
                onClick={() => setIsOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: Sidebar Card
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  );
}
