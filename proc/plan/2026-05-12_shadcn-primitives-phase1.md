# shadcn 프리미티브 도입 — Phase 1 (교사·학생 핵심 폼)

## 목표
교사 과제 발사 / 봇 빌더 / 학생 풀이의 핵심 폼에서 native `<button>/<input>/<textarea>/<label>`을 shadcn 프리미티브로 교체.
**풀림 브랜드 컬러를 유지하면서** focus-visible · disabled · aria-* 처리 일관성 확보.
디자인 audit Major 항목 중 "shadcn 프리미티브 80% 미사용" 결함 해소.

## 범위
- 3개 핵심 파일만 (assignment-form, step-content, solve-workspace) — replay/grading/check-in 등은 Phase 1B로 분리
- shadcn에 없는 primitive (Select, Slider, Checkbox) 는 native 유지
- 풀림 컬러 = `Button` 컴포넌트에 `pullim`(brand blue) / `pullim-danger`(시험 모드) variant 추가

## 작업 항목

### A. Button variants 확장
- [x] `src/components/ui/button.tsx` — `pullim` / `pullim-danger` / `pullim-lemon` variant 3종 추가
  - `pullim`: `bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white`
  - `pullim-danger`: `bg-pullim-danger hover:bg-pullim-danger/90 text-white`
  - `pullim-lemon`: `bg-pullim-lemon hover:bg-pullim-lemon-soft text-pullim-lemon-ink` (Step 8 배포하기 등)

### B. assignment-form.tsx 마이그레이션
- [x] `<label htmlFor>` 7곳 → `<Label htmlFor>` (Field 컴포넌트 내부)
- [x] 텍스트/일시 `<input>` → `<Input>` (title, due) — range는 native 유지
- [x] 메시지 `<textarea>` → `<Textarea>`
- [x] CTA 버튼 (발사 / 미리보기 / 임시저장 / 닫기) → `<Button>` + variant (`pullim`/`pullim-danger`/`secondary`)
- [x] 토글 그룹 (mode 3 / difficulty 3 / target 학생) — **native button 유지** + `role="radiogroup"`/`role="radio"`/`aria-checked` + `focus-visible:ring-3` (Button 변환 시 다중 줄 콘텐츠 + 활성 색 override 패턴이 복잡해져 native 유지가 더 깔끔)
- [x] aria-invalid · aria-describedby 유지 (Input/Textarea가 shadcn 기본 스타일로 처리)

### C. builder/step-content.tsx 마이그레이션
- [x] Step 1: 봇 이름 `<Input>`, 과목/학년 native select + `<Label>` 매핑 + select에 focus-visible 추가
- [x] Step 1: 캐릭터 톤 3-카드 — native + radiogroup/radio/aria-checked
- [x] Step 2: 선택 방식 2-카드 + TTS 프리셋 5-리스트 — native + radiogroup/radio/aria-checked. 샘플 재생 → `<Button variant="ghost" size="xs">`
- [x] Step 3: 파일 추가 / 파일 선택 / 삭제 → `<Button>` (각 variant + size="icon-xs")
- [x] Step 4: 교수 스타일 4-카드 — native + radiogroup
- [x] Step 5: Scope 5-카드 — native + radiogroup
- [x] Step 6: 루브릭 `<Label>`, 피드백 스타일 3-카드 — native + radiogroup
- [x] Step 8: 테스트 채팅 `<Input>` (rounded-full) + `<Button variant="pullim" size="icon-lg">`. 드래프트 저장 / 배포하기 → `<Button>` (ghost + pullim-lemon)
- [x] Step 5/7/8 SafetyToggle / 배포 반 checkbox — `<label>` wrapper 패턴 유지 (htmlFor 없이 input 자식 — 유효한 HTML)

### D. solve-workspace.tsx 마이그레이션
- [x] 객관식 선택지 4~5개 → native + radiogroup/radio/aria-checked
- [x] 단답/서술형 `<textarea>` → `<Textarea>` + aria-label
- [x] 이전/다음/제출 네비 → `<Button>` (`secondary` / `pullim` + `size="lg"`, disabled 자동)
- [x] 힌트 받기 토글 → `<Button variant="outline">` (border-dashed 유지)

### E. Textarea 컴포넌트
- [x] `src/components/ui/textarea.tsx` 추가 (Input과 동일 패턴 — focus-visible ring, aria-invalid 자동)

### F. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright E2E 4/4 통과 — 9.6s (assignment-dispatch.spec)
- [x] 풀림 브랜드 컬러 시각 유지 — production build 성공, variant override 동작
- [x] focus-visible 키보드 Tab 일관성 — 모든 toggle button에 `focus-visible:ring-3 ring-pullim-blue-400/50` 적용

### G. 마무리
- [x] plan ↔ 코드 정합성 검토 (체크박스 동기화 완료)
- [ ] commit + PR (base: `chore/critical-design-fixes` — PR #5 위 stacked)

## 정합성 검토 노트

- **토글 그룹은 native button 유지**: 다중 줄 콘텐츠(아이콘 + 제목 + 설명) + 활성 색 override 복잡도 때문에 `<Button variant="outline">` 변환보다 native가 가독성 ↑. 대신 `role="radiogroup"`/`role="radio"`/`aria-checked` + `focus-visible:ring-3` 일관 적용으로 a11y/포커스 결함 해소.
- **계획에 없던 보너스**: Step 3 (파일 업로드/삭제) Button 도입, 학생 풀이의 힌트 받기 토글 Button outline.
- **다음 단계 (Phase 1B)**: replay-player, grading-detail, check-in-form, bot-hint-panel 등 잔여 컴포넌트 + Range Slider primitive 도입.

## 보류 (Phase 1B 이후)
- `replay-player.tsx`, `grading-detail.tsx`, `check-in-form.tsx`, `bot-hint-panel.tsx` 등
- Select 검색 콤보박스 (Radix Combobox)
- Slider primitive (Radix Slider)
- Checkbox/Radio primitive

## 위험
- Button variant override 시 활성 상태 색이 흐려질 위험 → 토글 active className은 직접 유지
- shadcn `Input`의 `h-8`이 기존 `py-2`(약 h-10)보다 작아 시각 변화 → `className="h-10"` override 또는 디자인 변화 허용
- builder의 native `<select>`는 변경 없음 — 차후 Combobox 도입 검토
