# 08. 디자인 시스템 (Design Token / Style Guide / UI Kit)

실제 토큰 정의 위치: [src/app/globals.css](../../src/app/globals.css), [src/lib/tokens/](../../src/lib/tokens/).

이 문서는 **명세적 요약**이며, 토큰 변경 시 두 위치를 정합 유지.

---

## 1. 컬러 팔레트

### 1.1 풀림 브랜드 블루 (Primary)

| 단계 | HEX | 용도 |
|------|-----|------|
| 50 | `#EEF3FF` | 가장 옅은 배경, 카드 hover |
| 100 | `#DCE6FF` | 부드러운 강조 배경 |
| 200 | `#B8CDFF` | 비활성 강조 |
| 300 | `#8BAEFF` | 보조 차트 |
| 400 | `#5A8BFF` | 보조 강조, 다크모드 primary |
| **500** | **`#3B6FF6`** | **메인 Primary, CTA** |
| 600 | `#2854D8` | hover/active, 슬라이더 thumb |
| 700 | `#1D3FA8` | accent foreground (라이트) |
| 800 | `#152E7A` | 어두운 강조 |
| 900 | `#0E1F54` | 다크 배경 강조 |
| 950 | `#070F2C` | 가장 어두운 |

### 1.2 풀림 슬레이트 (중립)

| 단계 | HEX | 용도 |
|------|-----|------|
| 0 | `#FFFFFF` | 라이트 배경 |
| 25 | `#FBFCFE` | 사이드바 배경 |
| 50 | `#F5F7FB` | muted 배경 |
| 100 | `#EDF0F5` | secondary |
| 200 | `#DDE2EC` | border |
| 300 | `#C4CBDA` | 비활성 텍스트 |
| 400 | `#97A0B4` | 다크 muted-foreground |
| 500 | `#6B7489` | muted-foreground |
| 600 | `#4A536A` | 보조 텍스트 |
| 700 | `#343B50` | 강조 텍스트 |
| 800 | `#20263A` | secondary-foreground (라이트) |
| 900 | `#121627` | foreground (라이트) |
| 950 | `#080B18` | 다크 배경 |

#### 1.2.1 메타 텍스트 컬러 사용 가이드 (a11y AA)

흰 배경 위 회색 메타 텍스트의 명도 사용 룰. 통합 디자인 시스템 v0.1 합의 + private-classbot.md a11y 관찰 결과 반영.

