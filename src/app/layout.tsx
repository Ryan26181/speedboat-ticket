import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { WebVitalsProvider } from "@/lib/web-vitals";

// Optimize font loading - only load essential weights
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

// Site configuration
const siteConfig = {
  name: "SpeedBoat Ticket",
  description: "Pesan tiket speedboat online dengan mudah dan cepat. Nikmati perjalanan laut yang nyaman ke berbagai destinasi wisata di Indonesia.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://speedboat-ticket.com",
  ogImage: "/og-image.jpg",
  twitterHandle: "@speedboatticket",
  locale: "id_ID",
  keywords: [
    "tiket speedboat",
    "pesan tiket kapal",
    "speedboat indonesia",
    "tiket kapal online",
    "transportasi laut",
    "wisata pulau",
    "ferry booking",
    "tiket ferry",
    "kapal cepat",
    "perjalanan laut",
  ],
};

export const metadata: Metadata = {
  // Basic metadata
  title: {
    default: `${siteConfig.name} - Pesan Tiket Speedboat Online`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "SpeedBoat Ticket Team" }],
  creator: "SpeedBoat Ticket",
  publisher: "SpeedBoat Ticket",
  metadataBase: new URL(siteConfig.url),

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: `${siteConfig.name} - Pesan Tiket Speedboat Online`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.ogImage}`,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Pesan Tiket Speedboat Online`,
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - Pesan Tiket Speedboat Online`,
    description: siteConfig.description,
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Manifest
  manifest: "/site.webmanifest",

  // Verification
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },

  // Alternate languages
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "id-ID": `${siteConfig.url}/id`,
      "en-US": `${siteConfig.url}/en`,
    },
  },

  // Category
  category: "travel",

  // Format detection
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
};

// JSON-LD Structured Data
function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Indonesian", "English"],
    },
    sameAs: [
      "https://facebook.com/speedboatticket",
      "https://twitter.com/speedboatticket",
      "https://instagram.com/speedboatticket",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteConfig.name,
    image: `${siteConfig.url}/logo.png`,
    url: siteConfig.url,
    description: siteConfig.description,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "ID",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className="overflow-x-hidden" lang="id">
      <head>
        <JsonLd />
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://app.sandbox.midtrans.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch */}
        <link rel="dns-prefetch" href="https://app.sandbox.midtrans.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased min-h-screen bg-background overflow-x-hidden`}
      >
        <WebVitalsProvider />
        {children}
      </body>
    </html>
  );
}
