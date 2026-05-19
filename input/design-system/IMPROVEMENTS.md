# Pullim 개선 백로그 (세 앱 통합)

세 앱 감사 결과를 **공통 / Planner / Q / Classbot** 4그룹으로 분류. 심각도(high/med/low) + 노력(S/M/L) + 영향 영역 태그.

`tokens.json` / `tokens.css`을 도입하면 ⓣ 표시된 항목은 자동 해결.

---

## A. 공통 (세 앱 모두 해당)

| # | sev | 노력 | 영역 | 액션 | 토큰화? |
|---|---|---|---|---|---|
| A1 | **high** | S | a11y | `#97A0B4` on white (3.0:1) 14px 미만 텍스트 모두 `#6B7489`로 일괄 치환 | ⓣ |
| A2 | **high** | S | a11y | 버튼 `min-height: 44px` (모바일) / `40px` (데스크탑) 가드 | ⓣ |
| A3 | **high** | M | typography | 타이포 스케일 8단계 토큰화: caption12 / body14 / bodyLg16 / title3-18 / title2-20 / title1-24 / display2-28 / display1-32 | ⓣ |
| A4 | high | S | typography | 9, 10, 10.5, 11, 12.5px 사용 전면 금지 (lint 룰화) | ⓣ |
| A5 | med | M | consistency | radius 14/18/20/26 → **14 · 20 · pill** 3단계로 통일 | ⓣ |
| A6 | med | S | spacing | 14·18 같은 튀는 값 제거, 8pt 변형 스케일(0/4/8/12/16/20/24/32/40/48) 통일 | ⓣ |
| A7 | med | M | motion | 모션 토큰(duration fast/base/slow, easing standard/emphasis) 도입, 카드 hover/페이지 진입/포커스 통일 | ⓣ |
| A8 | med | S | a11y | `:focus-visible` 룰 글로벌 적용 (`--focus-ring` 사용) | ⓣ |
| A9 | med | S | a11y | 헤더/네비 아이콘 버튼 `aria-label` 일괄 점검 | |
| A10 | low | S | a11y | 모든 페이지 skip-link(`Skip to content`) | |
| A11 | low | M | i18n | 영문 jargon(`Hero Recap`, `Scope L3`, `Root Graph`) 한글 병기 또는 툴팁 | |
| A12 | low | M | components | 공통 컴포넌트 패키지(`@pullim/ui`)로 Button/Card/Chip/Hero/FAB/EmptyState/Skeleton 분리 | |

---

## B. Planner (학생 학습 플래너)

| # | sev | 노력 | 영역 | 액션 |
|---|---|---|---|---|
| P1 | **high** | S | layout | **모바일 헤더 아래 ~250px 빈 공간 제거** — 가장 시급. 빈 placeholder/skeleton 누수 추정. |
| P2 | **high** | M | typography | H2/H3 모두 16px → title2(20/600), title3(18/600)로 위계 회복. |
| P3 | **high** | S | a11y | "시작" 액션 뱃지 24px → 36~44px 높이. padding으로 hit-area 확보. |
| P4 | **high** | S | typography | 캘린더 시각 라벨 9~11px → 12~14px. |
| P5 | med | M | dark-mode | 정의만 있고 미적용 중인 다크 변수(`--background:#080b18`) → 정식 토글 구현 또는 죽은 코드 제거. |
| P6 | med | S | emphasis | 메타라인 "모의평가 · D-16 · 1/7" 균등 강조 → D-16만 pill 분리, 나머지 muted. |
| P7 | med | S | layout | 1440 폭에서 콘텐츠 1000px (우측 240px 낭비) → max-w 1280으로 확장. |
| P8 | med | S | copy | "드래그 정렬 곧 열려요" → 베타/coming soon 라벨로 명시. |
| P9 | med | S | copy | "(데모)" 라벨 라이브 URL 노출 → 데모 환경 분리 또는 배지 격하. |
| P10 | low | S | data-viz | 차트 5색 모두 청색 단조 → chart.2~6 토큰 활용. |
| P11 | low | S | interaction | 카드 hover시 elev.1→elev.2로 인터랙티브 힌트. |
| P12 | low | S | navigation | 사이드바 그룹 헤더("풀림 플래너")가 클릭 가능해 보임 → 작게/회색 분리. |
| P13 | low | S | empty-state | 컨디션 트래커 임계치 이하면 자동 펼침. |

---

## C. Q (학생 학습 허브)

