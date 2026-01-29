import Link from "next/link";
import { Ship, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted/20">
      <div className="container max-w-2xl px-4 py-16 text-center">
        {/* Animated Ship */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-1 bg-linear-to-r from-transparent via-primary/20 to-transparent" />
          </div>
          <div className="relative">
            <Ship className="h-24 w-24 mx-auto text-primary" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-primary/20 mb-4">404</h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold mb-4">
          Oops! This page has sailed away
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved to a different location.
          Don&apos;t worry, let&apos;s get you back on course!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg">
              <Home className="mr-2 h-4 w-4" />
              Back to Homepage
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" size="lg">
              <Search className="mr-2 h-4 w-4" />
              Search Tickets
            </Button>
          </Link>
        </div>

        {/* Wave Animation */}
        <div className="mt-16 overflow-hidden">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-12 text-primary/10"
          >
            <path
              d="M0,60 C300,120 600,0 900,60 C1050,90 1150,90 1200,60 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
