# shadcn 프리미티브 Phase 1B — 잔여 컴포넌트 일괄 정리

## 목표
PR #6 (Phase 1) + PR #10 (Phase 1B 채점/리포트) 이후 남은 classbot 컴포넌트들의 native button → shadcn Button 마이그레이션. focus-visible / disabled / a11y 일관성 마무리.

## 범위
- 작은 컴포넌트 7개 일괄 (각 1~3 element)
- replay-player.tsx (12 element) 는 별 PR로 분리
- emotion-emoji-picker.tsx 의 range slider 는 Radix Slider 도입 시점 (별 PR)

## 작업 항목

### A. 컴포넌트별 마이그레이션
- [x] `crisis-gate.tsx` — "1:1 면담 메모" / "리포트 첨부로 진행" 2 Button (default + outline) v2 마커
- [x] `bot-hint-panel.tsx` — PracticeHints reveal Button (pullim/secondary 조건부) + WrongConquestPanel "봇에게 더 물어보기" Button v2 마커
- [x] `emotion-emoji-picker.tsx` — mood 4 native + radiogroup/radio/aria-checked + focus-visible (Button 변환 시 활성 색 toneClass override 복잡도 때문에 native 유지)
- [x] `live-quiz-card.tsx` — 객관식 4 native + radio/aria-checked, 제출 Button (size="lg")
- [x] `live-feed-panel.tsx` — toggleShared Button outline + aria-pressed + 답 보강 Button ghost
- [x] `scope-control.tsx` — scope 5 native + role=radiogroup/radio + aria-checked + focus-visible
- [x] `replay-review.tsx` — KeyTakeawaysEditor Textarea + 트랜스크립트 라인 토글 aria-pressed + focus-visible (native 유지) + 학생 발송 Button (pullim-lemon)

### B. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 통과 (10.1s) — 무회귀

### C. 마무리
- [x] plan ↔ 코드 정합성 검토
- [ ] commit + PR (base: dev)

## 정합성 검토 노트

- **mood 4-카드, scope 5-카드, transcript 라인 토글**: native button 유지 패턴 — PR #6 의 토글 그룹 결정과 일관. 다중 줄 콘텐츠 또는 활성 색 override 복잡도 때문에 native + radiogroup/aria-checked + focus-visible 적용.
- **계획에 추가**: replay-review.tsx 의 KeyTakeawaysEditor Textarea, 트랜스크립트 라인 토글 (a11y만 보강), 학생 발송 Button — 총 3 element 모두 정리.
- **bot-hint-panel WrongConquestPanel 버튼**: 원래 onClick 없는 dead button → v2 disabled 마커 적용 (PR #5 패턴 일관).

## 보류 (별 PR / Phase 2)
- replay-player.tsx (12 element + 시간 slider)
- replay-player 의 시간 slider, emotion-emoji-picker 의 intensity slider → Radix Slider 도입
- assignment-form 의 문항 수 / 시험 시간 slider → 동일 묶음
- rubric-editor.tsx 의 점수 slider → 동일 묶음
