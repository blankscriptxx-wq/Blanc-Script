/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // When you host portfolio media on an external CDN, whitelist the host here:
    // remotePatterns: [{ protocol: "https", hostname: "cdn.yourdomain.com" }],
  },
};

export default nextConfig;
