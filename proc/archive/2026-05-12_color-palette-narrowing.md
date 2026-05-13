# 색상 스펙트럼 축소 — 풀림 톤 정돈

## 목표
풀림 클래스봇 화면에서 동시에 노출되는 색 hue를 **7종 → 3~4종**으로 줄여 "알록달록한" 인상을 제거한다. 정보 위계는 hue 다양성 대신 **단일 hue 안의 명도/채도**로 표현한다.

## 현재 색 사용 진단 (2026-05-12)

`grep` 카운트(상위 hue별):
- 블루 (`pullim-blue-*`) — 메인. 그대로 유지.
- 슬레이트 (`pullim-slate-*`) — 중립. 그대로 유지.
- **레몬** (`pullim-lemon*`) — 70회. lime/yellow-green CTA·스트릭.
- **warn** (`pullim-warn*`) — 68회. amber.
- **danger** (`pullim-danger*`) — 59회. red.
- **success** (`pullim-success*`) — 47회. green.
- **subject 보조** (`pullimSubjectColors`: 보라/에메랄드/앰버) — 토큰엔 있으나 실사용 거의 없음(과목별 라벨 마이그레이션 안 됨).

알록달록 핫스팟:
- [replay-review.tsx](src/components/classbot/replay-review.tsx) 마커 4종 — quiz=warn, student-q=success, sharing=lemon, attention=danger → 한 화면에 4 hue.
- [classbot.ts moodMeta](src/lib/mock/classbot.ts#L1801-L1806) — mood 1~4 = success/blue/slate/warn → 감정 4색.
- [student-roster.tsx](src/components/classbot/student-roster.tsx#L15-L23) — active/quiet/inactive dot = success/warn/danger + burnout/emotion 아이콘 = danger/warn → 행마다 4 hue 혼재 가능.
- [assignment-overview-header.tsx](src/components/classbot/assignment-overview-header.tsx#L7-L8) — exam=danger, wrong-conquest=warn.
- [grading-row.tsx](src/components/classbot/grading-row.tsx#L15-L16) — approved=success, overridden=warn.

## 축소 방향 (옵션)

| 옵션 | 유지 hue | 제거/축소 | 인상 | 리스크 |
|---|---|---|---|---|
| **A. 보수적** | blue, slate, success, warn, danger, lemon (6) | subject 3종(보라/에메랄드/앰버) 토큰만 삭제 | 거의 변화 없음 | 알록달록함 잔존 — 효과 미미 |
| **B. ★ 중간 (추천)** | blue, slate, danger, lemon (4) | **success/warn 제거 → blue 명도로 흡수** + subject 3종 제거. lemon은 키 CTA에만 한정. | 차분한 블루 단톤, 위험만 빨강 — "신호등" 회피 | 정답/완료=success 관성 사용자에게 새 학습 비용 |
| **C. 공격적** | blue, slate, danger (3) | success/warn/lemon 모두 제거. CTA도 blue로 통일. | 가장 절제, 거의 mono. | 학생 친화 인상(레몬 CTA·축하 톤) 상실 |

### 추천 = 옵션 B 근거

- 풀림 시그니처(블루 + 레몬)는 디자인 spec § 11.2에 명시된 정체성. 레몬은 유지하되 **CTA·스트릭에만** 한정.
- success/warn는 **명도 변주로 충분히 대체 가능** — 정답/완료 = `blue-500`, 주의 = `blue-200` + 아이콘 명시(색만으로 의미 전달 금지는 spec § 14.1 Layer 1 룰).
- danger 1종은 **위험·삭제·시험 모드** 시그니처로 보존(다크 톤과 함께 spec § 14.1 예외).
- 결과 동시 노출 hue: 블루 그라데이션 + 슬레이트 + 빨강(드물게) + 레몬(CTA 1~2개). 신호등 인상 제거.

## 작업 항목

### Phase 1 — 의사결정 & spec 갱신
- [x] 옵션 B(중간) 채택
- [x] [proc/spec/08-design-system.md](proc/spec/08-design-system.md) § 1.3 시맨틱 / § 1.6 레몬 / § 14.1 색 강조 토큰 동시 사용 조항 개정
- [x] [src/lib/tokens/index.ts](src/lib/tokens/index.ts) — `pullimSubjectColors`를 blue 명도 변주로 통일 + `pullimSemantic.success/warn` deprecated 주석

### Phase 2 — replay-review 마커 4종 정돈
- [x] [replay-review.tsx](src/components/classbot/replay-review.tsx#L20-L26) `segmentMeta` 4종 색 통일 (concept/quiz/student-q → blue 명도, sharing lemon · attention danger 유지)
- [x] StatusBadge(review/sent), ReviewBanner, SentBanner, KeyTakeaways indicator, ProcessStep done, Transcript speaker chip + 노출/비공개 badge, Stat accent 일괄 blue/slate로 매핑

### Phase 3 — 감정/상태 hue 단순화
- [x] [classbot.ts moodMeta](src/lib/mock/classbot.ts#L1801-L1806) tone 4종 → blue-500/blue-300/slate/blue-700
- [x] [emotion-emoji-picker.tsx toneClass](src/components/classbot/emotion-emoji-picker.tsx) 매핑 단순화
- [x] [student-roster.tsx](src/components/classbot/student-roster.tsx#L14-L25) statusMeta + alertMeta — active blue / quiet slate-300 / inactive danger / emotion 아이콘 slate

### Phase 4 — 채점/리포트/시험 모드 + 그 외 hue 단순화
- [x] grading-row / report-row / grading-detail / rubric-editor 점수 색 위계 — `blue-700 / blue-500 / slate-500`
- [x] assignment-overview-header / classbot/page(student+teacher) / assignment/page modeMeta — practice=blue-400, exam=danger, wrong-conquest=blue-700
- [x] wellbeing-gauge 점수 4단계 — blue-600/500/300 + 위기 danger
- [x] live-quiz-card / quiz-launcher / scope-control / parent-message-preview / kpi-trend-card / class-kpi-bar / student-intents — warn/success → blue 명도
- [x] page-header tone 사전 — success → blue-500, warn → blue-700
- [x] result/page / me/report — "잘한 점" blue-50 + "신경 쓸 점" slate-50 (시각 차별화)
- [x] onboarding-template / section-intro — signature ring + badge → lemon (시그니처 영역에만)
- [x] override-delta-meter — isOver = blue-700 (임계 초과 = 강조이지 위험 아님)
- [x] step-indicator(builder) done = blue-400 / step-content validation = blue/slate
- [x] bot-hint-panel WrongConquestPanel = blue-700/blue-50 톤
- [x] replay-player segmentMeta + SpeakerBadge + KeyTakeaways + question status — 동일 매핑 적용
- [x] assignment-form modeMeta wrong-conquest border / Sparkles 아이콘 색 일괄 정리

### Phase 5 — 검증
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 24 라우트 통과
- [x] grep 카운트 — `pullim-warn` 68→0, `pullim-success` 47→0 (mock-browser traffic light 제외)
- [ ] `bun dev` → 라이브 캡처 (`output/live-shots/`, PR 단계에서)

### Phase 6 — 후속
- [x] `pullimSubjectColors`는 blue 명도 변주로 형태 보존(import 깨짐 회피, 추후 cleanup PR에서 제거 가능)
- [x] `pullim-success*` / `pullim-warn*` 토큰은 globals.css에 보존 + tokens/index.ts `@deprecated` JSDoc 추가
- [x] spec § 1.3 — success/warn 표시 deprecated 명시
- [ ] dev → main 릴리스 PR

## 변화 정량 (grep 카운트)

| 토큰 | Before | After | Δ |
|---|---|---|---|
| `pullim-warn*` | 68 | 0 (mock-browser 제외) | **-68** |
| `pullim-success*` | 47 | 0 (mock-browser 제외) | **-47** |
| `pullim-blue-700` | 66 | 119 | +53 |
| `pullim-blue-600` | 78 | 100 | +22 |
| `pullim-blue-50` | 46 | 72 | +26 |
| `pullim-lemon*` | 70 | 75 | +5 (signature 흡수) |
| `pullim-danger*` | 59 | 59 | 0 |

동시 노출 hue: **블루 그라데이션 + 슬레이트 + 레몬(CTA·시그니처) + 위험 빨강(드물게)** = 4 hue 한도 내.

## 비고
- 본 작업은 **시각 인상 변경**이라 라이브 검증(`output/live-shots/`) 캡처가 필수. PR에 before/after 첨부.
- spec § 14.1 "색 강조 토큰 동시 사용 ≤ 3종" 조항이 이미 존재 — 본 작업은 그 룰의 실제 강제.
- 토큰 일괄 삭제는 깨짐 위험 → Phase 4까지 사용처 모두 비운 뒤 Phase 6에서 제거.
