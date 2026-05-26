# 학생 클래스봇 홈 전면 개편

## 목표
학생 홈([src/app/(student)/classbot/page.tsx](../../src/app/(student)/classbot/page.tsx))의 9블록 To-Do 대시보드를 *"선생님들이 나한테 보낸 것"* 4블록 구조로 전면 리라이트. 정체성("선생님의 분신")이 카드 인격화가 아니라 **각 줄의 발신자 라인**으로 살아나도록.

## 정체성 (대화 합의 — 2026-05-26)
- **클래스봇 = 선생님의 분신** ([07 § 1.1](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md))
- **학생 홈 = 분신들이 나한테 한 일/보낸 것이 보이는 한 곳**
- 봇 인격은 *카드 디자인*이 아니라 *각 줄의 발신자 라인*으로 표현. 봇 성격을 카드에 그리는 건 학생에게 새 정보 0이라 제외.
- 학생이 홈에서 답해야 할 질문은 단 하나: **"내가 지금 뭐 해야 하지"**

## 진단 (현재 홈의 문제)
- 블록 9개 — LIVE / 내 클래스봇 / 채점알림 / Primary 과제 / 받은 과제 / Mini KPI / QuickEntry 3개 / 모니터링 / FlywheelNote
- 컬러 시스템 4종 동시 충돌 — LIVE(navy+lime) / Primary(blue grad+lemon) / 봇 시그니처 / mode 컬러
- 시각 무게가 *"과제 1개"*(`PrimaryAssignmentCard` 그라데이션)에 쏠려 정체성("내 선생님들")보다 무거움

## 새 구조 (4블록)
1. **라이브 강조 카드** — 활성 라이브 있을 때만. 봇 아바타 + 수업 제목 + 참여 인원 + "지금 들어가기 →"
2. **새로 온 것 큐** — 이벤트 통합 리스트. 각 줄: 봇 아바타 + 발신자 + 이벤트 요약 + 시간 + 액션 CTA. 종류: 채점 결과 / 새 과제 / 봇 메시지
3. **받은 과제 다 보기 한 줄** — "받은 과제 다 보기 (N개) →"
4. **푸터 안내 한 줄** — "👁 선생님들이 지켜보고 있어요"

### 빈 상태
새로 온 것 0건 + 라이브 없음 → "오늘은 조용해요 / 새로 오는 게 있으면 여기에 떠요" 한 줄 + 푸터만. (사용자 선택: 옵션 1)

## 카피 톤
[feedback_korean_ui_copy.md](../../../.claude/projects/-Users-curea-dev-git-pullim-classbot/memory/feedback_korean_ui_copy.md) 따라 한자어 회피:
- 입장→들어가기 · 확인→보기 · 대화→얘기 · 완료→끝 · 임박/D-1→내일까지 · 코멘트→한 마디 · 문항→문제 · 총 N건→N개
- 도메인 고정 용어(과제·수행평가·채점·선생님·라이브)는 유지
- "수신함" 같은 개념어 화면 노출 X — 헤더는 "새로 온 것"

## 작업 항목
- [ ] mock — 봇 발신 통합 이벤트 타입 (채점 결과 / 새 과제 / 봇 메시지) + 학생별 최근 이벤트 시간순 셀렉터
- [ ] [page.tsx](../../src/app/(student)/classbot/page.tsx) 전면 리라이트 — 9블록 → 4블록
- [ ] 신규 컴포넌트 — 받은 것 줄 / 빈 상태 / 푸터 (이름은 한자어 회피하며 별도 결정)
- [ ] 기존 컴포넌트 제거 — `MyBotsStrip`, `BotCard`, `PrimaryAssignmentCard`, `EmptyAssignmentCard`, `AssignmentRow`, `QuickEntry`, `Mini`, `LiveQuizCard`, `GradingNotificationCard`(→ 큐로 흡수), `FlywheelNote`
- [ ] `LiveSection` 정비 — `LiveQuizCard` 분리 제거, 발광 카드 한 컷만
- [ ] 카피 한자어 점검 1회
- [ ] 빈 상태(라이브 없음 + 새로 온 것 0건) 수동 확인

## 결정 (잠정 — 사용자 지시로 합의 단계 생략, 일단 이대로 구현)
- 큐 묶음 기준: **24시간 이내 + 미열람**
- 채점 결과 점수 노출: **노출** (학생 가치 > 또래 비교 부담)
- 라이브 동시 다수: **첫 하나만 강조 + "외 N건"**
- 큐 최대 표시: **5개 + 더 보기**

---

## 작업 방식 변경 (2026-05-26)
사용자 지시: **시안 10개를 worktree 격리 + 동시 개발**. 합의 단계 생략, planning → 개발까지 한 번에. 사용자가 10개를 실제 화면으로 동시 비교 후 1개 픽.

