"use client";

import { Link } from "@/i18n/routing";
import { Mail, Phone, Ship, Facebook, Instagram, Twitter } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: t('links.explore.schedule'), href: "/search" },
    { name: t('links.explore.destinations'), href: "/destinations" },
    { name: "My Bookings", href: "/my-bookings" },
  ];

  const socialLinks = [
    { name: "Facebook", href: "#", icon: Facebook },
    { name: "Instagram", href: "#", icon: Instagram },
    { name: "Twitter", href: "#", icon: Twitter },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer */}
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <Ship className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-white">{t('brand.name')}</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-md">
              {t('brand.description')}
            </p>
            
            {/* Contact */}
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="tel:+6281234567890" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <Phone className="w-4 h-4" />
                <span>+62 812-3456-7890</span>
              </a>
              <a href="mailto:support@speedboat.id" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <Mail className="w-4 h-4" />
                <span>support@speedboat.id</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-4">Follow Us</h4>
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <Container className="py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <p>© {currentYear} {t('brand.name')}. {t('copyright')}</p>
            <p className="flex items-center gap-1">
              {t('madeWith')} <span className="text-red-500">❤️</span> {t('inIndonesia')} 🇮🇩
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
