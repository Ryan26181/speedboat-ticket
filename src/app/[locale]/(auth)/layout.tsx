import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { LanguageSwitcher } from '@/components/language-switcher';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* Mini Header */}
      <header className="py-4 px-4 sm:py-6">
        <Container size="lg">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">🚤</span>
              <span className="font-bold text-base sm:text-lg text-gray-900">
                Speedboat
              </span>
            </Link>
            <LanguageSwitcher variant="ghost" size="sm" showLabel={false} />
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8 md:py-12">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </main>

      {/* Mini Footer */}
      <footer className="py-4 px-4 text-center">
        <p className="text-xs sm:text-sm text-gray-500">
          © {new Date().getFullYear()} Speedboat Ticket. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
