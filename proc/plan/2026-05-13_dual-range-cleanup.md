# 2026-05-13 — dual-range CSS 죽은 코드 cleanup

## 목표
Slider primitive 도입(PR #16) 이후 사용처가 사라진 `.dual-range` CSS 블록을 globals.css에서 제거.

## 현황
- [globals.css:201-267](src/app/globals.css#L201-L267) `.dual-range` 클래스 정의 (약 65줄)
- 원래 dual-thumb range slider용 — `::-webkit-slider-thumb` + `::-moz-range-thumb` 크로스브라우저 스타일링
- `grep -rn "dual-range" src --include="*.tsx" --include="*.ts"` = **0건** (현재 검증)
- Slider primitive(`@base-ui/react/slider`)가 Thumb 컴포넌트로 동일 역할 수행 — 네이티브 `<input type="range">` 의존성 사라짐
- 그래서 정의만 남은 죽은 코드. 보존하면 globals.css 노이즈만 +65줄

## 작업 항목
- [x] [globals.css](src/app/globals.css) `@layer components` 블록 통째로 제거 (안에 dual-range만 있어서 빈 layer가 됨)
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 24 라우트 통과
- [x] **Playwright 26/26** 무회귀 (회귀 23 + chat-greeting 1 + chat-quick-prompts 2)
- [ ] PR dev 머지 + main 릴리스
- [ ] `bunx vercel --prod` 트리거 → production 라이브 재검증
- [x] plan 체크박스 마무리 (본 commit에 포함)

## 완료 기준
- [x] globals.css에서 `.dual-range` 정의 **0건**
- [x] Playwright 26/26 유지
- [ ] production 라이브에서 Slider 사용 페이지 회귀 없음 — vercel deploy 후 확인
