import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker prod 컨테이너용 standalone 출력 — .next/standalone에 server.js 생성
  output: "standalone",
  // 로컬 SSO: os.pullim.local 로 접속 시 Next dev cross-origin 리소스(HMR 등) 허용.
  allowedDevOrigins: ["os.pullim.local"],
  /**
   * 개발용 신원 판정(`lib/dev-identity.ts`)이 **브라우저에서도** 배포 환경을 알게 한다.
   *
   * `VERCEL_ENV` 는 서버 전용이라 클라이언트 번들에 없다. 같은 뜻의 공개 변수
   * `NEXT_PUBLIC_VERCEL_ENV` 는 Vercel 프로젝트 설정(「Automatically expose System
   * Environment Variables」)에 달려 있어 **저장소만 보고는 보장되지 않는다.** 그 설정에
   * 기대면 PR preview 에서 역할 전환 버튼이 조용히 사라진다 — preview 를 살리는 게
   * 그 장치의 요구사항인데도.
   *
   * 그래서 빌드 때 **여기서 직접 실어 보낸다.** 저장소 안의 코드라 대시보드에서 따로 켤
   * 것이 없고, 서버가 읽는 값과 클라이언트가 읽는 값이 같은 출처에서 나온다.
   * 값이 없으면 빈 문자열이고, 그때 판정은 **닫히는 쪽**으로 접힌다(그 파일의 fail-closed 규칙).
   */
  env: {
    NEXT_PUBLIC_VERCEL_ENV:
      process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "",
  },
  // 워크스페이스 패키지는 TS 소스를 그대로 export 하므로 Next 가 트랜스파일하도록 등록.
  transpilePackages: [
    "@pullim-classbot/api-client",
    "@pullim-classbot/auth",
    "@pullim-classbot/types",
  ],
};

export default nextConfig;
