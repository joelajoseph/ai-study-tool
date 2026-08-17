import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // PDF.js resolves its worker relative to its installed package. Keeping these
  // server-side packages external prevents Next's dev bundler from moving the
  // parser without its worker file.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
