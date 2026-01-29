"use client";

import { ReactNode, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
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
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles?: string[];
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('dashboard.menu');
  const tNav = useTranslations('navigation');
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=" + encodeURIComponent(pathname));
    }
  }, [status, router, pathname]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Define nav items with translations
  const userNavItems: NavItem[] = [
    { label: t('overview'), href: "/user", icon: <Home className="h-5 w-5" /> },
    { label: t('bookings'), href: "/user/bookings", icon: <Ticket className="h-5 w-5" /> },
    { label: tNav('profile'), href: "/user/profile", icon: <User className="h-5 w-5" /> },
  ];

  const operatorNavItems: NavItem[] = [
    { label: t('overview'), href: "/operator", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: t('schedules'), href: "/operator/schedules", icon: <Calendar className="h-5 w-5" /> },
    { label: t('bookings'), href: "/operator/bookings", icon: <Ticket className="h-5 w-5" /> },
    { label: t('validate'), href: "/operator/validate", icon: <Users className="h-5 w-5" /> },
  ];

  const adminNavItems: NavItem[] = [
    { label: t('overview'), href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: t('ships'), href: "/admin/ships", icon: <Ship className="h-5 w-5" /> },
    { label: t('ports'), href: "/admin/ports", icon: <MapPin className="h-5 w-5" /> },
    { label: t('routes'), href: "/admin/routes", icon: <Route className="h-5 w-5" /> },
    { label: t('schedules'), href: "/admin/schedules", icon: <Calendar className="h-5 w-5" /> },
    { label: t('bookings'), href: "/admin/bookings", icon: <Ticket className="h-5 w-5" /> },
    { label: t('payments'), href: "/admin/payments", icon: <CreditCard className="h-5 w-5" /> },
    { label: t('users'), href: "/admin/users", icon: <Users className="h-5 w-5" /> },
    { label: t('reports'), href: "/admin/reports", icon: <BarChart3 className="h-5 w-5" /> },
  ];

  // Get nav items based on role and current path
  const getNavItems = (): NavItem[] => {
    const role = session?.user?.role;
    
    // Remove locale prefix from pathname for matching (e.g., /en/admin -> /admin)
    const pathWithoutLocale = pathname.replace(/^\/(en|id)/, '');
    
    if (pathWithoutLocale.startsWith("/admin") && role === "ADMIN") {
      return adminNavItems;
    }
    if (pathWithoutLocale.startsWith("/operator") && (role === "OPERATOR" || role === "ADMIN")) {
      return operatorNavItems;
    }
    return userNavItems;
  };

  const navItems = getNavItems();

  // Remove locale prefix for path matching
  const pathWithoutLocale = pathname.replace(/^\/(en|id)/, '');

  // Check if current path is active
  const isActive = (href: string) => {
    if (href === "/user" || href === "/admin" || href === "/operator") {
      return pathWithoutLocale === href;
    }
    return pathWithoutLocale.startsWith(href);
  };

  // Loading state
  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (status === "unauthenticated") {
    return null;
  }

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Ship className="h-6 w-6 text-primary" />
          <span className="font-bold">SpeedBoat</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-background border-r transform transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center gap-2 px-4 border-b">
          <Link href="/" className="flex items-center gap-2">
            <Ship className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SpeedBoat</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Role Switcher (for admin) */}
        {user?.role === "ADMIN" && (
          <div className="px-4 mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 px-3">
              {t('switchView')}
            </p>
            <div className="space-y-1">
              <Link
                href="/user"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith("/user")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <User className="h-4 w-4" />
                {t('userView')}
              </Link>
              <Link
                href="/operator"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith("/operator")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Settings className="h-4 w-4" />
                {t('operatorView')}
              </Link>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                {t('adminView')}
              </Link>
            </div>
          </div>
        )}

        {/* Sidebar Footer - User Menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {tNav('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
