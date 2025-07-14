/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pi-specific optimizations
  
  // Force Babel compilation (SWC not available on ARM)
  experimental: {
    forceSwcTransforms: false,
  },
  
  // Optimize for Pi memory constraints
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Reduce bundle size for Pi
  webpack: (config, { isServer }) => {
    // Reduce memory usage during build
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxSize: 100000, // 100KB chunks for Pi
      },
    };
    
    // ARM-specific optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Pi deployment settings
  output: 'standalone',
  poweredByHeader: false,
  
  // Exhibition-specific headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  // Environment-specific redirects for exhibition mode
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/',
          destination: '/?exhibition=true',
          permanent: false,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;