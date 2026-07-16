/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint is run explicitly in CI; do not fail production builds on lint.
    ignoreDuringBuilds: true,
  },
  images: {
    // Supabase Storage signed URLs are served from the project domain.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
