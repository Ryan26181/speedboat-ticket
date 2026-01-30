import { Suspense } from "react";
import { Link } from "@/i18n/routing";
import { Ship, Shield, Clock, CreditCard, MapPin, ArrowRight, Waves, Anchor, Compass, Star, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchForm } from "@/components/features/search-form";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

// Format duration from minutes to readable string
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours}h ${mins}m`;
}

// Format price to Indonesian Rupiah
function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Popular routes component - fetches from database
async function PopularRoutes() {
  const t = await getTranslations('home');
  
  // Fetch active routes from database (limit to 4)
  const routes = await prisma.route.findMany({
    where: { status: "ACTIVE" },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      departurePort: { select: { name: true, city: true } },
      arrivalPort: { select: { name: true, city: true } },
    },
  });

  // If no routes in database, show empty state
  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <Ship className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No routes available yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {routes.map((route) => (
        <Link key={route.id} href={`/search?from=${route.departurePortId}&to=${route.arrivalPortId}`}>
          <Card className="group cursor-pointer overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 relative">
              {/* Route visualization */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30">
                    <span className="text-white text-xs font-bold">{t('routes.from')}</span>
                  </div>
                  <div>
                    <span className="font-bold text-lg text-foreground">{route.departurePort.city}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pl-5">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-primary-500 rounded-full"></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Ship className="h-3.5 w-3.5 text-primary-500" />
                    <span>{formatDuration(route.estimatedDuration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30">
                    <span className="text-white text-xs font-bold">{t('routes.to')}</span>
                  </div>
                  <div>
                    <span className="font-bold text-lg text-foreground">{route.arrivalPort.city}</span>
                  </div>
                </div>
              </div>
              
              {/* Price and CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('routes.startingFrom')}</p>
                  <p className="text-xl font-extrabold text-primary-600">
                    {formatPrice(route.basePrice)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center group-hover:bg-primary-500 transition-all duration-300">
                  <ArrowRight className="h-5 w-5 text-primary-500 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('home');
  
  // Features data with translations
  const features = [
    {
      icon: Clock,
      title: t('features.fast.title'),
      description: t('features.fast.description'),
      color: "from-blue-500 to-blue-600",
      shadowColor: "shadow-blue-500/30",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      icon: Shield,
      title: t('features.secure.title'),
      description: t('features.secure.description'),
      color: "from-emerald-500 to-emerald-600",
      shadowColor: "shadow-emerald-500/30",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      icon: CreditCard,
      title: t('features.eticket.title'),
      description: t('features.eticket.description'),
      color: "from-purple-500 to-purple-600",
      shadowColor: "shadow-purple-500/30",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      icon: Ship,
      title: t('features.routes.title'),
      description: t('features.routes.description'),
      color: "from-primary-500 to-primary-600",
      shadowColor: "shadow-primary-500/30",
      bgColor: "bg-primary-50 dark:bg-primary-900/20",
    },
  ];

  // Stats data with translations
  const stats = [
    { value: "50K+", label: t('stats.travelers'), icon: Users },
    { value: "100+", label: t('stats.routes'), icon: Compass },
    { value: "4.8", label: t('stats.rating'), icon: Star },
    { value: "99%", label: t('stats.onTime'), icon: CheckCircle },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 py-24 md:py-36">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="waves" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 Q5 5, 10 10 T20 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-400" />
            </pattern>
            <rect x="0" y="0" width="100" height="100" fill="url(#waves)" />
          </svg>
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGMxLjI1NCAwIDIuNDc4LS4xMjggMy42Ni0uMzcyIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-amber-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        
        {/* Decorative icons */}
        <div className="absolute top-32 right-20 text-white/5 hidden lg:block">
          <Anchor className="h-32 w-32" />
        </div>
        <div className="absolute bottom-32 left-20 text-white/5 hidden lg:block">
          <Waves className="h-24 w-24" />
        </div>

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center text-white">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 shadow-xl hover:bg-white/15 transition-all duration-300">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <Ship className="h-4 w-4 text-cyan-300" />
              <span className="text-sm font-semibold">{t('hero.badge')}</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">{t('hero.title')}</span>
              <span className="block mt-4 bg-gradient-to-r from-cyan-300 via-primary-300 to-cyan-300 bg-clip-text text-transparent">{t('hero.subtitle')}</span>
            </h1>
            
            <p className="mt-8 text-lg text-slate-300 md:text-xl max-w-2xl mx-auto leading-relaxed">
              {t('hero.description')}
            </p>
            
            {/* Stats Row */}
            <div className="mt-10 flex flex-wrap justify-center gap-8 md:gap-12">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center group">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl md:text-3xl font-bold text-white">{stat.value}</span>
                  </div>
                  <span className="text-sm text-slate-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search Form */}
          <div className="mx-auto mt-14 max-w-5xl">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-2 border border-white/10 shadow-2xl">
              <SearchForm variant="hero" />
            </div>
          </div>
        </div>
        
        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L48 45.7C96 41 192 33 288 35.3C384 38 480 52 576 58.3C672 65 768 63 864 55C960 47 1056 33 1152 30C1248 27 1344 35 1392 38.7L1440 43V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" className="fill-background"/>
          </svg>
        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-background via-background to-slate-50 dark:to-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-full mb-4 shadow-sm">
              <MapPin className="h-4 w-4" />
              {t('routes.badge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground">
              {t('routes.title')} <span className="text-primary-600">{t('routes.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
              {t('routes.subtitle')}
            </p>
          </div>

          <Suspense fallback={<div className="h-48 animate-shimmer rounded-2xl" />}>
            <PopularRoutes />
          </Suspense>

          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" asChild className="gap-2 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-all duration-300">
              <Link href="/search">
                {t('routes.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20 md:py-28 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-full mb-4 shadow-sm">
              <Star className="h-4 w-4" />
              {t('features.badge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground">
              {t('features.title')} <span className="text-primary-600">{t('features.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <Card key={idx} className="group border-0 bg-white dark:bg-slate-800 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <CardContent className="p-8 text-center relative">
                  {/* Background glow on hover */}
                  <div className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  <div className="relative">
                    <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg ${feature.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
            
            <CardContent className="p-0 relative">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-10 md:p-16 lg:p-20">
                  <div className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-cyan-300 bg-white/10 rounded-full mb-6">
                    <Compass className="h-4 w-4" />
                    {t('cta.badge')}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                    {t('cta.title')} <span className="text-cyan-300">{t('cta.titleHighlight')}</span>
                  </h2>
                  <p className="mt-6 text-slate-300 text-lg leading-relaxed max-w-lg">
                    {t('cta.description')}
                  </p>
                  
                  {/* Trust badges */}
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>{t('cta.badges.confirmation')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span>{t('cta.badges.secure')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      <span>{t('cta.badges.support')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Button size="lg" asChild className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 gap-2">
                      <Link href="/search">
                        <Ship className="h-5 w-5" />
                        {t('cta.searchButton')}
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                      <Link href="/help">{t('cta.learnMore')}</Link>
                    </Button>
                  </div>
                </div>
                
                {/* Right side decoration */}
                <div className="hidden lg:flex lg:w-2/5 items-center justify-center relative p-10">
                  <div className="relative">
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-4 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                    <div className="absolute inset-8 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
                    
                    {/* Central ship icon */}
                    <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary-500/30 to-cyan-500/30 backdrop-blur-xl flex items-center justify-center border border-white/20">
                      <Ship className="h-24 w-24 text-white/80" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
