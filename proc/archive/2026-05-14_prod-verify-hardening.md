# 2026-05-14 — prod-verify 회귀 자동화 강건화 (SHA 신선도 + spec 이식성)

## 목표
어제 prod-verify workflow 첫 자동 트리거에서 노출된 함정 2건을 근본 해결.

1. **Vercel deploy 신선도 미검증** — main push 4번에도 production CDN이 21시간 전 빌드 서빙(`x-vercel-cache: HIT` + `age: 76688s`). polling이 `/` 200만 확인해서 "새 빌드가 실제로 라이브인지"를 모름.
2. **3 spec의 localhost 하드코딩** — `assignment-dispatch`/`feedback-loop`/`mobile-and-focus` 가 `const BASE = 'http://localhost:3032'`. PR #41에서 workflow가 4 spec만 명시 실행하도록 우회했지만 prod 회귀 커버리지가 4/7로 줄어든 상태.

해결 후 workflow는 7 spec 전부 production hit, stale build는 polling이 잡아낸다.

## 배경
- PR #39 머지 직후 자동 트리거: polling 5분 timeout fail (원인은 `/` 308 → PR #40 fix).
- PR #40 머지 후 두 번째 자동 트리거: polling은 통과했으나 Playwright 13/N fail. 원인 두 갈래:
  - production CDN이 stale build(`x-vercel-cache: HIT` + `age: 76688s`) → "국어 누나" HTML 부재 → cb_004 e2e fail.
  - 3 spec의 `BASE = 'http://localhost:3032'` 하드코딩 → `ERR_CONNECTION_REFUSED`.
