/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Raspberry Pi performance
  swcMinify: false, // Disable SWC minification for ARM compatibility
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable static exports for better performance
  output: 'standalone',
  
  // Disable image optimization (resource intensive)
  images: {
    unoptimized: true,
  },
  
  // Experimental features for better ARM performance
  experimental: {
    // Reduce memory usage
    workerThreads: false,
    cpus: 2, // Limit CPU usage for Pi
  },
  
  // Environment variables for Raspberry Pi
  env: {
    IS_RASPBERRY_PI: 'true',
  },
  
  // Webpack configuration for ARM optimization
  webpack: (config, { isServer }) => {
    // Disable source maps in production for memory savings
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }
    
    // Add polyfills for browser APIs if needed
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
};

export default nextConfig;