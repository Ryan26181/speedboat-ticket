import { Ship } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="relative">
        {/* Animated Ship */}
        <div className="animate-bounce">
          <Ship className="h-16 w-16 text-primary" />
        </div>
        
        {/* Wave Animation */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <svg width="80" height="20" viewBox="0 0 80 20" className="text-primary/30">
            <path
              d="M0,10 Q10,5 20,10 T40,10 T60,10 T80,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <animate
                attributeName="d"
                dur="1.5s"
                repeatCount="indefinite"
                values="
                  M0,10 Q10,5 20,10 T40,10 T60,10 T80,10;
                  M0,10 Q10,15 20,10 T40,10 T60,10 T80,10;
                  M0,10 Q10,5 20,10 T40,10 T60,10 T80,10
                "
              />
            </path>
          </svg>
        </div>
      </div>

      {/* Loading Text */}
      <p className="mt-8 text-muted-foreground animate-pulse">
        Loading...
      </p>

      {/* Progress Dots */}
      <div className="flex gap-1 mt-4">
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
