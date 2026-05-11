import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker prod 컨테이너용 standalone 출력 — .next/standalone에 server.js 생성
  output: "standalone",
};

export default nextConfig;
