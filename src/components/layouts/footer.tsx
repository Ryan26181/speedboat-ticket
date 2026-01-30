import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Container } from '@/components/ui/container';
import { Ship, Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  const links = {
    company: [
      { name: t('about'), href: '/about' },
      { name: t('careers'), href: '/careers' },
      { name: t('blog'), href: '/blog' },
    ],
    support: [
      { name: t('contact'), href: '/contact' },
      { name: t('faq'), href: '/faq' },
      { name: t('help'), href: '/help' },
    ],
    legal: [
      { name: t('terms'), href: '/terms' },
      { name: t('privacy'), href: '/privacy' },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <Container>
        <div className="py-10 sm:py-12 lg:py-16">
          {/* Main Grid */}
          <div className="grid gap-8 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Ship className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl text-white">SpeedBoat</span>
              </Link>
              <p className="text-sm text-gray-400 mb-4 max-w-xs">
                {t('description')}
              </p>
              
              {/* Social */}
              <div className="flex gap-3">
                {[Facebook, Instagram, Twitter].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{t('company')}</h4>
              <ul className="space-y-2">
                {links.company.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{t('support')}</h4>
              <ul className="space-y-2">
                {links.support.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">{t('legal')}</h4>
              <ul className="space-y-2">
                {links.legal.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact - Desktop */}
            <div className="hidden lg:block">
              <h4 className="font-semibold text-white mb-3 text-sm">{t('contactTitle')}</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> info@speedboat.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> +62 123 456 7890
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="py-4 border-t border-gray-800 text-center sm:text-left">
          <p className="text-sm text-gray-500">
            {t('copyright', { year: currentYear, appName: 'SpeedBoat Ticket' })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
