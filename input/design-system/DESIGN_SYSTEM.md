# Pullim 통합 디자인 시스템 (v0.1 제안)

세 모듈(Planner / Q / Classbot)을 동시 감사한 결과를 합쳐 **공통 토큰·컴포넌트·a11y 규칙**을 한 곳에 정리했습니다. 이미 세 앱이 같은 폰트·같은 primary blue·같은 시맨틱 컬러로 70% 수렴해 있습니다. 남은 30%(타입 스케일, radius, 작은 글자 컬러, 모션, 터치 타깃)를 통일하면 사실상 하나의 시스템이 됩니다.

- 일자: 2026-05-19
- 소스: `/tmp/pullim-audit/{planner,q,classbot}/tokens.json` + 각 REPORT
- 산출물:
  - `DESIGN_SYSTEM.md` (이 문서)
  - `tokens.json` — 단일 정규 토큰
  - `tokens.css` — CSS custom properties
  - `IMPROVEMENTS.md` — 세 앱 공통/개별 개선 백로그

---

## 1. 한 줄 결론

> **공통 브랜드·공통 폰트·공통 시맨틱**은 이미 잘 잡혀 있다. 시급한 통일 과제는 **(1) 타이포 스케일을 8단계로 재정의해 H2/H3 위계 회복, (2) radius를 3단계(8/14/20)+pill로 축약, (3) 본문 메타 컬러를 `#6B7489` 이상으로 끌어올려 AA 통과, (4) 터치 타깃 44px 최소 보장, (5) 모션 토큰(타이핑/페이드/포커스)을 공식화** 이 다섯 가지다.

---

## 2. 앱별 핵심 발견 (요약)

| 모듈 | 강점 | 가장 시급한 결함 |
|---|---|---|
| **Planner** (학생 학습 플래너) | 단일 청색·미니멀·기능 중심. AI slop 없음. 정보 위계 명확. | (1) **모바일 헤더↓ 250px 빈 공간** 첫 화면 비어 보임 (2) H2/H3 모두 16px 위계 붕괴 (3) "시작" 뱃지 24px hit-area 미달 (4) 캘린더 9~11px 라벨 |
| **Q** (학생 학습 허브) | 시그니처 "— 부제" 패턴, 강한 정보 위계, 23+ 화면 일관 IA. AI slop 거의 없음. | (1) **앰버 버튼 #F59E0B+흰색 = 대비 2.6 AA 미달** (2) 메타 `#97A0B4` 10–11px ~3.0:1 (3) 16↔24 사이 스케일 점프 (4) 모바일 FAB와 탭바 충돌 |
| **Classbot** (수업 챗봇) | 친근한 톤·봇 페르소나·라임 악센트 효과적. | (1) **챗봇인데 타이핑 인디케이터/메시지 fade-in 없음** (2) 브레드크럼 "풀림 클래스봇 > 풀림 클래스봇" 중복 (3) radius 14/18/20/26 혼재 (4) `Scope L3` 같은 내부 jargon 노출 |

상세는 각 `/tmp/pullim-audit/{module}/REPORT.md` 또는 인라인 응답 본문을 참조.

---

## 3. 이미 수렴된 공통 요소 (변경하지 말 것)

| 영역 | 합의된 값 | 비고 |
|---|---|---|
| 폰트 | **Pretendard Variable** + Geist Mono(수식/코드) | 세 앱 동일. 한국어 가독성 검증됨. |
| Primary blue | **#2854D8** (hover/strong `#1D3FA8`, soft `#3B6FF6`) | 세 앱 동일. |
| Lime accent | **#E6FF4C** | Q/Classbot 활용. Planner는 미사용이나 추가해도 충돌 없음. |
| 시맨틱 컬러 | success `#12B26B`, warning `#F59E0B`, danger `#E5484D` | 세 앱 동일. |
| 중성(텍스트) | ink `#121627` → secondary `#4A536A` → tertiary `#6B7489` → quaternary `#97A0B4` | 세 앱 동일. |
| 배경 | canvas `#F5F7FB`, surface `#FFFFFF`, line `#EDF0F5 / #DDE2EC` | 세 앱 동일. |
| 비주얼 톤 | **Borderline-flat**: 1px 라인 + 옅은 배경 틴트. 그림자 거의 안 씀. | 세 앱 동일. 유지. |
| 아이콘 | **lucide-react** outline 1.5–2px | 세 앱 동일. |