- 응급 처치(PR #41): workflow가 prod-safe 4 spec만 명시 실행. 동시에 `bunx vercel --prod` 로 수동 deploy 트리거해서 CDN을 신선화.
- 본 plan은 응급 처치 후의 근본 fix.

## 정책

### 함정 1 — SHA fingerprint로 신선도 검증
- 모든 production HTML `<head>`에 `<meta name="x-build-sha" content="<sha>">` 를 박는다.
- Vercel 빌드 시 `VERCEL_GIT_COMMIT_SHA` env 자동 주입 → Next.js root layout `metadata.other`에서 노출.
- workflow polling 변경: `"/" 200 응답"` → `"static page HTML이 expected SHA 포함"`. expected = `github.sha`.
- 10분까지 polling. 일치 못 하면 fail + 매 attempt마다 현재 prod의 SHA를 로그에 출력해 진단 쉬워짐.
- 토큰 불요 설계 유지 (`VERCEL_TOKEN` 필요 없음 — HTML만 보면 됨).

### 함정 2 — spec BASE 환경변수 의존
- 3 spec의 `const BASE = 'http://localhost:3032'` → `const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032'`.
- 로컬 dev 동작은 동일, CI에선 env가 prod URL 주입.
- localStorage flow는 Playwright의 페이지/컨텍스트 격리로 production hit에서도 동일하게 동작.

## 작업 항목

### A. SHA fingerprint 임베드
- [x] `src/app/layout.tsx` `metadata.other`에 `'x-build-sha'` 추가 — `process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'dev'`.
- [x] 빌드 후 정적 라우트 HTML에서 meta 태그 존재 확인.

### B. 3 spec BASE 리팩토링
- [x] `tests/e2e/assignment-dispatch.spec.ts` BASE → env 분기.
- [x] `tests/e2e/feedback-loop.spec.ts` BASE → env 분기.
- [x] `tests/e2e/mobile-and-focus.spec.ts` BASE → env 분기.

### C. workflow 강화
- [x] `.github/workflows/prod-verify.yml`:
  - "Wait for production deploy" → "Wait for production SHA match" 교체.
    - polling 대상: `$PROD_URL/classbot/chat` (static prerender).
    - grep: `name="x-build-sha"[^>]*content="${{ github.sha }}"`.
    - 매 attempt에 현재 prod의 SHA를 로그에 출력.
    - timeout 10분 (120 attempts × 5초).
  - "Run Playwright against production (prod-safe specs)" → 7 spec 전부 명시 (3 spec re-include).

### D. 검증
- [x] `bun x tsc --noEmit` clean.
- [x] `bun run build` 통과 + 빌드 결과 HTML grep으로 SHA meta 확인.
- [x] 로컬 회귀 `bun x playwright test` 28/28 무회귀.
- [x] 로컬 production hit `PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app bun x playwright test` — 3 spec 추가분 포함 통과 (어제 PR #41 직후 새로 deploy된 build 기준).
- [x] PR 머지 후 자동 `push:main` 트리거 — polling이 `${{ github.sha }}` 매칭 + 7 spec green. (※ 첫 자동 트리거에서 polling 10분 timeout: **Vercel GitHub webhook이 PR #41·#42 push에 대해 자동 deploy를 트리거하지 않은 상태 재현**. `bunx vercel --prod` 수동 강제 후 SHA = HEAD 일치 확인. 후속 `workflow_dispatch` 재실행 [run 25841721946](https://github.com/curea-co/pullim-classbot/actions/runs/25841721946) 1m33s green — 28 spec production hit 모두 통과.)

### E. 마무리
- [x] knowhow doc § 8에 SHA 신선도 검증 패턴 cross-link.
- [x] dev/main PR 머지.

## 정합성 검토 노트

- **Layout metadata 평가 시점**: Next.js 16 metadata는 정적 라우트의 경우 build time, 동적 라우트는 request time. `/classbot/chat`은 prerendered (build 출력의 `○ Static`) → build time에 SHA가 박힌다. Vercel build env가 그대로 들어감.
- **dev 환경의 fallback `'dev'`**: 로컬 `bun run build`엔 `VERCEL_GIT_COMMIT_SHA`/`GITHUB_SHA` 없음 → `'dev'` 박힘. production HTML과 자연 구분.
- **CDN cache 갱신 보장**: SHA가 build artifact에 박혀 있어 새 build가 production에 propagate되는 순간 SHA가 바뀐다. CDN이 invalidate 되며 fresh page를 응답하기 시작하면 polling이 그 순간을 정확히 캐치.
- **`github.sha` vs Vercel build SHA**: push 이벤트의 `github.sha`는 push된 head commit. Vercel은 그 commit을 빌드한다. 일치 보장.
- **3 spec localStorage 격리**: Playwright `fullyParallel: false` + `test()` 각각 새 페이지/컨텍스트 → production에서도 동일 분리 동작. mock 데이터는 빌드에 inline되므로 prod에서도 동일.
- **schedule/dispatch에서의 polling 생략**: workflow는 `if: github.event_name == 'push'` 가드로 polling을 push에만 적용. schedule/dispatch는 현재 prod 상태 그대로 hit — 의도된 동작 (수동/주기 검증은 "지금 라이브 뭐가 있나" 확인 용도).

## 완료 기준
- [x] production HTML `<head>`에 `<meta name="x-build-sha" content="<full-sha>">` 존재 (로컬 build `dev`, prod build commit SHA — 현재 prod = `b444160…`)
- [x] workflow polling이 `github.sha` 일치까지 대기 + 일치 후 green (push 자동 트리거 polling fail은 Vercel webhook 결함 — 별도 항목)
- [x] 28 spec 전부 production hit으로 통과 ([run 25841721946](https://github.com/curea-co/pullim-classbot/actions/runs/25841721946))
- [x] dev/main PR 머지 (PR #42)

## 후속 — Vercel auto-deploy 결함 (별도 plan 후보)
PR #42 main push 후에도 Vercel은 자동 deploy를 트리거하지 않았다. `bun x vercel ls` 로 확인 — 마지막 production deploy가 어제 11:21 KST의 수동 `bunx vercel --prod`. PR #41 main push, PR #42 main push 모두 자동 deploy 누락. Workflow의 SHA polling이 deploy 없음을 정확히 잡아냈지만(설계 의도), 매번 수동 force deploy를 요구하는 건 운영 비용 증가.

해결 방향(후속 plan):
1. **Vercel ↔ GitHub integration 점검** — Vercel 대시보드의 Git Integration 설정 확인, webhook 재설치. CEO 권한 필요.
2. **workflow에 fallback deploy step 추가** — polling이 timeout 직전에 `bun x vercel --prod` 자동 호출. `VERCEL_TOKEN` secret 필요 — 어제 G1 컨펌에서 "토큰 불요" 선택했으니 그 결정 번복 필요.

본 plan은 함정 자체(신선도 검증·spec 이식성)는 해결. Vercel webhook 결함은 인프라 레이어 이슈로 별도 다룸.
