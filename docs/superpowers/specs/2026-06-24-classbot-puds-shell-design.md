# classbot → PUDS Dashboard Shell Migration — Design

> 2026-06-24 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-classbot` (app: `apps/classbot`, Next 16 + React 19 + Tailwind v4, Bun/Turbo monorepo)
> 의존: PUDS 레지스트리(`https://pullim-design-system.vercel.app/r/{name}.json`, 67 아이템, shadcn v4)

## 목표
classbot 대시보드 크롬을 PUDS 디자인 셸로 교체하고, classbot 토큰을 PUDS(pullim-os) 어휘/값으로 **전면 이행**하여 풀림 디자인 시스템과 통일된 룩을 갖게 한다. 학생·교사 두 표면 모두 공유 `AppShell`을 통해 일괄 전환.

## 결정 (brainstorming 합의, 2026-06-24)
1. **첫 마이그레이션 대상 = classbot** (planner 아님).
2. **전면 토큰 이행** — classbot이 PUDS/pullim-os 룩으로 통일(셸뿐 아니라 기존 컴포넌트까지).
3. **셸 즉시 교체, 기능 손실 수용** — `@puds/DashboardShell`로 교체하고 right-rail / 사이드바 접힘 / 다크모드를 포기. (프로덕션 UX 회귀를 사용자가 명시 수용.)
4. **`.dark` 블록은 휴면 유지** — 삭제하지 않고 비우선 상태로 둠(되돌리기 여지).

## 현황 사실 (탐색 결과)
- classbot은 이미 shadcn 사용(`apps/classbot/components.json`, shadcn 4.11.0 → 네임스페이스 레지스트리 지원). `registries: {}` (비어 있음 — `@puds` 추가 필요).
- **팔레트가 이미 풀림 블루**: classbot `--primary: oklch(0.524 0.197 258)` = PUDS `--color-primary-600`; `--accent` = `--color-primary-50`; `--accent-foreground`/`--ring` = `--color-primary-700`. 색은 이미 일치 — 차이는 주로 radius(`--radius-md: 14px` vs PUDS 8px, `--radius: 0.625rem`)와 시맨틱 매핑.
- classbot `cn`은 `apps/classbot/lib/utils.ts`(`@/lib/utils`). PUDS 컴포넌트는 `@/lib/cn` import → `@puds/cn`이 `lib/cn.ts`로 설치되어 **두 cn 공존**(무해, 동일 구현).
- classbot 토큰 시스템 = 표준 shadcn 시맨틱(`--background/--foreground/--card/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring/--radius` + `.dark`), `app/globals.css`의 `@theme inline`에서 `--color-*`로 노출.
- `AppShell`(`components/shell/app-shell.tsx`) = `AppHeader` + `AppSidebarRail`(반응형 접힘) + `BottomNav`(학생) + `Breadcrumb` + `RightRailAside`(페이지가 `useSetRightRail`로 등록) + `RoleGuard`. 역할 기반 내비는 `components/shell/nav-config.ts`(리치 `NavItem`/`NavGroup`/lucide 아이콘/`Role`).
- 두 레이아웃 `app/(student)/layout.tsx`·`app/(teacher)/layout.tsx`가 `AppShell role=...`을 공유 → `AppShell` 한 곳을 바꾸면 양 표면 전환.

## 아키텍처 (마이그레이션)

### 1. PUDS 소비 설정 (`apps/classbot`)
- `components.json`의 `registries`에 `"@puds": "https://pullim-design-system.vercel.app/r/{name}.json"` 추가.
- `bunx shadcn add @puds/theme-puds @puds/dashboard-shell @puds/service-switcher @puds/page-header @puds/os-rail @puds/os-tabbar @puds/service-icon` → 컴포넌트 + 전이 의존(`cn`, `use-reduced-motion`)을 classbot 트리에 설치(`components/ui/...`, `lib/cn.ts`, `hooks/...`, `app/tokens/...`).

