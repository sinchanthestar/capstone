/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO: Set to false after fixing pre-existing TypeScript errors
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure Turbopack (Next dev) uses the project root when multiple lockfiles exist
  turbopack: {
    root: './',
  },
}

export default nextConfig
