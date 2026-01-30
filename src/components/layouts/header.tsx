'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Container } from '@/components/ui/container';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import {
  Menu,
  X,
  Home,
  Search,
  Ticket,
  User,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Globe,
  Ship,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const t = useTranslations('navigation');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Navigation items
  const navItems = [
    { name: t('home'), href: '/', icon: Home },
    { name: t('search'), href: '/search', icon: Search },
    { name: t('myBookings'), href: '/user/bookings', icon: Ticket, auth: true },
  ];

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu open
  useScrollLock(isMenuOpen);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/en' || pathname === '/id';
    }
    return pathname.includes(href);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-white/80 backdrop-blur-sm'
        )}
      >
        <Container>
          <nav className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 z-50">
              <Ship className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              <span className="font-bold text-base sm:text-lg text-gray-900">
                <span className="hidden xs:inline">SpeedBoat</span>
                <span className="xs:hidden">SB</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems
                .filter(item => !item.auth || session)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher - Desktop */}
              <div className="hidden sm:block">
                <LanguageSwitcher variant="ghost" size="sm" showLabel={false} />
              </div>

              {/* User Menu / Auth Buttons */}
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={session.user?.image || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(session.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="font-medium text-sm truncate">{session.user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/user" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t('dashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/user/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        {t('profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="btn-touch">
                      {t('login')}
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="btn-touch">
                      {t('register')}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </nav>
        </Container>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-white z-50 md:hidden shadow-2xl flex flex-col"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-semibold text-gray-900">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User Info (if logged in) */}
              {session && (
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.user?.image || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(session.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-4">
                <div className="px-3 space-y-1">
                  {navItems
                    .filter(item => !item.auth || session)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors',
                            isActive(item.href)
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="font-medium">{item.name}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-gray-400" />
                        </Link>
                      );
                    })}
                </div>

                {/* Language Section */}
                <div className="px-4 py-4 mt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-3 px-2">
                    <Globe className="h-3.5 w-3.5" />
                    Language
                  </div>
                  <LanguageSwitcher variant="outline" showLabel className="w-full justify-start" />
                </div>
              </nav>

              {/* Footer Actions */}
              <div className="p-4 border-t bg-gray-50 safe-bottom">
                {session ? (
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-center text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('logout')}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12">
                        {t('login')}
                      </Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full h-12">
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
      <div className="h-14 sm:h-16" />
    </>
  );
}
