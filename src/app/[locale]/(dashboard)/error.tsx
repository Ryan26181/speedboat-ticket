"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  // Check if it's an authentication error
  const isAuthError =
    error.message.includes("Unauthorized") ||
    error.message.includes("401") ||
    error.message.includes("session");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {isAuthError ? "Session Error" : "Dashboard Error"}
          </CardTitle>
          <CardDescription>
            {isAuthError
              ? "Your session may have expired or you don't have permission to access this page."
              : "An error occurred while loading the dashboard. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth Error Alert */}
          {isAuthError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please sign out and sign in again to refresh your session.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Details (Development) */}
          {isDevelopment && !isAuthError && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                Error Details:
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {isAuthError ? (
              <Button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out & Sign In Again
              </Button>
            ) : (
              <Button onClick={reset} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <Link href="/" className="inline-flex items-center justify-center">
                <Home className="mr-2 h-4 w-4" />
                Back to Homepage
              </Link>
            </Button>
          </div>

          {/* Error ID for support */}
          {!isDevelopment && error.digest && (
            <p className="text-xs text-center text-muted-foreground">
              Error ID: <code className="text-primary">{error.digest}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
