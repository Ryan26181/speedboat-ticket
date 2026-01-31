"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

// Web Vitals thresholds based on Google's recommendations
const WEB_VITAL_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
} as const;

type MetricName = keyof typeof WEB_VITAL_THRESHOLDS;

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;
  navigationType: string;
  delta: number;
}

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITAL_THRESHOLDS[name];
  if (!thresholds) return 'good';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function getMetricColor(rating: string): string {
  switch (rating) {
    case 'good': return '#22c55e'; // green-500
    case 'needs-improvement': return '#f59e0b'; // amber-500
    case 'poor': return '#ef4444'; // red-500
    default: return '#6b7280'; // gray-500
  }
}

// Store metrics for debugging
const metricsStore: WebVitalMetric[] = [];

export function WebVitalsProvider() {
  useReportWebVitals((metric) => {
    const name = metric.name as MetricName;
    const rating = getRating(name, metric.value);
    
    const enhancedMetric: WebVitalMetric = {
      name,
      value: metric.value,
      rating,
      id: metric.id,
      navigationType: metric.navigationType,
      delta: metric.delta,
    };
    
    // Store for debugging
    metricsStore.push(enhancedMetric);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const color = getMetricColor(rating);
      console.log(
        `%c[Web Vitals] ${name}: ${Math.round(metric.value)}${name === 'CLS' ? '' : 'ms'} (${rating})`,
        `color: ${color}; font-weight: bold;`
      );
    }
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      sendToAnalytics(enhancedMetric);
    }
  });

  // Debug helper: expose metrics to window in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as Window & { __webVitals?: WebVitalMetric[] }).__webVitals = metricsStore;
    }
  }, []);

  return null;
}

// Send metrics to your analytics service
async function sendToAnalytics(metric: WebVitalMetric) {
  // Example: Send to your backend API
  // You can replace this with Google Analytics, Vercel Analytics, etc.
  
  try {
    // Using Navigator.sendBeacon for non-blocking analytics
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: Date.now(),
      });
      
      // Uncomment to enable analytics endpoint
      // navigator.sendBeacon('/api/analytics/web-vitals', body);
      void body; // Suppress unused variable warning
    }
  } catch (error) {
    // Silently fail - we don't want analytics to break the app
    console.debug('[Web Vitals] Failed to send analytics:', error);
  }
}

// Hook to get current web vitals metrics
export function useWebVitals() {
  return {
    metrics: metricsStore,
    getMetric: (name: MetricName) => 
      metricsStore.filter(m => m.name === name).pop(),
    getAllByName: (name: MetricName) => 
      metricsStore.filter(m => m.name === name),
    getSummary: () => {
      const summary: Partial<Record<MetricName, WebVitalMetric>> = {};
      for (const metric of metricsStore) {
        summary[metric.name] = metric;
      }
      return summary;
    },
  };
}

// Performance mark helper
export function perfMark(name: string) {
  if (typeof performance !== 'undefined') {
    performance.mark(name);
  }
}

// Performance measure helper
export function perfMeasure(name: string, startMark: string, endMark?: string) {
  if (typeof performance !== 'undefined') {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
      
      const entries = performance.getEntriesByName(name, 'measure');
      const entry = entries[entries.length - 1];
      
      if (process.env.NODE_ENV === 'development' && entry) {
        console.log(`[Perf] ${name}: ${Math.round(entry.duration)}ms`);
      }
      
      return entry?.duration;
    } catch {
      // Marks might not exist
    }
  }
  return undefined;
}

// Track component render time
export function trackRender(componentName: string) {
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  
  return {
    start: () => perfMark(startMark),
    end: () => {
      perfMark(endMark);
      return perfMeasure(`${componentName} render`, startMark, endMark);
    },
  };
}

// Track API call duration
export function trackApiCall(endpoint: string) {
  const id = `${endpoint}-${Date.now()}`;
  const startMark = `${id}-start`;
  const endMark = `${id}-end`;
  
  return {
    start: () => perfMark(startMark),
    end: () => {
      perfMark(endMark);
      return perfMeasure(`API: ${endpoint}`, startMark, endMark);
    },
  };
}