### 2. 전면 토큰 이행
- 설치된 PUDS 토큰(`app/tokens/_base.css` + `app/tokens/pullim-os.css`)을 `app/globals.css`에서 `@import`.
- 루트(`app/layout.tsx`의 `<html>`)에 `data-theme="pullim-os"` 지정.
- classbot의 shadcn 시맨틱 토큰 **값을 PUDS 값으로 재매핑**(이름은 유지 → 기존 컴포넌트 무수정 리스킨): `--background → var(--surface-canvas)`, `--foreground → var(--text-primary)`, `--card → var(--surface-raised)`, `--card-foreground → var(--text-primary)`, `--muted → var(--surface-sunken)`, `--muted-foreground → var(--text-tertiary)`, `--border`/`--input → var(--border-default)`, `--primary → var(--color-primary-600)`, `--primary-foreground → #fff`, `--accent → var(--color-primary-50)`, `--ring → var(--focus-ring-color)`, `--radius` 및 radius 스케일 → PUDS `--radius-*`. (색은 이미 일치하므로 대부분 정렬 수준; radius·표면·텍스트가 핵심 변경.)
- `.dark` 블록은 그대로 두되(휴면) `data-theme="pullim-os"`가 라이트 룩을 강제. 다크 토글 UI는 비활성/제거.

### 3. 셸 교체
- `components/shell/app-shell.tsx`를 `@puds/DashboardShell` 합성으로 재작성:
  - `AppHeader` → `brand`({logo: `<ServiceIcon name="classbot"/>`, title:"풀림", sub:"클래스봇"}) + `switcher`(`<ServiceSwitcher>`) + `actions`(기존 유저/검색 액션을 슬롯으로 주입).
  - `AppSidebarRail` → `rail`(`<OsRail head=... items=...>` — `nav-config`의 역할별 `NavItem[]`을 `{label, href, icon: <Icon/>, active: pathname 매칭}`으로 매핑).
  - `BottomNav`(학생) → `tabbar`(`<OsTabbar items=...>`).
  - `Breadcrumb` → 페이지가 `<PageHeader crumbs title>`로 렌더(또는 AppShell이 얇은 기본 PageHeader 제공).
  - **제거**: `RightRailAside`/`RightRailProvider`, 사이드바 접힘, 다크모드. `RoleGuard`는 레이아웃에 그대로 유지.
- `nav-config.ts`는 데이터 소스로 유지(아이콘은 lucide 엘리먼트로 OsRail/OsTabbar/ServiceSwitcher에 prop 주입). 셸은 prop 주도.

### 4. 매핑 표 (AppShell → PUDS)
| classbot | PUDS |
|---|---|
| AppHeader (브랜드+검색+유저) | DashboardShell `brand` + `switcher` + `actions` 슬롯 |
| AppSidebarRail (역할 내비) | `rail` = `<OsRail>` (nav-config 매핑) |
| BottomNav (학생) | `tabbar` = `<OsTabbar>` |
| Breadcrumb | `<PageHeader crumbs title>` |
| RightRailAside | (제거 — 수용) |
| 사이드바 접힘/다크모드 | (제거/휴면 — 수용) |

## 5. 테스트 · 검증
- `apps/classbot` 빌드 통과(`bun run build` 또는 turbo). 타입 체크 통과.
- 학생·교사 대시보드가 PUDS 셸 + pullim-os 토큰으로 렌더 — 브라우저(playwright-mcp/크롬) 시각 확인.
- classbot 기존 테스트 통과(회귀 없음, 제거된 기능 관련 테스트는 제외/갱신).
- 새 `AppShell` 렌더 스모크(역할별 nav 렌더, 슬롯 배선) — classbot 테스트 셋업에 맞춰 추가.

## 6. 범위
- classbot `@puds` 소비 설정 + 전면 토큰 이행(pullim-os) + `AppShell`을 `@puds/DashboardShell`로 교체(학생·교사) + nav-config 매핑 + 빌드/시각 검증.

## 7. 비범위
- right-rail / 사이드바 접힘 / 다크모드 복원(수용된 손실 — 추후 PUDS 셸 확장 시 재도입 가능).
- planner / 문제큐 등 다른 서비스 마이그레이션(후속).
- PUDS 셸 자체 기능 확장(별도 작업).
- classbot 백엔드(`apps/backend`) 무관.

## 8. 위험 / 유의
- **UX 회귀(수용):** right-rail·접힘·다크모드 상실. 페이지가 `useSetRightRail`을 호출하던 곳은 노옵/제거 필요(빌드 깨짐 방지).
- **두 cn 공존:** `@/lib/utils`(classbot) vs `@/lib/cn`(PUDS). 무해하나 인지 필요.
- **토큰 값 정렬 정확도:** 재매핑 누락 시 기존 컴포넌트 미스킨 → 빌드 후 시각 확인으로 보강.
- **프로덕션 앱:** `dev` 브랜치 기반 feature 브랜치 + PR. 배포 전 시각 회귀 점검.
- **Bun 툴체인:** shadcn add는 `bunx`로. 레지스트리 네임스페이스는 shadcn 4.11에서 동작.
