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

- **UI 소스는 3레인으로 갈린다** — 아래 [§ 3.1 PUDS 레인 판별표](#31-puds-디자인-시스템--3레인-판별표) 가 권위.
  요지: 토큰·셸은 **PUDS 원격에서 벤더링**, 프리미티브는 **로컬 base-ui**, 나머지는 서비스 고유.
  npm DS **패키지**(`@pullim/design-system` 등)를 dependency 로 추가하는 건 여전히 **금지**다 —
  PUDS 는 패키지가 아니라 `shadcn add` 로 소스를 복사해 오는 방식이라 이 금지와 충돌하지 않는다.
- **i18n 미도입** — 한글 하드코딩 OK. `useTranslations` 같은 호출 추가 금지
- **Sentry 미도입** — 에러 추적 라이브러리 추가 금지
- **drizzle ORM** — `lib/db/` 에서 스키마·쿼리. `drizzle.config.ts` 는 `apps/classbot/` 직속
- **mock 잔존** — `lib/mock/*` 가 데이터 권위. BE entity 와 동기화는 Phase β 이후 점진적
- **import alias** — `@/*` → `apps/classbot/*` (모노레포 root 아님, 이 앱 root)

### 3.1 PUDS 디자인 시스템 — 3레인 판별표

[PUDS](https://github.com/curea-co/pullim-design-system)(풀림 통합 디자인 시스템)를 **버전 고정 URL** 로
쓴다. `shadcn add` 는 npm 의존이 아니라 **소스를 이 리포로 복사(벤더링)** 하므로, 받아 온 파일은
그때부터 이 리포에 커밋된 우리 소스다. 그래서 **어느 파일이 어느 레인인지**가 곧 규칙이다.

| 레인 | 파일 | 출처 | 로컬 수정 |
|---|---|---|---|
| **1. PUDS 원격** | 아래 목록 | `shadcn add @puds/*` | **금지** |
| **2. 로컬 base-ui 프리미티브** | `components/ui/*` 중 레인 1 이 아닌 전부 | 이 리포 | 자유 (단 PUDS 프리미티브로 **교체 금지**) |
| **3. 서비스 고유** | 그 밖의 전부 | 이 리포 | 자유 |

#### 레인 1 — PUDS 원격에서 받는 것 (로컬 수정 금지)

```
app/tokens/_base.css            app/tokens/pullim-os.css
app/tokens/_animations.css      app/tokens/pullim-jr.css     ← 설치만, import 안 함(아래 주의)
components/ui/dashboard-shell.tsx    components/ui/os-rail.tsx
components/ui/os-tabbar.tsx          components/ui/rail-collapse-context.tsx
components/ui/page-header.tsx        components/ui/breadcrumb.tsx
components/ui/service-switcher.tsx   components/ui/service-icon.tsx
components/ui/skip-link.tsx
lib/cn.ts
```

**이 파일들을 직접 고치지 마라.** 재설치가 조용히 덮어쓴다. 고쳐야 할 이유가 생기면 둘 중 하나다:
1. **prop 으로 해결한다** — 앱이 넘기는 prop 은 재설치에 안전하다
   (예: `AppShell` 의 `collapsed={false}` + `hideToggle`).
2. **PUDS 에 역상신한다** — 상류에서 고치고 버전을 올려 받는다.
   (`hideToggle` 은 원래 이 리포의 로컬 포크였다가 v0.2.0 에서 상류로 올라간 사례다.
   `page-header` 의 breadcrumb import 도 v0.2.0 에선 로컬 한 줄 패치였다가 v0.3.0 에서 상류가 같은 형태로 고쳐,
   재설치만으로 패치가 사라졌다.)

레인 1 파일을 감싸는 얇은 어댑터를 **레인 3에** 두는 건 괜찮다 —
`components/shell/app-shell.tsx` 가 그 예다.

> ⚠ **`_animations.css` 와 `pullim-jr.css` 는 설치되지만 `globals.css` 에서 import 하지 않는다.**
> 이유는 `app/globals.css` 상단 주석에 적어 뒀다(각각 `tw-animate-css` 와의 `@utility` 이름 충돌,
> 그리고 이 앱이 `pullim-os` 테마 하나만 쓴다는 것). 지우지 말고 import 하지도 마라.

#### 레인 2 — 로컬 base-ui 프리미티브 (PUDS 프리미티브로 교체 금지)

`components/ui/` 의 나머지(`button` · `dialog` · `dropdown-menu` · `sheet` · `tooltip` ·
`tabs` · `input` · `select` 계열 등)는 **`@base-ui/react` 엔진**이다.

**PUDS 프리미티브 51종은 전부 `@radix-ui/react-*` 기반이라 엔진이 다르다.**
`shadcn add @puds/button` 같은 명령은 머지가 아니라 **덮어쓰기**다. 실행하면:
- 같은 파일 경로(`components/ui/button.tsx`)를 Radix 판으로 통째로 갈아치우고,
- `@radix-ui/*` 를 새 의존성으로 끌어오며,
- base-ui 전용 prop(`render`, `data-open` 등)을 쓰는 호출부가 **즉시 깨진다.**

그래서 **레인 2 파일 이름과 겹치는 PUDS 아이템은 설치하지 않는다.** 겹치는 것:
`button` · `card` · `badge` · `avatar` · `dialog` · `dropdown-menu` · `input` · `label` ·
`progress` · `scroll-area` · `separator` · `sheet` · `skeleton` · `slider` · `tabs` ·
`textarea` · `tooltip`.

새 PUDS 아이템을 들일 때는 **설치 전에** 두 가지를 확인한다:
```bash
PUDS=https://pullim-design-system.vercel.app/v/0.3.0   # components.json 과 같은 버전을 쓸 것
# ① Radix 를 물지 않는가
curl -s $PUDS/<name>.json | grep -o '"@radix-ui[^"]*"'   # 출력이 없어야 한다
# ② 기존 파일을 덮지 않는가 (target 경로가 이미 있는지)
curl -s $PUDS/<name>.json | grep -o '"target":"[^"]*"'
```
전이 의존(`registryDependencies`)도 같이 딸려 오니 함께 확인한다.

#### 레인 3 — 서비스 고유 컴포넌트

`components/{classbot,builder,shell,brand,charts,layout,features}/*` 와 `app/**` 전부.
자유롭게 고친다. 다만 토큰 규칙 하나:

- **`var(--radius-*)` / `var(--text-<size>)` 를 직접 읽지 마라.** Tailwind 유틸리티
  (`rounded-2xl`, `text-sm`)를 쓴다. 이 두 이름은 앱 스케일과 PUDS 스케일이 **같은 이름에 다른 값**이고,
  유틸리티는 앱 값을, `var()` 는 PUDS 값을 준다(`rounded-md`=14px vs `var(--radius-md)`=8px).
  근거와 경계는 `app/globals.css` 의 해당 주석에 적어 뒀다.
- **색·표면 의미 토큰은 자유롭게 읽어도 된다** — `var(--surface-*)`, `var(--text-primary|secondary|tertiary)`,
  `var(--border-*)`, `var(--color-action-*)` 은 이름 충돌이 없고 **명암 축을 자동으로 따라간다.**

#### 명암(다크) 축 — `data-scheme`

`<html data-theme="pullim-os" data-scheme="light|dark">` 두 축이다.
`data-theme` 슬롯은 **성격**(pullim-os)이 점유했으므로 **다크를 `data-theme="dark"` 로 지정하면 테마가 풀린다.**
next-themes 는 `attribute="data-scheme"` 로 배선돼 있고(`app/layout.tsx`), `globals.css` 의
`@custom-variant dark` 도 같은 축을 본다. **`.dark` 클래스는 더 이상 아무 의미가 없다.**

다크 정의는 **PUDS 토큰 파일 한 곳뿐**이다. `globals.css` 에서 shadcn 계층 변수를 다시 칠하지 마라 —
`:root` 매핑이 PUDS 의미 토큰을 가리키므로 명암은 자동으로 따라온다.

> **아직 남은 것**: 앱 본문은 `text-pullim-slate-900` · `bg-white` 같은 **고정 브랜드 팔레트**를
> 400곳 넘게 쓴다. 이 유틸리티들은 스킴 축에 참여하지 않아 다크에서도 밝은 채로 남는다.
> 셸은 다크가 맞지만 **본문까지 다크가 정합하지는 않다.** 별도 과제.

#### 레지스트리 URL — **경로로 고정**한다

레지스트리는 `apps/classbot/components.json` 의 한 줄이 전부다:

```json
"registries": { "@puds": "https://pullim-design-system.vercel.app/v/0.3.0/{name}.json" }
```

**고정은 호스트가 아니라 경로(`/v/<버전>/`)가 한다.** `/v/0.3.0/` 이 내려주는 내용은 PUDS 저장소의
`registry-releases/0.3.0/` 에 **커밋돼 있어서** main 에 무엇이 푸시돼도 변하지 않는다.

> ⛔ **`/r/{name}.json` 을 서비스가 직접 참조하면 안 된다.** 그 경로는 항상 **main 최신**을
> 따라가므로 `shadcn add` 를 돌리는 **시점마다 받아오는 소스가 달라진다.** 어제 벤더링한 셸과
> 오늘 받는 셸이 서로 다른 판이 되고, 그 차이는 커밋 diff 로만 드러난다.
>
> 호스트로 고정하는 방식(`puds-v0-2-0.vercel.app` 류)도 쓰지 마라 — **폐기됐다.** Vercel 의
> `ssoProtection: all_except_custom_domains` 때문에 공개로 열리는 건 프로젝트 도메인뿐인데
> 그 도메인은 프로덕션 최신을 추종한다. 공개와 고정이 동시에 성립하지 않아 다음 배포에서 밀린다.

버전 목록은 PUDS 리포의 `docs/releases.md`.

#### 버전 업그레이드 절차

```bash
cd apps/classbot

# 1) components.json 의 URL 에서 **경로의 버전만** 바꾼다.  /v/0.3.0/ → /v/0.4.0/
#    (호스트는 그대로 pullim-design-system.vercel.app 이다)

# 2) 레인 1 파일을 재설치한다
./node_modules/.bin/shadcn add @puds/theme-puds --overwrite --yes
./node_modules/.bin/shadcn add \
  @puds/dashboard-shell @puds/os-rail @puds/os-tabbar @puds/page-header \
  @puds/rail-collapse-context @puds/service-switcher @puds/service-icon \
  @puds/skip-link --overwrite --yes

# 3) diff 리뷰 → 검증
git diff apps/classbot/app/tokens apps/classbot/components/ui
bun --filter @pullim-classbot/classbot typecheck
bun --filter @pullim-classbot/classbot lint
bun --filter @pullim-classbot/classbot build
```

> ⚠ **재설치는 로컬 수정을 덮어쓴다.** 벤더링이라 머지가 아니다. `--overwrite` 를 **반드시** 붙여라 —
> 없이 돌리면 기존 파일과 내용이 다를 때 `--yes` 를 줘도 **대화형 프롬프트에서 멈춘다**(에이전트는 그대로 매달린다).
> 반대로 내용이 이미 같으면 `--overwrite` 를 붙여도 `Skipped ... use --overwrite` 라고 찍히는데,
> 이건 **정상이다** — 바뀔 게 없어서 건너뛴 것이다. 그러니 로그 문구가 아니라 **diff 로 판단해라.**
> "조용히 아무 일도 안 일어났다" 와 "덮어썼다" 둘 다 경계할 것. **diff 리뷰는 선택이 아니다.**
> 토큰 값이 바뀌었으면 `tests/e2e/color-palette.spec.ts` 도 함께 돌린다(금지 hue 회귀를 잡는다).

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
- **PUDS 버전 업그레이드** — `components.json` 의 레지스트리 URL 변경 + 레인 1 재설치. 전 화면 시각 회귀 범위라 보고 후 진행 ([§ 3.1](#31-puds-디자인-시스템--3레인-판별표))

**하면 안 되는 것**
- 다른 도메인(플래너/Q/라이브러리 등) 코드를 새로 작성 — 추출본 범위 외. 필요하면 원본 풀림 스터디 데모 저장소 또는 `pullim` 본체에서 작업
- npm DS **패키지**(`@pullim/design-system` 등)를 dependency 로 추가 — UI 소스는 로컬 파일뿐이다.
  PUDS 는 `shadcn add` 로 **소스를 복사**해 오는 방식이라 여기 해당하지 않는다 ([§ 3.1](#31-puds-디자인-시스템--3레인-판별표))
- 레인 1(PUDS 벤더링) 파일 직접 수정, 레인 2(로컬 base-ui 프리미티브)를 PUDS Radix 프리미티브로 교체 — 둘 다 [§ 3.1](#31-puds-디자인-시스템--3레인-판별표)

## 6. prod-verify — production 회귀 자동화

이 앱은 **production hit Playwright** 자산을 보유 (`apps/classbot/tests/e2e/*` + `.github/workflows/prod-verify.yml`):
- main push / 일일 schedule (UTC 23:00 = KST 08:00) / 수동 dispatch 세 경로로 https://classbot.pullim.ai 검증
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
