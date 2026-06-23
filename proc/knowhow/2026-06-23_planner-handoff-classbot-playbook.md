# 풀림 플래너 핸드오프 — 클래스봇 작업 방식·디자인 적용 플레이북

**작성:** 2026-06-23 · **대상:** 풀림 플래너를 작업하는 담당자
**목적:** 클래스봇에서 **검증된** (1) 디자인 시스템 적용, (2) 작업 방식(프로세스), (3) 디자인 리파인먼트 패턴을 플래너에서 **같은 맥락**으로 이어가기 위한 실무 가이드.

> 핵심 한 줄: **토큰은 단일 소스로 한 번만 바꾸고, 작업은 `spec → plan → 서브에이전트 실행 → 리뷰 게이트`로, PR은 `feature → dev → main`으로 작게 쪼개 올린다.**

---

## 0. 클래스봇에서 실제로 한 일 (한눈에)

세 묶음의 작업이 모두 **phased stacked PR + 서브에이전트 주도**로 진행됐고, 각 PR이 dev preview에서 검증된 뒤 main(prod)으로 승격됐다. worked example로 그대로 참고:

| 묶음 | 내용 | PR |
|---|---|---|
| **DS 적용** | CUDS → Pullim 통합 DS 리스킨 (토큰 파운데이션) | #115 |
| **디자인 리파인먼트** | 멀티에이전트 감사 → P0 버그 + 퀵윈 + 타입스케일/포커스 수렴 | #116, #117 |
| **신규 기능(dual-mode)** | brainstorm→spec→plan→실행 풀사이클, 3 PR 스택 | #118, #119, #120 |

문서 산출물(이 레포 `proc/`):
- spec: `proc/spec/2026-06-22_pullim-ds-revamp-design.md`, `proc/spec/2026-06-23_classbot-dual-mode-design.md`
- plan: `proc/plan/2026-06-23_pullim-ds-pr1-foundation.md`, `proc/plan/2026-06-23_classbot-dualmode-pr{1,2,3}-*.md`

플래너도 동일한 `proc/{spec,plan,knowhow}` 흐름을 쓰면 된다.

---

## 1. 디자인 시스템 적용 (가장 직접 이식 가능한 부분)

### 1.1 권위(Source of Truth)
- **`input/design-system/`** 가 풀림 통합 DS의 권위다 — `tokens.json` / `tokens.css` / `DESIGN_SYSTEM.md`.
- 플래너 도메인 딥다이브는 **`input/design-system/private-planner.md`** (클래스봇이 쓴 `private-classbot.md`의 플래너 대응본). 우선순위 매트릭스·면별 개선안이 여기에 있으니 **플래너 작업의 백로그로 이걸 우선 참조**.
- ❌ pullim.ai 라이브 화면이나 즉흥 색을 소스로 삼지 말 것. DS 문서가 유일 권위.

### 1.2 단일 토큰 소스 패턴 ★ (이게 핵심)
클래스봇 리스킨이 컴포넌트를 거의 안 건드리고 끝난 이유:

```
palette.ts (JS 값)  →  globals.css @theme inline (CSS 변수: --color-pullim-*, --text-*, --radius-*, --duration-*)  →  컴포넌트는 토큰 "클래스명"만 사용 (bg-pullim-blue-600, text-sm, rounded-md …)
```

- 값을 바꿀 때 **CSS 변수의 값만 교체하고 변수/클래스 이름은 유지** → 컴포넌트를 한 줄도 안 고치고 전체가 리스킨된다.
- 락(lock) 테스트로 토큰 값을 고정: `lib/tokens/__tests__/palette.test.ts`가 앵커 값(`primary[600]==='#2854D8'` 등)을 단언 → 회귀 방지.
- 플래너 적용: 플래너의 토큰 파일(`lib/tokens/palette.ts` 또는 동등물)을 찾아 **같은 변수 이름 체계로 값만 Pullim DS로 re-point**. 컴포넌트 일괄 수정 금지.