| 회색 | 대비 (vs #FFFFFF) | 허용 사이즈 | 사용 |
|---|---|---|---|
| `slate-400 #97A0B4` | ~3.0:1 | **≥ 14px만** | 큰 캡션, 카드 안 메타. 12px 메타에 쓰지 말 것 |
| `slate-500 #6B7489` | ~4.6:1 (AA) | **12px 이상 메타의 기본값** | 작은 메타·시간·서브라벨 |
| `slate-600 #4A536A` | AA+ | 보조 본문 | 강조가 필요한 메타 |

> 회귀 점검: 클래스봇 데스크탑/모바일에서 10~12px 메타가 `#97A0B4`로 노출되어 a11y 미달 — `text-pullim-slate-500`로 일괄 치환 권고.

### 1.3 시맨틱

| 토큰 | HEX | 배경 (-bg) | 용도 |
|------|-----|-----------|------|
| danger | `#E5484D` | `#FCE9EA` | 위험·삭제·시험 모드 시그니처. **유일하게 화면에 시맨틱 hue로 노출되는 색** |
| ~~success~~ | ~~`#12B26B`~~ | ~~`#E6F7EE`~~ | **deprecated (2026-05-12)** — 정답·완료는 `pullim-blue-500`/`blue-600`로 표현. 토큰은 1차 보존, 신규 사용 금지 |
| ~~warn~~ | ~~`#F59E0B`~~ | ~~`#FEF3DB`~~ | **deprecated (2026-05-12)** — 주의는 `pullim-blue-700`(고강조) 또는 `pullim-slate-500`(중간) + 아이콘 명시로 대체. 토큰은 1차 보존, 신규 사용 금지 |

색 hue를 정보 위계에 쓰지 않고 **단일 hue 안의 명도**로 정보 위계를 표현한다 — § 14.1 "색 강조 토큰 동시 사용 ≤ 3종" 조항의 실제 강제.

### 1.4 IRT 난이도 (5단계)

| 레벨 | HEX | 의미 |
|------|-----|------|
| Lvl 1 | `#E5EEFF` | 매우 쉬움 |
| Lvl 2 | `#A9C4FF` | 쉬움 |
| Lvl 3 | `#5A8BFF` | 보통 |
| Lvl 4 | `#2854D8` | 어려움 |
| Lvl 5 | `#152E7A` | 매우 어려움 |

### 1.5 학습 히트맵 (6단계)

| 레벨 | HEX |
|------|-----|
| heat-0 | `#F0F3F9` |
| heat-1 | `#D9E5FB` |
| heat-2 | `#A9C4FF` |
| heat-3 | `#5A8BFF` |
| heat-4 | `#2854D8` |
| heat-5 | `#0E1F54` |

### 1.6 풀림 레몬 (강조·CTA·스트릭)

| 토큰 | HEX | 용도 |
|------|-----|------|
| lemon | `#E6FF4C` | **키 CTA 한정** — 페이지 최상위 행동(예: 학생 발송·시작), 스트릭/완료 인증 시그니처 |
| lemon-soft | `#F5FFB8` | 강조 배경 |
| lemon-ink | `#5C6B0A` | 레몬 위 텍스트 |

플래너 핸드오프 12.1 기반. **남용 금지** — 레몬은 한 화면에 1~2 곳까지. 그 이상의 강조는 `pullim-blue-500/600`을 사용.

---

## 2. 라이트/다크 테마 매핑

### 2.1 라이트 (기본)
- `--background`: `#FFFFFF`
- `--foreground`: `#121627` (slate-900)
- `--primary`: `#3B6FF6` (blue-500)
- `--secondary`: `#EDF0F5` (slate-100)
- `--muted`: `#F5F7FB` (slate-50)
- `--accent`: `#EEF3FF` (blue-50)
- `--border`: `#DDE2EC` (slate-200)

### 2.2 다크 (학생 야간 학습 모드)
- `--background`: `#080B18` (slate-950)
- `--foreground`: `#FBFCFE`
- `--primary`: `#5A8BFF` (blue-400) — 다크에선 한 단계 밝게
- `--secondary`: `#20263A` (slate-800)
- `--accent`: `#1D3FA8` (blue-700)
- `--border`: `rgba(255, 255, 255, 0.08)`

### 2.3 차트 (Recharts) — IRT 5단계 톤

라이트:
- chart-1~5: `#3B6FF6`, `#5A8BFF`, `#2854D8`, `#1D3FA8`, `#8BAEFF`

다크:
- chart-1~5: `#5A8BFF`, `#8BAEFF`, `#3B6FF6`, `#B8CDFF`, `#2854D8`

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

| 토큰 | 폰트 | 용도 |
|------|------|------|
| `--font-sans` | **Pretendard Variable** + system fallback | 본문·UI |
| `--font-mono` | Geist Mono + ui-monospace | 코드·수식 보조 |
| `--font-heading` | Pretendard Variable | 제목 |

### 3.2 폰트 임포트
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
```

### 3.3 typography 디테일
- letter-spacing: 본문 `-0.01em`, 제목(h1~h3) `-0.02em`
- font-feature-settings: `'tnum' 1, 'cv11' 1` (탭 숫자 + 변형 글자)
- antialiased

### 3.4 사이즈 가이드 (태블릿 우선 · 3-Bracket 반응형)

학생 주 디바이스가 **태블릿 (가로/세로)**이므로 break point를 다음 3개 bracket으로 정의한다 (자세한 룰은 §14).

| 용도 | Compact <768px (모바일) | Cozy 768~1023px (태블릿 portrait) | Comfortable ≥1024px (태블릿 landscape, 데스크탑) | Tailwind |
|------|----|----|----|----|
| 본문 | **≥ 16px** | ≥ 15px | ≥ 14px | `text-base` ~ `text-sm` |
| 캡션 | 12px | 12px | 12px | `text-xs` |
| H3 | 18px | 18~20px | 18~20px | `text-lg` |
| H2 | 22px | 24px | 24px | `text-xl` ~ `text-2xl` |
| H1 | 28px | 30px | 32~36px | `text-2xl` ~ `text-4xl` |

> Compact 본문 16px 하한은 iOS Safari 자동 줌 방지 + 학생 가독성 보장 (Layer 1 베이스라인).

수식 렌더링: **KaTeX** (`react-katex`).

### 3.5 8단계 타이포 토큰 (통합 시스템 v0.1)

§3.4의 bracket 가이드는 화면 유형별 추천이고, **컴포넌트 토큰**은 다음 8단계로 통일한다. 16↔24 사이의 빈 자리(18·20)를 채워 H2/H3 위계를 회복하기 위함.

| 토큰 | size / line-height | 권장 weight | 용도 |
|---|---|---|---|
| `text.caption` | 12 / 16 | 500 | 메타, 시간, 서브라벨 |
| `text.body` | 14 / 22 | 400 | 모바일 본문, 사이드 본문 |
| `text.bodyLg` | 16 / 24 | 400 | **데스크탑 본문 기본** |
| `text.title3` | 18 / 26 | 600 | H4, 카드 헤딩 |
| `text.title2` | 20 / 28 | 600 | H3, 섹션 헤딩 |
| `text.title1` | 24 / 32 | 700 | H2 |
| `text.display2` | 28 / 36 | 700 | H1 (페이지) |
| `text.display1` | 32 / 40 | 700 | 히어로 |

#### 3.5.1 금지 사이즈

- **9, 10, 10.5, 11, 12.5px 사용 금지**. 작은 캡션은 12px가 floor.
- 흰 배경 위 12px 메타에 weight 500 미만 금지 (가독성·a11y).
- 캘린더·차트 시각 라벨도 12px 이상 강제.

> 토큰 도입 전 회귀 사례: 클래스봇 데스크탑 섹션 헤딩 14px, H2/H3 위계 붕괴, 모바일 메타 10~11px 노출. `text.title2` (20/600)·`text.title3` (18/600) 일괄 적용으로 해결.

---

## 4. 라운드 (Border Radius)

| 토큰 | 값 | 용도 |
|------|------|------|
| xs | `4px` | 작은 칩, 태그 |
| sm | `6px` | 인풋, 버튼 small |
| md | `10px` | 기본 카드, 버튼 |
| lg | `14px` | 큰 카드, 모달 |
| xl | `20px` | 히어로 카드 |
| 2xl | `~18px` (calc) | 특수 |
| 3xl | `~22px` (calc) | 특수 |
| 4xl | `~26px` (calc) | 특수 |
| pill | `9999px` | 칩, 둥근 버튼 |

기준: `--radius: 0.625rem` (10px).

### 4.1 통일 권고 (통합 시스템 v0.1)

위 토큰표는 base UI 호환 차원에서 보존하지만, **신규 컴포넌트는 다음 3+1 단계로만 결정**한다. 클래스봇 감사에서 14/18/20/26 혼재가 통일성 결함의 1순위였음.

| 단계 | 값 | 사용 |
|---|---|---|
| `sm` | 8px | input, 작은 chip |
| `md` | 14px | **카드·버튼·인풋 표준** |
| `lg` | 20px | 히어로, 큰 컨테이너 |
| `pill` | 9999px | 아바타, FAB, status chip |

> 16/18/26 사용 금지(lint 룰화 대상). 회귀 사례: 클래스봇 카드 14·말풍선 18·다크 카드 20·이모지 원 26 혼재.

---

## 5. 그림자

| 토큰 | 값 | 용도 |
|------|---|------|
| pullim-xs | `0 1px 2px rgba(18, 22, 39, 0.04)` | 미세 강조 |
| pullim-sm | `0 1px 3px ... + 0 1px 2px ...` | 카드 기본 |
| pullim-md | `0 4px 12px ... + 0 2px 4px ...` | 떠 있는 카드 |
| pullim-lg | `0 12px 24px ... + 0 4px 8px ...` | 모달·팝오버 |
| pullim-glow | `0 0 0 4px rgba(59, 111, 246, 0.15)` | focus ring |

### 5.1 포커스 링 토큰 (a11y 필수)

키보드 포커스에는 색약·저조도 환경에서도 식별 가능한 명확한 ring을 강제한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--focus-ring` | `0 0 0 3px rgba(59, 111, 246, 0.35)` | 기본 키보드 포커스 (모든 인터랙티브 요소) |
| `--focus-ring-danger` | `0 0 0 3px rgba(229, 72, 77, 0.30)` | destructive 액션 (삭제·세션 종료 등) |
| `--shadow-pullim-glow` | `0 0 0 4px rgba(59, 111, 246, 0.15)` | 컨테이너·카드 강조 hover (legacy) |

룰:
- `:focus-visible`에만 적용 (마우스 클릭에는 안 보이게)
- transition 없이 **즉시 표시** (접근성 — 포커스 이동 지연은 시각 추적을 방해)

---

## 6. 레이아웃 규칙

### 6.1 공간 (Tailwind 기준)
- Compact (<768px) padding: `p-4` (16px)
- Cozy (768~1023) padding: `p-5` (20px)
- Comfortable (≥1024) padding: `p-6` ~ `p-8` (24~32px)
- 섹션 간 여백: `space-y-8` (32px)
- 카드 내부 여백: `p-4` ~ `p-6`
- 카드/블록 사이 간격: **≥ 12px** (Layer 1 베이스라인)
- 학생 콘텐츠 최대 폭: `max-w-screen-md` (768px) — `(student)` 레이아웃 자동 적용
- 교사 콘텐츠 폭: `w-full` — 와이드 데스크탑 최적화

### 6.2 3-Bracket 그리드 (태블릿 우선)

| Bracket | 폭 | 레이아웃 베이스 | 그리드 |
|---|---|---|---|
| **Compact** | <768px | 햄버거 + 하단 탭바 | 단일 열 |
| **Cozy** | 768~1023px | 아이콘 사이드바 + 압축 헤더 | 1~2 열 |
| **Comfortable** | ≥1024px | 풀 사이드바 + 풀 글로벌 nav | 2~3 열 |

> Break point가 **1024px**에서 켜지는 기준은 라이브 검증 결과 (태블릿 portrait는 Cozy로, landscape는 Comfortable로 자연스럽게 전환됨 — `output/live-shots/tablet-*.png` 참고).

### 6.3 최소 너비 보호
- `body { min-width: 320px }` — 320px 미만은 가로 스크롤 허용

### 6.4 터치 타겟 (Layer 1 베이스라인)
- 인터랙티브 요소: **≥ 44×44pt** (태블릿 메인 사용 — 터치 우선)
- 버튼·토글 안 텍스트: **`white-space: nowrap`** 강제 (Compact에서 텍스트 wrap 깨짐 방지)

---

## 7. 컴포넌트 시스템

### 7.1 베이스
- **shadcn/ui 4.x** (`@base-ui/react` 기반)
- 14개 base 컴포넌트 + 풀림 토큰 매핑
- 베이스 컴포넌트는 [04-ux-flow.md § 6.6](04-ux-flow.md) 오버플로 처리 규칙을 기본 동작으로 충족해야 한다 (다이얼로그·시트·팝오버·드롭다운·셀렉트의 `max-h` + `overflow-y-auto`).

### 7.2 풀림 자체 컴포넌트

#### `components/brand/`
- `logo.tsx` — 풀림 로고 (단일 출처)

#### `components/shell/` (★ 학생/교사 공용)
| 파일 | 역할 |
|------|------|
| `app-shell.tsx` | 루트 wrapper (역할 분기) |
| `app-header.tsx` | GNB (로고·검색·컨텍스트·알림·사용자) |
| `app-sidebar.tsx` | 사이드바 (lg 전체·md 축약·모바일 drawer) |
| `mobile-drawer.tsx` | 모바일 햄버거 → Sheet |
| `bottom-nav.tsx` | 학생 모바일 5탭 |
| `role-switcher.tsx` | GNB 역할 토글 (학생/교사) |
| `breadcrumb.tsx` | 자동 생성 trail |
| `coach-fab.tsx` | 학생 모바일 코치 FAB |
| `nav-config.ts` | ★ 모든 네비 항목의 단일 소스 |
| `section-heading.tsx` | 페이지 컨텍스트 헤딩 |

**규칙**:
- 새 기능 라우트 추가 시 `nav-config.ts`의 `studentNav` 또는 `teacherNav`에 항목 추가 → 사이드바·드로어 자동 갱신
- 페이지는 shell이 wrapping 하므로 자체 헤더·네비 만들지 말 것 — 페이지 콘텐츠만 작성

#### 도메인 컴포넌트
| 폴더 | 도메인 |
|------|------|
| `components/study/` | 대시보드 (DomainCard, FeatureCard, ComingSoon, Today위젯) |
| `components/planner/` | 플래너 |
| `components/planner-builder/` | 플래너 빌더 |
| `components/infinity/` | 무한풀기 |
| `components/coach/` | 코치 |
| `components/tutor/` | 튜터 |
| `components/conqueror/` | 오답정복 |
| `components/memory/` | 기억장치 |
| `components/study-index/` | 분석 |
| `components/xray/` | 풀이분석 |
| `components/classbot/` | 클래스봇 (학생/교사 공용) |
| `components/builder/` | 봇 빌더 |
| `components/visual/` | 라이브러리 (VLM) |
| `components/ui/` | shadcn/ui |

### 7.3 버튼 어포던스 규칙 (Button Affordance)

**원칙**: 클릭 가능한 요소는 첫 시선에 클릭 가능함이 인지되어야 한다. 역으로 클릭 불가능한 요소는 클릭 가능하게 보이지 않아야 한다 (false affordance 금지). 버튼·태그·링크의 시각 패턴이 의미와 1:1 매핑되어야 한다.

#### 7.3.1 버튼이 갖춰야 할 시각 신호

다음 중 **2개 이상**을 충족해야 버튼으로 인지된다:
- **명확한 경계**: 배경색 채움 또는 1px 이상 보더. 투명 배경 + 텍스트만은 불가 (단, § 7.3.4 텍스트 링크는 별도 규칙)
- **충분한 패딩**: `px-3 py-2` 이상 (텍스트 버튼). Primary CTA는 `px-4 py-2.5` 이상 권장
- **터치 타겟 ≥ 44×44pt** (§ 6.4): 시각 면적이 작아도 invisible padding으로 보장
- **타이포 위계**: 본문 대비 무게/사이즈 차이 (`font-semibold` 이상, `≥ text-sm`)
- **호버/포커스 상태**: 색상·그림자·스케일 중 1개 이상 변화

#### 7.3.2 모양과 의미의 1:1 매핑

| 시각 패턴 | 의미 | 사용처 |
|---|---|---|
| `rounded-full` + 작은 사이즈 + 컬러 배경 | **태그/뱃지/칩** (정보 라벨, 상태) | 카테고리, 상태 표시, 카운터 |
| `rounded-lg`/`rounded-xl` + `≥ text-sm` + 컬러 배경 | **버튼** (액션) | CTA, 폼 제출, 모드 전환 |
| 텍스트 + 밑줄 (`underline-offset`) | **인라인 링크** | 본문 안 참조 이동 |
| FAB (원형, 그림자, 우하단) | **컨텍스트 액션** | 화면당 1개, 가장 자주 쓰는 액션 |

> 같은 시각 패턴이 두 의미로 쓰이면 사용자가 학습된 패턴을 의심하게 되어 인지 비용이 발생한다. **`rounded-full` 작은 알약 모양은 버튼으로 쓰지 않는다.**

#### 7.3.3 Primary CTA 베이스라인

페이지·모달·섹션의 **주요 액션**은 다음을 모두 만족:
- **색상**: `bg-pullim-blue-600` (브랜드 블루) 또는 `bg-pullim-lemon` (스트릭·CTA 강조)
- **크기**: `≥ text-sm`, `px-4 py-2.5` 이상
- **모양**: `rounded-lg` 또는 `rounded-xl`
- **동사 텍스트**: "시작", "풀기", "저장", "확인" 등 행위 명시 — 명사구 단독은 피함
- **위치**: 섹션 콘텐츠 흐름의 끝 또는 상단 우측. 단, 작은 알약 모양으로 메타 라벨처럼 보이게 배치하지 않는다.

#### 7.3.4 텍스트 링크 / 보조 액션

- **본문 안 인라인 이동**: `underline underline-offset-3 hover:text-foreground`
- **"더 보기", "전체 보기"**: 텍스트 링크 또는 `ghost` 변형 버튼. Primary CTA 컬러로 칠하지 않음.

#### 7.3.5 검증

- 첫 시선 1초 안에 페이지의 주요 액션을 식별 가능해야 한다 (디자인 리뷰 체크).
- 같은 페이지에서 비슷한 시각 패턴이 다른 의미로 두 번 이상 등장하지 않아야 한다.
- **회귀 사례**: `/q/review`의 "정복 세트 풀이" — `rounded-full` + `text-xs` + 작은 패딩으로 태그·뱃지처럼 보였던 케이스. § 7.3.2의 금지 패턴 참조 예시.
  - ✅ Q 도메인 처리 완료 — [2026-05-06 button-affordance-q-domain plan](../archive/2026-05-06_button-affordance-q-domain.md)
  - ✅ 라이브러리 4건 처리 완료 (라이브 검증 통과) — [2026-05-07 button-affordance-library plan](../archive/2026-05-07_button-affordance-library.md)
  - ✅ 클래스봇 1건 처리 완료 (라이브 검증 통과) — [2026-05-07 button-affordance-classbot plan](../archive/2026-05-07_button-affordance-classbot.md)
  - ✅ 플래너 4건 처리 완료 (hero CTA 추가 발견 포함, 라이브 검증 통과) — [2026-05-07 button-affordance-planner plan](../archive/2026-05-07_button-affordance-planner.md)

---

## 8. 차트 시스템

- **Recharts** (기본) — 모든 통계 차트
- **D3.js** — 복잡한 시각화만 (망각곡선, IRT 분포 등)

### 차트 컬러 — IRT 5단계 차트 토큰 (`--chart-1` ~ `--chart-5`) 활용

### 표준 차트 패턴
- θ 추세: 라인 차트
- 시간 분포: 막대 차트
- 단원별 정답률: 히트맵 (학습 히트맵 6단계 컬러)
- 사고유형: 레이더 차트
- 망각곡선: 타임라인 + 곡선

---

## 9. 아이콘

- **lucide-react** 일관 사용
- 다른 아이콘 라이브러리 사용 금지
- 컬러는 `--color-foreground` 또는 시맨틱 토큰

---

## 10. 모션 / 애니메이션

- **tw-animate-css** 활용 (Tailwind 기반)
- 모션 토큰은 통합 시스템 v0.1 합의를 따른다 (다른 도메인은 토큰 패키지화 시 자동 정렬, 클래스봇이 우선 적용 대상).

### 10.1 duration / easing 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--duration-fast` | 120ms | 호버, 작은 transform, 색 변환 |
| `--duration-base` | 200ms | 일반 전환, 메시지 mount |
| `--duration-slow` | 320ms | 모달·시트 슬라이드, 큰 페이지 전환 |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | 기본 |
| `--easing-emphasis` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 등장·강조 (메시지 mount, 봇 전환 wave 등) |

### 10.2 인터랙션 표준
- 버튼 hover: `transition-colors var(--duration-fast)`
- 슬라이더 thumb: `transition-transform 120ms`, hover `scale(1.1)`, active `scale(1.15)`
- 카드 hover: `elev.1` → `elev.2`, 120ms (live 카드는 `elev.fab`로 한 단계 위)
- 메시지 mount (챗봇): opacity 0→1, translateY 8→0, 200ms `easing-emphasis` (§15 참조)
- 페이지 진입: skeleton 200ms → content fade-in 160ms (깜빡임 방지)

### 10.3 `prefers-reduced-motion` 처리

모든 도메인 모션은 사용자 시스템 설정을 존중한다.

```css
@media (prefers-reduced-motion: reduce) {
  /* transform·translate·scale·bounce 계열 → opacity-only fade 120ms 로 fallback */
  /* 무한 loop (idle 호흡·blink·LIVE 펄스) → 정적 상태로 정지 */
}
```

- 챗봇 시그니처 모션 9종 (§15) 모두 reduce 시 opacity-only fallback 의무.
- 무한 loop (M2 타이핑·M3 봇 호흡·M4 blink·M5 LIVE 펄스)는 reduce 시 1-frame 정적 (LIVE 뱃지 점은 정적 점으로 유지).

---

## 11. 시각적 컨셉

### 11.1 전반 톤
- **깨끗하고 학생 친화적**
- 정보 밀도는 높지만 과하지 않게 (한 화면 = 한 의사결정)
- **태블릿 우선** (가로/세로 모두 main) — 큰 터치 영역, 충분한 여백, 1024px break point에서 사이드바 풀/조밀 전환

### 11.2 풀림 시그니처
- **블루 + 레몬 강조**: 메인 블루 + 스트릭/CTA에 레몬 색
- **인터랙티브 시뮬**: 라이브러리 VLM의 슬라이더·실시간 그래프
- **데이터 시각화**: 히트맵, 레이더, 망각곡선이 자연스럽게 노출
- **친근한 마이크로카피**: 이모지·존댓말로 학생과 같은 편

### 11.3 학생 vs 교사 시각 구분
- 학생: 좁고 친근, **태블릿 우선** (3 bracket 모두 일급), 풍부한 모션
- 교사: 넓고 정보 밀도 높음, 데스크탑 우선, 절제된 모션

---

## 12. 접근성 (Accessibility)

### 12.1 포커스
- 키보드 포커스: **`--focus-ring`** 무조건 표시 (§ 5.1). transition 없이 즉시 적용.
- destructive 액션은 `--focus-ring-danger`.
- 모든 인터랙티브 요소 키보드 접근 가능 + `:focus-visible`만 사용 (마우스 클릭 안 보이게).

### 12.2 색 대비
- 텍스트 vs 배경: 최소 WCAG AA (4.5:1) — 메타 컬러 사용은 § 1.2.1 표 강제.
- 시맨틱 색은 색만으로 의미 전달 X (아이콘·레이블 병행).
- danger·warning CTA는 흰 글자 대비 AA 통과 hue로 한정 (warning CTA는 `#D97706` 이상 — `#F59E0B`+흰 글자 = 2.6:1 미달이므로 금지).

### 12.3 모션 감소
- `prefers-reduced-motion: reduce` 시 § 10.3 룰 적용.
- 무한 loop (타이핑·LIVE 펄스·봇 idle 호흡)는 정적 상태로 정지.
- 챗봇 시그니처 모션 9종 (§ 15.2)은 reduce 시 opacity-only fade 120ms로 fallback.

### 12.4 hit-area
- 인터랙티브 요소 최소 **44×44pt** (§ 6.4). 시각 면적이 작아도 invisible padding으로 보장.
- 챗봇 primary 전송 버튼·봇 스위처 칩·과제 카드 D-day pill 등 회귀 점검 대상.

### 12.5 아이콘 버튼·skip-link
- 단독 아이콘 버튼은 `aria-label` 필수 (헤더 알림·검색·역할 토글 등).
- 모든 페이지에 `Skip to content` 링크 (키보드 사용자용).

---

## 13. 폼 / 인풋

- 슬라이더: `dual-range` 클래스 (트랙 클릭 무시, 핸들만 드래그)
- KaTeX 입력: 별도 위지윅이 아닌 raw LaTeX 입력 권장 (학생용은 미니 키패드 옵션)

---

## 14. 정보 밀도 가이드 (Layer 1 + Layer 2)

학생 사용자가 **조잡함 없이** 화면을 읽을 수 있도록 정량 기준을 정의한다. 두 층으로 구성:

- **Layer 1 (공통 베이스라인)** — 모든 화면이 만족해야 하는 floor
- **Layer 2 (화면 유형별 매트릭스)** — 화면 유형 × 디바이스 bracket으로 차별 적용
- **Layer 3 (개별 화면)** — 명세하지 않음. 디자인·스토리보드 단계에서 처리

> 이 룰은 라이브 검증(`output/live-shots/`) 기반. 7가지 조잡함 패턴 — 헤더 과밀, nav 이중화, 학습 화면 정보 과부하, 다크/라이트 톤 혼재, 이모지·아이콘·색 남발, 메타 텍스트 hierarchy 부족, primary CTA 모호 — 을 직접 잡기 위해 작성.

### 14.1 Layer 1 — 공통 베이스라인 (모든 화면 필수)

| 항목 | 기준 | 비고 |
|---|---|---|
| 본문 폰트 (Compact) | ≥ 16px | iOS Safari 자동 줌 방지 + 학생 가독성 |
| 본문 폰트 (Cozy) | ≥ 15px | |
| 본문 폰트 (Comfortable) | ≥ 14px | |
| 캡션 폰트 | 12px | 모든 디바이스 동일 |
| Color contrast (본문) | **WCAG AA 4.5:1 이상** | 시맨틱 색만으로 의미 전달 금지 |
| Color contrast (큰 텍스트) | **3:1 이상** | 18px+ |
| 인터랙티브 터치 타겟 | **≥ 44×44pt** | 태블릿 메인 = 터치 우선 |
| 카드/블록 간격 | **≥ 12px** | |
| Primary CTA | **한 화면에 정확히 1개** | 시각적으로 가장 강한 단일 액션 |
| Secondary 액션 | **≤ 3개** | primary 외 액션 수 제한 |
| 메타 텍스트 hierarchy | **2단계 (primary/secondary)** | primary: slate-600/700 / secondary: slate-400/500 — 한 회색 단계 금지 |
| 토글·버튼 텍스트 | **`white-space: nowrap`** | Compact에서 한 글자씩 wrap 깨짐 방지 |
| 화면 베이스 톤 | **단일 (다크 OR 라이트)** | 한 화면에 두 톤 혼재 금지 — **예외**: 시험 모드 시그니처(`exam-status-bar.tsx`) 등 사용자에게 모드 변경을 명시 신호하는 의도적 다크 영역은 허용 |
| 색 강조 토큰 동시 사용 | **≤ 3종** (블루 + 레몬 + 위험까지 한도) | 이모지·아이콘 색은 별도. success/warn은 § 1.3 deprecated — 정보 위계는 블루 명도로 표현 |
| 아이콘 일관성 | **lucide-react 단독** | 다른 아이콘 라이브러리 금지. 단 아래 §14.1.1 예외 항목은 emoji 허용 |

#### 14.1.1 아이콘 일관성 예외 (emoji 허용 영역)

`lucide-react 단독` 룰의 예외는 다음 여섯 영역으로 한정한다. 이 외 영역은 룰을 그대로 따른다.

- **예외 1 — 감정·컨디션 셀프-리포트 픽커**: 학생이 자기 affect를 보고하는 픽커는 emoji가 표현력 우위(즉각적 감정 매핑) + 학생 친화. 적용 사례: `conditionMeta` (1~5단계 컨디션 슬라이더), `emotionIcons` (블록 완료 후 감정 체크인). 위치: `src/lib/mock/planner.ts`.
- **예외 2 — 봇·교사 페르소나 식별**: 봇·교사 페르소나 아바타·식별 emoji는 사용자 커스터마이징 가능 영역(데이터 형태로 emoji 보존). 적용 사례: `ClassBot.avatarEmoji`, `LiveSessionRow.botEmoji`, `BotSettingsState.identity.avatarEmoji`, `TeacherVoice.emoji`. 위치: `src/lib/mock/classbot.ts`, `src/lib/mock/infinity.ts`.
- **예외 3 — Transient feedback / 환영 emoji**: toast 메시지·환영 인삿말·empty state는 일시적이거나 감정·환영 톤이라 emoji가 표현력 우위. 적용 사례: `toast.success/info/warning` 안 emoji(예: 정답 피드백 `🎉 정답이에요!`, 빈 상태 `✨ 약점 없어요`), 학생 홈 `👋` 인삿말. 위치: `src/components/study/weak-spot-card.tsx`, 각 도메인 toast 호출부, 학생 홈 인삿말.
- **예외 4 — 봇 페르소나 발화 메시지 텍스트**: 예외 2의 자연스러운 확장. 봇·교사 페르소나가 발화하는 카톡 스타일 챗 스트림 메시지 본문 안 emoji는 페르소나 voice 일부라 예외. 적용 사례: `lib/mock/coach.ts` agent message stream(📅/📚/📈/🎯/💡/🌅/🔥 등 12+건), `lib/mock/phase1.ts` 봇 인삿말 안 `🙌`. 위치: `src/lib/mock/coach.ts`, `src/lib/mock/phase1.ts`.
- **예외 5 — 콘텐츠 썸네일 indicator emoji**: 콘텐츠 카드 썸네일 영역의 emoji는 이미지 placeholder 역할 + 콘텐츠 다양성 표현. 적용 사례: `lib/mock/visual.ts` `thumbEmoji` 필드(📈/🛗/🎧 등 3건). 위치: `src/lib/mock/visual.ts`.
- **예외 6 — Q-1 픽커 의미 설명 텍스트**: 예외 1의 자연스러운 확장. Q-1 셀프 affect 픽커의 의미를 설명하는 onboarding/도움말 텍스트는 픽커 selector(예외 1)와 시각 일치를 위해 동일 emoji 유지. 적용 사례: `app/(student)/planner/onboarding/page.tsx:67` `bullets: ['😴 피곤 → -20%', '🙂 보통 → 기본', '🤩 쌩쌩 → +20%']`. 위치: `src/app/(student)/planner/onboarding/page.tsx`.

그 외 decorative emoji(헤딩/뱃지/필터칩/메타 prefix/legend marker/onboarding step/builder tone·style meta/ValueBullet 등)는 lucide-react로 통일한다.

> 결정 출처: 2026-05-07 inline emoji cleanup plan (결정 ①~⑤=A 권장안 채택). 선행: 2026-05-07 mock emoji cleanup tail (Q-1=A 감정 픽커 예외, Q-2=A 봇 정체성 예외, Q-3=A 그 외 lucide). 본 plan 경로: `proc/archive/2026-05-07_inline-emoji-cleanup.md`.

### 14.2 Layer 2 — 화면 유형별 매트릭스

화면 유형 5개 × 3 bracket = 15셀. 각 셀은 Layer 1 위에 추가로 적용.

#### 14.2.1 화면 유형 정의

| 유형 | 특성 | 대표 라우트 |
|---|---|---|
| **A. 학습 집중형** | 콘텐츠 가독성 최우선, 풀이·해설 | `/q/infinity/solve`, `/q/infinity/explain`, `/q/review/conquer` |
| **B. 대시보드형** | 정보 살펴보기, 도메인 허브 | `/q`, `/q/infinity`, `/q/review`, `/planner` 홈 |
| **C. 분석/차트형** | 차트가 메인, 메트릭 다수 | `/q/analysis/*` 전체 |
| **D. 대화형** | 채팅 패턴, 코치·튜터 | `/q/talk`, `/q/talk?tab=coach` |
| **E. 목록/인덱스형** | 스캔 가능성, 카드·행 다수 | `/q/infinity/history`, `/q/review` 목록부 |

#### 14.2.2 매트릭스

| 유형 \ Bracket | Compact (<768) | Cozy (768~1023) | Comfortable (≥1024) |
|---|---|---|---|
| **A. 학습 집중형** | 우측 보조 패널은 **슬라이드인 모달**로 분리 / 메인 너비 100% / Primary 인터랙션 ≤ 3 | 우측 패널 토글 가능 / 메인 ≥ 70% / Primary 인터랙션 ≤ 4 | 우측 패널 고정 / 메인 ≥ 60% / Primary 인터랙션 ≤ 5 |
| **B. 대시보드형** | 단일 열 / 첫 뷰포트 카드 ≤ 5 / Primary CTA 1개 + Secondary ≤ 2 | 1~2 열 / 카드 ≤ 6 | 2~3 열 / 카드 ≤ 8 |
| **C. 분석/차트형** | 메트릭 **세로 스택 또는 carousel** (≥3 한 줄 금지) / 차트 1개당 텍스트 부연 ≤ 3줄 | 메트릭 2~3 열 / 차트 풀 폭 / 텍스트 부연 ≤ 4줄 | 메트릭 ≥3 열 / 차트 multi 가능 / 텍스트 부연 ≤ 4줄 |
| **D. 대화형** | 채팅 영역 **≥ 70%** / 안내 카드 접힘 가능 (collapse 기본) | 채팅 ≥ 60% / 안내 카드 토글 | 채팅 ≥ 60% / 안내 패널 사이드 |
| **E. 목록/인덱스형** | 메트릭 카드 ≤ 4 / 행당 정보 ≤ 3 항목 / 정렬·필터 ≤ 1개 | 메트릭 카드 ≤ 6 / 행당 ≤ 4 / 정렬·필터 ≤ 2개 | 메트릭 카드 ≤ 8 / 행당 ≤ 5 / 정렬·필터 ≤ 3개 |

#### 14.2.3 위반 시 처리

- **개별 위반은 PR 단계에서 수정**
- 룰을 의도적으로 위반해야 하는 경우 (특수 화면): [04-ux-flow.md](04-ux-flow.md) 또는 해당 화면 명세에 **명시적 예외**로 기록 + 사유

### 14.3 Layer 3 — 개별 화면 (out of scope)

Layer 1 + Layer 2를 만족하면 OK. 화면 단위 미세 기준은 본 명세에서 다루지 않으며, 디자인·스토리보드 단계에서 결정한다.

---

**기준 자료**: 
- 토큰 정의: `src/app/globals.css`
- 런타임 토큰: `src/lib/tokens/index.ts`, `src/lib/tokens/tier.ts`
- 디자인 프로토타입: `input/design-prototype/` (참고용 — 그대로 복사 금지)
- 라이브 검증 캡처: `output/live-shots/` (24장 — 모바일·태블릿 portrait·태블릿 landscape·데스크탑)

---

## 15. 챗봇 (Classbot) 도메인 디자인 시스템

> 출처: `input/design-system/private-classbot.md` (Playwright 사적 감사 2026-05-19). 클래스봇의 "AI 분신 챗봇" 컨셉을 시각 언어로 표현하기 위한 도메인 특화 토큰·컴포넌트. 다른 도메인은 통합 시스템 v0.1만 따르고 본 §15는 클래스봇 전용.

### 15.1 메시지 버블 시스템

#### 15.1.1 버블 3 variant

| variant | 배경 | 텍스트 | 보더/라이너 | radius |
|---|---|---|---|---|
| **봇 첫 발화** | `surface.default` (`#FFFFFF`) | `text.primary` | `border.subtle` + **좌측 3px 봇 시그니처 컬러 라이너** | 14 (md) |
| **봇 연속 발화** (같은 봇 3분 이내) | 동일 | 동일 | 아바타 생략 + 32px 들여쓰기 | 14 (md) |
| **사용자** | `brand.600` (`#2854D8`) | `white` | 우측 정렬 | 14 (md) |

- 사용자 버블은 **솔리드 brand.600** (지금처럼 옅은 brand.50 tint는 봇과 구분이 약함 — 사용 금지).
- 봇 첫 발화 위에 아바타 + 이름 + 시간 (12px / `text.tertiary`). 연속 발화엔 생략.
- 메시지 상태 인디케이터: 전송 `✓` / 수신 `✓✓` / AI 생성 `⚡` — 12px / `text.tertiary` / 메시지 우측 하단.

#### 15.1.2 시간/날짜 디바이더

```
─────────── 오늘, 5월 19일 ───────────
─────────── 어제 ───────────
```

- 12px / `text.tertiary` / `font-weight 500` / 상하 32px 여백 / 가운데 정렬
- iMessage 패턴 그대로. 날짜 그루핑 없이 연속 표시 금지.

#### 15.1.3 메시지 타입 6종 카탈로그

| 타입 | 비주얼 단서 | 용도 |
|---|---|---|
| `text` | 기본 버블 | 일반 답변 |
| `problem-card` | 좌측 lime 4px 라이너 + 문제번호 큰 숫자 + "풀러 가기" CTA | 과제·퀴즈 인라인 |
| `explain-step` | 1️⃣ 2️⃣ 3️⃣ 단계 indent + 수식 `font-mono` | 단계별 풀이 |
| `reference-link` | 16:9 썸네일 + 도메인 + 제목 + 한 줄 요약 | 외부 자료 |
| `image` | radius 14, 탭 → lightbox shared-element | 사진·필기 |
| `audio` (T3) | 파형 + 재생/배속 control | 음성 답변 (영어 누나 발음 등) |

> 실제 컴포넌트 구현 우선순위: text → problem-card → explain-step → 나머지.

### 15.2 챗봇 시그니처 모션 9종

§10 통합 모션 토큰을 따르되, 클래스봇 도메인 특화 모션을 정의. 모두 `prefers-reduced-motion: reduce` 시 opacity-only fade 120ms로 fallback (§ 10.3).

| # | 트리거 | 변화 | duration / easing | 효과 |
|---|---|---|---|---|
| **M1** | 메시지 mount (bot/user) | opacity 0→1, translateY 8→0, blur 1px→0 | 220ms / `easing-emphasis` | 자연스러운 등장. 봇별 컬러 라이너 200ms 후 stroke-in. |
| **M2** | 타이핑 인디케이터 (3-dot) | 3 dot 각 220ms 시차 bounce 12px | 1.4s loop / `ease-in-out` | **봇 시그니처 컬러로 점 색칠** |
| **M3** | 봇 아바타 idle 호흡 | scale 1.0↔1.03, opacity 1↔0.92 | 3.2s loop / `ease-in-out` | "살아있다" 신호. **LIVE 봇만**, 대기 봇은 정적 |
| **M4** | 봇 아바타 blink | eye-mask scaleY 1→0.1→1 | 140ms / linear, 4–7s 랜덤 간격 | 사람 같은 디테일 |
| **M5** | LIVE 뱃지 펄스 | `●` 점 opacity 1→0.4→1 + scale 1→1.2→1 | 1.4s loop / `ease-out` | "지금 켜져 있음" 신호 |
| **M6** | 봇 전환 (스위처 클릭) | 채팅 영역 cross-fade 160ms + 봇 메타카드 slide-down 200ms + 시그니처 컬러 라이너 240ms left-to-right swipe | 240ms total / `easing-emphasis` | 봇 전환의 명확한 신호 |
| **M7** | 빠른 칩 등장 stagger | 칩 1~3 각 60ms 시차로 fade-up 8→0 | 200ms each / `easing-standard` | 봇 응답 후 칩이 "권유"하는 느낌 |
| **M8** | 첨부 이미지 expand | 썸네일 → lightbox shared-element transform | 280ms / `easing-emphasis` | iOS Photos 느낌 |
| **M9** | 봇 시그니처 응답 시작 | 첫 글자 등장 전 봇 액센트 컬러 **wave bar** (3px 높이) 좌→우 1회 | 320ms / `easing-emphasis` | 봇별 "지금 말 시작" 시각 cue |

#### 15.2.1 봇별 시그니처 모션 변형 (M1·M2)

| 봇 | M1 변형 | M2 점 색 | 톤 |
|---|---|---|---|
| 수학이 형 | 단정한 fade-up 200ms `ease-out`, no spring | `accent.lime` `#E6FF4C` | 단호 |
| 영어 누나 | spring fade-up 280ms (overshoot 1.05) | coral `#FF7A6B` | 부드러움 |
| 과학 쌤 | scale 0.96→1 + fade 240ms | mint `#22C5A8` | 호기심 |
| 국어 누나 | slow fade 320ms (튀지 않음) | violet `#7B5CFF` | 차분 |
| 사회 코치 | bouncy 260ms `ease-out-back` | amber `#D97706` | 활기 |

> 봇 시그니처 컬러는 [07-branding.md § 4.6.2](07-branding.md) 정의 표를 단일 진실원으로 사용.

#### 15.2.2 시청자 수 라이브 카운터

- 숫자 변동 시 spring-in 180ms micro-animation
- 5명 이상 늘면 `+5` 잠깐 floating (1.2s 후 페이드 아웃)

### 15.3 LIVE 카드 시그니처

```
┌────────────────────────────────────────────────┐
│●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│  ← 좌측 4px lime 라이너
│  ●LIVE  ⬢ 14명 참여 중 · 23:14 진행            │
│  수학이 형 라이브                              │  ← 22px bold white
│  도함수의 활용 — 극값과 변곡점                 │
│  [▶ 지금 입장] [✦ 음소거 미리보기]             │  ← lime CTA + ghost
└────────────────────────────────────────────────┘
```

- 배경: `surface.inverse` (`#0F1A3A`) **solid** — 그라데이션 금지
- 좌측 라이너: 4px `accent.lime` (시그니처)
- LIVE 뱃지: `live.fg` (`#E5484D`) bg + 흰 텍스트 pill + M5 펄스
- CTA: lime pill (브랜드 lemon = lime) + 검정 텍스트
- 이전 다크 그라데이션(`navy → blue`) 패턴 폐기 — 시각 차별화 0이라 사용 금지.

### 15.4 봇 스위처 칩

- 가로 스크롤 5개 칩 + 오른쪽 끝 `[≡]` drawer (검색·즐겨찾기 진입)
- 활성 봇: **봇 시그니처 컬러 배경 + 흰 글자** (지금처럼 brand.600 단색 X — 봇 구분 안 됨)
- LIVE 봇: 칩 좌측에 빨간 펄스 점 (2px 라이너) — 대기는 회색 점
- 데스크탑은 칩 사이 8px 갭, 모바일은 6px

### 15.5 봇 메타 카드 (헤더)

자세한 collapse 동작과 인터랙션 룰은 [04-ux-flow.md § 9.3](04-ux-flow.md). 본 절은 토큰만.

| 상태 | 높이 | 노출 정보 |
|---|---|---|
| **기본 (collapsed)** | 56px | `← [🧑‍🏫] 수학이 형 · L3 교과범위        ⓘ ⌃` |
| **펼침 (expanded)** | 180px | + 학원명 / 톤(친근체) / 응답시간(~3초) / 자동차단 안내 + 범위 변경 진입 |

- toggle: `⌃` 아이콘 클릭 또는 메타카드 영역 탭
- 모바일 키보드 열림 시 자동 collapse ([04 § 9.5](04-ux-flow.md) 참조)
- 컬러: `surface.default` bg + `border.subtle` bottom line

### 15.6 과제 카드 상태별 컬러 매핑

학생 받은 과제 리스트의 카드 상태를 컬러로 즉시 구분.

| 상태 | progress bar | D-day chip | 카드 좌측 라이너 |
|---|---|---|---|
| 진행 중 | `brand.600` | 회색 + "D-N" | `brand.50` |
| 마감 임박 (D-1) | `warning.cta-bg` (`#D97706`) | warning chip "내일" | warning |
| 지연 | `danger.fg` (`#C03B3F`) | danger chip "지난 N일" | danger |
| 완료 | `success.fg` (`#0E8C56`) + 100% | 회색 "완료" | success + 체크 |
| 오답정복 | `accent.lime` | lime chip | lime |
| 시험 | `surface.inverse` solid | navy chip "시험" | navy 강조 |

- 뱃지 3종(연습/오답정복/시험)이 모두 파랑 계열로 보이던 회귀를 해결.
- 봇별 그룹 헤더: 카드 위에 `[🧑‍🏫 수학이 형 · 3개]` + 봇 시그니처 컬러 점 + 진척 한 줄 (`8/55문항`).

### 15.7 입력바 (Chat Input)

```
┌─────────────────────────────────────────────────────┐
│ [+] [🎤] [수학이 형에게 물어보세요…           ] [→] │
└─────────────────────────────────────────────────────┘
   ↑    ↑    ↑                                       ↑
첨부 음성  multiline 자동확장 (max 5 lines)        전송
```

- 높이: 기본 44px, multiline 자동 확장 max 5 lines (이후 자체 스크롤)
- `[+]`·`[🎤]`·`[→]` 각 44×44pt hit-area 가드
- placeholder: 봇 이름 + 시그니처 prompt 예시
- bottom-fixed sticky, 모바일은 `visualViewport` API로 키보드 위에 부착 ([04 § 9.5](04-ux-flow.md) Critical 룰)
- Scope·Tone 표시 절대 풋터에 두지 않음 — 봇 헤더 카드에서만 (메타) 노출

### 15.8 컴포넌트 추가 권고

`components/classbot/` 하위에 다음 컴포넌트를 신설:

| 컴포넌트 | 역할 | §15 참조 |
|---|---|---|
| `BotBubble` | 봇 첫 발화·연속 발화 variant | 15.1.1 |
| `UserBubble` | 사용자 발화 (solid brand.600) | 15.1.1 |
| `MessageDivider` | 시간/날짜 그룹 디바이더 | 15.1.2 |
| `TypingIndicator` | M2 3-dot bounce | 15.2 |
| `BotMetaHeader` | collapse/expand 토글 헤더 | 15.5 |
| `BotSwitcherChip` | 시그니처 컬러 + LIVE 펄스 점 | 15.4 |
| `LiveCard` | navy solid + lime 라이너 시그니처 | 15.3 |
| `AssignmentStateBadge` | 상태별 컬러 매핑 통합 | 15.6 |
| `QuickReplyChips` | M7 stagger + 동적 추천 props | 15.2 + [04 § 9.6](04-ux-flow.md) |
| `ChatInputBar` | `visualViewport` sticky + multiline 자동확장 | 15.7 + [04 § 9.5](04-ux-flow.md) |
