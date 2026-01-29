import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorMessageProps {
  className?: string;
  variant?: "error" | "warning" | "info";
  title?: string;
  message: string;
  retry?: {
    label?: string;
    onClick: () => void;
  };
}

const variants = {
  error: {
    icon: XCircle,
    containerClass: "bg-destructive/10 border-destructive/20",
    iconClass: "text-destructive",
    titleClass: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-warning/10 border-warning/20",
    iconClass: "text-warning",
    titleClass: "text-warning",
  },
  info: {
    icon: AlertCircle,
    containerClass: "bg-blue-500/10 border-blue-500/20",
    iconClass: "text-blue-500",
    titleClass: "text-blue-500",
  },
};

export function ErrorMessage({
  className,
  variant = "error",
  title,
  message,
  retry,
}: ErrorMessageProps) {
  const { icon: Icon, containerClass, iconClass, titleClass } = variants[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4",
        containerClass,
        className
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)} />
      <div className="flex-1 space-y-1">
        {title && (
          <h4 className={cn("text-sm font-medium", titleClass)}>{title}</h4>
        )}
        <p className="text-sm text-muted-foreground">{message}</p>
        {retry && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry.onClick}
            className="mt-3"
          >
            {retry.label ?? "Try again"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ErrorPageProps {
  className?: string;
  title?: string;
  message?: string;
  reset?: () => void;
}

export function ErrorPage({
  className,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again later.",
  reset,
}: ErrorPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-100 flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4">
        <XCircle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {reset && (
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      )}
    </div>
  );
}
