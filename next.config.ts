import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Bundle analyzer for performance analysis
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // Security headers
  async headers() {
    // Determine if we're in production
    const isProd = process.env.NODE_ENV === "production";
    
    // CSP directives - more permissive in development
    const cspDirectives = [
      "default-src 'self'",
      // Scripts - allow inline for Next.js, and external payment SDK
      `script-src 'self' 'unsafe-inline' ${isProd ? "" : "'unsafe-eval'"} https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com`,
      // Styles - allow inline for styled-components/emotion
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images - allow data URIs for QR codes, and external images
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Connect - API calls and websockets
      `connect-src 'self' ${isProd ? "" : "ws://localhost:* http://localhost:*"} https://app.sandbox.midtrans.com https://app.midtrans.com https://api.midtrans.com https://accounts.google.com`,
      // Frames - for payment popups
      "frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com https://accounts.google.com",
      // Objects
      "object-src 'none'",
      // Base URI
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
      // Frame ancestors - prevent clickjacking
      "frame-ancestors 'none'",
      // Upgrade insecure requests in production
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          // Prevent cross-domain policy files (Flash/Silverlight)
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // Strict Transport Security (HTTPS only in production)
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      // Cache static assets
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Don't cache API routes
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds to succeed even if there are type errors
    // Set to false in CI/CD for strict type checking
    ignoreBuildErrors: false,
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
