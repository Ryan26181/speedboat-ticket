"use client";

import { Link } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, LogOut, Ticket, LayoutDashboard, ChevronRight, Search, MapPin, Globe, Ship } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Container } from "@/components/ui/container";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTranslations } from "next-intl";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('navigation');

  // Scroll lock for mobile menu
  useScrollLock(mobileMenuOpen);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navigation = [
    { name: t('home'), href: "/" as const, icon: null },
    { name: t('search'), href: "/search" as const, icon: Search },
    { name: t('destinations'), href: "/destinations" as const, icon: MapPin },
    { name: t('myBookings'), href: "/my-bookings" as const, icon: Ticket },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/en' || pathname === '/id';
    }
    return pathname.includes(href);
  };

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled 
            ? "bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/50 dark:border-slate-800/50" 
            : "bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm"
        )}
      >
        <Container>
          <nav className="flex h-14 sm:h-16 lg:h-18 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group z-50">
              <div className="relative">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 group-hover:shadow-xl group-hover:shadow-cyan-500/40 group-hover:scale-105 transition-all duration-300">
                  <Ship className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg lg:text-xl font-bold font-heading bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  <span className="hidden xs:inline">SpeedBoat</span>
                  <span className="xs:hidden">SB</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">
                  Fast & Reliable
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex lg:items-center lg:gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative px-3 xl:px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive(item.href)
                      ? "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50"
                      : "text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher - Desktop */}
              <div className="hidden sm:block">
                <LanguageSwitcher variant="ghost" size="sm" showLabel={false} />
              </div>
              
              {/* Auth Section */}
              {status === "loading" ? (
                <div className="h-9 w-9 sm:w-24 animate-pulse rounded-full sm:rounded-xl bg-slate-200 dark:bg-slate-800" />
              ) : session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-9 w-9 sm:h-10 sm:w-auto sm:px-2 sm:pr-3 rounded-full sm:rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-300"
                    >
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-white dark:ring-slate-900 shadow-sm">
                        <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
                        <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-white text-xs font-bold">
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-20 truncate ml-2">
                        {session.user.name?.split(" ")[0]}
                      </span>
                      <ChevronRight className="hidden sm:block w-4 h-4 text-slate-400 rotate-90 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-linear-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 border border-cyan-100 dark:border-cyan-900/50">
                      <Avatar className="h-14 w-14 ring-4 ring-white dark:ring-slate-900 shadow-lg">
                        <AvatarImage src={session.user.image || undefined} />
                        <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-white font-bold">
                          {getInitials(session.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-base font-bold text-slate-900 dark:text-white truncate">{session.user.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{session.user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="my-3" />
                    <div className="space-y-1">
                      <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                        <Link href="/my-bookings" className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400">
                            <Ticket className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{t('myBookings')}</span>
                            <span className="text-xs text-slate-500">{t('viewTrips')}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                        <Link href="/user/profile" className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{t('profile')}</span>
                            <span className="text-xs text-slate-500">{t('manageAccount')}</span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      {(session.user.role === "ADMIN" || session.user.role === "OPERATOR") && (
                        <DropdownMenuItem asChild className="rounded-xl py-3 cursor-pointer">
                          <Link href="/admin" className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                              <LayoutDashboard className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{t('dashboard')}</span>
                              <span className="text-xs text-slate-500">{t('manageSystem')}</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </div>
                    <DropdownMenuSeparator className="my-3" />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="rounded-xl py-3 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{t('logout')}</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 btn-touch">
                    <Link href="/login">{t('login')}</Link>
                  </Button>
                  <Button asChild className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 rounded-xl px-4 sm:px-6 btn-touch">
                    <Link href="/auth/register">{t('register')}</Link>
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </nav>
        </Container>
      </header>

      {/* Mobile Menu - Slide from Right */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-white dark:bg-slate-950 z-50 lg:hidden shadow-2xl flex flex-col"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User Info (if logged in) */}
              {session?.user && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-800 shadow-md">
                      <AvatarImage src={session.user.image || undefined} />
                      <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-white font-bold">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {session.user.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors',
                          isActive(item.href)
                            ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700'
                        )}
                      >
                        {Icon && <Icon className="h-5 w-5 shrink-0" />}
                        <span className="font-medium">{item.name}</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                      </Link>
                    );
                  })}
                </div>

                {/* Quick Links for logged in users */}
                {session?.user && (
                  <div className="px-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <Link
                      href="/user/profile"
                      className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <User className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{t('profile')}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                    </Link>
                    {(session.user.role === "ADMIN" || session.user.role === "OPERATOR") && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <LayoutDashboard className="h-5 w-5 text-purple-500" />
                        <span className="font-medium">{t('dashboard')}</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Language Section */}
                <div className="px-4 py-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-3 px-2">
                    <Globe className="h-3.5 w-3.5" />
                    Language
                  </div>
                  <LanguageSwitcher variant="outline" showLabel className="w-full justify-start" />
                </div>
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 safe-bottom">
                {session?.user ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-center text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('logout')}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12 rounded-xl">
                        {t('login')}
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-12 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600">
                        {t('register')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header Spacer */}
      <div className="h-14 sm:h-16 lg:h-18" />
    </>
  );
}
