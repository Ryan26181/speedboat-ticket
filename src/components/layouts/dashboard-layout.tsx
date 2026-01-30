'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship,
  Home,
  Ticket,
  User,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Users,
  MapPin,
  Route,
  Calendar,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  children: ReactNode;
  role?: 'user' | 'admin' | 'operator';
}

export function DashboardLayout({ children, role = 'user' }: DashboardLayoutProps) {
  const t = useTranslations('dashboard.menu');
  const tNav = useTranslations('navigation');
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen, isMobile]);

  // Navigation items based on role
  const userNavSections: NavSection[] = [
    {
      items: [
        { label: t('overview'), href: '/user', icon: <Home className="h-5 w-5" /> },
      ],
    },
    {
      title: 'My Travel',
      items: [
        { label: t('bookings'), href: '/user/bookings', icon: <Ticket className="h-5 w-5" /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: tNav('profile'), href: '/user/profile', icon: <User className="h-5 w-5" /> },
      ],
    },
  ];

  const adminNavSections: NavSection[] = [
    {
      items: [
        { label: t('overview'), href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: t('ships'), href: '/admin/ships', icon: <Ship className="h-5 w-5" /> },
        { label: t('ports'), href: '/admin/ports', icon: <MapPin className="h-5 w-5" /> },
        { label: t('routes'), href: '/admin/routes', icon: <Route className="h-5 w-5" /> },
        { label: t('schedules'), href: '/admin/schedules', icon: <Calendar className="h-5 w-5" /> },
      ],
    },
    {
      title: 'Transactions',
      items: [
        { label: t('bookings'), href: '/admin/bookings', icon: <Ticket className="h-5 w-5" /> },
        { label: t('payments'), href: '/admin/payments', icon: <CreditCard className="h-5 w-5" /> },
      ],
    },
    {
      title: 'System',
      items: [
        { label: t('users'), href: '/admin/users', icon: <Users className="h-5 w-5" /> },
        { label: t('reports'), href: '/admin/reports', icon: <BarChart3 className="h-5 w-5" /> },
      ],
    },
  ];

  const operatorNavSections: NavSection[] = [
    {
      items: [
        { label: t('overview'), href: '/operator', icon: <LayoutDashboard className="h-5 w-5" /> },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: t('schedules'), href: '/operator/schedules', icon: <Calendar className="h-5 w-5" /> },
        { label: t('bookings'), href: '/operator/bookings', icon: <Ticket className="h-5 w-5" /> },
        { label: t('validate'), href: '/operator/validate', icon: <Users className="h-5 w-5" /> },
      ],
    },
  ];

  const getNavSections = (): NavSection[] => {
    switch (role) {
      case 'admin':
        return adminNavSections;
      case 'operator':
        return operatorNavSections;
      default:
        return userNavSections;
    }
  };

  const navSections = getNavSections();

  // Remove locale prefix for path matching
  const pathWithoutLocale = pathname.replace(/^\/(en|id)/, '');

  const isActive = (href: string) => {
    if (href === '/user' || href === '/admin' || href === '/operator') {
      return pathWithoutLocale === href;
    }
    return pathWithoutLocale.startsWith(href);
  };

  const user = session?.user;
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Sidebar Content Component
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🚤</span>
          <span className="font-bold text-lg text-gray-900">Speedboat</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="mb-4">
            {section.title && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive(item.href)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image || ''} alt={user?.name || 'User'} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/user/profile" className="inline-flex items-center">
                <User className="h-4 w-4 mr-2" />
                {tNav('profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/" className="inline-flex items-center">
                <Home className="h-4 w-4 mr-2" />
                {t('backToHome')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {tNav('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-white border-r shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 sm:w-80 bg-white z-50 lg:hidden shadow-2xl flex flex-col"
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 z-10"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">🚤</span>
              <span className="font-bold text-gray-900">Speedboat</span>
            </Link>

            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || ''} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                {session?.user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-56px)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
