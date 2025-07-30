import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Disable ESLint during builds for Railway
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'true',
  },
  
  // Disable TypeScript checking during builds for Railway  
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'true',
  },
  
  // Disable the error overlay in production
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // Disable dev indicators in production
  devIndicators: false,
  
  // Railway-specific configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    // Explicitly expose the PDF conversion API URL
    NEXT_PUBLIC_PDF_CONVERSION_API_URL: process.env.NEXT_PUBLIC_PDF_CONVERSION_API_URL || 'https://backend-production-6048.up.railway.app',
  },
  
  
  
  // Configure domains for images (if using next/image)
  images: {
    domains: [
      'localhost', 
      '127.0.0.1',
      'd1.awsstatic.com', 
      'res.cloudinary.com',
      'cloudinary.com',
      // Add additional Cloudinary subdomains that might be used
      'dki0pkjto.cloudinary.com'
    ],
    unoptimized: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'true',
    // Add error handling for missing domains
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Headers configuration for Railway with comprehensive CORS
  async headers() {
    return [
      {
        // API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        // Static files and images
        source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico|css|js)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // Next.js assets
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Public folder assets
        source: '/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

export default nextConfig;
