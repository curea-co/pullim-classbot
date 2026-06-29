import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker prod 컨테이너용 standalone 출력 — .next/standalone에 server.js 생성
  output: "standalone",
  // 로컬 SSO: os.pullim.local 로 접속 시 Next dev cross-origin 리소스(HMR 등) 허용.
  allowedDevOrigins: ["os.pullim.local"],
  // 워크스페이스 패키지는 TS 소스를 그대로 export 하므로 Next 가 트랜스파일하도록 등록.
  transpilePackages: [
    "@pullim-classbot/api-client",
    "@pullim-classbot/auth",
    "@pullim-classbot/types",
  ],
};

export default nextConfig;