### 1.3 토큰 값 (Pullim DS, hex)
- **브랜드 블루**: `50 #EEF3FF · 100 #DCE6FF · 200 #B8CDFF · 300 #8BAEFF · 400 #5A8BFF · 500 #3B6FF6 · 600 #2854D8(★CTA) · 700 #1D3FA8 · 800 #142C73 · 900 #070F2C · 950 #050A1E`
- **중립(slate)**: `0 #FFFFFF · 50 #F5F7FB · 100 #EDF0F5 · 200 #DDE2EC · 300 #B7BDCD · 400 #97A0B4 · 500 #6B7489 · 600 #4A536A · 700 #2B3245 · 800 #1E2435 · 900 #121627 · 950 #0B0E1A`
- **시맨틱(AA 튜닝)**: success `#0E8C56`/bg `#E6F8EF` · warn `#D97706`/bg `#FFF7E6` · danger `#C03B3F`/bg `#FDECEC` · info `#2854D8`/bg `#EEF3FF`
- **레몬(강조·스트릭·CTA)**: `#E6FF4C` · soft `#F4FFB8` · ink `#5C6B0A`
- **타입(8-step)**: caption 12/16 · body 14/22 · bodyLg 16/24 · title3 18/26 · title2 20/28 · title1 24/32 · display2 28/36 · display1 32/40. (+ micro 10, 2xs 11 for fine-print). 폰트 Pretendard.
- **라운드**: sm 8 · md 14(★카드/버튼 표준) · lg 20 · pill.
- **모션**: duration fast 120 / base 200 / slow 320; easing standard `cubic-bezier(.4,0,.2,1)`, emphasis `cubic-bezier(.2,.8,.2,1)`.
- **포커스 링**: `0 0 0 3px rgba(59,111,246,.35)` 또는 `:focus-visible` outline `2px solid blue-400`.

