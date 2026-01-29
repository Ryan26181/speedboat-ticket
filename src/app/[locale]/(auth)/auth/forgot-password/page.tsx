"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validations/auth";
import { Mail, Loader2, CheckCircle, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Forgot Password Page
 * 
 * Allows users to request a password reset email.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const handleForgotPassword = async (data: ForgotPasswordInput) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      await response.json();
      
      // Always show success to prevent email enumeration
      setSuccess(true);
      setSubmittedEmail(data.email);
    } catch {
      // Still show success to prevent enumeration
      setSuccess(true);
      setSubmittedEmail(data.email);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('success.title')}</h1>
          <p className="text-muted-foreground mb-2">
            {t('success.message')}{" "}
            <span className="font-semibold text-foreground">{submittedEmail}</span>,
          </p>
          <p className="text-muted-foreground mb-8">
            {t('success.instructions')}
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl text-center transition-all duration-300"
            >
              {t('backToLogin')}
            </Link>
            
            <button
              onClick={() => {
                setSuccess(false);
                setSubmittedEmail("");
              }}
              className="block w-full py-3 px-4 border border-border rounded-xl text-muted-foreground hover:bg-muted/50 font-medium transition-all"
            >
              {t('tryAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-lg">
          <KeyRound className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-3 text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleForgotPassword)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            {t('email')}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register("email")}
              type="email"
              id="email"
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-6"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('sending')}
            </span>
          ) : (
            t('submit')
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <span>←</span>
          <span>{t('backToLogin')}</span>
        </Link>
      </div>
    </div>
  );
}
