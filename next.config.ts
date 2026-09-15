import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 親フォルダ（system\claude）をプロジェクトの根と誤認して tailwindcss を探しに行くのを防ぐ
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