---

## 4. 통합 토큰 (제안)

### 4.1 Color

```ts
// brand
brand.50      #EEF3FF   // 배경 틴트 (강조 카드 bg)
brand.100     #DCE6FF   // chip bg, hover bg
brand.200     #B8CDFF
brand.300     #8BAEFF
brand.400     #5A8BFF   // 차트 보조
brand.500     #3B6FF6   // 보조 액션, soft primary
brand.600     #2854D8   // ★ Primary CTA
brand.700     #1D3FA8   // hover / pressed
brand.900     #070F2C   // text on tint

// accent
accent.lime         #E6FF4C
accent.lime-on      #5C6B0A   // 라임 위 텍스트 (AAA)

// neutral (text-first naming)
text.primary        #121627   // body, headings
text.secondary      #4A536A   // sub-body
text.tertiary       #6B7489   // meta (AA 안전 최소선)
text.quaternary     #97A0B4   // ⚠ 14px 이상에서만 사용
text.on-primary     #FFFFFF
text.disabled       #B7BDCD

surface.canvas      #F5F7FB   // 페이지 배경
surface.subtle      #EDF0F5   // 카드 내부 강조
surface.default     #FFFFFF   // 카드 표면
surface.inverse     #0F1A3A   // 다크 카드 (LIVE/리플레이 등)

border.subtle       #EDF0F5
border.default      #DDE2EC
border.strong       #B7BDCD

// semantic
success.fg          #0E8C56   // ★ AA 통과용으로 #12B26B에서 한 톤 ↓
success.bg          #E6F8EF
warning.fg          #B7791F   // ★ AA용. #F59E0B는 화면 텍스트 색으로 금지
warning.bg          #FFF7E6
warning.cta-bg      #D97706   // ★ 흰글자 위 AA 통과 (기존 #F59E0B 대체)
warning.cta-text-on-amber #3F2A00  // 또는 amber 위에 짙은 갈색 글자 사용
danger.fg           #C03B3F
danger.bg           #FDECEC
live.fg             #E5484D   // 큰 라벨/뱃지에서만
live.bg             #FFE9EA

// chart (3개 시리즈 이상일 때)
chart.1 #2854D8  chart.2 #12B26B  chart.3 #F59E0B
chart.4 #8B5CF6  chart.5 #06B6D4  chart.6 #E5484D
```

**핵심 결정**
- `#97A0B4`는 **14px 이상**에서만 사용. 10~12px 메타는 `#6B7489`(text.tertiary)로 통일. → 세 앱 공통 a11y 결함 1순위 해결.
- `#F59E0B` 위 흰 글자 = AA 미달(2.6:1). **CTA 배경은 `#D97706`로 한 톤 어둡게**, 또는 amber 배경 + 갈색 텍스트로 페어링.
- `#12B26B` 흰 글자도 4.0:1 경계 → 폰트 색은 `#0E8C56`로.

### 4.2 Typography

```ts
font.sans   = '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif'
font.mono   = '"Geist Mono", ui-monospace, SFMono-Regular, monospace'

// 8단계 스케일 (16↔24 빈 자리에 18·20 채움 / 9·10·11·12.5 제거)
size.caption   12px  / line 16 / weight 500   // meta, sub
size.body      14px  / line 22 / weight 400   // sub-body (모바일 본문)
size.bodyLg    16px  / line 24 / weight 400   // ★ 본문 (데스크탑 기준)
size.title3    18px  / line 26 / weight 600   // H4
size.title2    20px  / line 28 / weight 600   // H3 / 섹션 헤딩
size.title1    24px  / line 32 / weight 700   // H2
size.display2  28px  / line 36 / weight 700   // H1 (페이지)
size.display1  32px  / line 40 / weight 700   // 히어로

// 금지
- 9, 10, 10.5, 11, 12.5 px 사용 금지
- weight 500 미만으로 흰 배경 위 12px 메타 사용 금지
```

