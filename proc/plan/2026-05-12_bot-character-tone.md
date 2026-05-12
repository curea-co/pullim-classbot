# 봇 캐릭터 톤 통일 — 봇별 인사·응답 일관성

## 정책
정책 (b) 내에서 봇 캐릭터는 의도된 톤 차이 유지:
- **cb_001 수학이 형 — `친근` 톤**: 반말 친근 (`~봐 / ~할게 / ~이야`)
- **cb_002 영어 누나 — `정중` 톤**: 친근한 존댓말 (`~봐요 / ~할게요 / ~예요`)
- **cb_003 과학 쌤 — `스파르타` 톤**: 단호한 반말 (`~해 / ~한다 / ~다`)

각 봇은 자체 내에서 톤 일관, 봇 간에는 캐릭터로서 차별.

## 현재 격차

| 영역 | 현황 | 문제 |
|---|---|---|
| 봇별 인사 (`greetingFor`) | 봇별 분기 ✓ | 일관 |
| 공유 응답 (`classbotChatReplies`) | cb_001 친근 톤만 | cb_002/cb_003 선택 시 응답이 cb_001 톤으로 나옴 |
| `pickClassbotReply` 시그니처 | `(question)` | botId 인식 못 함 |
| BotHintPanel 봇 응답 | 봇 인자 받지만 톤 분기 없음 | 후속 (별 작업) |

## 작업 항목

### A. mock 데이터 — 봇별 응답 맵
- [x] `repliesByTone: Record<BotTone, Record<ReplyKey, string>>` 추가 — 친근 / 정중 / 스파르타 3 톤별 4 응답 = 12건
- [x] `defaultRepliesByTone` — 톤별 디폴트 응답 3건
- [x] 하위 호환: `classbotChatReplies` 와 `classbotDefaultReply` export 는 친근 톤(cb_001)으로 alias 유지

### B. helper 함수
- [x] `pickClassbotReply(question: string, botTone?: BotTone): string` — botTone 받아 분기, 기본값 친근

### C. chat/page.tsx
- [x] `send` 함수가 현재 `bot.tone` 을 `pickClassbotReply` 에 전달

### D. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 통과 (11.7s)
- [ ] 수동: 봇 chip strip 에서 3개 봇 전환 → quick prompt "극값" 클릭 → 각 봇별로 톤이 다른 응답 확인 (Post-merge QA)

### E. 마무리
- [x] plan ↔ 코드 정합성 검토 (체크박스 동기화)
- [ ] commit + PR (base: dev)

## 정합성 검토 노트
- **인자 이름 변경**: 계획의 `botId?: string` → 실제는 `botTone?: BotTone`. 톤은 ClassBot 타입의 한 속성이라 botTone 으로 받는 게 직관적 (chat/page.tsx 에서 `bot.tone` 으로 바로 전달).
- **하위 호환 유지**: 다른 mock 데이터 (replies 등)가 이전 export 를 import 하고 있을 수 있어 `classbotChatReplies` / `classbotDefaultReply` export 유지.

## 보류
- BotHintPanel 의 hints 텍스트도 봇 톤별 분기 — 별 PR (큰 작업)
- 봇 quick prompts 가 과목별로 다르게 — UX 결정 후 별 PR
