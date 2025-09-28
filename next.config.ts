import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for performance
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      '@tanstack/react-query-devtools',
      'date-fns',
      'zustand',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      'react-big-calendar',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },

  // Compiler optimizations for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },

  // Bundle analyzer and webpack optimizations
  webpack: (config: unknown, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    const webpackConfig = config as {
      optimization: {
        splitChunks: unknown;
        usedExports: boolean;
        sideEffects: boolean;
      };
      plugins: unknown[];
    };

    // Production optimizations
    if (!dev && !isServer) {
      // Enhanced code splitting
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Framework chunks (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // UI Library chunks
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
            name: 'ui-libraries',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // React Query and data fetching
          query: {
            test: /[\\/]node_modules[\\/](@tanstack)[\\/]/,
            name: 'react-query',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Calendar libraries
          calendar: {
            test: /[\\/]node_modules[\\/](react-big-calendar|date-fns)[\\/]/,
            name: 'calendar-libs',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Supabase and auth
          auth: {
            test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Common vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            minChunks: 2,
            maxSize: 244000, // 244KB max chunk size
          },
          // Common app code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            enforce: true,
            maxSize: 244000,
          },
        },
      };

      // Minimize bundle size
      webpackConfig.optimization.usedExports = true;
      webpackConfig.optimization.sideEffects = false;
    }

    // Bundle analyzer (when ANALYZE=true)
    if (process.env.ANALYZE === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')();
      webpackConfig.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: isServer ? 'server-bundle-analysis.html' : 'client-bundle-analysis.html',
        })
      );
    }

    return webpackConfig;
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;