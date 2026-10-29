import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure server secrets are never bundled for the client
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
