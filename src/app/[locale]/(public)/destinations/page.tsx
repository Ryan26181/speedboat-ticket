"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { MapPin, Ship, ArrowRight, Search, Loader2, Waves, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface Port {
  id: string;
  name: string;
  code: string;
  city: string;
  province: string;
  imageUrl?: string;
  routesCount: number;
}

export default function DestinationsPage() {
  const t = useTranslations("destinations");
  const [ports, setPorts] = useState<Port[]>([]);
  const [filteredPorts, setFilteredPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchPorts() {
      try {
        const response = await fetch("/api/ports?limit=-1&status=ACTIVE");
        const data = await response.json();
        if (data.data) {
          setPorts(data.data);
          setFilteredPorts(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch ports:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPorts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPorts(ports);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPorts(
        ports.filter(
          (port) =>
            port.name.toLowerCase().includes(query) ||
            port.city.toLowerCase().includes(query) ||
            port.province.toLowerCase().includes(query) ||
            port.code.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, ports]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary-600 via-primary-500 to-blue-500 py-20 sm:py-28">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
          <Waves className="absolute bottom-0 left-0 h-32 w-full text-white/5" />
          <Anchor className="absolute top-20 right-20 h-24 w-24 text-white/10 rotate-12" />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <MapPin className="h-4 w-4" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
              {t("hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Search and Ports Grid */}
      <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("search.placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <span className="ml-3 text-muted-foreground">{t("loading")}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPorts.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
                <MapPin className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t("empty.title")}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("empty.description")}
              </p>
            </div>
          )}

          {/* Ports Grid */}
          {!loading && filteredPorts.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("results.title")}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {t("results.count", { count: filteredPorts.length })}
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPorts.map((port) => (
                  <Card
                    key={port.id}
                    className="group cursor-pointer overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                  >
                    {/* Image or Gradient Placeholder */}
                    <div className="relative h-40 bg-linear-to-br from-primary-400 to-blue-500 overflow-hidden">
                      {port.imageUrl ? (
                        <img
                          src={port.imageUrl}
                          alt={port.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Ship className="h-16 w-16 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                      
                      {/* Port Code Badge */}
                      <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary-600 dark:text-primary-400">
                        {port.code}
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary-600 transition-colors">
                        {port.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{port.city}, {port.province}</span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Ship className="h-4 w-4 text-primary-500" />
                          <span>
                            {t("card.routes", { count: port.routesCount })}
                          </span>
                        </div>
                        <Link
                          href={`/search?from=${port.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700 group-hover:gap-2 transition-all"
                        >
                          {t("card.explore")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300"
            >
              <Link href="/search">
                {t("cta.button")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
