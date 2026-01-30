'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await res.json();
      setIsSuccess(true);
      toast.success('Email sent!');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {t('success.title')}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('success.message')}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <div className="p-3 sm:p-4 bg-amber-50 rounded-xl text-xs sm:text-sm text-amber-800">
            {t('success.notice')}
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full h-10 sm:h-11"
            onClick={() => {
              setIsSuccess(false);
              form.reset();
            }}
          >
            Send another link
          </Button>
        </CardContent>

        <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
          <Link href="/login">
            <Button variant="ghost" className="gap-2 h-10 sm:h-11">
              <ArrowLeft className="h-4 w-4" />
              {t('backToLogin')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-100 shadow-xl border-0 mx-auto">
      <CardHeader className="text-center space-y-2 pb-4 px-4 sm:px-6">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg">
            🔐
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription className="text-sm">{t('subtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                className="pl-10 h-11 sm:h-12 text-base"
                {...form.register('email')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-xs sm:text-sm text-red-500">
                {form.formState.errors.email.message}
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