### 시안 10개 컨셉 + 포트 매핑
| # | 컨셉 | 한 줄 정의 | 포트 |
|---|---|---|---|
| S1 | **Inbox** | 받은 것 목록 (이번 대화 합의 기본형) | 3031 |
| S2 | **Chat list** | 카톡 채팅방 리스트 — 봇 × 1줄 + 미열람 뱃지 | 3032 |
| S3 | **Timeline feed** | 시간 역순 피드, 큰 타임스탬프 헤더 | 3033 |
| S4 | **Spotlight** | 가장 임박한 것 1개 거대 카드 + 미니 리스트 | 3034 |
| S5 | **Speak** | 봇이 학생에게 직접 말 거는 말풍선 + 스와이프 | 3035 |
| S6 | **Schedule** | 오늘 시간표 (오전/오후/마감 구분) | 3036 |
| S7 | **Concierge** | "안녕 ○○야" 대화체 단일 안내 | 3037 |
| S8 | **Notification stack** | iOS lock screen 카드 스택 | 3038 |
| S9 | **Stat grid** | 봇 × 상태 표 + 새로 온 것 카운트 | 3039 |
| S10 | **Deck** | 중앙 카드 한 장 + 스와이프 | 3040 |

### Worktree 전략
- 각 시안 = 별도 git worktree (Agent isolation: worktree)
- node_modules는 메인 워크트리에서 심볼릭 링크로 공유 (`ln -s`)
- 각 agent: 빌드/타입 체크 통과 → worktree path 반환
- 메인에서 10개 dev server 백그라운드 (3031~3040)
- 사용자가 동시 비교 후 1개 픽 → 나머지 worktree 정리

## 비범위
- 교사용 홈, 사이드바·하단탭 IA, 봇 빌더·리플레이·채팅 페이지
- `/classbot/me`로 옮겨갈 KPI(오늘 질문/정답률/웰빙) 노출 변경 — 별도 plan
- [2026-05-26_classbot-design-phase4.md](./2026-05-26_classbot-design-phase4.md) (P3-20 봇 모션) — 같은 날짜 다른 작업, 독립 진행

## 완료 기준
- [ ] `bun x tsc --noEmit` 통과
- [ ] `bun run build` 통과
- [ ] [page.tsx](../../src/app/(student)/classbot/page.tsx) 블록 수 9 → 4
- [ ] 라이브 있음 / 새로 온 것 있음 / 빈 상태 세 가지 모두 `bun dev`로 수동 확인

## 권위
- [07_풀림_클래스봇_핸드오프.md § 1](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md) — 정체성·핵심 가치
- 이번 대화 (2026-05-26) — 정체성 재정의, 4블록 구조 합의, 빈 상태 옵션 1 선택

---

## 결과 (2026-05-26)

**사용자 픽: V15 — KPI header + 봇 strip + 2x2 카테고리 grid + 단일 CTA**

### 라운드 1 — 시안 10개 (S1~S10) 자유 컨셉 비교
worktree 10개 동시 개발 → 모바일 viewport 비교. V09(Stat grid)가 1차 우승.

### 라운드 2 — V09 기준 변형 10개 (V11~V20) 비교
V09 골격을 base로 다른 축의 변형 (Matrix table / +Recommended CTA / Wheel / Vertical rows / KPI header / 6-tile / Sparkline / Action-first / Color tiles / Monochrome) → V15 픽.

### V15 선정 핵심
- 첫 시선이 압축 KPI 헤더("오늘 N개 새 알림 · 라이브/마감/한 마디")로 떨어져 *"오늘 얼마나 바쁘지"* 즉답
- 그 아래 V09 골격(봇 strip + 4 카테고리 2x2 grid + 단일 CTA) 유지로 *정체성·분류·행동* 흐름 보존
- 컬러 시스템 단순화(navy KPI + lemon glow + 4 카테고리 색)로 기존 9블록 4종 충돌 해소

### 메인 반영
- [src/app/(student)/classbot/page.tsx](../../src/app/(student)/classbot/page.tsx) ← V15 worktree(agent-af7c548b12dd3e0f9) page.tsx로 교체
- 신규 컴포넌트/mock 추가 없음 (단일 파일 변경)

### 정리
- worktree 20개(S1~S10 + V11~V20 + V19 recovered) `git worktree remove --force`
- 관련 branch 20개 `git branch -D`
- dev server 10개(3091~3100) `kill -9`

### 메모
- V09 base 가져오기는 일부 agent에서 noop (V09 commit 안 한 working tree 상태였음) → main 9블록 base에서 자기 변형을 직접 적용. 의도와 달랐으나 다양성 측면에서 결과적 OK
- V19는 worktree isolation 실패해서 메인 repo에 직접 작업 → stash + 새 worktree로 분리 복원 후 비교 진행
