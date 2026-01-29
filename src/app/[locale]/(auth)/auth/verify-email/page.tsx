"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

function VerifyEmailContent() {
  const t = useTranslations('auth.verifyEmail');
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const success = searchParams.get("success");
  const errorParam = searchParams.get("error");
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Handle redirect from GET endpoint
    if (success === "true") {
      setStatus("success");
      setMessage("Your email has been verified successfully!");
      return;
    }

    if (errorParam) {
      setStatus("error");
      if (errorParam === "missing_token") {
        setMessage("No verification token provided.");
      } else if (errorParam === "rate_limit") {
        setMessage("Too many attempts. Please try again later.");
      } else {
        setMessage(decodeURIComponent(errorParam));
      }
      return;
    }

    // If token is in URL but not processed by GET, verify via POST
    if (token) {
      verifyEmail(token);
    }
  }, [token, success, errorParam]);

  const verifyEmail = async (verificationToken: string) => {
    setStatus("loading");
    
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(result.error || "Verification failed");
        return;
      }

      setStatus("success");
      setMessage("Your email has been verified successfully!");
    } catch {
      setStatus("error");
      setMessage("An error occurred during verification.");
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      await response.json();
      setResendSuccess(true);
    } catch {
      // Still show success to prevent enumeration
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
            <Loader2 className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('verifying')}</h1>
          <p className="text-muted-foreground">{t('pleaseWait')}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('success')}</h1>
          <p className="text-muted-foreground mb-8">{t('successMessage')}</p>
          
          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl text-center transition-all duration-300"
          >
            {t('goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('failed')}</h1>
          <p className="text-muted-foreground mb-8">{message}</p>
          
          {/* Resend verification form */}
          <div className="bg-muted/50 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-foreground mb-4">
              {t('needNewLink')}
            </h2>
            
            {resendSuccess ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('resendSuccess')}
              </p>
            ) : (
              <form onSubmit={handleResendVerification} className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder={t('enterEmail')}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isResending || !resendEmail}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isResending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resend')}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 border border-border rounded-xl text-foreground hover:bg-muted/50 font-medium transition-all text-center"
            >
              {t('goToLogin')}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <span>←</span>
              <span>{t('backToHome')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Idle state - no token provided
  return (
    <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
          <Mail className="w-10 h-10 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">{t('title')}</h1>
        <p className="text-muted-foreground mb-8">
          {t('checkInbox')}
        </p>

        {/* Resend verification form */}
        <div className="bg-muted/50 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            {t('didntReceive')}
          </h2>
          
          {resendSuccess ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('resendSuccess')}
            </p>
          ) : (
            <form onSubmit={handleResendVerification} className="flex gap-2">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder={t('enterEmail')}
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <button
                type="submit"
                disabled={isResending || !resendEmail}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {isResending ? <Loader2 className="w-5 h-5 animate-spin" /> : t('resend')}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 px-4 border border-border rounded-xl text-foreground hover:bg-muted/50 font-medium transition-all text-center"
          >
            {t('goToLogin')}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span>←</span>
            <span>{t('backToHome')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Email Verification Page
 * 
 * Handles email verification tokens and displays status.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
            <Loader2 className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
