import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ensure middleware dependencies are properly traced
  serverExternalPackages: ['bcryptjs'],
};

export default nextConfig;
