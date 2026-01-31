"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console (in production, send to monitoring service)
    console.error("[GLOBAL_ERROR]", {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4 py-12">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            Terjadi Kesalahan
          </CardTitle>
          <CardDescription className="text-base">
            Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah
            diberitahu dan sedang memperbaiki masalah ini.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error details (development only) */}
          {isDevelopment && (
            <div className="rounded-lg bg-gray-900 p-4 overflow-auto max-h-48">
              <div className="flex items-center gap-2 text-red-400 text-sm font-mono mb-2">
                <Bug className="h-4 w-4" />
                {error.name}: {error.message}
              </div>
              {error.stack && (
                <pre className="text-xs text-gray-400 whitespace-pre-wrap break-all">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {/* Error ID for support */}
          {error.digest && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                ID Kesalahan:{" "}
                <code className="font-mono text-gray-800">{error.digest}</code>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Simpan ID ini jika Anda menghubungi dukungan
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={reset}
              className="flex-1 gap-2"
              size="lg"
            >
              <RefreshCw className="h-5 w-5" />
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex-1 gap-2"
              size="lg"
            >
              <Home className="h-5 w-5" />
              Ke Beranda
            </Button>
          </div>

          {/* Tips */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Yang bisa Anda coba:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Muat ulang halaman ini</li>
              <li>Hapus cache browser Anda</li>
              <li>Coba beberapa saat lagi</li>
              <li>Hubungi dukungan jika masalah berlanjut</li>
            </ul>
          </div>

          {/* Support link */}
          <div className="text-center text-sm text-gray-500">
            Butuh bantuan?{" "}
            <a
              href="/contact"
              className="text-blue-600 hover:underline"
            >
              Hubungi Tim Dukungan
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
