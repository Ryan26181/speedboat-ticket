"use client";

import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Ship,
  Shield,
  Clock,
  Headphones,
  MapPin,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  Anchor,
  Waves,
} from "lucide-react";

export default function AboutPage() {
  const features = [
    {
      icon: Zap,
      title: "Fast Booking",
      description: "Book your tickets in under 2 minutes with our streamlined booking process.",
    },
    {
      icon: Shield,
      title: "Secure Payment",
      description: "Your transactions are protected with bank-grade encryption and security.",
    },
    {
      icon: Clock,
      title: "Instant Confirmation",
      description: "Receive your e-ticket immediately after payment confirmation.",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Our customer support team is always ready to help you anytime.",
    },
  ];

  const stats = [
    { value: "50K+", label: "Happy Travelers" },
    { value: "100+", label: "Routes Available" },
    { value: "99%", label: "On-time Rate" },
    { value: "4.8", label: "User Rating" },
  ];

  const benefits = [
    "Skip the queue - no need to wait at the port",
    "Real-time schedule updates and notifications",
    "Easy refund and rescheduling options",
    "Digital tickets - no printing required",
    "Multiple payment methods available",
    "Family and group booking discounts",
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 lg:py-28 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
        </div>

        <Container className="relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <Anchor className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">About SpeedBoat</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Your Trusted Partner for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Island Hopping
              </span>
            </h1>
            
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              We connect the beautiful islands of Indonesia with fast, reliable, and comfortable speedboat services. 
              Book your journey with confidence.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/search">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  <Ship className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </Container>

        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-slate-50">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Choose SpeedBoat?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We make island travel simple, safe, and enjoyable for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 text-blue-600 mb-4">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-white">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                Travel Smarter with Digital Tickets
              </h2>
              <p className="text-slate-600 mb-8">
                Say goodbye to long queues and paper tickets. Our digital booking system 
                gives you the freedom to plan your journey anytime, anywhere.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link href="/search">
                  <Button size="lg">
                    Start Booking
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 rounded-3xl flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full opacity-20 blur-3xl" />
                  <div className="relative w-48 h-48 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Ship className="w-24 h-24 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Booking Confirmed</div>
                    <div className="text-xs text-slate-500">Just now</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">100+ Routes</div>
                    <div className="text-xs text-slate-500">Across Indonesia</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <Waves className="w-12 h-12 text-cyan-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Explore?
            </h2>
            <p className="text-slate-300 mb-8">
              Start your island adventure today. Book your speedboat ticket in minutes 
              and experience the beauty of Indonesian archipelago.
            </p>
            <Link href="/search">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                <Ship className="w-4 h-4 mr-2" />
                Search Schedules
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