**핵심 결정**
- 본문은 데스크탑 `16/24`, 모바일 `14/22`. H2 이상은 두 viewport 동일.
- 작은 라벨(뱃지·캡션) **최소 12px** 강제. 캘린더 시각 라벨도 12px 이상.
- H2/H3 위계 회복을 위해 **20·24·28** 세 사이즈 명시.

### 4.3 Spacing (8pt 변형)

```
0 1 2 3 4 6 8 10 12 16 20 24 32 40 48 64   (px)
```

- 14·18 같은 **튀는 값 제거**. 카드 내부 padding은 16/20, 섹션 갭은 24/32로 통일.
- 데스크탑 카드 갭 24 → **16~20**으로 줄여 [[feedback_ui_density]] (촘촘 UI 선호) 반영.

### 4.4 Radius (3단계 + pill)

```
radius.sm     8px    // input, chip 작은 것
radius.md    14px    // ★ 카드, 버튼, 인풋 표준
radius.lg    20px    // 히어로, 큰 컨테이너
radius.pill  9999px  // 아바타, FAB, status chip
```

- 16/18/26 폐기.
- 버튼=14, 카드=14 (대형=20), 칩/FAB=pill. 외 사용 금지.

### 4.5 Shadow (4단계, 절제)

```
elev.0  none
elev.1  0 1px 2px rgba(18,22,39,0.04)                                        // 카드 default
elev.2  0 4px 12px rgba(18,22,39,0.06), 0 2px 4px rgba(18,22,39,0.04)        // hover / dropdown
elev.3  0 12px 24px rgba(18,22,39,0.08), 0 4px 8px rgba(18,22,39,0.04)       // modal
elev.fab 0 10px 15px -3px rgba(40,84,216,0.30), 0 4px 6px -4px rgba(40,84,216,0.30)  // primary FAB
ring.focus 0 0 0 3px rgba(59,111,246,0.35)                                   // ★ 키보드 포커스 (필수)
```

- 그림자 의존 금지 — **카드 분리는 1px line + tint** 우선. 그림자는 hover/elevation 신호로만.

### 4.6 Motion

세 앱 모두 모션 토큰 부재. 다음을 표준화:

```
duration.fast    120ms   // 호버, 작은 transform
duration.base    200ms   // 일반 전환
duration.slow    320ms   // 모달, 슬라이드인
easing.standard  cubic-bezier(0.4, 0, 0.2, 1)
easing.emphasis  cubic-bezier(0.2, 0.8, 0.2, 1)

// 필수 모션 패턴
- 카드 hover     scale(1.00→1.01) + elev.1→elev.2, 120ms
- 버튼 hover     bg darken 4%, 120ms
- 메시지 mount   opacity+y(8→0), 200ms ease-out  ← Classbot 적용 필수
- 타이핑        3-dot bounce, 1.4s loop          ← Classbot 적용 필수
- 페이지 진입   skeleton 200ms → content fade-in 160ms
- 포커스         ring.focus 즉시 적용, transition 없음 (접근성)
```

### 4.7 Breakpoint

Tailwind 기본 유지. 의미만 명문화.

```
sm  640    // 큰 폰
md  768    // 태블릿 세로
lg 1024    // ★ 사이드바 vs 하단 탭바 분기
xl 1280
2xl 1536
```

- 사이드바(데스크탑) ↔ 햄버거+하단 탭바(모바일) 분기는 **lg(1024)** 고정.
- 콘텐츠 최대 폭 `xl=1280`로 통일. (Planner 1000px 사용 → 좌우 240px 낭비 해결)

### 4.8 Layout 토큰

```
header.height         56px (데스크탑) / 52px (모바일)
sidebar.width         240px
tabBar.height         64px + safe-area
content.maxWidth      1280px
content.gutter        24px (desktop) / 16px (mobile)
fab.offset.bottom     88px (탭바와 16px 띄움)  ← Q 충돌 해결
```

---

## 5. 컴포넌트 컨벤션

### 5.1 Button

| variant | bg | text | border | radius | min-height |
|---|---|---|---|---|---|
| primary | `brand.600` | white | none | 14 | **44** (모바일) / 40 (데스크탑) |
| secondary | white | `brand.600` | 1px `brand.100` | 14 | 동일 |
| ghost | transparent | `text.primary` | none | 14 | 동일 |
| warning | `warning.cta-bg #D97706` | white | none | 14 | 동일 |
| destructive | `danger.fg` | white | none | 14 | 동일 |
| chip (status) | bg-tint | matching fg | none | pill | 24~28 |

