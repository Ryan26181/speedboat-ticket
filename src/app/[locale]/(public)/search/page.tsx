"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { format, parseISO } from "date-fns";
import { AlertCircle, CalendarDays, Ship, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SearchForm } from "@/components/features/search-form";
import { ScheduleCard, ScheduleCardSkeleton } from "@/components/features/schedule-card";
import { useTranslations } from "next-intl";

interface Schedule {
  id: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  priceFormatted: string;
  totalSeats: number;
  availableSeats: number;
  duration: {
    hours: number;
    minutes: number;
    formatted: string;
  };
  route: {
    id: string;
    distance: number;
    departurePort: {
      id: string;
      name: string;
      code: string;
      city: string;
    };
    arrivalPort: {
      id: string;
      name: string;
      code: string;
      city: string;
    };
  };
  ship: {
    id: string;
    name: string;
    code: string;
    facilities: string[];
    imageUrl?: string;
  };
}

interface SearchResult {
  schedules: Schedule[];
  searchParams: {
    departurePortId: string;
    arrivalPortId: string;
    departureDate: string;
    passengers: number;
  };
  totalResults: number;
  alternatives?: { date: string; count: number }[];
}

function SearchResults() {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const departurePortId = searchParams.get("departurePortId");
  const arrivalPortId = searchParams.get("arrivalPortId");
  const date = searchParams.get("date");
  const passengers = parseInt(searchParams.get("passengers") || "1", 10);

  useEffect(() => {
    async function fetchSchedules() {
      if (!departurePortId || !arrivalPortId || !date) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          departurePortId,
          arrivalPortId,
          date,
          passengers: passengers.toString(),
        });

        const res = await fetch(`/api/schedules/search?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch schedules");
        }

        setResults(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchedules();
  }, [departurePortId, arrivalPortId, date, passengers]);

  // Missing search params
  if (!departurePortId || !arrivalPortId || !date) {
    return (
      <div className="text-center py-12">
        <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">{t('empty.title')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('empty.description')}
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, idx) => (
          <ScheduleCardSkeleton key={idx} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{tCommon('error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // No results
  if (!results || results.schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">{t('results.noResults')}</h2>
        <p className="mt-2 text-muted-foreground">
          {t('results.noResultsDescription')}
        </p>

        {results?.alternatives && results.alternatives.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium mb-3">{t('results.tryAlternatives')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {results.alternatives.map((alt, idx) => (
                <Button key={idx} variant="outline" size="sm" asChild>
                  <Link
                    href={`/search?departurePortId=${departurePortId}&arrivalPortId=${arrivalPortId}&date=${alt.date}&passengers=${passengers}`}
                  >
                    {format(parseISO(alt.date), "EEE, MMM d")} ({alt.count})
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results found
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('results.found', { count: results.totalResults })}{" "}
          <span className="font-medium">{format(parseISO(date), "EEEE, MMMM d, yyyy")}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t('results.passengers', { count: passengers })}
        </p>
      </div>

      {results.schedules.map((schedule) => (
        <ScheduleCard key={schedule.id} schedule={schedule} passengers={passengers} />
      ))}
    </div>
  );
}

export default function SearchPage() {
  const t = useTranslations('search');
  const searchParams = useSearchParams();
  
  const defaultValues = {
    departurePortId: searchParams.get("departurePortId") || undefined,
    arrivalPortId: searchParams.get("arrivalPortId") || undefined,
    date: searchParams.get("date") ? parseISO(searchParams.get("date")!) : undefined,
    passengers: parseInt(searchParams.get("passengers") || "1", 10),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/" className="inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToHome')}
        </Link>
      </Button>

      {/* Search Form */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <SearchForm
          variant="compact"
          defaultValues={defaultValues}
        />
      </div>

      {/* Results */}
      <Suspense fallback={<ScheduleCardSkeleton />}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
