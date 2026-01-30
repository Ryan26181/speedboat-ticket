"use client";

import { Link } from "@/i18n/routing";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, ArrowRight, Send, Ship } from "lucide-react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    explore: [
      { name: t('links.explore.popularRoutes'), href: "/routes" },
      { name: t('links.explore.destinations'), href: "/destinations" },
      { name: t('links.explore.travelDeals'), href: "/deals" },
      { name: t('links.explore.schedule'), href: "/schedule" },
    ],
    company: [
      { name: t('links.company.about'), href: "/about" },
      { name: t('links.company.careers'), href: "/careers" },
      { name: t('links.company.press'), href: "/press" },
      { name: t('links.company.partners'), href: "/partners" },
    ],
    support: [
      { name: t('links.support.helpCenter'), href: "/help" },
      { name: t('links.support.faqs'), href: "/faq" },
      { name: t('links.support.contact'), href: "/contact" },
      { name: t('links.support.refund'), href: "/refund-policy" },
    ],
    legal: [
      { name: t('links.legal.terms'), href: "/terms" },
      { name: t('links.legal.privacy'), href: "/privacy" },
      { name: t('links.legal.cookies'), href: "/cookies" },
      { name: t('links.legal.licenses'), href: "/licenses" },
    ],
  };

  const socialLinks = [
    { name: "Facebook", href: "#", icon: Facebook },
    { name: "Instagram", href: "#", icon: Instagram },
    { name: "Twitter", href: "#", icon: Twitter },
    { name: "YouTube", href: "#", icon: Youtube },
  ];

  return (
    <footer className="relative bg-slate-950 text-slate-300 overflow-hidden">
      {/* Decorative Wave */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-cyan-500 via-blue-500 to-purple-500" />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full blur-[128px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
      </div>

      {/* Newsletter Section */}
      <div className="relative border-b border-slate-800">
        <Container className="py-10 sm:py-12 lg:py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-heading text-white mb-2">
                {t('newsletter.title')}
              </h3>
              <p className="text-sm sm:text-base text-slate-400">
                {t('newsletter.description')}
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <form className="flex flex-col sm:flex-row gap-3 max-w-md lg:max-w-none mx-auto">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    placeholder={t('newsletter.placeholder')}
                    className="w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all input-responsive"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-200 btn-touch"
                >
                  <span>{t('newsletter.subscribe')}</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </Container>
      </div>

      {/* Main Footer */}
      <Container className="relative py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group mb-6">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                <Ship className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold font-heading text-white">{t('brand.name')}</span>
                <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">
                  {t('brand.tagline')}
                </span>
              </div>
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-sm">
              {t('brand.description')}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="tel:+6281234567890" className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+62 812-3456-7890</span>
              </a>
              <a href="mailto:support@speedboat.id" className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                  <Mail className="w-4 h-4" />
                </div>
                <span>support@speedboat.id</span>
              </a>
              <div className="flex items-center gap-3 text-slate-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Bali, Indonesia</span>
              </div>
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t('sections.explore')}</h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t('sections.company')}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t('sections.support')}</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t('sections.legal')}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                  >
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      {/* Bottom Bar */}
      <div className="relative border-t border-slate-800">
        <Container className="py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
              © {currentYear} {t('brand.name')}. {t('copyright')}
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-200"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <span>{t('madeWith')}</span>
              <span className="text-red-500">❤️</span>
              <span>{t('inIndonesia')}</span>
              <span className="text-lg">🇮🇩</span>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
