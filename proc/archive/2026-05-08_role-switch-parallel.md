# AppHeader 역할 전환 — cycle → 병렬 진입

## 목표
ProfileMenu의 역할 전환 동선을 *3-way cycle (학생→교사→보호자→학생)*에서 *나머지 두 역할 평행 노출*로 변경. 어느 페이지든 1번 클릭으로 다른 역할 진입 가능.

## 의사결정 (2026-05-08)
- 사용자 명시 피드백 — "학생-교사-학부모-학생 사이클은 병렬적이지 않아. 사용자 메뉴로 진입 시 학생의 경우엔 교사·학부모 페이지 진입이 가능하도록"
- 모바일 drawer의 RoleSwitcher는 이미 3-way 토글이라 변경 없음 — 데스크톱 ProfileMenu만 통일

## 작업 범위
`src/components/shell/app-header.tsx` ProfileMenu 영역만 (1 컴포넌트, 글로벌 영역).

## 작업 항목
- [x] **`roleSwitchNext` cycle map 제거** → `ROLE_ENTRIES` 3개 진입점 (`student`/`teacher`/`parent`)
- [x] **`ALL_ROLES` 배열** 신규 — `['student', 'teacher', 'parent']`
- [x] **`otherEntries` 산출** — `ALL_ROLES.filter(r => r !== role)`로 현재 역할 제외 두 개
- [x] **DropdownMenuItem 다중 렌더** — 단일 cycle 항목 → `.map()`으로 두 항목 렌더, 각각 own Icon

## 검증
- [x] `bunx tsc --noEmit` — exit 0
- [x] 라이브 인터랙션 (playwright 3 역할 검증):
  - 학생(/) → 메뉴 4항목 (내 정보 / 교사 뷰로 전환 → /teacher/classbot / 보호자 뷰로 전환 → /parent / 로그아웃) ✓
  - 교사(/teacher/classbot) → (내 정보 / 학생 뷰로 전환 → / / 보호자 뷰로 전환 → /parent / 로그아웃) ✓
  - 보호자(/parent) → (내 정보 / 학생 뷰로 전환 → / / 교사 뷰로 전환 → /teacher/classbot / 로그아웃) ✓

## 후속 메모
본 plan은 *retroactive 작성* — 사용자 피드백("문서화 먼저") 후 archive로 즉시 정리. 향후 모든 코드 변경은 plan 우선 워크플로우 엄수.
