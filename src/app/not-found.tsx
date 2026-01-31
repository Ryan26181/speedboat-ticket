import Link from "next/link";
import { Anchor, Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated illustration */}
        <div className="relative mb-8">
          <div className="text-9xl font-bold text-blue-100 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-bounce">
              <Anchor className="h-20 w-20 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Error message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Maaf, halaman yang Anda cari sepertinya telah berlayar ke tempat lain.
          Mungkin URL salah atau halaman telah dipindahkan.
        </p>

        {/* Wave decoration */}
        <div className="mb-8">
          <svg
            className="w-full h-12 text-blue-100"
            viewBox="0 0 1440 54"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0 22L60 16.7C120 11 240 1 360 0.7C480 1 600 11 720 16.7C840 22 960 22 1080 18.3C1200 15 1320 7 1380 3.7L1440 0V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z" />
          </svg>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-5 w-5" />
              Kembali ke Beranda
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/search">
              <Search className="h-5 w-5" />
              Cari Jadwal
            </Link>
          </Button>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman sebelumnya
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-12 text-sm text-gray-500">
          Butuh bantuan?{" "}
          <Link href="/contact" className="text-blue-600 hover:underline">
            Hubungi kami
          </Link>
        </p>
      </div>
    </div>
  );
}
