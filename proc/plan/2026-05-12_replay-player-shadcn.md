# replay-player shadcn 마이그레이션 (Phase 2 마지막)

## 목표
shadcn Phase 1B 후 남은 가장 큰 컴포넌트(`replay-player.tsx`, 12 native element)를
Button/Input/focus-visible 패턴으로 정리. 단, 세그먼트 마커가 트랙에 오버레이된
복잡한 스크러버 구조는 Slider primitive 로 대체할 수 없어 키보드 핸들러만 보강.

## 작업 항목

### A. 변환 (Button / Input)
- [x] 플레이어 컨트롤 3개 (10초 뒤로 / 재생·일시정지 / 10초 앞으로) → Button (ghost / pullim-lemon / ghost) size="icon-lg"
- [x] 속도 4 버튼 → role=radiogroup + role=radio + aria-checked + focus-visible (native 유지 — 트랙 하단 작은 칩)
- [x] 북마크 추가 Button (ghost)
- [x] 교사 질문 composer Input + Button (pullim, icon-sm)
- [x] 교사 질문 timestamp 점프 native + focus-visible + aria-label

### B. 스크러버 — Slider 대체 보류
- [x] 세그먼트 마커가 트랙에 절대 위치로 오버레이된 복잡 구조라 Slider primitive 로 단순 대체 시 마커 배치 깨짐
- [x] 대신 키보드 접근성 보강:
  - tabIndex=0
  - onKeyDown: ArrowLeft/Right(-5/+5s), Home/End(0/total)
  - aria-valuetext, focus-visible:ring-3

### C. focus-visible 보강 (native 유지)
- [x] 북마크 리스트 항목 버튼
- [x] 트랜스크립트 라인 버튼 + aria-current (현재 라인)
- [x] 집중도 heatmap 1분 바
- [x] 세그먼트 마커 버튼 (이미 hover 적용, focus 무)

### D. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 통과 (12.0s)

### E. 마무리
- [x] plan ↔ 코드 정합성 검토
- [ ] commit + PR (base: dev)

## 정합성 검토 노트

- **스크러버 Slider 대체 안 함**: Slider primitive 의 단일 thumb + filled indicator 패턴으로는 세그먼트 마커 (5색 dot + ownedByMe 강조) 를 트랙 위에 겹쳐 보여줄 수 없음. 키보드 접근성(Arrow / Home / End)만 보강해 a11y 갭 메움.
- **속도 4 칩**: 트랙 하단의 inline radio. native + radio + aria-checked + focus-visible 로 패턴 일관.
- **트랜스크립트 라인 / heatmap 바**: 라인 수가 수십개 ~ 수백개라 Button 컴포넌트 변환은 비용 큼. native + focus-visible 패턴만 일관 적용.

## 종합 — shadcn 마이그레이션 사이클 마무리

| PR | 대상 |
|---|---|
| #6 | assignment-form / step-content / solve-workspace |
| #10 | grading-detail / reports/[id] / parent-message-preview |
| #14 | classbot 7개 컴포넌트 |
| #16 | Slider primitive + 4개 range 적용 |
| **이번** | replay-player |

남은 native button/input 은 학생/교사 핵심 흐름 외부 (cron, dev 메뉴 등) 가 없어서 사실상 마이그레이션 마무리.
