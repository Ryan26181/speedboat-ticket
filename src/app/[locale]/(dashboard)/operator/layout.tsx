"use client";

import { ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OperatorLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Role-based access control - require OPERATOR or ADMIN
  useEffect(() => {
    if (status === "authenticated") {
      const role = session?.user?.role;
      if (role !== "OPERATOR" && role !== "ADMIN") {
        router.push("/user");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check role access
  const role = session?.user?.role;
  if (role !== "OPERATOR" && role !== "ADMIN") {
    return (
      <div className="space-y-4 max-w-md mx-auto mt-12">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to access the operator dashboard.
            Only operators and administrators can access this area.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/user">Go to User Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