| # | sev | 노력 | 영역 | 액션 |
|---|---|---|---|---|
| Q1 | **high** | S | a11y | **앰버 버튼 `#F59E0B` + 흰글자 (2.6:1)** → `#D97706`로 한 톤 어둡게 (warning.cta-bg 토큰). |
| Q2 | **high** | S | a11y | 작은 회색 메타 `#97A0B4` 10~11px → `#6B7489` 12px+. |
| Q3 | **high** | M | typography | 16↔24 사이 빈 스케일 채움(18·20). H2 16→20/600 승격. |
| Q4 | med | S | layout | `/q/review` 행 높이 72~96px 들쑥날쑥 → 80px(또는 sm/md 두 단계) 고정. |
| Q5 | med | S | density | 데스크탑 카드 갭 24+ → 16~20px (UI 밀도 선호 반영). |
| Q6 | med | M | copy | 해설 12-섹션 영문 라벨 → 한글 병기 ("Hero Recap · 핵심 한눈에"). |
| Q7 | med | S | mobile | FAB와 하단 탭바 충돌 → `bottom: tabBar+24`, 채팅(/q/talk)에서 숨김. |
| Q8 | med | M | motion | skeleton·카드 mount fade-up·FAB hover scale 추가. |
| Q9 | low | S | color | 라임 `#E6FF4C`가 학습 톤과 충돌하는 위치는 골드 `#FFD43B`로 교체 검토. |
| Q10 | low | S | hero | 모바일에서 H1 + 부제 + 칩 같은 줄 → 칩을 H1 위로 분리. |
| Q11 | low | S | consistency | radius 14·20·pill 외 사용 금지 명문화. |
| Q12 | low | S | copy | 엠대시 부제가 모바일에서 어색 → 줄바꿈+회색 보조 텍스트로 변형. |
| Q13 | low | S | a11y | 헤더 아이콘 단독 버튼 4개 `aria-label` 확인. |
| Q14 | low | S | chips | 칩 5종 동시 노출 → 3-tier(brand/success/warning)로 축약. |
| Q15 | low | M | perf | above-fold 우선 + below skeleton 도입. |

---

## D. Classbot (수업 챗봇)

| # | sev | 노력 | 영역 | 액션 |
|---|---|---|---|---|
| C1 | **high** | S | IA | 브레드크럼 "풀림 클래스봇 > 풀림 클래스봇" 중복 제거. |
| C2 | **high** | S | a11y | 10~12px `#97A0B4` 메타 대비 상향(`#6B7489` + min 12px). |
| C3 | **high** | M | motion | **챗봇 타이핑 인디케이터 + 메시지 fade-in 추가** (챗봇 신뢰감 핵심). |
| C4 | **high** | S | a11y | 버튼 hit area 세로 44px (특히 primary 전송). |
| C5 | med | M | consistency | radius 14/18/20/26 → 14/20/pill로 통일. |
| C6 | med | M | typography | 데스크탑 섹션 헤딩 14 → 18~20/600. |
| C7 | med | S | typography | 수식은 이미 로드된 Geist Mono로 렌더. |
| C8 | med | M | copy | "Scope L3" 등 내부 용어 첫 등장 ⓘ 툴팁. |
| C9 | med | M | tone | 봇 톤 반말/존대 토글 (학년·관계 설정 기반). |
| C10 | med | S | a11y | skip-to-content + 아이콘 버튼 aria-label 보강. |
| C11 | low | S | mobile | 챗봇 봇 메타 카드 축약 → 메시지 영역 400px+. |
| C12 | low | S | style | 다크 그라데이션 카드를 솔리드 + 라임 1px 라이너로 단순화. |
| C13 | low | S | copy | 푸터 "데이터 플라이휠" 카피를 학생 시점으로 재작성. |
| C14 | low | M | chat | 빠른질문 칩 4개를 봇/단원별 동적 추천으로. |
| C15 | low | S | input | 입력 후 floating label 보존. |

---

## E. 우선순위 추천 (PR 묶음 단위)

| PR | 묶음 | 영향 앱 | 노력 | 영향 |
|---|---|---|---|---|
| PR-1 | `@pullim/design-tokens` 패키지 신설 + 세 앱 import (A1~A8 토큰 기반 자동 해결) | 전부 | S~M | a11y AA 즉시 통과 + 일관성 |
| PR-2 | **Planner 모바일 헤더 공백 버그 픽스** (P1) | Planner | S | 첫 화면 가치 복구 |
| PR-3 | 타이포 스케일 토큰 적용 (A3, P2, Q3, C6) | 전부 | M | 정보 위계 회복 |
| PR-4 | **Classbot 챗봇 모션 추가** (C3 타이핑 + fade-in) | Classbot | M | 챗봇 신뢰감 |
| PR-5 | 앰버 CTA 컬러 픽스 + 작은 글자 컬러 픽스 (A1, Q1, Q2) | Q (주로) | S | a11y |
| PR-6 | FAB 위치 + 모바일 충돌 해결 (Q7) | Q | S | 모바일 UX |
| PR-7 | radius 14/20/pill 통일 (A5, C5, Q11) | 전부 | M | 일관성 |
| PR-8 | `@pullim/ui` Button/Card/Chip/Hero/FAB/EmptyState 컴포넌트 분리 (A12) | 전부 | L | 장기 일관성 |
| PR-9 | 다크 모드 정리 (P5) | Planner | M | 죽은 코드 제거 또는 토글 |
| PR-10 | 마이크로카피 한글 병기 + 톤 룰 (A11, Q6, C8, C9) | 전부 | M | UX |
