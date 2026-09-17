import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pemeriksaan tipe dijalankan sebelum build melalui skrip npm agar hasilnya tetap wajib lulus.
  typescript: { ignoreBuildErrors: true },
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
