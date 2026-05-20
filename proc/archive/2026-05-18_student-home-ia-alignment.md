# 2026-05-18 — 학생 홈 IA 정합 (라이브+리플레이 가중치 상향)

## 결정 한 줄
**07 핸드오프 IA(L.56-59 "클래스룸 = 실시간 수업 / 즉석 퀴즈·폴 / 수업 리플레이") 정합 — 학생 홈 화면에서 라이브+리플레이의 시각적 가중치를 봇 대화보다 높인다.**

## 배경
[input/docs-archive/07_풀림_클래스봇_핸드오프.md](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md) 점검 결과 권위 IA와 코드 홈 화면 간 갭이 확인됨.

### 권위 문서 가중치
| 측면 | 봇 대화 (채팅) | 라이브 + 리플레이 |
|---|---|---|
| IA 1차 메뉴 | 없음 — 봇 선택 후 행위로 흡수 | 클래스룸 섹션 2개 (실시간 수업, 수업 리플레이) |
| 단독 4.x 섹션 | 없음 | 4.6 수업 리플레이 단독 섹션 |
| 용어 사전 (L.496) | 미등재 | `Replay` 등재 |
| Flow A 골든 패스 (L.222-223) | 등장 안 함 | "실시간 수업 화면 진입 → 수업 종료 → 리플레이 자동 생성" |
| MVP 명시 우선순위 (L.408-426) | 필수 (기본 챗) | 라이브 묵시 필수 / 리플레이 v1 명시 제외 |

### 코드 BEFORE (`src/app/(student)/classbot/page.tsx`)
- 라이브 섹션은 `liveBots.length > 0` 조건부 — 평소 0건일 때 IA의 "실시간 수업" 슬롯이 사라짐
- 빠른 진입 3 그리드의 `accent`(파란 강조)는 **봇 대화** — IA 1차 메뉴가 아닌 행위에 강조 부여
- 리플레이는 평범한 칸 — IA 단독 섹션 보유 자원에 강조 없음

## 결정 근거
**IA·섹션 두께·용어 사전 가중치를 따른다.** MVP 우선순위에서 봇 대화가 필수이고 리플레이가 명시 제외라는 사실은 알지만, 봇 대화 진입 경로 자체는 `MyBotsStrip`의 봇 카드 클릭(`href="/classbot/chat"`)으로 이미 영구 보장되므로 빠른 진입 그리드의 강조까지 봇 대화에 부여할 필요는 없음. 라이브 슬롯은 IA에 명시된 영구 자리.

## 작업 항목

### A. 라이브 섹션 영구 노출 ([src/app/(student)/classbot/page.tsx](../../src/app/(student)/classbot/page.tsx#L55-L119))
- [x] `liveBots.length > 0` 조건부 wrap 제거 — `<section>`은 항상 렌더
- [x] 헤더 분기: 활성 시 빨간 LIVE 펄스 뱃지 + "N개 수업 진행 중" + 시각 / 비활성 시 회색 LIVE 뱃지 + "라이브 수업" (시각 생략)
- [x] 본문 분기: 활성 시 기존 파란 그라데이션 큰 카드 + `<LiveQuizCard />` / 비활성 시 점선 회색 안내 카드 → `/classbot/replay` 이동
- [x] 헤더 부가표시 "외 0건" 노이즈 정리 — 1건일 때 단순 시각만 표시

### B. 빠른 진입 그리드 accent 재배치 ([src/app/(student)/classbot/page.tsx](../../src/app/(student)/classbot/page.tsx#L131-L156))
- [x] 봇 대화 칸 — `accent` prop 제거. 칸 자체는 유지(`MyBotsStrip` 봇 카드 진입과 별개의 명시적 진입점)
- [x] 리플레이 칸 — `accent` prop 추가. IA 단독 섹션 보유 자원으로 격상
- [x] 봇 찾기 — `locked` 유지 (변동 없음)

### C. 검증
- [x] `bun x tsc --noEmit` 통과
- [ ] dev 서버 직접 확인 — 라이브 활성·비활성 두 상태 (localStorage `pullim-live-sessions` 비워서 비활성 케이스 재현)
- [ ] PR 머지 후 prod-verify schedule run 1회 green

## 비-대상
- 사이드바·하단탭 IA 자체는 미변경 — 본 plan은 학생 홈 화면 한 곳 범위
- 교사 측 IA 정합은 별도 검토 대상
- `MyBotsStrip` 봇 카드의 `href` 변경 안 함 — 봇 대화 진입은 그대로 봇 카드가 책임

## 관련 문서
- [input/docs-archive/07_풀림_클래스봇_핸드오프.md](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md) — 권위 IA·플로우 출처
- [input/docs-archive/05_풀림_수업방_세부기획.md](../../input/docs-archive/05_풀림_수업방_세부기획.md) — "라이브/리플레이" 어휘 미사용, "세션·실시간 모니터링" 어휘 — 본 plan에서는 07 어휘 채택
