'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { localeFlags, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LanguageSwitcherSimpleProps {
  className?: string;
}

export function LanguageSwitcherSimple({ className }: LanguageSwitcherSimpleProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const newLocale: Locale = locale === 'en' ? 'id' : 'en';
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  if (isPending) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-1 px-2', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className={cn('gap-1 px-2', className)}
    >
      <span className={cn('text-sm', locale === 'en' ? 'font-bold' : 'opacity-50')}>
        {localeFlags.en} EN
      </span>
      <span className="text-gray-300">|</span>
      <span className={cn('text-sm', locale === 'id' ? 'font-bold' : 'opacity-50')}>
        {localeFlags.id} ID
      </span>
    </Button>
  );
}
