# 통합 shell 구현 (학생/교사 공용)

## 목표
학생과 교사가 같은 shell 컴포넌트를 공유하되 역할별로 행동이 분기되는 단일 진입점 구축. 페이지는 콘텐츠만 작성하면 됨.

## 작업 항목
- [x] `components/shell/app-shell.tsx` 루트 wrapper (역할 분기)
- [x] `components/shell/app-header.tsx` GNB
  - [x] 좌: 풀림 로고 + 검색 (Cmd+K)
  - [x] 중: 컨텍스트 (D-day · 플래너 활성 블록 · LIVE)
  - [x] 우: 알림 · 역할 스위처 · 사용자 메뉴
- [x] `components/shell/app-sidebar.tsx` 사이드바
  - [x] lg 전체 / md 축약 / 모바일 drawer 안에서도 재사용
  - [x] 1항목 그룹 라벨 숨김
  - [x] 섹션(Contextual Sidebar) swap 패턴
- [x] `components/shell/mobile-drawer.tsx` 모바일 햄버거 → Sheet
- [x] `components/shell/bottom-nav.tsx` 학생 모바일 5탭 (matchPrefix)
- [x] `components/shell/role-switcher.tsx` GNB 역할 토글 (학생/교사)
- [x] `components/shell/breadcrumb.tsx` 자동 생성 trail
- [x] `components/shell/coach-fab.tsx` 학생 모바일 코치 FAB
- [x] `components/shell/nav-config.ts` ★ 모든 네비 항목의 단일 소스
- [x] `components/shell/section-heading.tsx`
- [x] 학생 콘텐츠 폭 `max-w-screen-md` 자동 적용
- [x] 교사 콘텐츠 폭 `w-full` (와이드)
- [x] 페이지 자체 헤더·네비 만들지 않는 컨벤션 정착

## 비고

### 핵심 원칙
- **새 기능 라우트 추가 시**: `nav-config.ts`의 `studentNav` 또는 `teacherNav`에 항목 추가만 하면 사이드바·드로어·BottomNav 자동 갱신
- **페이지는 shell이 wrapping** 하므로 자체 헤더·네비 만들지 말 것 — 페이지 콘텐츠만 작성
- breadcrumb는 `nav-config.ts`의 그룹/항목/섹션 구조에서 자동 파생

### 섹션 패턴 (Contextual Sidebar)
복잡한 기능은 sub-route를 가진 "섹션"으로 등록 — 진입 시 사이드바가 swap.
- 사이드바 상단에 "← 전체 기능" 복귀 링크 + 섹션 헤더(아이콘+이름)
- breadcrumb 자동 3-단계 (예: `풀림 스터디 > 풀림 플래너 > 일간 캘린더`)

### 섹션 등록된 기능
- 풀림 플래너 (홈·캘린더·빌더·리포트) ✅
- 풀림 클래스봇 (학생/교사 각각)
- 풀림 무한풀기 (홈·풀이·해설·시험·이력)
- 풀림 AI 대화 (코치 6 에이전트별 입구)

### 단일 페이지로 충분한 기능
- 풀림 분석 (탭만으로 정보 밀도 OK)
- 풀림 비주얼 (단일 카탈로그+상세)
