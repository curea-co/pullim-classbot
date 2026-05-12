# Slider primitive 도입 + 4 곳 일괄 적용

## 목표
풀림 클래스봇의 4개 native `<input type="range">` 를 shadcn 스타일 Slider primitive 로 통일. 디자인 토큰 + focus-visible + a11y 일관성을 슬라이더 영역까지 확장.

## 정책
- `@base-ui/react/slider` 기반 (프로젝트 표준 — Button/Input 동일 토대)
- 단일 thumb 만 (현재 범위 슬라이더 없음)
- 풀림 톤 thumb (blue-600) + track (slate-100)
- 키보드 ← → / Home / End 지원 (Base UI 기본)

## 작업 항목

### A. Slider primitive 컴포넌트
- [x] `src/components/ui/slider.tsx` 신규 — `@base-ui/react/slider` parts 조합 (Root/Control/Track/Indicator/Thumb)
- [x] 풀림 색 (track slate-200 / indicator blue-500 / thumb blue-600) + focus-visible:ring-3 ring-pullim-blue-400/50 + disabled opacity-50
- [x] `accentClassName` prop 으로 Indicator 색 override (시험 시간 슬라이더 danger 톤)

### B. 적용 (4 곳)
- [x] `emotion-emoji-picker.tsx` — 강도 1~5 Slider
- [x] `rubric-editor.tsx` — 항목별 점수 0~가중치 Slider (목록 안)
- [x] `assignment-form.tsx` 문항 수 1~50/60 Slider
- [x] `assignment-form.tsx` 시험 시간 10~180 (step 10) Slider + `accentClassName="bg-pullim-danger"` 로 indicator 만 danger
- [ ] `replay-player.tsx` 시간 슬라이더는 별 PR

### C. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 통과 (12.2s) — 무회귀
- [ ] 키보드 ← → 로 슬라이더 조작 (육안 / Post-merge QA)

### D. 마무리
- [x] plan ↔ 코드 정합성 검토
- [ ] commit + PR (base: dev)

## 정합성 검토 노트
- **Base UI 단일 thumb**: Base UI Slider 는 thumb 컴포넌트가 명시적이라 단일 thumb 만 렌더 (Root 안에 `<Thumb>` 1 개).
- **시험 시간 danger 톤**: thumb 까지 danger 로 바꾸려면 Slider primitive 자체에 variant 추가 필요. 이번엔 indicator (filled portion) 만 danger 로 — thumb 은 일관된 blue-600 유지 (시각적 액션 일관성).
- **`onValueChange` 시그니처**: Base UI 가 `number | number[]` 반환 → 호출부에서 Array.isArray 분기.
