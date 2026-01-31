'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

type Status = 'form' | 'success' | 'error' | 'invalid';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('auth.resetPassword');
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>(!token || !email ? 'invalid' : 'form');
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      email: email || '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (token) {
      form.setValue('token', token);
    }
    if (email) {
      form.setValue('email', email);
    }
  }, [token, email, form]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!result.success) {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to reset password');
        toast.error(result.error);
        return;
      }

      setStatus('success');
      toast.success('Password reset successful!');
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid Link State
  if (status === 'invalid') {
    return (
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">{t('invalidLink.title')}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('invalidLink.message')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
          <Link href="/auth/forgot-password">
            <Button className="h-10 sm:h-11">{t('invalidLink.requestNew')}</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Success State
  if (status === 'success') {
    return (
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">{t('success.title')}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('success.message')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="p-3 sm:p-4 bg-green-50 rounded-xl text-xs sm:text-sm text-green-800">
            For security, all other sessions have been logged out.
          </div>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
          <Link href="/login">
            <Button className="h-10 sm:h-11">Go to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Reset Failed</CardTitle>
          <CardDescription className="text-sm sm:text-base">{errorMessage}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center gap-3 border-t pt-4 sm:pt-6 px-4 sm:px-6 flex-wrap">
          <Link href="/auth/forgot-password">
            <Button variant="outline" className="h-10 sm:h-11">{t('invalidLink.requestNew')}</Button>
          </Link>
          <Button onClick={() => setStatus('form')} className="h-10 sm:h-11">Try Again</Button>
        </CardFooter>
      </Card>
    );
  }

  // Form State
  return (
    <Card className="w-full max-w-100 shadow-xl border-0 mx-auto">
      <CardHeader className="text-center space-y-2 pb-4 px-4 sm:px-6">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg">
            🔐
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl">{t('title')}</CardTitle>
        <CardDescription className="text-sm">{t('subtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...form.register('token')} />

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t('newPassword')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder={t('newPasswordPlaceholder')}
                className="pl-10 h-11 sm:h-12 text-base"
                {...form.register('password')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.password && (
              <p className="text-xs sm:text-sm text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}
            <p className="text-[10px] sm:text-xs text-gray-500">
              Min 8 chars with uppercase, lowercase, and number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmPassword')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('confirmPasswordPlaceholder')}
                className="pl-10 h-11 sm:h-12 text-base"
                {...form.register('confirmPassword')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs sm:text-sm text-red-500">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submit')}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
        <Link href="/login">
          <Button variant="ghost" className="gap-2 h-10 sm:h-11 text-gray-600">
            <ArrowLeft className="h-4 w-4" />
            {t('backToLogin')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 animate-spin" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            Loading...
          </div>
        </CardHeader>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
