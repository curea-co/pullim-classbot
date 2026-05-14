# 2026-05-14 — Slider dual-thumb + danger thumb variant 확장

## 목표
풀림 클래스봇 Slider primitive에 (1) dual-thumb(range) 모드, (2) **thumb 자체** danger variant를 추가하고, 실제 사용처 1곳에 라이브 연결 + e2e 신규 1건으로 회귀를 묶는다.

## 배경
- 어제 17:30 보고 "내일 후보" 잔여분. (출처: `daily_outcome/2026-05-14.md` 산출물 A)
- 현재 `src/components/ui/slider.tsx`는
  - `@base-ui/react/slider` 기반 single-thumb 만 렌더 (Thumb 컴포넌트 1개)
  - `accentClassName` prop은 **Indicator(filled portion) 색만** override — thumb는 항상 `bg-pullim-blue-600` 고정
- 어제 정리 노트 (`proc/archive/2026-05-12_slider-primitive.md` 정합성 검토 노트) 에 "thumb까지 danger로 바꾸려면 Slider primitive 자체에 variant 추가 필요"라고 명시 — 그 후속.

## 정책
- `@base-ui/react/slider` 표준 패턴 그대로 사용 — Root `value` 가 `number` 면 single, `number[]` 면 multi-thumb 렌더 (Base UI 표준).
- thumb 색은 **prop으로 명시 선언** — `accentClassName`(indicator)와 분리. 새 prop `thumbVariant: 'pullim' | 'danger'` 또는 `thumbClassName` 도입 검토.
- 기존 호출부 5곳(`emotion-emoji-picker`, `rubric-editor`, `assignment-form` × 2, `replay-player`) 무회귀 — single-thumb 기본 경로는 그대로.

## 작업 항목

### A. Slider primitive 확장
- [x] `src/components/ui/slider.tsx` — `thumbClassName?: string` prop 추가. accentClassName 패턴 그대로 빌려쓰기.
- [x] dual-thumb 모드 — `value`/`defaultValue`가 `number[]` 이면 `Thumb` 컴포넌트를 `value.map((_, idx) => <Thumb index={idx} />)` 로 렌더. Base UI Slider Thumb에는 `index` prop 존재 (멀티 thumb 식별자).
- [x] danger thumb 표현 — `thumbClassName="bg-pullim-danger ring-pullim-danger/40"` 같은 override 적용 가능하도록.
- [x] 기존 single-thumb 호출부 무회귀 — accentClassName / value(number) / onValueChange((v: number | number[]) => ...) 그대로.

### B. 실 사용처 1곳 라이브 연결
- 후보:
  - **(우선)** `assignment-form.tsx` 시험 시간 슬라이더 — 이미 `accentClassName="bg-pullim-danger"`인데 thumb는 blue. **thumb까지 danger 일관화** — 시험 모드 위험 신호 강화.
  - dual-thumb 후보: 새 builder 페이지 score range filter 등 — 현재 라우트 내 자연스러운 dual-thumb 슬롯 없음. 시간/스코프상 thumb-only variant 적용에 집중하고, dual-thumb은 primitive만 확장 + e2e 합성 라우트에서 검증.
- [x] `assignment-form.tsx` 시험 시간 Slider에 `thumbClassName="bg-pullim-danger"` 추가 (시험 모드 일관화). 비-시험 모드 진입로/문항 수 슬라이더는 blue 유지.
- [x] dual-thumb 라이브 사용처는 이번 PR 범위 밖 — primitive 확장 + e2e 데모 페이지(또는 storybook-like fixture)에서만 검증, 실 라이브 적용은 후속 plan으로 분리.

### C. e2e 신규
- [x] `tests/e2e/slider-variants.spec.ts` 신설:
  - 시험 시간 Slider thumb 색 검증 — 시험 모드 진입 후 `[data-slot="slider"] [role="slider"]` computed `background-color` 가 풀림 danger RGB(`rgb(255,71,87)` 등 토큰 hex 의 rgb) 인지 assert.
  - dual-thumb 렌더 검증 — 데모 fixture 라우트나 page.evaluate 로 마운트한 인스턴스에서 `role="slider"` 가 2개 노출되고 각각 keyboard `ArrowLeft`/`ArrowRight` 로 독립 조작되는지.

### D. 검증
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 16 라우트 통과 (라우트 수 변경 없음)
- [x] Playwright 회귀(`color-palette` 9 + 채팅 3 + assignment-dispatch / feedback-loop / mobile-and-focus) 무회귀
- [x] `tests/e2e/slider-variants.spec.ts` 통과

### E. 마무리
- [ ] PR 본문에 "primitive 확장 + 시험 시간 thumb danger 일관화. dual-thumb 라이브 적용은 후속" 명시
- [ ] dev 머지 → main 릴리스
- [ ] production 라이브 검증: `PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app bun x playwright test slider-variants` 1회 (production 배포 후)

## 정합성 검토 노트
- **Base UI multi-thumb 렌더**: Base UI Slider 의 Thumb는 `value` 배열 길이만큼 `<Thumb index={i} />` 를 명시 렌더해야 함. 자동 fan-out 아님. Slider primitive 내부에서 `Array.isArray(value) ? value.map(...) : <Thumb />` 분기.
- **`onValueChange` 시그니처 유지**: Base UI가 `number | number[]` 반환. 기존 호출부의 `Array.isArray(v) ? v[0] : v` 패턴 그대로 — single-thumb 호출부는 영향 없음.
- **thumb danger variant**: 시험 모드의 위험 신호를 **indicator + thumb** 양쪽으로 일관화 → 시각 일관성 ↑. 다른 위치(연습/오답정복)에선 blue 유지로 모드별 시각 구분 강화.
- **dual-thumb 사용처 미존재**: 현재 추출본 라우트에선 자연스러운 range slot 부재. primitive에 dual-thumb 길만 열어두고 적용은 후속 작업 (range filter / 시험 시간대 from-to 등이 후보).

## 완료 기준
- [x] `slider.tsx` primitive에 dual-thumb 지원 + thumb 색 override prop
- [x] 시험 시간 슬라이더 thumb 색 danger 일관화 (라이브)
- [x] `tests/e2e/slider-variants.spec.ts` 신규 + 통과
- [ ] dev/main PR 머지
