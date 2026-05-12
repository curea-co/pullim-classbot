# 릴리스 + shadcn 일괄 도입 — 2026-05-12 ~

어제(2026-05-11) 17:30 Daily Outcome 의 **내일 첫 액션** 못박음. PR #4~#7 스택 머지 → main 배포 → Major 후속(shadcn 도입) 본격화.

## 목표
1. 현재 누적된 stacked PR 체인을 dev 까지 머지 후 main 릴리스
2. production 배포 정상 확인
3. shadcn `Button` / `Input` / `Label` 도입을 핵심 4 영역에 일괄 적용
4. (차순위) 학생 영역 존댓말·반말 톤 정책 결정 후 일괄 교정

## 작업 항목

### A. Stacked PR 풀기 — 머지 순서 (bottom-up)

> 실제 진행: PR #4 머지 시 `--delete-branch` 영향으로 PR #5 자동 닫힘 → PR #8 로 동일 head 브랜치 재생성. #6·#7 은 retarget 으로 dev 직접 머지. **교훈**: stacked PR 머지엔 `--delete-branch` 금지.

- [x] PR #4 머지 (`feat/teacher-assignment-workspace` → `dev`) — spec 14 교사 과제 발사 워크스페이스
- [x] PR #5 머지 (재생성된 **#8** `chore/critical-design-fixes` → `dev`) — Critical 6건 핫픽스
- [x] PR #6 머지 (retarget → `dev`) — shadcn Phase 1
- [x] PR #7 머지 (retarget → `dev`) — 피드백 루프
- [x] PR #9 릴리스 `dev` → `main` 머지 (main HEAD: ce8e576)

### B. Production 배포 확인 (Vercel)
- [x] main 머지 후 Vercel 자동 배포 — 초기엔 GitHub 통합 끊김 → 사용자가 재연결 + 대시보드에서 신규 배포 트리거
- [x] OG/메타 — "풀림 클래스봇 — 교사가 만드는 AI 학습 교실" 노출 확인
- [x] 핵심 5 라우트 200 응답: `/classbot`, `/teacher`, `/teacher/classbot`, `/teacher/assignment/new`, `/classbot/assignment`
- [ ] `https://pullim-classbot.vercel.app/classbot` — 학생 홈 빈 상태 + 발사 후 등장 시연 (육안)
- [ ] `/teacher/classbot` — 교사 패널 진행률 + 라이브 뱃지 시연 (육안)
- [ ] PR #4·#8·#6·#7·#9 본문의 🔍 Post-merge QA 체크박스 일괄 체크 (육안)

### C. shadcn Button·Input·Label 일괄 도입 — 4 핵심 영역

> 효과: **focus-visible / disabled / label 연결 / aria-invalid** 일관성을 컴포넌트 레벨에서 한 번에 해결.
> 진행 순서: 데이터 흐름 방향 (학생 풀이 → 교사 워크스페이스 → 채점 허브 → 리포트)을 따라가지만, 이미 완료된 곳은 ✓.

#### C-1. 학생 풀이 (`solve-workspace.tsx`)
- [x] Input/Textarea/Button 도입 — PR #6 에서 완료
- [x] 객관식 선택지 role=radio + aria-checked + focus-visible
- [ ] 잔여 점검: 풀이 중 BotHintPanel 의 버튼·인풋 (PR Phase 1B 대상)

#### C-2. 교사 워크스페이스 (`assignment-form.tsx`, `builder/step-content.tsx`)
- [x] Field 내부 Label, title/due Input, message Textarea — PR #6
- [x] 발사/미리보기/임시저장 Button + variant — PR #6
- [x] 토글 그룹 9곳 — native + role=radiogroup/radio + aria-checked + focus-visible — PR #6
- [x] builder Step 1~8 input/label/button — PR #6
- [ ] 잔여: assignment-form 의 range slider(문항 수, 시험 시간), select(봇·단원) — Phase 2 에서 Radix Slider/Combobox 도입 시 처리

#### C-3. 채점 허브 (`/teacher/grading`, `/teacher/grading/[id]`)
- [x] `grading-list.tsx` / page.tsx — 점검 결과 native button/input 0건 (Link 위주)
- [x] `grading-detail.tsx` — AI 초안 코멘트 `<Textarea>`, "그대로 승인 / 수정 후 승인" `<Button>` (default / pullim-lemon), "메모 작성하기" `<Button variant="outline">` v2 disabled 마커
- [x] 루브릭 점수 input — Slider primitive 미도입 → native `<input type="range">` 유지 (Phase 2 대상)

#### C-4. 리포트 (`/teacher/reports`, `/teacher/reports/[id]`)
- [x] `reports/[id]/page.tsx` — 1줄 요약 `<Textarea>` + `<Label htmlFor sr-only>` 연결
- [x] 위기 신호 "1:1 상담 / Wee센터" 액션 → `<Button>` (default / outline) + v2 disabled 마커 (이전 PR #5 패턴)
- [x] `parent-message-preview.tsx` — 메시지 `<Textarea>`, 보류 / 발송 승인 `<Button>` (secondary disabled / pullim-warn override)
- [x] 필터·검색 input — 점검 결과 reports/page.tsx 에 없음

#### C-5. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright 15/15 무회귀 (11.3s)
- [ ] 채점 허브·리포트 페이지 Vercel preview 시각 확인 (Post-merge QA — 사용자 육안)

### D. (차순위) 학생 영역 톤 정책

> 현재 혼재 — 웰빙·BotHint·체크인은 반말(`도와줄게 / 어땠어`) / 홈·풀이·결과는 존댓말(`봐요 / 수고했어요`). 같은 페이지 내에서도 섞이는 곳 다수 (예: wellness/page.tsx).

- [ ] 정책 결정 — (a) 학생 전반 반말, 봇·시스템 안내만 존댓말 / (b) 학생 전반 존댓말, 봇 발화만 반말 / (c) 영역별 분리
- [ ] 정책 문서화 (`proc/spec/` 또는 CLAUDE.md 부록)
- [ ] 일괄 교정 대상 식별:
  - `(student)/classbot/wellness/*`, `(student)/classbot/me/report/page.tsx`
  - `components/classbot/bot-hint-panel.tsx`
  - 결과 페이지 / FlywheelNote / PageHeader description
- [ ] 일괄 교정 PR

## 마무리
- [ ] plan ↔ 진행 상황 정합성 검토
- [ ] 완료된 plan은 `proc/archive/` 로 이동 (오늘자 + 어제자 plan들)

## 위험·결정
- **머지 충돌**: PR base 가 stacked 되어 있어 한 PR 머지 시 다음 PR 의 diff 가 줄어듦. GitHub 가 자동 재계산하지만 종종 충돌. 머지 직전 각 PR 의 "Update branch" 한 번씩 권장.
- **shadcn 채점/리포트 영역 작업량**: grading-detail 은 루브릭 점수 input·코멘트 textarea 가 많아 PR #6 보다 클 수도 있음. 분할 PR 검토.
- **톤 정책**: 결정 자체가 사용자 의사결정 — AI 가 단독으로 결정하지 말 것.