### 1.4 가드(절대 어기지 말 것) — 클래스봇이 자동 검사하는 것들
- **`components/**` 에 hex 리터럴 금지** (토큰/런타임 변수만). 검사: `scripts/check-design-gates.mjs` (+ `word-break: keep-all` 가드).
- **임의 `text-[Npx]` 금지** — 8-step 스케일(`text-xs`/`sm`/…/`text-micro`/`text-2xs`)만. (클래스봇은 345개를 토큰으로 수렴시킴 → #117)
- **44px 터치 타깃**(`min-h-11`), **모든 인터랙티브에 `focus-visible` 링**.
- **color-palette 가드**: 스캔되는 학생/주요 라우트에서 **초록(success-green)·앰버(warn-amber)가 큰 면으로 나오면 안 됨**. e2e가 `isForbiddenHue`(green: `g>140 && g>r+40 && g>b+30 && r<80` / amber: `r>200 && 130<g<200 && b<80`)로 자동 검출. DS의 AA 시맨틱(success `#0E8C56` g=140, warn `#D97706` g=119)은 경계 밖이라 통과하지만, **새 색은 반드시 경험적으로 e2e로 확인**. 시그니처 색(라임/민트 등)은 큰 fill 말고 얇은 액센트(left-liner)로만.

---

## 2. 작업 방식 (프로세스) — 이걸 그대로 따라오면 됨

### 2.1 브랜치 플로우 (최상위 규칙)
- **`feature/* → dev → main`** 고정. **`main` 직접 PR 금지.**
- 작업 브랜치 PR은 **base를 `dev`** 로. `main`으로는 **`dev → main` 승격 PR**로만.
- `dev` = preview(외부 차단), `main` = prod 배포 소스. 변경은 dev에서 검증 후 prod 승격.

### 2.2 PR 단위 (최상위 규칙)
- **FE 변경과 BE 변경을 한 PR에 섞지 않는다.** 공유 타입/패키지는 그걸 쓰는 PR보다 **먼저** 별도 PR.
- **한 PR = 한 계층/한 단위.** diff가 작아야 코드 리뷰(코덱스)가 수렴한다. 크게 섞으면 리뷰가 매 라운드 새 지적을 내며 무한 반복.
- 큰 기능은 **phased stacked PR**로: 파운데이션 → 면별. 각 PR이 단독으로 동작/검증 가능해야.

### 2.3 풀사이클 (신규 기능)
스킬을 그대로 사용(클래스봇 dual-mode가 이 흐름):
1. **brainstorming** — 아이디어 → 한 번에 하나씩 질문 → 2~3 접근법 → 설계 제시 → **승인 게이트**(승인 전 구현 금지) → `proc/spec/YYYY-MM-DD-*.md` 작성.
2. **writing-plans** — spec → bite-sized TDD 태스크로 분해(파일 경로·코드·검증 명령까지) → `proc/plan/*.md`.
3. **subagent-driven-development** — 실행(아래).

### 2.4 서브에이전트 주도 실행
- **태스크당 fresh 구현 에이전트** 1명(컨텍스트 격리; 태스크 brief 파일만 전달).
- 각 태스크 후 **리뷰**: spec 준수 + 코드 품질 두 판정. Critical/Important는 fix 에이전트로.
- 마지막에 **whole-branch 리뷰**(가장 강한 모델, opus).
- **ledger**(`.git/sdd/progress.md`)에 완료 태스크 기록 — 컴팩션/중단 후 복구 지도.
- 모델: 기계적 전사=싼 모델, 통합/판단=표준, 최종 리뷰=최강.

### 2.5 검증 게이트 (모든 PR 공통)
- `typecheck` + `lint`(+design gates) + `jest` + `build` 전부 통과.
- 관련 **e2e**(특히 **color-palette 전 라우트**) + boot smoke(주요 라우트 200).
- **기존 e2e 계약을 깨지 말 것**: testid, `data-slot`, 스캔 라우트 색. 새 기능은 **additive**로(기존 흐름 byte-for-byte 유지).
- ⚠️ dev 서버가 떠 있으면(iPad 미리보기 등) `dev`를 새로 띄우지 말고 typecheck/build/gates/jest로 검증, e2e는 기존 서버에 hit.

---

## 3. 디자인 리파인먼트 패턴 (클래스봇 #116/#117 방식)

1. **멀티에이전트 감사** — 면(surface)별로 읽기-전용 에이전트를 병렬로 돌려 design/layout/feature/a11y 이슈를 **구조화 산출**(file:line + severity + 구체 픽스) → 1명이 dedupe·우선순위화한 로드맵.
2. **배치 실행** — **독립 파일**(충돌 없음)은 병렬 에이전트로, **공유 파일/가드 대상**(globals.css·프리미티브·color/chat 계약)은 **순차**로 + 각 e2e 검증.
3. **자주 나온 픽스(플래너도 십중팔구 동일)**: 타입스케일 수렴(`text-[Npx]`→토큰), 전역 `focus-visible` 링, 44px 터치, 대비(특히 navy 위 텍스트), dead-end 링크/dead-code 정리, LIVE-first 정렬 등.

> 감사는 강제하지 말고 **로드맵을 먼저 사람에게 보여주고** 우선순위 합의 후 실행.

---

## 4. 플래너에 맞게 — 같은 것 / 다른 것

| | 그대로 가져가기 | 플래너에서 다시 확인 |
|---|---|---|
| 디자인 | DS 토큰 값·단일소스 패턴·가드(hex/타입/44px/focus/color-palette) | 도메인 백로그 = **`private-planner.md`** (≠ classbot). 플래너 고유 면·컴포넌트 |
| 프로세스 | 브랜치 플로우·PR 단위·풀사이클·서브에이전트·검증 게이트 | 플래너 레포의 e2e 계약(testid/data-slot/스캔 라우트), prod-verify 자산 위치 |
| 색 가드 | green/amber 금지 룰·`isForbiddenHue` | 어떤 라우트가 color-palette 스캔 대상인지(플래너 기준) |

- **주의**: 이 레포(`pullim-classbot`)는 클래스봇 **추출본**이라 일부(포트 3032, prod-verify 도메인, 사라진 도메인 룰)는 레포 특정. 플래너 레포의 동등 설정을 확인하고 매핑할 것. **이식 대상은 "패턴·토큰·프로세스"이지 경로 그대로가 아님.**

---

## 5. 플래너 dev 시작 체크리스트

- [ ] `input/design-system/DESIGN_SYSTEM.md` + **`private-planner.md`** 정독 (백로그 확보)
- [ ] 플래너의 토큰 소스 파일 위치 확인 → **변수 이름 유지하고 값만 Pullim DS로 re-point** + lock 테스트
- [ ] design-gates(hex/word-break) + 타입스케일 + focus/44px + color-palette e2e를 플래너 라우트 기준으로 세팅/확인
- [ ] 첫 작업을 **파운데이션 PR(토큰)** 로 잡고 `feature → dev` PR, 검증 게이트 통과 후 승격
- [ ] 신규 기능은 `brainstorming → spec → writing-plans → subagent-driven` 풀사이클
- [ ] PR은 FE/BE 분리 + 작게. 각 PR 단독 동작·검증

---

## 6. 참고 링크 (worked examples, 이 레포)
- 단일 토큰 소스: `apps/classbot/lib/tokens/palette.ts` → `apps/classbot/app/globals.css`(`@theme inline`) → lock `lib/tokens/__tests__/palette.test.ts`
- 가드 스크립트: `apps/classbot/scripts/check-design-gates.mjs`
- color-palette 가드: `apps/classbot/tests/e2e/color-palette.spec.ts`
- DS 적용 spec/plan: `proc/spec/2026-06-22_pullim-ds-revamp-design.md` · `proc/plan/2026-06-23_pullim-ds-pr1-foundation.md`
- 신규 기능 풀사이클 예: `proc/spec/2026-06-23_classbot-dual-mode-design.md` + `proc/plan/2026-06-23_classbot-dualmode-pr{1,2,3}-*.md`
- 브랜치/PR 규칙 원문: 루트 `CLAUDE.md`(최상위 규칙 2개) · 앱 `apps/classbot/CLAUDE.md`
