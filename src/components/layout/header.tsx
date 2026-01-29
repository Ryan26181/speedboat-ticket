"use client";

import { Link } from "@/i18n/routing";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, LogOut, Ticket, LayoutDashboard, ChevronRight, Search, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('navigation');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled 
          ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg shadow-slate-900/5 border-b border-slate-200/50 dark:border-slate-800/50" 
          : "bg-transparent"
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 group-hover:shadow-xl group-hover:shadow-cyan-500/40 group-hover:scale-105 transition-all duration-300">
                <span className="text-lg lg:text-xl">🚤</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                SpeedBoat
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase hidden sm:block">
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
                className="group relative px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl transition-all duration-200 hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </span>
                <span className="absolute inset-0 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 scale-0 group-hover:scale-100 transition-transform duration-200" />
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            <LanguageSwitcher variant="ghost" size="sm" showLabel={false} />
            {status === "loading" ? (
              <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative flex items-center gap-3 h-11 px-2 pr-4 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-300"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-900 shadow-sm">
                      <AvatarImage src={session.user.image || undefined} alt={session.user.name || "User"} />
                      <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-white text-xs font-bold">
                        {getInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-25 truncate">
                      {session.user.name?.split(" ")[0]}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
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
                      <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 w-fit">
                        Verified
                      </span>
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
              <div className="flex items-center gap-3">
                <LanguageSwitcher variant="ghost" size="sm" showLabel={false} />
                <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400">
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild className="bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 rounded-xl px-6">
                  <Link href="/auth/register">{t('register')}</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-125 pb-6" : "max-h-0"
          )}
        >
          <div className="pt-4 pb-2 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon && <item.icon className="w-5 h-5 text-cyan-500" />}
                {item.name}
              </Link>
            ))}
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
            {session?.user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-slate-900 shadow-md">
                    <AvatarImage src={session.user.image || undefined} />
                    <AvatarFallback className="bg-linear-to-br from-cyan-500 to-blue-600 text-white font-bold">
                      {getInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{session.user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                  </div>
                </div>
                <Link
                  href="/user/profile"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5 text-blue-500" />
                  {t('profile')}
                </Link>
                {(session.user.role === "ADMIN" || session.user.role === "OPERATOR") && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-5 h-5 text-purple-500" />
                    {t('dashboard')}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="space-y-3 px-4">
                <Button asChild variant="outline" className="w-full rounded-xl py-3 border-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    {t('login')}
                  </Link>
                </Button>
                <Button asChild className="w-full rounded-xl py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                    {t('register')}
                  </Link>
                </Button>
              </div>
            )}
            {/* Mobile Language Switcher */}
            <div className="px-4 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <LanguageSwitcher variant="outline" size="sm" showLabel={true} className="w-full justify-center" />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
