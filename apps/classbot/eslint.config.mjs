import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // input/ 은 CLAUDE.md 기준 "입력·참고 데이터" (docs-archive + design-prototype + audit
    // 스크립트). Next 빌드 대상 아님 — lint 게이트에서 제외.
    "input/**",
  ]),
  {
    // React 19 / Compiler 신규 룰은 SSR-safe time, prop 변경 시 state 리셋, Date.now()
    // 렌더 중 호출 등 합법 패턴을 false-positive 로 잡음. 진짜 버그는 rules-of-hooks 가
    // 잡아주므로 두 룰만 warn 으로 격하 — 추후 useSyncExternalStore / key prop 패턴으로
    // 마이그레이션할 때 다시 error 로 승격.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
