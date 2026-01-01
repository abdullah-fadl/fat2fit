import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // تعطيل Turbopack مؤقتاً إذا كانت هناك مشاكل
  // experimental: {
  //   turbo: {
  //     resolveAlias: {},
  //   },
  // },
  
  // إعدادات إضافية للاستقرار
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // إعدادات الصور
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
