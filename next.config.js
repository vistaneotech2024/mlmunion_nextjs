const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Reduce inline payload size
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
  },
  // Only add compiler.removeConsole in production (Turbopack doesn't support it in dev)
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: { exclude: ['error'] },
    },
  }),
  // Optimize HTML output
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  swcMinify: true,
  
  // Reduce inline scripts and data
  webpack: (config, { isServer, dev }) => {
    // Ignore Supabase Edge Functions files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*\/supabase\/functions\/.*$/,
      })
    );
    
    // Optimize for production - reduce inline data
    if (!dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.minimize = true;
      
      // Split chunks to reduce inline scripts
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
  
  // Headers for better SEO and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

