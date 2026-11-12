/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // One app, two surfaces: the marketing site (app/(site)) and the OS
  // (app/(os)) each have their own root layout, so unmatched URLs need a
  // global 404 (app/global-not-found.tsx).
  experimental: {
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // OS media is served from Cloudflare R2 (signed URLs).
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
