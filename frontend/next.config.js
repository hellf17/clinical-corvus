const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable experimental features if needed
    swcMinify: true,
  },
  transpilePackages: ['framer-motion'],
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure proper module resolution for Radix UI packages
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    // Fix for webpack serialization issues
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },
  // Reduce bundle size and avoid serialization issues
  compress: true,
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    if (!isProd) return []

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
    const asList = (value) => (value || '').split(/[ ,]+/).filter(Boolean)
    const extraScript = asList(process.env.NEXT_PUBLIC_CSP_SCRIPT_SRC_EXTRA)
    const extraConnect = asList(process.env.NEXT_PUBLIC_CSP_CONNECT_SRC_EXTRA)
    const extraFrame = asList(process.env.NEXT_PUBLIC_CSP_FRAME_SRC_EXTRA)
    const extraImg = asList(process.env.NEXT_PUBLIC_CSP_IMG_SRC_EXTRA)
    const extraStyle = asList(process.env.NEXT_PUBLIC_CSP_STYLE_SRC_EXTRA)

    const scriptSrc = ["'self'", 'https://clerk.com', 'https://*.clerk.com', ...extraScript]
    const imgSrc = ["'self'", 'data:', 'blob:', 'https:', ...extraImg]
    const fontSrc = ["'self'", 'data:']
    const connectSrc = ["'self'", 'https:', 'wss://*.clerk.com', ...(backendUrl ? [backendUrl] : []), ...extraConnect]
    const frameSrc = ["'self'", 'https://clerk.com', 'https://*.clerk.com', ...extraFrame]
    const styleSrc = ["'self'", "'unsafe-inline'", ...extraStyle]
    const workerSrc = ["'self'", 'blob:']

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      `style-src ${styleSrc.join(' ')}`,
      `script-src ${scriptSrc.join(' ')}`,
      `img-src ${imgSrc.join(' ')}`,
      `font-src ${fontSrc.join(' ')}`,
      `connect-src ${connectSrc.join(' ')}`,
      `frame-src ${frameSrc.join(' ')}`,
      `worker-src ${workerSrc.join(' ')}`,
      "object-src 'none'",
      "manifest-src 'self'",
      // Framing protections
      "frame-ancestors 'none'"
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS: only enable when served over HTTPS and you control the domain
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
