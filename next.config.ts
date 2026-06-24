import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브/대용량 패키지는 서버 번들에서 제외 (런타임에 require)
  serverExternalPackages: ["puppeteer", "sharp", "unpdf"],
};

export default nextConfig;
