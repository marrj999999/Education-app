import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration - silence lockfile warning
  turbopack: {
    root: __dirname,
  },

  // Enable gzip compression
  compress: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Add caching headers for static assets
  async headers() {
    return [
      {
        // Cache static assets for 1 year
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache JS/CSS bundles
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  images: {
    // Allow Notion-hosted images and common external image hosts
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.notion.so',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'bamboobicycleclub.org',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
    // Optimize image formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for the sizes attribute
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Quality settings
    qualities: [25, 50, 75, 85, 100],
    // Cache optimized images for 24 hours
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
