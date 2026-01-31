'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

type Status = 'loading' | 'success' | 'error' | 'expired';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('auth.verifyEmail');
  
  const token = searchParams.get('token');
  const success = searchParams.get('success');
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Handle redirect from GET endpoint
    if (success === 'true') {
      setStatus('success');
      setMessage(t('successMessage'));
      return;
    }

    if (errorParam) {
      setStatus(errorParam.includes('expired') ? 'expired' : 'error');
      setMessage(decodeURIComponent(errorParam));
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage(t('invalidLink'));
      return;
    }

    // Verify via POST
    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email: emailParam }),
        });
        const data = await res.json();

        if (data.success) {
          setStatus('success');
          setMessage(t('successMessage'));
        } else {
          setStatus(data.error?.includes('expired') ? 'expired' : 'error');
          setMessage(data.error || t('invalidLink'));
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong');
      }
    };

    verify();
  }, [token, success, errorParam, t]);

  const handleResend = async () => {
    if (!emailParam) return;
    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      });
      const data = await res.json();
      setMessage(data.success ? 'New verification email sent!' : data.error);
    } catch {
      setMessage('Failed to resend');
    } finally {
      setIsResending(false);
    }
  };

  const statusConfig = {
    loading: {
      icon: <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 animate-spin" />,
      bg: 'bg-gray-100',
      title: t('verifying'),
    },
    success: {
      icon: <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />,
      bg: 'bg-green-100',
      title: t('success'),
    },
    error: {
      icon: <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-600" />,
      bg: 'bg-red-100',
      title: t('failed'),
    },
    expired: {
      icon: <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-600" />,
      bg: 'bg-red-100',
      title: t('expired'),
    },
  };

  const config = statusConfig[status];

  return (
    <Card className="w-full max-w-100 shadow-xl border-0 mx-auto text-center">
      <CardHeader className="space-y-4 pb-4 px-4 sm:px-6">
        <div className="flex justify-center">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 ${config.bg} rounded-full flex items-center justify-center`}>
            {config.icon}
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
          {config.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <p className="text-sm sm:text-base text-gray-600">{message}</p>

        {status === 'success' && (
          <div className="mt-4 p-3 sm:p-4 bg-green-50 rounded-xl text-xs sm:text-sm text-green-800">
            Your account is now active. You can sign in and start booking!
          </div>
        )}

        {status === 'expired' && emailParam && (
          <Button
            onClick={handleResend}
            disabled={isResending}
            className="mt-4 w-full h-11 sm:h-12"
          >
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {t('resend')}
          </Button>
        )}
      </CardContent>

      <CardFooter className="justify-center border-t pt-4 sm:pt-6 px-4 sm:px-6">
        {status !== 'loading' && (
          <Link href="/login">
            <Button variant={status === 'success' ? 'default' : 'outline'} className="h-10 sm:h-11">
              {t('goToLogin')}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
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
            Verifying...
          </div>
        </CardHeader>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
