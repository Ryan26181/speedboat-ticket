import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Optimize font loading - only load essential weights
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"], // Reduced from 7 to 4 weights for faster loading
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Speedboat Ticket - Book Your Sea Journey",
    template: "%s | Speedboat Ticket",
  },
  description:
    "Book speedboat tickets for inter-island travel. Fast, secure, and convenient booking for your sea travel needs.",
  // Add metadataBase for better SEO
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://speedboat-ticket.com'),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning className="overflow-x-hidden">
      <head>
        {/* DNS prefetch and preconnect for faster external resources */}
        <link rel="dns-prefetch" href="https://app.sandbox.midtrans.com" />
        <link rel="preconnect" href="https://app.sandbox.midtrans.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${poppins.variable} font-sans antialiased min-h-screen bg-background overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
