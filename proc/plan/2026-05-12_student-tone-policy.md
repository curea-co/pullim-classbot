# 학생 영역 톤 정책 — 존댓말 통일 (정책 b 채택)

## 정책
**학생 전반 UI 카피 → 존댓말 (`~해요/~돼요/~예요/~봐요`)**
**봇 발화 텍스트 → 반말 유지 (`~할게/~해보자/~어땠어`)**

봇 발화의 정의: 봇 메시지 카드/말풍선 안에서 봇 캐릭터의 목소리로 학생에게 직접 말하는 텍스트. 예: chat 페이지의 봇 인사, BotHintPanel 의 봇 응답 카드 안의 메시지, 결과 페이지의 "봇 한 마디" 카드 안.

봇 발화가 아닌 모든 학생 측 UI(페이지 헤더 description, 빈 상태, 폼 라벨, 버튼 텍스트, 안내 메시지)는 존댓말.

## 작업 항목

### A. 명확한 UI 카피 변환 (반말 → 존댓말)
- [x] `check-in-form.tsx` — 5건 + 보너스 2건 (line 37 "내일 또 봐" / line 73 "짚고 가자. 부담 갖지 마.")
- [x] `wellness/page.tsx` — 4건 + 60미만 위로 메시지(line 106) 존댓말화
- [x] `bot-hint-panel.tsx` ExamLocked + PracticeHints + WrongConquestPanel UI 설명·버튼·후속 안내 5건
- [x] `me/report/page.tsx` "다음 주 도전" 안내 (line 89) "시작해보자" → "시작해봐요" (보너스)

### B. 모호 케이스 결정
- [x] `bot-hint-panel.tsx` line 98 "풀어볼래?" — 결국 UI 후속 안내라 판단 → 존댓말 "풀어봐요"
- [x] `me/report/page.tsx` line 50/60 봇 피드백 — 봇 발화 카드로 반말 유지
- [x] `me/report/page.tsx` line 72 "선생님이 한 마디" — 사람(교사) 직접 메시지 → 존댓말 + "서연아" → "서연 학생"
- [x] `chat/page.tsx` 봇 인사말 — 봇 발화로 반말 유지 (캐릭터 톤 차이는 별 PR)

### C. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 통과 (10.7s) — assignment-dispatch / mobile-and-focus / feedback-loop 무회귀

### D. 마무리
- [x] plan ↔ 코드 정합성 검토 (체크박스 동기화)
- [ ] commit + PR (base: dev)

## 위험·결정 노트
- **봇 발화 정의 모호성**: 봇 카드 / 봇 말풍선 / 봇 피드백 섹션 안의 텍스트만 반말. 그 외는 모두 존댓말. 의문이면 보수적으로 존댓말로.
- **봇 캐릭터별 톤 차이**: chat 의 과학 봇은 반말, 영어 봇은 ~요 — 봇 캐릭터 설계 결정이므로 본 PR 에서 통일하지 않음.
- **`me/report/page.tsx`의 "선생님이 한 마디"**: 봇이 아니라 사람(교사)의 직접 한 마디라는 의미면 존댓말이 자연스러움. 봇 발화가 아니므로 정책 (b)에 따라 변환.

## 변경 통계 예상
- 변환: 약 14~15건 (UI)
- 유지: 약 6~7건 (봇 발화)
