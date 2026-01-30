'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      setRegisteredEmail(data.email);
      setIsSuccess(true);
      toast.success('Registration successful!');
    } catch {
      toast.error('Something went wrong');
      setIsLoading(false);
    }
  };

  // Success State
  if (isSuccess) {
    return (
      <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
        <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('success.title')}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('success.message')}
            <br />
            <span className="font-semibold text-gray-900 mt-1 block break-all">
              {registeredEmail}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="p-3 sm:p-4 bg-blue-50 rounded-xl text-xs sm:text-sm text-blue-800">
            <p className="font-medium mb-1">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open the email we sent you</li>
              <li>Click the verification link</li>
              <li>Start booking tickets!</li>
            </ol>
          </div>

          <p className="text-xs sm:text-sm text-gray-500">
            {t('success.noEmail')}{' '}
            <button
              onClick={() => {
                setIsSuccess(false);
                setIsLoading(false);
              }}
              className="text-blue-600 font-medium hover:underline"
            >
              {t('success.tryAgain')}
            </button>
          </p>
        </CardContent>

        <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
          <Link href="/login">
            <Button variant="outline" className="gap-2 h-10 sm:h-11">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Registration Form
  return (
    <Card className="w-full max-w-100 shadow-xl border-0 mx-auto">
      <CardHeader className="text-center space-y-2 pb-4 px-4 sm:px-6">
        <div className="flex justify-center mb-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-linear-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg">
            🚤
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
          {t('title')}
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          {t('subtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">{t('name')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder={t('namePlaceholder')}
                autoComplete="name"
                className="pl-10 h-11 sm:h-12 text-base"
                {...form.register('name')}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.name && (
              <p className="text-xs sm:text-sm text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                autoComplete="new-password"
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
            <p className="text-[10px] sm:text-xs text-gray-500">{t('passwordRequirements')}</p>
          </div>

          {/* Confirm Password */}
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
                autoComplete="new-password"
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

          {/* Terms */}
          <p className="text-[10px] sm:text-xs text-gray-500 text-center">
            {t('termsNotice')}{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">{t('termsOfService')}</Link>
            {' & '}
            <Link href="/privacy" className="text-blue-600 hover:underline">{t('privacyPolicy')}</Link>
          </p>

          {/* Submit */}
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

      <CardFooter className="flex justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
        <p className="text-xs sm:text-sm text-gray-600">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">
            {t('signIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
