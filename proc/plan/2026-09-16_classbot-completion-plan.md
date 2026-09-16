# 클래스봇 완성 계획 — PR 0 ~ PR 8 (+ PR 4-ci)

> **spec**: [`proc/spec/2026-09-16_classbot-completion-design.md`](../spec/2026-09-16_classbot-completion-design.md) (설계 정본 · 사용자 승인 2026-09-16).
> **시각화 원본**: `output/2026-09-16_classbot-completion-plan.html`(v3 · 미추적) · 아티팩트 https://claude.ai/code/artifact/ee808b01-1819-44f0-bc25-b0a67173b328
> **상태**: 진행 *(`[2026-09-17 정정]` — 종전 「착수」)* — **2026-09-17 04:00 KST 실측**: 이 리포는 PR 0·4-ci·4·5a·6 다섯이 `dev` 에 들어갔다(#349 · #348 · #350 · #351 · #352). pullim-api 는 PR 0~3 브랜치 넷이 **로컬에만** 준비됐다(`origin/` ref 없음) — 푸시·PR·`migration:generate` 는 소유자 게이트. PR 5 는 5a·5b·5c 로 갈랐다(아래). 리포 최상위 규칙 둘(FE/BE 분리 · 전부 `dev` 경유)을 지킨다. pullim-api 쪽 PR 은 그 리포의 `dev` 로.

**Goal:** 요구 11개(R0~R11)가 **배포된 dev·prod 에서 서버까지 간다.** 지금은 로컬 DB + 개발 쿠키에서만 다섯이 서버까지 가고, 배포에서는 전부 목이다.

## 결정 (2026-09-16 · 사용자)

- **BE 정본은 pullim-api `src/classbot`**(ADR-063 · 봇 분리는 ADR-091 `[예정]` `docs/design/_platform/adr/ADR-091-classbot-bots-분리.yaml` — pullim-api 브랜치 `docs/classbot-classroom-spine`, PR 승인 대기). 이 리포의 `app/api/**` + Drizzle 은 겹치는 것부터 은퇴.
- ① 겹치는 라우트·표(반·봇·챗·과제)만 은퇴 — 범위 밖 계열은 「로컬 전용」으로 남긴다
- ② 비로그인 데모 통과는 코어 화면에서 닫는다 — 소개·랜딩만 공개
- ③ `bots` 표로 봇과 반을 갈라낸다 — 반은 `bot_id` 로 가리킨다
- ④ 「봇 대화」는 레일에서 「내 수업방」 아래 한 단계 — 경로 `/classbot/chat` 유지
- ⑤ 위험 감지 1차는 규칙 다섯 + 위기 키워드 — 주제 이탈·강도 설정은 2차
- ⑥ 학부모·기관은 범위 밖 — 학생으로 위장시키던 매핑만 걷는다
- 남은 모순 일곱은 권장안으로 해소(설계 § 0.1) — prod-verify 두 레인 · 학부모 트리 비활성 · 챗 단위 = 반 · 루트 가이드 BE 절 · 명단 표시명은 auth 읽기 전용 투영 포트 · 로컬 `classbot.pullim.local` · PR 4 는 있는 문만

## PR 목록 (「←」는 먼저 머지돼야)

### 문서
- [x] **PR 0** · 이 리포 · docs — 설계 정본 + 03 § 2.1·2.2·2.3 · 05 § 3·11.1·11.2·11.3 · 2026-07-03 amendment · `apps/classbot/CLAUDE.md` § 5 · 루트 `CLAUDE.md` § 1·§ 2. **코드 무변경.** — **#349 머지**(2026-09-16 19:51 KST)
- [ ] **PR 0** · pullim-api · docs — `authz.md` 교사 대화 열람(operator read) · `data-model.md` `bots`·`risk_signals`·`classes.bot_id`·`messages.bot_id`·`join_codes.expires_at` — 로컬 브랜치 `docs/classbot-classroom-spine` `50d04e20`(ADR-091) 준비 · **푸시·PR 대기(소유자)**

### pullim-api (그 리포 `dev`)
브랜치 실물(2026-09-17 실측 · 부모 SHA): `origin/dev` `97e0d624` 위에 ① `docs/classbot-classroom-spine` `50d04e20` 과 ② `feat/classbot-bots-schema` `c4a5c685` 가 **형제**로 서 있고, ③ `feat/classbot-classroom-doors` `6ce7bfd2` 는 ② 위, ④ `feat/classbot-monitoring-doors` `00acb39e` 는 **③ 위**다 — ② → ③ → ④ 직렬. 「세션 리뷰」 = 이 세션(session_01V1F4LGiFNG6JjYBpiDx32G)의 에이전트 리뷰 판정이다. pullim-api 에 PR 이 없어 두 리포 어디에도 리뷰 코멘트 기록이 없다 — 여기 적힌 것이 유일한 기록이고, 소유자가 PR 을 열면 그 PR 의 리뷰가 이것을 대신한다.
- [ ] **PR 1** · schema — `bots` · `classes.bot_id` · `messages.bot_id` · `risk_signals` · `join_codes.expires_at` · `class_bot_profiles → bots` 이행 · `PersonaInput` 조인 교체. 엔티티·리포지토리만 ← PR 0 — 로컬 브랜치 `feat/classbot-bots-schema` `c4a5c685`(엔티티 + `uq_risk_signals_message_kind`) · 세션 리뷰 「푸시 가능」 · 마이그레이션 `pnpm migration:generate ClassbotBotsAndRiskSignals` 는 **승인 뒤 같은 PR** 에 · `origin/dev` `97e0d624` 위 — PR 0 문서 브랜치와 **형제** *(`[2026-09-17 정정]` — 종전 「PR 0 브랜치 위에 쌓임」은 부모 SHA 와 다르다)*
- [ ] **PR 2** · routes A — `POST /classes` · `GET /classes/:id/members` · `POST/PATCH /bots` · `PUT /classes/:id/bot` · 참여 만료 410 · 재발급 시 옛 코드 삭제 · `GET /assignments?audience=teacher&classId=` ← PR 1 · 단위 테스트 필수 — 로컬 브랜치 `feat/classbot-classroom-doors` `6ce7bfd2` · 리뷰 반영 · 세션 리뷰 「푸시 가능」 · PR 1(`c4a5c685`) 위에 쌓임
- [ ] **PR 3** · routes B — `GET /classes/:id/chat?studentId=` *(`[2026-09-17 정정]` — 종전 `?student=` · 브랜치 실물 `chat.controller.ts` 는 `studentId`)* · `GET /classes/:id/signals` · `PATCH /signals/:id/ack` · 챗 저장 훅 규칙 다섯 ← PR 1 (계획은 PR 2 와 병렬) — 로컬 브랜치 `feat/classbot-monitoring-doors` `00acb39e` · 세션 리뷰 3회 반영 · 세션 리뷰 「푸시 가능」 · **PR 2(`6ce7bfd2`) 위에 쌓임 — 브랜치 실물은 직렬** *(`[2026-09-17 정정]` — 종전 「PR 1 위에 쌓임」은 부모 SHA 와 다르다. 병렬로 두려면 ④ 를 ② 위로 rebase 해야 한다)*

### 이 리포 (`dev`)
- [x] **PR 4-ci** · ci — prod-verify 두 레인(익명 · 로그인) ← PR 0 · **PR 4 보다 먼저** · 워크플로 편집 승인 2026-09-16 — **#348 머지**(2026-09-16 20:03 KST)
- [x] **PR 4** · FE 신원 — RoleGuard 공개 경로 목록 · `mapRole` 정리 · 안내 한 장 · 플래그 둘 제거 · 있는 문의 훅만 `domainFetch` 로 ← PR 0 · PR 4-ci — **#350 머지**(2026-09-16 20:25 KST)
- [x] **PR 5a** · FE 수업방 (1/2) — 학생 레일 중첩(「봇 대화」는 「내 수업방」 아래) · 챗 단위 = 반(선택기·기록·전송) + 고지 「선생님이 이 대화를 볼 수 있어요」 · 교사 반 목록·상세(`/teacher/classroom/[id]`)는 정본을 읽는다(같은 오리진 명단 칸은 내렸다 — 5b 가 새 DTO 로 다시) · 봇 마켓 공유 칸은 `/teacher/marketplace` 「내 봇 공유」 절로 ← PR 4 — **#351 머지**(2026-09-17 03:39 KST). *(`[2026-09-17 정정]` — 종전 한 줄 「PR 5 · FE 수업방 — `/teacher/classroom/[id]` 껍데기 + 명단·봇 탭 · 반 카드 봇 칸 · 반·명단·봇 할당 훅 · 학생 레일 중첩 · 챗 단위 = 반 · SSE + 기록 + 고지 · 목 참여 폴백 제거 ← PR 2 · PR 4」 를 5a·5b·5c 로 갈랐다. 5a 는 pullim-api 새 문 없이 되는 몫만)*
- [ ] **PR 5b** · FE 수업방 (2/2) — 반 만들기(`POST /classes`) 열기 · 반 상세 명단·봇 탭(`GET /classes/:id/members` · 표시명 투영) · 봇 할당/교체(`PUT /classes/:id/bot`) · 반 카드 봇 칸 · 참여 코드 만료 표시(410) · 봇 관리/빌더를 pullim-api `bots` 로 · 목 참여 폴백 제거 ← pullim-api **PR 2 가 dev-api 에 들어간 뒤** · PR 5a
- [ ] **PR 5c** · FE 교사 개입 — 리마인드·코멘트 되살리기. #352 가 로컬 제출 레인과 그 위의 리마인드 버튼·제출 현황 시트(`components/classbot/remind-button.tsx` · `submission-status-sheet.tsx` 삭제)를 걷었으므로, pullim-api `POST /classes/:classId/interventions`(있는 문) + 정본 명단 위에서 다시 세운다 · 학생 인박스는 `GET /interventions?audience=student` ← PR 5b
- [x] **PR 6** · FE 과제 — `questions[]` · 서버 문항 · `/submit` · 점수 · `useTeacherAssignments` · `/submissions` · `pullim-assignments` persist 은퇴 ← PR 3 · PR 4 · e2e test 블록 41(sso 제외 · 파일 10) 전환은 별도 스펙 트랙 — **#352 머지**(2026-09-17 03:50 KST · squash `1a14886`)
- [ ] **PR 7** · FE 모니터링 — 「대화」 탭 · 학생별 기록 뷰어 · 신호 배지·확인 · 관제소 목 표 은퇴 ← pullim-api **PR 3 이 dev-api 에 들어간 뒤** · PR 5a *(`[2026-09-17 정정]` — 종전 「PR 3 · PR 5」)*
- [ ] **PR 8** · 정리 — B 세계 은퇴(겹치는 `app/api/**` · Drizzle 표 · 시드 · 개발 쿠키 경로 · `lib/mock` 반·봇·챗·과제 · 스토어 persist) ← PR 5b · 5c · 6 · 7 *(`[2026-09-17 정정]` — 종전 「PR 5 · 6 · 7」)* · **맨 마지막**
- [ ] **e2e 트랙** · e2e — `mixed-role-pending` 다섯 스펙(`assignment-dispatch` · `color-palette` · `feedback-loop` · `mobile-and-focus` · `student-live-and-flows`) 재작성 + 로그인 픽스처(`tests/e2e/auth.setup.ts`) ← GitHub secrets `E2E_OS_{STUDENT,TEACHER}_{EMAIL,PASSWORD}` 가 있어야 로그인 레인이 돈다(PR 6 메모의 「별도 스펙 트랙」이 이 줄이다)

**후속 주석 정정** (다음 FE 코드 PR 에 끼운다 · 이 문서 PR 은 코드를 만지지 않는다): `components/shell/nav-config.ts:180` 은 「게시 버튼 자체는 「내 수업방」 카드에 있다」, `hooks/api/marketplace.ts:122`·`:153` 은 「수업방 카드의 게시 배지는 마켓 목록에서 파생된다」 고 아직 적혀 있다 — #351 이 그 공유 칸을 `/teacher/marketplace` 「내 봇 공유」 절(`app/(teacher)/teacher/marketplace/publish-bot-block.tsx`)로 옮겼으므로 둘 다 옛 자리를 가리킨다(2026-09-17 실측).

### 사람 액션 (설계 § 9 · 2026-09-17 04:00 KST 기준 전부 미완)
- [ ] **pullim-api 푸시 + PR 넷, 순서대로** — 브랜치마다 `git push -u origin <branch>` 뒤 `gh pr create --base dev …`: ① `docs/classbot-classroom-spine` ② `feat/classbot-bots-schema` ③ `feat/classbot-classroom-doors` ④ `feat/classbot-monitoring-doors`. ①·② 는 `origin/dev` 위의 형제, ③ 은 ② 위, ④ 는 ③ 위 — base 는 넷 다 그 리포 `dev`, **머지 순서는 ② → ③ → ④**(④ 의 diff 에는 ③ 이 머지되기 전까지 ③ 의 변경이 함께 실린다; ③·④ 를 병렬로 하려면 ④ 를 ② 위로 rebase) *(`[2026-09-17 정정]` — 종전 「③·④ 는 ② 위에 쌓인다 · 머지는 ② 뒤」)*
- [ ] pullim-api `pnpm migration:generate ClassbotBotsAndRiskSignals` 승인 — 생성 파일은 ② 와 **같은 PR** 에
- [ ] dev RDS `migration:run` 승인 — ② 가 그 리포 `dev` 에 들어간 뒤
- [ ] GitHub secrets `E2E_OS_STUDENT_EMAIL` · `E2E_OS_STUDENT_PASSWORD` · `E2E_OS_TEACHER_EMAIL` · `E2E_OS_TEACHER_PASSWORD`(선택 `E2E_OS_URL`) — 아래 「OS 테스트 계정 시크릿」의 이름 · 로그인 레인과 e2e 트랙의 조건
- [ ] OS 복귀 허용목록 `dev-classbot.pullim.ai` · `classbot.pullim.ai`
- [ ] Vercel env `NEXT_PUBLIC_OS_URL` · `NEXT_PUBLIC_OS_API_URL`
- [ ] pullim-api CORS 두 오리진 · dev→main 승격 요청
- [ ] dev-os Deployment Protection 우회([`2026-07-05_m0-infra-reassessment.md:38`](2026-07-05_m0-infra-reassessment.md)) · OS 테스트 계정 시크릿(로그인 레인)

```
PR 0✓ ─┬─→ PR 1 ─┬─→ PR 2 ─→ PR 5b ─→ PR 5c ─┐     ✓ = dev 머지(2026-09-17 04:00 KST)
       │         └─→ PR 3 ─→ PR 7 ───────────┼─→ PR 8     PR 0✓ 는 이 리포 몫(#349)만 — pullim-api 문서 몫 50d04e20 은 미푸시(PR 1 의 앞은 아직 안 열렸다)
       └─→ PR 4-ci✓ ─→ PR 4✓ ─┬─→ PR 5a✓     │     교차 의존(선 생략): PR 5b ← PR 5a · PR 7 ← PR 5a · PR 6 ← PR 3
                              └─→ PR 6✓ ─────┘
```
*(`[2026-09-17 정정]` — 종전 그림은 PR 5 한 칸이었다. 5a·5b·5c 로 가른 뒤의 그림. PR 6 은 PR 3 이 dev-api 에 들어가기 전에 #352 로 머지됐다 — `questions[]` 수용은 있는 문 위에서 됐고, 표의 「← PR 3」 은 감지 훅 몫으로 남는다)*

**Global constraints:** 한 PR = 한 계층 · base 는 항상 `dev` · 문서 PR 이 먼저 머지된 뒤 코드 PR(리뷰가 base 스펙을 본다) · 학생 화면 카피는 한자어 없이(고지 문구 「선생님이 이 대화를 볼 수 있어요」) · `x-build-sha` meta 와 `PLAYWRIGHT_BASE_URL ?? …` 패턴은 깨지 않는다.