**Hit area 규칙**: 최소 클릭 영역 **44×44**. 시각적 작은 뱃지여도 padding으로 hit-area 확보.

### 5.2 Card

- bg `surface.default`, border `1px solid border.default`, radius **14** (대형 컨테이너만 20)
- padding 16 (모바일) / 20 (데스크탑)
- hover시 `elev.2` + border `border.strong`로 인터랙티브 신호 (선택)
- **중첩 금지**: card-in-card 패턴은 안쪽을 `surface.subtle` 배경으로 처리해 시각적 깊이 차이로 표현.

### 5.3 Hero (대형 액션 카드)

- gradient: `linear-gradient(135deg, #2854D8 0%, #3B6FF6 100%)`
- text on hero: `white` / sub `rgba(255,255,255,0.85)`
- radius 20, padding 24~32
- 라임 액센트 사용 가능 (1점 강조용)

### 5.4 Chip / Badge

- pill radius, 12px text, weight 600
- 5종 동시 노출 금지 — **3-tier 컬러**(brand / success / warning)만, 그 외는 grey+아이콘으로 분류
- live/긴급은 `danger.bg + danger.fg` 페어로 통일

### 5.5 Chat (Classbot 전용)

- 메시지 버블: user `brand.50 bg + brand.700 text`, bot `white bg + border.default + text.primary`
- 메시지 mount: fade-up 200ms (위 motion 토큰)
- **타이핑 인디케이터 필수**: 3-dot bounce, bot 버블 안에서 표시
- 입력창: bottom-fixed, FAB와 영역 분리 (FAB 숨김 또는 inline send 버튼 통합)

### 5.6 Navigation

- 데스크탑 ≥1024: 240px 좌 사이드바 + 헤더 56
- 모바일 <1024: 헤더 + 하단 5탭 (탭 라벨 12px, 아이콘 24px, 활성색 `brand.600`)
- 브레드크럼: 동일 라벨 연속 표시 금지(Classbot 사례) → 자동 dedupe

### 5.7 FAB

- pill, `brand.600` bg, `elev.fab` 그림자, 56×56
- 모바일 위치: `bottom: calc(tabBar.height + 24px)` ← 탭바 충돌 해결
- 채팅/입력 화면에서는 **자동 숨김**

### 5.8 Empty / Loading state

- empty: 아이콘(brand.300) + 한 줄 제목(16/600) + 보조 한 줄(14/400) + CTA
- loading: skeleton 200ms 후 noop, 200ms 후 표시 (깜빡임 방지)

---

## 6. 마이크로카피 가이드라인

세 앱 강점인 친근·존댓말 톤을 시스템화:

- **존댓말 + 학생 친화**: "지금 시작", "이어서", "오답 3개, 복습 시간이 지났어요"
- **수치 우선**: "D-22 · 17일 연속 · 12/30문항" — 시간/진행을 첫 문장에
- **액션은 동사형**: "오답 정복하기", "스튜디오 가보기" (명사 라벨 금지)
- **금지**:
  - 내부 jargon 외부 노출 (`Scope L3`, `7대 교육학 엔진`, `Hero Recap`) → 노출 시 첫 등장에 툴팁 또는 한글 병기
  - "(데모)" 라벨 라이브 화면 노출 (Planner) → 환경 분리
  - 영문 섹션 라벨 (Q `Hero Recap`, `Root Graph`) → "핵심 한눈에", "원인 트리" 같은 한글 병기

---

## 7. 접근성 베이스라인 (세 앱 공통 결함 → 통합 룰)

| 항목 | 룰 | 비고 |
|---|---|---|
| 텍스트 대비 | **본문 4.5:1 이상**, 대형 텍스트 3:1 이상 | `#97A0B4` on white = 3.0:1 → 14px 이상에서만 |
| CTA 컬러 | `warning.cta-bg`는 `#D97706` (4.5:1) | `#F59E0B` + 흰글자 금지 |
| 포커스 링 | `ring.focus` 키보드 포커스에 무조건 표시 | transition 없이 즉시 |
| Hit area | 최소 44×44 | 시각 뱃지는 padding으로 보강 |
| 아이콘 버튼 | `aria-label` 필수 | Q/Classbot 헤더 아이콘들 결함 |
| Skip link | `Skip to content` 모든 페이지 | 키보드 사용자용 |
| `lang` | `<html lang="ko">` 유지 | OK |
| 이미지 | `<img>` 대신 SVG는 `aria-hidden="true"` 또는 의미 있으면 `aria-label` | OK |

