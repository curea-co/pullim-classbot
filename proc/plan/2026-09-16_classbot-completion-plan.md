# 클래스봇 완성 계획 — PR 0 ~ PR 8 (+ PR 4-ci)

> **spec**: [`proc/spec/2026-09-16_classbot-completion-design.md`](../spec/2026-09-16_classbot-completion-design.md) (설계 정본 · 사용자 승인 2026-09-16).
> **시각화 원본**: `output/2026-09-16_classbot-completion-plan.html`(v3 · 미추적) · 아티팩트 https://claude.ai/code/artifact/ee808b01-1819-44f0-bc25-b0a67173b328
> **상태**: 진행 — **2026-09-18 실측**: 이 리포에서 **남은 코드 PR 은 PR 5e `[예정]` 하나와 e2e 트랙뿐이다.** 5d 는 **#360 머지**(squash `5026813`)로 끝났고, PR 8 은 **#358 머지**(squash `e1b8860`)로 **5d 보다 먼저** 들어갔다. pullim-api PR 4 도 **#672 머지**(그 리포 `dev` 끝 `2d24f323`). 5d 가 남기고 간 축은 하나 — **마켓 정본화**인데 pullim-api 에 게시·해제 문이 없어 막혀 있다(설계 § 8.1), 그래서 **5e 로 열었다.** 아래 「사람 액션」도 다시 쟀다 — 남은 것은 **다섯**이다.
>
> *(`[2026-09-17 정정]` — 종전 「착수」)* — **2026-09-17 04:00 KST 실측**: 이 리포는 PR 0·4-ci·4·5a·6 다섯이 `dev` 에 들어갔다(#349 · #348 · #350 · #351 · #352). pullim-api 는 PR 0~3 브랜치 넷이 **로컬에만** 준비됐다(`origin/` ref 없음) — 푸시·PR·`migration:generate` 는 소유자 게이트 *(`[2026-09-17 밤 정정]` — 넷 다 그 리포 `dev` 에 들어갔다: #667 · #668 · #669 · #670, dev RDS 마이그레이션 적용 2026-09-17 21:35 KST(소유자 보고 · 이 리포에서는 실측 불가). ADR 번호는 **ADR-092** — 아래 결정 줄의 정정)*. PR 5 는 5a·5b·5c 로 갈랐다(아래) — 5b 는 #355 인도분으로 좁히고 **5d `[예정]`** 을 열었다(pullim-api PR 4 = #672 뒤). 리포 최상위 규칙 둘(FE/BE 분리 · 전부 `dev` 경유)을 지킨다. pullim-api 쪽 PR 은 그 리포의 `dev` 로. *(`[2026-09-17 은퇴 범위 정정]` — 이 리포에서 **열린 PR 은 둘**이다(실측): **PR 8 = #358**(세션 리뷰 Approve · 이 문서 PR 이 먼저 머지된 뒤)과 이 문서 PR **#359**. **5b = #355 는 머지됐다**(21:36 KST · 머지 커밋 `1fc134e` — 이 문서 브랜치가 갈라져 나온 자리 그 자체다) · **5c = #357 도 머지됐다**(22:28 KST · squash `2e9dfa6`). pullim-api **PR 4 = #672** 는 열림·머지 대기. 은퇴 범위를 실물에 맞췄다 — 죽은 라우트 둘(`/api/wellness` · `/api/grades`)은 「남긴다」가 아니라 은퇴 대상이고, DROP 되는 표는 아홉이 아니라 넷이다(설계 § 0 결정 ① · § 2). 로컬 `db:seed` 는 `grading_items` FK 에서 멎는다 — 아래 「알려진 고장」)*

**Goal:** 요구 11개(R0~R11)가 **배포된 dev·prod 에서 서버까지 간다.** 지금은 로컬 DB + 개발 쿠키에서만 다섯이 서버까지 가고, 배포에서는 전부 목이다.

## 결정 (2026-09-16 · 사용자)

- **BE 정본은 pullim-api `src/classbot`**(ADR-063 · 봇 분리는 ADR-092 `docs/design/_platform/adr/ADR-092-classbot-bots-분리.yaml` — pullim-api #667 `f6e546a0` 로 머지, 2026-09-17 19:25 KST *(정정 2026-09-17 — 종전 「ADR-091 `[예정]` · PR 승인 대기」. pullim-api `dev` 에 이미 다른 ADR-091(cloudwatch 오류 다이제스트 lambda)이 있어 머지 시 092 로 번호가 붙었다; 이 문서의 ADR-091 은 전부 092 로 바꿨다)*). 이 리포의 `app/api/**` + Drizzle 은 겹치는 것부터 은퇴.
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
- [x] **PR 0** · pullim-api · docs — `authz.md` 교사 대화 열람(operator read) · `data-model.md` `bots`·`risk_signals`·`classes.bot_id`·`messages.bot_id`·`join_codes.expires_at` — 로컬 브랜치 `docs/classbot-classroom-spine` `50d04e20`(ADR-092) 준비 · 푸시·PR 대기(소유자) → **#667 머지**(2026-09-17 19:25 KST · `f6e546a0`)

### pullim-api (그 리포 `dev`)
브랜치 실물(2026-09-17 실측 · 부모 SHA): `origin/dev` `97e0d624` 위에 ① `docs/classbot-classroom-spine` `50d04e20` 과 ② `feat/classbot-bots-schema` `c4a5c685` 가 **형제**로 서 있고, ③ `feat/classbot-classroom-doors` `6ce7bfd2` 는 ② 위, ④ `feat/classbot-monitoring-doors` `00acb39e` 는 **③ 위**다 — ② → ③ → ④ 직렬 — 그 순서대로 #668 → #669 → #670 으로 머지됐다(① 은 #667 · 2026-09-17 밤 실측). 「세션 리뷰」 = 이 세션(session_01V1F4LGiFNG6JjYBpiDx32G)의 에이전트 리뷰 판정이다. pullim-api 에 PR 이 없어 두 리포 어디에도 리뷰 코멘트 기록이 없다 — 여기 적힌 것이 유일한 기록이고, 소유자가 PR 을 열면 그 PR 의 리뷰가 이것을 대신한다.
- [x] **PR 1** · schema — `bots` · `classes.bot_id` · `messages.bot_id` · `risk_signals` · `join_codes.expires_at` · `class_bot_profiles → bots` 이행 · `PersonaInput` 조인 교체. 엔티티·리포지토리만 ← PR 0 — 로컬 브랜치 `feat/classbot-bots-schema` `c4a5c685`(엔티티 + `uq_risk_signals_message_kind`) · 세션 리뷰 「푸시 가능」 · 마이그레이션 `pnpm migration:generate ClassbotBotsAndRiskSignals` 는 **승인 뒤 같은 PR** 에 · `origin/dev` `97e0d624` 위 — PR 0 문서 브랜치와 **형제** *(`[2026-09-17 정정]` — 종전 「PR 0 브랜치 위에 쌓임」은 부모 SHA 와 다르다)* → **#668 머지**(19:25 KST · `4b97257f` · 마이그레이션 `src/common/database/migrations/1789625114547-ClassbotBotsAndRiskSignals.ts` 같은 PR) · dev RDS 적용 2026-09-17 21:35 KST(bastion · 소유자 보고)
- [x] **PR 2** · routes A — `POST /classes` · `GET /classes/:id/members` · `POST/PATCH /bots` · `PUT /classes/:id/bot` · 참여 만료 410 · 재발급 시 옛 코드 삭제 · `GET /assignments?audience=teacher&classId=` ← PR 1 · 단위 테스트 필수 — 로컬 브랜치 `feat/classbot-classroom-doors` `6ce7bfd2` · 리뷰 반영 · 세션 리뷰 「푸시 가능」 · PR 1(`c4a5c685`) 위에 쌓임 → **#669 머지**(19:26 KST · `25b9393d`)
- [x] **PR 3** · routes B — `GET /classes/:id/chat?studentId=` *(`[2026-09-17 정정]` — 종전 `?student=` · 브랜치 실물 `chat.controller.ts` 는 `studentId`)* · `GET /classes/:id/signals` · `PATCH /signals/:id/ack` · 챗 저장 훅 규칙 다섯 ← PR 1 (계획은 PR 2 와 병렬) — 로컬 브랜치 `feat/classbot-monitoring-doors` `00acb39e` · 세션 리뷰 3회 반영 · 세션 리뷰 「푸시 가능」 · **PR 2(`6ce7bfd2`) 위에 쌓임 — 브랜치 실물은 직렬** *(`[2026-09-17 정정]` — 종전 「PR 1 위에 쌓임」은 부모 SHA 와 다르다. 병렬로 두려면 ④ 를 ② 위로 rebase 해야 한다)* → **#670 머지**(20:17 KST · `324f36fc`)
- [x] **PR 4** · reads — `GET /classes/:id`(반 상세 — FE 가 새로고침 뒤 `classes.bot_id` 를 다시 읽을 문 · 봇 합성) · `GET /me/bots`(내 `bots` 최신순) · 스키마 무변경 ← PR 2 — **#672 머지**: 그 리포 `origin/dev` 끝이 `2d24f323`(2026-09-18 실측). 스키마 무변경이라 RDS 작업 없었다. **FE 5d(#360)가 이 두 문 위에 섰다**

### 이 리포 (`dev`)
- [x] **PR 4-ci** · ci — prod-verify 두 레인(익명 · 로그인) ← PR 0 · **PR 4 보다 먼저** · 워크플로 편집 승인 2026-09-16 — **#348 머지**(2026-09-16 20:03 KST)
- [x] **PR 4** · FE 신원 — RoleGuard 공개 경로 목록 · `mapRole` 정리 · 안내 한 장 · 플래그 둘 제거 · 있는 문의 훅만 `domainFetch` 로 ← PR 0 · PR 4-ci — **#350 머지**(2026-09-16 20:25 KST)
- [x] **PR 5a** · FE 수업방 (1/2) — 학생 레일 중첩(「봇 대화」는 「내 수업방」 아래) · 챗 단위 = 반(선택기·기록·전송) + 고지 「선생님이 이 대화를 볼 수 있어요」 · 교사 반 목록·상세(`/teacher/classroom/[id]`)는 정본을 읽는다(같은 오리진 명단 칸은 내렸다 — 5b 가 새 DTO 로 다시) · 봇 마켓 공유 칸은 `/teacher/marketplace` 「내 봇 공유」 절로 ← PR 4 — **#351 머지**(2026-09-17 03:39 KST). *(`[2026-09-17 정정]` — 종전 한 줄 「PR 5 · FE 수업방 — `/teacher/classroom/[id]` 껍데기 + 명단·봇 탭 · 반 카드 봇 칸 · 반·명단·봇 할당 훅 · 학생 레일 중첩 · 챗 단위 = 반 · SSE + 기록 + 고지 · 목 참여 폴백 제거 ← PR 2 · PR 4」 를 5a·5b·5c 로 갈랐다. 5a 는 pullim-api 새 문 없이 되는 몫만)*
- [x] **PR 5b** · FE 수업방 (2/2) — 반 만들기(`POST /classes` · 첫 참여 코드와 닫히는 시각 배너) · 반 상세 「명단」 탭(`GET /classes/:id/members` · 표시명 투영) · 「봇」 탭(지금 붙은 봇 · 새 봇 만들어 붙이기 `POST /bots` → `PUT /classes/:id/bot` · 봇 떼기 · 이름/인사말/말투/scope 고치기 `PATCH /bots/:id`) · 참여 코드 만료 표시 ← pullim-api PR 2(#669 ✓) · PR 5a — **#355 머지**(2026-09-17 21:36 KST · 머지 커밋 `1fc134e`) *(`[2026-09-17 늦은 밤 정정]` — 종전 「#355 열림 · `dev`(#354 `ad21d11`) 위로 rebase 필요(네 파일 충돌)」. rebase 는 끝났고 「명단」「봇」 의 `class-tabs.ts` 등록도 #355 가 가져갔다)* *(`[2026-09-17 밤 정정]` — 종전 줄에 있던 「봇 할당/교체」 중 **바꾸기** · 「반 카드 봇 칸」 · 「봇 관리/빌더를 pullim-api `bots` 로」 · 「목 참여 폴백 제거」 는 **5d** 로 옮겼다 — #355 가 인도한 만큼으로 좁힌 것. #355 본문: 내 봇 목록 `GET /bots?role=teacher` 가 아직 반 기준이라 「다른 봇으로 바꾸기」 고르개가 없고, 반 카드 봇 칩은 옛 `profile` 기준 그대로)*
- [x] **PR 5c** · FE 교사 개입 — 리마인드·코멘트 되살리기. #352 가 로컬 제출 레인과 그 위의 리마인드 버튼·제출 현황 시트(`components/classbot/remind-button.tsx` · `submission-status-sheet.tsx` 삭제)를 걷었으므로, pullim-api `POST /classes/:classId/interventions`(있는 문) + 정본 명단 위에서 다시 세운다 · 학생 인박스는 `GET /interventions?audience=student` ← PR 5b — **#357 머지**(2026-09-17 22:28 KST · `feat/classbot-interventions-on-api` · squash `2e9dfa6`)
- [x] **PR 5d** · FE 수업방 (봇 정본 전환) ← pullim-api **PR 4 = #672 ✓** · PR 5b — **#360 머지**(2026-09-18 · squash `5026813`). **봇이 반에서 독립했다.** 인도한 것 여섯:
  - 반 카드·반 상세의 봇 칸이 **`GET /classbot/classes/:classId`** 를 읽는다 — 세션 캐시가 아니라 정본이라 **새로고침 뒤에도 봇을 안다**
  - 「봇」 탭 **「다른 봇으로 바꾸기」** — `GET /classbot/me/bots` 로 이미 붙은 봇을 뺀 내 봇을 늘어놓고(각 봇의 과목·학년·말투·등급과 이미 붙은 반까지), 고르면 `PUT /classbot/classes/:classId/bot`
  - `/teacher/bots` **목록·상세가 정본** — `POST`·`PATCH /classbot/bots`
  - **빌더가 진짜 만든다** — `POST /classbot/bots` 로 만들고 `PUT /classbot/classes/:classId/bot` 으로 붙인다
  - **만든 뒤 배너의 거짓 문구를 걷었다** — 「데모라 저장되지 않아요」는 이 PR 이 거짓으로 만든 문장이다. 그대로 두면 교사가 없어진 줄 알고 다시 만드는데, **지우는 문이 없어 중복이 남는다**
  - **반 이름을 못 풀 때의 폴백을 한 규칙으로** — 이름이 **전부** 풀리면 잇고 하나라도 못 풀면 개수(uuid 를 보여주지 않는다). 폴백이 선 자리는 **셋**이다: 「방금 만든 봇」 배너 · 「다른 봇으로 바꾸기」 목록 · 만든 뒤 요약. *(정정 2026-09-18 — #360 커밋 메시지는 「네 자리」라 적었지만, 넷째로 센 봇별 설정 머리 부제와 `edit-workspace.tsx` 는 **이름을 시도하지 않고 처음부터 개수로만** 말한다(`BotDto` 에 반 이름이 없다) — 폴백이 아니다. 코드 주석의 「세 자리」가 맞다)*
  - 곁딸린 것: **「봇 이름·말투」 탭(`identity`)을 걷었다** — 화면이 그 일을 실제로 하게 돼서(탭 바 **위** 「이 봇」 칸 → `PATCH /classbot/bots/:id` 로 이름·인사말·말투·안전 등급 넷). 탭은 이제 **다섯**이다([03 § 4.4.2](../spec/03-features-and-ia.md) 정정). 옛 주소 둘은 **각자 다른 자리로 떨어진다** — `/teacher/settings?tab=identity` 는 탭을 버리고 **목록**(`/teacher/bots`)으로 넘어가고(`settings/page.tsx` 의 `redirect`), 봇별 설정 `/teacher/bots/:botId?tab=identity` 는 **첫 탭(안전 등급)**으로 연다(`app/(teacher)/teacher/bots/[botId]/page.tsx` — `isBotPolicyTab` 이 false 라 `botPolicyTabs[0]`). 둘 다 404 로 끊기지 않는다
- [ ] **PR 5e** `[예정]` · FE 마켓 정본 전환 — `/teacher/marketplace`(게시·해제·둘러보기)를 pullim-api 로 옮기고, 그때 `app/api/teacher/{classrooms,bots}` **다섯 라우트**(`teacher/bots` · `teacher/bots/[botId]/publish` · `teacher/classrooms` · `teacher/classrooms/[id]/join-codes` · `teacher/classrooms/[id]/students`)를 은퇴시킨다 ← **pullim-api 게시 표면(별건 PR · 아직 없다)**
  - **왜 5d 가 못 했나**: pullim-api `src/classbot` 의 컨트롤러 **일곱**(`assignment`·`bot`·`chat`·`classroom`·`intervention`·`replay`·`signal` — `origin/dev` `2d24f323` 전수 확인) 중 `bot.controller.ts` 가 여는 문은 **셋뿐**이다 — `GET classbot/me/bots` · `POST classbot/bots` · `PATCH classbot/bots/:id`. **게시하는 문도 해제하는 문도 없다.** 표의 칸(`bot.entity.ts` 의 `isPublished`·`publishedAt`)은 이미 있고 머리주석이 「마켓 공개(**후속 표면**)」라 적어 두었다 — 칸만 있고 문이 없다
  - 그래서 **`/teacher/marketplace` 와 그 트리는 같은 축으로 함께 남았다** — 게시·해제가 `POST`·`DELETE /api/teacher/bots/[botId]/publish`(`hooks/api/marketplace.ts`)를 부르고 그 라우트가 로컬 표를 읽는다. **#358 이 부르는 화면이 살아 있는 라우트를 남긴 것과 같은 판단이다**
  - **순서는 하나뿐이다**: pullim-api 게시 표면(별건 PR · 그 리포 `dev`) → 그 뒤 FE 마켓 전환 + 이 트리 은퇴. 앞뒤를 바꾸면 마켓이 통째로 죽는다
- [x] **PR 6** · FE 과제 — `questions[]` · 서버 문항 · `/submit` · 점수 · `useTeacherAssignments` · `/submissions` · `pullim-assignments` persist 은퇴 ← PR 3 · PR 4 · e2e test 블록 41(sso 제외 · 파일 10) 전환은 별도 스펙 트랙 — **#352 머지**(2026-09-17 03:50 KST · squash `1a14886`)
- [x] **PR 7** · FE 모니터링 — 「대화」 탭 · 학생별 기록 뷰어 · 신호 배지·확인 · 관제소 목 표 은퇴 ← pullim-api **PR 3 이 dev-api 에 들어간 뒤**(#670 ✓) · PR 5a *(`[2026-09-17 정정]` — 종전 「PR 3 · PR 5」)* — **#354 머지**(2026-09-17 21:16 KST · `ad21d11`). 반 상세 탭 등록부 `class-tabs.ts` 는 이 PR 이 새로 만들었다(「과제」「대화」) — 「명단」「봇」 등록은 #355 가 rebase 하며 맡는다
- [x] **PR 8** · 정리 — B 세계 은퇴(겹치는 `app/api/**` · Drizzle 표 · 시드 · 개발 쿠키 경로 · `lib/mock` 반·봇·챗·과제 · 스토어 persist) ← PR 5b · 5c · 5d · 6 · 7 — **#358 머지**(2026-09-18 실측 · squash `e1b8860`). **5d(#360 `5026813`)보다 먼저 들어갔다** *(정정 2026-09-18 — 「← 5d」 는 계획의 뜻이고 실제 머지 순서는 그 반대다. 그래서 5d 가 고친 화면들은 은퇴 뒤의 나무 위에 섰다)*. 실물 은퇴 범위: 라우트 10개 삭제(`/api/assignments` · `/api/assignments/[id]` · `/api/bots` · `/api/chat` · `/api/enrollments` · `/api/grades` · `/api/me/classrooms` · `/api/teacher/assignments` · `/api/teacher/assignments/[id]` · `/api/wellness`) · 표 넷 DROP(`0009_retire_world_b_tables`) · Drizzle 31표 → 27표
- [ ] **e2e 트랙** · e2e — `mixed-role-pending` 다섯 스펙(`assignment-dispatch` · `color-palette` · `feedback-loop` · `mobile-and-focus` · `student-live-and-flows`) 재작성 + 로그인 픽스처(`tests/e2e/auth.setup.ts`) ← GitHub secrets `E2E_OS_{STUDENT,TEACHER}_{EMAIL,PASSWORD}` 가 있어야 로그인 레인이 돈다(PR 6 메모의 「별도 스펙 트랙」이 이 줄이다)

### 알려진 고장 — 로컬 `db:seed` 가 `grading_items` FK 에서 멎는다 *(2026-09-17 실측)*

**`dev` 에 이미 있는 고장이고 #358 과 무관하다** — 은퇴 PR 이 만든 것이 아니라, 은퇴 범위를 재려고 로컬 DB 를 훑다 드러난 것이다.

`bun --filter @pullim-classbot/classbot db:seed` 는 16번째 단계 `grading_items` 에서 죽는다: `insert or update on table "grading_items" violates foreign key constraint "grading_items_student_id_users_id_fk" · Key (student_id)=(m13) is not present in table "users"`.

- **원인**: `apps/classbot/scripts/seed.ts:123-126` 의 `mapStudentId` 는 **`s1` 하나만** 치환하고 나머지는 그대로 돌려준다. `users` 시드(`scripts/seed.ts:216`)는 `classRoster`(`s1`~`s18` · `apps/classbot/lib/mock/classbot.ts:283`)에 교사 다섯·학부모 하나만 얹는데, 채점 시드가 가리키는 명단은 `apps/classbot/lib/mock/classbot.ts:914` 의 `gradingQueue` — `m13`·`m01`·`m04` … 다. 그 id 는 `users` 에 없고 `grading_items.student_id` 는 `users.id` 를 참조한다(`apps/classbot/lib/db/schema.ts:677`).
- **실측 자국**: 로컬 컨테이너 `pullim-classbot-postgres` 의 `users` 24행(18 + 5 + 1) · **`m` 으로 시작하는 id 0행** · `classrooms` 5행 · `assignments` 1행인데 16단계와 그 뒤는 전부 0행(`grading_items` · `grading_history` · `emotion_checkins` · `wellbeing_snapshots` · `reports`). 시드가 딱 거기서 멎었다는 뜻이다.
- **그래서**: [마이그레이션 번호 매기기 spec `:117-119`](../spec/2026-09-09_migration-numbering.md) 가 적은 복구 경로 —「root `bun run db:reset` 으로 DB 를 재생성한 뒤 `db:seed` 로 되돌린다」— 가 **완주하지 못한다.** DB 는 새로 서지만 시드가 채점 단계에서 죽어 그 뒤 단계가 빈 채로 남는다. 고치는 자리는 둘 중 하나다 — `users` 시드에 `gradingQueue` 명단을 넣거나, `mapStudentId` 가 `m*` 도 치환하거나. **이 문서 PR 은 코드를 만지지 않는다 — 기록만이다.**

### 5d 뒤의 후속 목록 — 코드에 남은 자국 *(2026-09-18 실측 · 다음 FE 코드 PR 이 가져간다)*

- **빌더 요약의 반 이름·말투 행이 아직 목 학급 표를 읽는다** — `components/builder/builder-types.ts` 의 `classroomLabel()` 이 `classroomChoices`(= `teacherClassrooms` 목)에서 id → 이름을 찾고, `summaryRows()` 의 `classes` 행이 그것을 쓴다. 정본 반 id 는 그 표에 없어 **그대로 찍히면 교사에게 uuid 가 보인다.** 지금은 두 화면이 「보여주기용 사본」으로 피해 간다(`done-view.tsx` 는 이름을 잇거나 개수로 · `builder/[botId]/edit-workspace.tsx` 는 개수로). **주입 조회로 고치면** 빌더 요약의 반 이름·말투 행이 정본을 따르고 그 사본이 없어진다. 같은 파일의 `classAssignments()` 는 **부르는 화면이 이미 0**(테스트만)인데 머리주석이 아직 「지금은 데모라 저장하지 않지만」이라 적는다
- **서버에 칸이 없어 로컬로 남은 것** — 봇별 설정의 안전 등급 **시간대 스케줄** · **이탈 설정**, 빌더의 **수업 자료**(`files`) · **평소에**(`style`) · **틀렸을 때**(`wrong`). `BotDto`·`CreateBotBody`·`UpdateBotBody`(`lib/api/classbot-dto.ts`)에 그 칸이 없다. **걷지 않고 그대로 묻는다** — 칸이 생기는 날 그대로 실어 보내면 되고, 지금 지우면 교사가 정할 수 있던 것이 먼저 사라진다. 화면이 그렇게 말한다
- **빌더가 아예 묻지 않는 것** — 인사말(`greeting`) · 아바타(`avatarEmoji`) · 빠른 프롬프트(`quickPrompts`). 이쪽은 반대다: **서버에 칸이 있는데** 빌더가 묻지 않아 본문에 싣지 않고 서버가 null 로 둔다. 인사말은 만든 **뒤** 봇별 설정에서 고칠 수 있다
- **이름 겹침 nit** — `components/builder/done-view.tsx` 에 `attached` 가 뜻을 바꿔 두 번 선다: 바깥은 반 이름 줄(`string | null`), 안쪽은 붙었나(`boolean`). **안쪽을 `isAttached` 로**
- **시드 FK 고장은 그대로 둔다** — 아래 「알려진 고장」에 **이미 기록됐다.** 이 축과 무관하고 고치는 자리도 거기 적혀 있다

**후속 주석 정정** (다음 FE 코드 PR 에 끼운다 · 이 문서 PR 은 코드를 만지지 않는다): `components/shell/nav-config.ts:180` 은 「게시 버튼 자체는 「내 수업방」 카드에 있다」, `hooks/api/marketplace.ts:122`·`:153` 은 「수업방 카드의 게시 배지는 마켓 목록에서 파생된다」 고 아직 적혀 있다 — #351 이 그 공유 칸을 `/teacher/marketplace` 「내 봇 공유」 절(`app/(teacher)/teacher/marketplace/publish-bot-block.tsx`)로 옮겼으므로 둘 다 옛 자리를 가리킨다(2026-09-17 실측).

### 사람 액션 (설계 § 9 · **2026-09-18 다시 쟀다 — 남은 것은 다섯**)

> **개수의 뜻** *(정정 2026-09-18)* — 종전에 「남은 것은 둘」이라 적었는데 **체크 안 된 칸은 다섯**이었다. 「둘」은 이번에 새로 판정한 둘(e2e 시크릿 · 운영 env)만 센 것이라 목록과 어긋난다. **다섯이 맞다**: ① pullim-api 게시 표면 ② e2e 시크릿 넷 ③ Vercel 운영(Production) env ④ pullim-api **prod** CORS · dev→main 승격 ⑤ dev-os Deployment Protection 우회. **그중 코드를 막는 것은 ① 하나뿐**이고(PR 5e 가 그것만 기다린다) 나머지 넷은 배포·검증 게이트다.
- [x] **pullim-api 푸시 + PR 넷, 순서대로** — 브랜치마다 `git push -u origin <branch>` 뒤 `gh pr create --base dev …`: ① `docs/classbot-classroom-spine` ② `feat/classbot-bots-schema` ③ `feat/classbot-classroom-doors` ④ `feat/classbot-monitoring-doors`. ①·② 는 `origin/dev` 위의 형제, ③ 은 ② 위, ④ 는 ③ 위 — base 는 넷 다 그 리포 `dev`, **머지 순서는 ② → ③ → ④**(④ 의 diff 에는 ③ 이 머지되기 전까지 ③ 의 변경이 함께 실린다; ③·④ 를 병렬로 하려면 ④ 를 ② 위로 rebase) *(`[2026-09-17 정정]` — 종전 「③·④ 는 ② 위에 쌓인다 · 머지는 ② 뒤」)* — **됐다**(2026-09-17 밤): #667 `f6e546a0` → #668 `4b97257f` → #669 `25b9393d` → #670 `324f36fc`
- [x] pullim-api `pnpm migration:generate ClassbotBotsAndRiskSignals` 승인 — 생성 파일은 ② 와 **같은 PR** 에 — **됐다**: `1789625114547-ClassbotBotsAndRiskSignals.ts` 가 #668 에
- [x] dev RDS `migration:run` 승인 — ② 가 그 리포 `dev` 에 들어간 뒤 — **됐다**(2026-09-17 21:35 KST · bastion 경유 · `ClassbotBotsAndRiskSignals1789625114547` — 소유자 보고, 이 리포에서는 실측 불가)
- [x] pullim-api **PR 4 = #672** 리뷰·머지(소유자) — **됐다**: 그 리포 `origin/dev` 끝이 `2d24f323`(2026-09-18 실측). FE 5d(#360)가 그 위에 섰다
- [ ] ① **pullim-api 게시 표면(별건 PR)** — 봇 마켓 게시·해제 문. **→ 이것이 머지돼야 위 「PR 5e `[예정]`」 이 착수된다**(`PR 5e ← 게시 표면` · 설계 § 8.1). `bot.controller.ts` 가 여는 문 셋에 게시가 없고 표의 칸(`isPublished`·`publishedAt`)만 서 있다. **다섯 중 코드를 막는 유일한 하나.** 소유자 게이트
- [ ] ② GitHub secrets `E2E_OS_STUDENT_EMAIL` · `E2E_OS_STUDENT_PASSWORD` · `E2E_OS_TEACHER_EMAIL` · `E2E_OS_TEACHER_PASSWORD`(선택 `E2E_OS_URL`) — 아래 「OS 테스트 계정 시크릿」의 이름 · 로그인 레인과 e2e 트랙의 조건
- [x] ~~OS 복귀 허용목록 `dev-classbot.pullim.ai` · `classbot.pullim.ai`~~ — **할 일이 아니다** *(정정 2026-09-18)*. pullim-api `src/common/security/redirect-host-allowlist.ts` 의 `isAllowedRedirectUrl()` 은 **호스트를 열거하지 않는다** — dev/prod 는 `host === 'pullim.ai' || host.endsWith('.pullim.ai')` 에 https 강제 한 줄이라 두 도메인 다 **이미 든다.** 규칙 밖인 것은 미리보기 도메인(`*.vercel.app`)뿐이고 그건 커스텀 도메인으로만 푼다
- [ ] ③ Vercel env `NEXT_PUBLIC_OS_URL` · `NEXT_PUBLIC_OS_API_URL` — **Preview(dev)·Development 는 넣었다**(2026-09-17). 실측으로 확인된다: 배포된 `https://dev-classbot.pullim.ai/classbot` 의 클라이언트 청크에 `https://dev-api.pullim.ai`·`https://dev-os.pullim.ai` 가 **박혀 있다**(2026-09-18 — 없으면 `lib/auth/os-sso.ts` 의 로컬 기본값 `api.pullim.local:3000` 이 박힌다). **남은 것은 운영(Production) env 결정 하나**(`https://os.pullim.ai` · `https://api.pullim.ai`)
- [ ] ④ pullim-api CORS — **dev 는 이미 있다** *(정정 2026-09-18)*: `OPTIONS https://dev-api.pullim.ai/classbot/me/bots` 에 `Origin: https://dev-classbot.pullim.ai` 를 얹으면 **204 + `access-control-allow-origin: https://dev-classbot.pullim.ai` · `allow-credentials: true`**. 코드가 아니라 배포 env `CORS_ALLOWED_ORIGINS` 의 값이다(`src/common/config/cors.ts` 는 **명시 목록만** 낸다 — 와일드카드 금지). **남은 것은 prod 오리진 `classbot.pullim.ai`** 로, 운영 env 결정과 같이 간다 · dev→main 승격 요청
- [ ] ⑤ dev-os Deployment Protection 우회([`2026-07-05_m0-infra-reassessment.md:38`](2026-07-05_m0-infra-reassessment.md)) · OS 테스트 계정 시크릿(로그인 레인)

```
PR 0✓ ─┬─→ PR 1✓ ─┬─→ PR 2✓ ─┬─→ PR 5b✓ → PR 5c✓ ┐     ✓ = dev 머지(2026-09-18 실측) · PR 0✓ 는 이 리포 #349 와 pullim-api #667 둘 다
       │          │          └→ api PR 4✓ → 5d✓ ┼─→ PR 8✓     api PR 4✓ = pullim-api #672(그 리포 dev 끝 2d24f323) · 5d✓ = #360(5026813)
       │          └─→ PR 3✓ ─→ PR 7✓ ───────────┤     교차 의존(선 생략): PR 5b ← PR 5a · PR 7 ← PR 5a · PR 6 ← PR 3 · PR 5d ← PR 5b
       └─→ PR 4-ci✓ ─→ PR 4✓ ─┬─→ PR 5a✓        │     PR 8✓ = #358(e1b8860) — 선의 뜻은 계획이고, 실제로는 5d 보다 먼저 들어갔다
                              └─→ PR 6✓ ────────┘

  pullim-api 게시 표면(별건 PR · 아직 없다) ─→ PR 5e `[예정]`      ← 남은 코드 PR 은 이 하나 + e2e 트랙
```
*(`[2026-09-17 정정]` — 종전 그림은 PR 5 한 칸이었다. 5a·5b·5c 로 가른 뒤의 그림. PR 6 은 PR 3 이 dev-api 에 들어가기 전에 #352 로 머지됐다 — `questions[]` 수용은 있는 문 위에서 됐고, 표의 「← PR 3」 은 감지 훅 몫으로 남는다)* *(`[2026-09-17 밤 정정]` — pullim-api PR 1·2·3 에 ✓, api PR 4 → PR 5d 가지를 더했다)*

**Global constraints:** 한 PR = 한 계층 · base 는 항상 `dev` · 문서 PR 이 먼저 머지된 뒤 코드 PR(리뷰가 base 스펙을 본다) · 학생 화면 카피는 한자어 없이(고지 문구 「선생님이 이 대화를 볼 수 있어요」) · `x-build-sha` meta 와 `PLAYWRIGHT_BASE_URL ?? …` 패턴은 깨지 않는다.
