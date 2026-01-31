import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "Speedboat Ticket - Book Your Sea Journey",
    template: "%s | Speedboat Ticket",
  },
  description:
    "Book speedboat tickets for inter-island travel. Fast, secure, and convenient booking for your sea travel needs.",
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
      <body
        className={`${poppins.variable} font-sans antialiased min-h-screen bg-background overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
