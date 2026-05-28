@AGENTS.md

# apps/classbot — 풀림 클래스봇 앱 가이드

이 앱은 **풀림 스터디 데모(`260506 pullim-study-demo`)** 에서 **풀림 클래스봇 도메인만** 떼어 낸 추출본입니다. 모노레포로 옮겨오면서 `src/`는 사라지고 `apps/classbot/` 직속 구조가 됐습니다.

원본의 6 도메인(스튜디오/스토어/플래너/Q/클래스봇/라이브러리) 중 **클래스봇만 살아 있고**, 나머지 도메인의 페이지·컴포넌트·mock·라우트는 모두 제거됐습니다. 사이드바·하단탭·역할 전환(GNB)도 클래스봇/빌더 라우트만 노출하도록 좁혀져 있습니다.

루트 모노레포 가이드는 [/CLAUDE.md](../../CLAUDE.md), 도메인 권위는 [`input/docs-archive/07_풀림_클래스봇_핸드오프.md`](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md).

## 1. 살아 있는 영역 (apps/classbot/ 직속)

| 구분 | 경로 | 비고 |
|---|---|---|
| 학생 라우트 | `app/(student)/classbot/{,chat,discover,replay,replay/[id],onboarding}` | 5 페이지 + 동적 1 |
| 학생 루트 | `app/(student)/page.tsx` | `/classbot`로 즉시 redirect — 6 도메인 홈은 사라짐 |
| 교사 라우트 | `app/(teacher)/teacher/{,classbot,builder}` | 홈/내 클래스봇/봇 빌더 3 페이지 |
| 도메인 컴포넌트 | `components/classbot/*`, `components/builder/*` | 13 파일 |
| 공유 셸 | `components/shell/*` | Role = `student | teacher` (parent 분기 제거, CoachFab 제거) |
| 공유 UI (shadcn) | `components/ui/*`, `components/brand/*` | shadcn 프리미티브 |
| 도메인 mock | `lib/mock/{persona,family,tutor,classbot,chat}.ts` | 잔존 — Phase β 이후 DB 로 점진 대체 |
| Drizzle 스키마 | `lib/db/schema.ts` | classbot 도메인 테이블 |
| 토큰 / 유틸 | `lib/tokens/*`, `lib/utils.ts` | |
| Drizzle 마이그레이션 | `drizzle/` | 0000_stiff_ulik.sql + meta |

## 2. 사라진 영역 (작업 시 의식할 것)

다음은 **이 앱에 존재하지 않습니다.** 클래스봇 안에서 다른 도메인을 참조하는 코드를 새로 쓰지 말 것:

- 플래너 / Q(무한풀기·코치·분석·복습) / 라이브러리 / 스튜디오 / 스토어 페이지·컴포넌트
- 보호자 영역(`(parent)/parent/*`), `currentParent` UI 분기 (mock의 `family.ts`는 type만 살려둠)
- `lib/mock/{features,domains,planner,coach,tutor 본체,conqueror,infinity,memory,irt,xray,visual,phase1(채팅 외),subscriptions,billing,parent-notifications}`
- `components/{planner,planner-builder,planner-manage,infinity,coach,tutor,conqueror,memory,study-index,xray,visual,parent,study}` — 학생 홈 카드 위젯(`study/*`)도 함께 제거됨
- 공유 셸 중 `coach-fab.tsx` — `/q/talk` 의존 → 삭제

## 3. UI · 도메인 컨벤션

- **shadcn/ui** — `components/ui/*` 가 프리미티브 출처. `@pullim/design-system` 같은 외부 DS 패키지는 도입 안 함 (pullim 본체와 다른 점)
- **i18n 미도입** — 한글 하드코딩 OK. `useTranslations` 같은 호출 추가 금지
- **Sentry 미도입** — 에러 추적 라이브러리 추가 금지
- **drizzle ORM** — `lib/db/` 에서 스키마·쿼리. `drizzle.config.ts` 는 `apps/classbot/` 직속
- **mock 잔존** — `lib/mock/*` 가 데이터 권위. BE entity 와 동기화는 Phase β 이후 점진적
- **import alias** — `@/*` → `apps/classbot/*` (모노레포 root 아님, 이 앱 root)

## 4. 포트

| 서비스 | 포트 |
|---|---|
| classbot FE (Next.js) | **3032** |
| backend (NestJS) | 4032 |
| Postgres (docker compose) | 5434 → container 5432 |

`predev` 가 3032 점유 프로세스를 kill 하므로 dev 재시작은 마음 편히.

## 5. 작업 컨벤션 — 클래스봇 단일 도메인 락인

**해도 되는 것**
- `app/(student)/classbot/*`, `app/(teacher)/teacher/{classbot,builder}/*` 페이지·컴포넌트·mock 수정·신규
- `components/{classbot,builder}/*` 도메인 컴포넌트 수정·신규
- `lib/db/*`, `lib/mock/*`, `lib/tokens/*` 수정
- 클래스봇 import 경로 갱신, 클래스봇 onboarding 페이지/UX 작업
- `__tests__/`, `lib/**/__tests__/`, `components/**/__tests__/` 단위 테스트 추가
- 공유 셸(`components/shell/*`)·UI 프리미티브(`components/ui/*`) **read**

**확인 후에만 (사용자 명시 동의 필요)**
- 공유 셸 / UI / nav-config 수정 — 클래스봇 한 도메인만 쓰는 상황이라 보통 안전하지만, role/nav 변경은 보고 후 진행
- 사라진 다른 도메인의 mock/페이지 복원 — 원본을 다시 가져와야 하는 경우 사용자에게 보고
- `packages/{api-client,auth,types}` 편집 — backend 와 양쪽 영향 (현재는 빈 placeholder)

**하면 안 되는 것**
- 다른 도메인(플래너/Q/라이브러리 등) 코드를 새로 작성 — 추출본 범위 외. 필요하면 원본 풀림 스터디 데모 저장소 또는 `pullim` 본체에서 작업
- DS 패키지 (`@pullim/design-system` 등) import 추가 — 이 앱은 shadcn 단독

## 6. prod-verify — production 회귀 자동화

이 앱은 **production hit Playwright** 자산을 보유 (`apps/classbot/tests/e2e/*` + `.github/workflows/prod-verify.yml`):
- main push / 일일 schedule (UTC 23:00 = KST 08:00) / 수동 dispatch 세 경로로 https://pullim-classbot.vercel.app 검증
- HTML `<meta name="x-build-sha">` 와 commit SHA 일치 polling 후 Playwright 7 spec 실행
- 색·chat·slider 회귀 자동 검출

`apps/classbot/app/layout.tsx` 에 x-build-sha meta tag 가 임베드되어 있어야 polling 이 동작.

## 7. 검증 (이 앱 단독)

루트에서:
```bash
bun install
bun --filter @pullim-classbot/classbot typecheck
bun --filter @pullim-classbot/classbot lint
bun --filter @pullim-classbot/classbot build
bun --filter @pullim-classbot/classbot test
bun --filter @pullim-classbot/classbot dev    # http://localhost:3032/classbot
```

원본의 6 도메인 라우트(`/planner`, `/q`, `/library`, `/parent` 등)는 모두 404가 정상입니다.

## 8. 의존 패키지 (현재 모두 빈 placeholder)

- `@pullim-classbot/api-client` — FE→BE fetch 래퍼
- `@pullim-classbot/auth` — IAuthProvider 추상화
- `@pullim-classbot/types` — BE↔FE 공유 타입

세 패키지 모두 Phase β·δ 이후 채워 넣을 예정.
