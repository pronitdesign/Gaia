import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  experimental: {
    // Cache em disco desligado: o iCloud (Desktop sync) corrompe os arquivos do Turbopack
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
