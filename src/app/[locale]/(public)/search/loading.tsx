import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Skeleton */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container">
          <Skeleton className="h-8 w-48 bg-primary-foreground/20 mb-2" />
          <Skeleton className="h-4 w-64 bg-primary-foreground/20" />
        </div>
      </div>

      {/* Search Form Skeleton */}
      <div className="container -mt-6 relative z-10">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Skeleton */}
      <div className="container py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results List */}
          <div className="flex-1 space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>

            {/* Schedule Cards */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Time & Route */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Skeleton className="h-0.5 flex-1" />
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-0.5 flex-1" />
                        </div>
                        <div className="space-y-1 text-right">
                          <Skeleton className="h-6 w-16 ml-auto" />
                          <Skeleton className="h-4 w-24 ml-auto" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>

                    {/* Price & Book */}
                    <div className="lg:border-l lg:pl-6 flex flex-col items-end justify-center gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
