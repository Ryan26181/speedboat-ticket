"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validations/auth";
import { Eye, EyeOff, Lock, Loader2, CheckCircle, XCircle, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

function ResetPasswordContent() {
  const t = useTranslations('auth.resetPassword');
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password", "");

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  useEffect(() => {
    if (token) {
      setValue("token", token);
    }
  }, [token, setValue]);

  const handleResetPassword = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Password reset failed. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('invalidLink.title')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('invalidLink.message')}
          </p>
          
          <div className="space-y-3">
            <Link
              href="/auth/forgot-password"
              className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl text-center transition-all duration-300"
            >
              {t('invalidLink.requestNew')}
            </Link>
            <Link
              href="/login"
              className="block w-full py-3 px-4 border border-border rounded-xl text-foreground hover:bg-muted/50 font-medium transition-all text-center"
            >
              {t('invalidLink.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('success.title')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('success.message')}
          </p>
          
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl text-center transition-all duration-300"
          >
            {t('success.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-6 shadow-lg">
          <KeyRound className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground mt-3 text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
        <input type="hidden" {...register("token")} />

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            {t('newPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
          )}
          
          {/* Password Strength Indicators */}
          {password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {hasMinLength ? '✓' : '○'}
                </span>
                <span className={hasMinLength ? 'text-green-600' : 'text-muted-foreground'}>
                  {t('passwordStrength.minLength')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUppercase ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {hasUppercase ? '✓' : '○'}
                </span>
                <span className={hasUppercase ? 'text-green-600' : 'text-muted-foreground'}>
                  {t('passwordStrength.uppercase')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasLowercase ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {hasLowercase ? '✓' : '○'}
                </span>
                <span className={hasLowercase ? 'text-green-600' : 'text-muted-foreground'}>
                  {t('passwordStrength.lowercase')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {hasNumber ? '✓' : '○'}
                </span>
                <span className={hasNumber ? 'text-green-600' : 'text-muted-foreground'}>
                  {t('passwordStrength.number')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
            {t('confirmPassword')}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              {...register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
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
              {t('resetting')}
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

/**
 * Reset Password Page
 * 
 * Allows users to set a new password using the reset token.
 */
export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  return (
    <Suspense fallback={
      <div className="bg-card rounded-3xl shadow-2xl border border-border/30 p-8 md:p-12 animate-scale-in backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
            <Loader2 className="w-10 h-10 text-primary-600 dark:text-primary-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('loading')}</h1>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
