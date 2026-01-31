import { Anchor } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative mb-8">
          <div className="h-20 w-20 mx-auto">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-200" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Anchor className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Memuat...
        </h2>
        <p className="text-gray-500">
          Mohon tunggu sebentar
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-1 mt-4">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
        </div>

        {/* Wave animation */}
        <div className="mt-12 overflow-hidden">
          <svg
            className="w-64 h-8 mx-auto text-blue-200"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
          >
            <path
              d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"
              fill="currentColor"
            >
              <animate
                attributeName="d"
                dur="2s"
                repeatCount="indefinite"
                values="
                  M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z;
                  M0 10 Q 25 20, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z;
                  M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z
                "
              />
            </path>
          </svg>
        </div>
      </div>
    </div>
  );
}