---

## 8. 적용 로드맵

세 앱이 이미 같은 베이스(Tailwind + Pretendard + 청색)라 마이그레이션 비용이 낮음.

### Phase 0 — 토큰 패키지화 (1~2일)
- `@pullim/design-tokens` 패키지 신설 (또는 모노레포 `packages/tokens`)
- `tokens.json` → `tokens.css` (CSS custom properties) + Tailwind preset 자동 생성
- 세 앱에 import

### Phase 1 — 글로벌 토큰 교체 (각 앱 1일)
- 컬러 변수 일괄 치환: `#97A0B4` 사용처를 `text.tertiary(#6B7489)`로 (14px 이상 예외)
- `#F59E0B` 버튼 → `#D97706`로 일괄 치환
- radius 14/18/20/26 → 14/20만 사용하도록 grep+fix

### Phase 2 — 타입 스케일 (각 앱 1~2일)
- H1/H2/H3 size·weight 토큰화
- 9~11px 텍스트 제거 (캘린더 라벨 등)

### Phase 3 — 컴포넌트 라이브러리화 (1~2주)
- `Button`, `Card`, `Chip`, `Hero`, `FAB`, `EmptyState`, `Skeleton`, `ChatBubble`, `TypingIndicator` 9개를 공통 패키지(`@pullim/ui`)로
- Storybook으로 시각 회귀 잡기

### Phase 4 — 모션·접근성 (병행)
- Classbot 타이핑 인디케이터 + 메시지 fade-in
- 모든 버튼 hit area 44px 가드
- 포커스 링 일괄 적용
- 앰버 CTA 대비 수정

### Phase 5 — 다크 모드 (옵션)
- Planner에 CSS만 남아 있는 다크 토큰을 정리해 정식 활성화 (또는 죽은 코드 제거)
- `text.*` / `surface.*`만 다크 페어 추가하면 컴포넌트 변경 없이 작동

---

## 9. 우선순위 액션 Top 10 (세 앱 공통)

| # | 액션 | 영향 앱 | 노력 | 효과 |
|---|---|---|---|---|
| 1 | 본문 메타 `#97A0B4` → `#6B7489` 일괄 치환 (14px 미만) | Planner/Q/Classbot | S | a11y AA 즉시 통과 |
| 2 | 앰버 CTA `#F59E0B → #D97706` | Q (주로) | S | a11y AA |
| 3 | 타이포 스케일 8단계 토큰화, H2/H3 위계 회복 | Planner/Classbot | M | 정보 위계 |
| 4 | 9~11px 텍스트 모두 12px로 | Planner (캘린더) | S | 가독성·a11y |
| 5 | 버튼 hit area 44px 가드 (`min-h-11`) | 전부 | S | 모바일 UX |
| 6 | radius 토큰 14/20/pill만 허용 | Classbot 주요 | M | 일관성 |
| 7 | Classbot 타이핑 인디케이터 + 메시지 fade-in | Classbot | M | 챗봇 신뢰감 |
| 8 | 모바일 FAB 위치 `bottom: tabBar+16` | Q | S | 충돌 해결 |
| 9 | Planner 모바일 헤더 아래 250px 공백 제거 | Planner | S | **첫 화면 가치 복구 (최우선)** |
| 10 | Classbot 브레드크럼 dedupe | Classbot | S | IA 신뢰 |

---

## 10. 미해결/추가 검증 필요

- 호버/포커스 실제 상태(정적 캡처라 일부만 확인)
- 다크모드 (Planner CSS 변수만 정의됨 — 의도 확인 필요)
- 로그인된 상태에서만 보이는 화면(폼/모달/검색)
- 데모 데이터 외 실데이터 케이스의 빈 상태/오류
- 차트 다중 시리즈 컬러 시뮬레이션
- 모션 실제 측정 (RUM)
