/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['fal.media', 'storage.googleapis.com', 'v2.fal.media'],
  },
  // Vercel-specific optimizations
  poweredByHeader: false,
  compress: true,
}

export default nextConfig
