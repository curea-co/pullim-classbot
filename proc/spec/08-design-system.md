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

### 1.3 시맨틱

| 토큰 | HEX | 배경 (-bg) | 용도 |
|------|-----|-----------|------|
| success | `#12B26B` | `#E6F7EE` | 성공·정답·완료 |
| warn | `#F59E0B` | `#FEF3DB` | 경고·주의 |
| danger | `#E5484D` | `#FCE9EA` | 오답·삭제·destructive |

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
| lemon | `#E6FF4C` | 강조 CTA, 스트릭 표시 |
| lemon-soft | `#F5FFB8` | 강조 배경 |
| lemon-ink | `#5C6B0A` | 레몬 위 텍스트 |

플래너 핸드오프 12.1 기반.

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

---

## 5. 그림자

| 토큰 | 값 | 용도 |
|------|---|------|
| pullim-xs | `0 1px 2px rgba(18, 22, 39, 0.04)` | 미세 강조 |
| pullim-sm | `0 1px 3px ... + 0 1px 2px ...` | 카드 기본 |
| pullim-md | `0 4px 12px ... + 0 2px 4px ...` | 떠 있는 카드 |
| pullim-lg | `0 12px 24px ... + 0 4px 8px ...` | 모달·팝오버 |
| pullim-glow | `0 0 0 4px rgba(59, 111, 246, 0.15)` | focus ring |

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
- 표준 duration:
  - 짧음 (hover): 120ms
  - 중간 (페이지 전환): 200ms
  - 김 (모달): 300ms
- easing: 기본 `ease`, 강조 시 `ease-out`

### 인터랙션 표준
- 버튼 hover: `transition-colors duration-120`
- 슬라이더 thumb: `transition-transform 120ms`, hover `scale(1.1)`, active `scale(1.15)`
- 카드 hover: 살짝 떠오르기 (`shadow-pullim-md` → `shadow-pullim-lg`)

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
- focus ring: `--shadow-pullim-glow` 또는 `outline: 2px solid blue-400`
- 모든 인터랙티브 요소 키보드 접근 가능
- focus-visible 사용 (마우스 클릭에는 안 보이게)

### 12.2 색 대비
- 텍스트 vs 배경: 최소 WCAG AA (4.5:1)
- 시맨틱 색은 색만으로 의미 전달 X (아이콘·레이블 병행)

### 12.3 모션 감소
- `prefers-reduced-motion: reduce` 시 애니메이션 최소화

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
| 색 강조 토큰 동시 사용 | **≤ 3종** (성공/주의/위험 + 풀림 블루까지 4종 한도) | 이모지·아이콘 색은 별도 |
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
