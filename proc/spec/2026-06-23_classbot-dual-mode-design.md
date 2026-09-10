# Classbot Dual-Mode (교사 주도 / 학생 자기주도) — Design Spec

**Date:** 2026-06-23
**Status:** approved (brainstorming) → ready for writing-plans
**Scope:** new product capability inside the existing single classbot app.
**Scope 이력** — 이 문서를 쓸 때(2026-06-23)의 전제는 **FE-only, mock-first**(BE 는 나중 트랙)였고,
아래 §3~§6 은 그 전제 위에서 쓰였다. **2026-09-04 그 전제를 푼다** — 스택 PR #266~#271 이
BE persistence 와 publish 경로까지 인도한다. 무엇이 바뀌고 무엇이 그대로인지는 바로 아래 개정
박스가 진다. 이 문서를 읽는 사람은 **머리의 옛 전제가 아니라 그 박스를 기준으로** 읽는다.

> **[2026-09-04 개정] 「FE-only · mock-first」 보류를 푸는 것이 정해졌다 — 인도는 `[예정]` 이다.**
> 아래 §6 의 Out(deferred) 에 있던 **BE persistence + real auth-scoped self-enrollment** 와
> **teacher-side publish to market** 은 스택 PR **#266~#271** 이 인도한다. 풀리는 것은
> **「mock-first」 의 mock 쪽**이지 자기주도 기능 전체가 아니다.
>
> **`dev` 의 자기주도는 「부품은 있고 문은 닫힌」 상태다.** 있는 것: 모드 분기 코드
> (`student-mode` · 학생 홈의 `mode === 'self'`), `useModeBots()` 의 self 분기,
> `/classbot/discover`(공식 튜터 마켓) · `/classbot/learn/[tutorId]{,/[unitId]}`, goal·
> unitProgress·streak 를 들고 있는 `lib/store/self-learning.ts`, `tutor-market-card` 의 등록·해제.
> **닫힌 것: self 모드로 들어가는 길** — 「기획 보류」로 헤더 토글(`StudentModeToggle`)이
> `app-header.tsx` 에서 비노출이고 `useStudentMode()` 의 default 가 `class` 로 고정돼 있다
> (스토어 구조·`setMode` 계약은 그대로라 재개는 그 두 자리를 되돌리는 일이다).
> **그래서 「self 화면이 있다」와 「자기주도가 열려 있다」는 같은 말이 아니고, 진입 복구는
> 이 스택이 서버와 함께 져야 할 몫이다** — 서버만 열면 끝나는 것으로 읽지 마라.
> 서버 쪽 라우트는 아직 없다. 이 표의 「인도」 칸은
> **어느 PR 이 무엇을 지느냐**를 적은 것이지 현재 상태가 아니다.
>
> **`[2026-09-09 정정]` 이 표는 종전에 마이그레이션 번호까지 적어 두었다** — `self_enrollments`
> 를 `0005`, `self_study_days` 를 `0006`, `revoked_at` 을 `0007` 로. **그 예약을 걷는다.**
> 번호는 설계 결정이 아니라 저널의 자리이고, **`dev` 에 먼저 도착한 PR 이 가져간다.**
> 스택의 base 가 squash 머지로 사라져 순서가 갈린 지금, 예약표를 권위 삼으면 리베이스가
> 번호를 뒤로 미는 순간 **drizzle 이 앞 번호를 조용히 건너뛴다**(판정이 `when` 이라
> 그렇다 — 규칙과 실측은 [`2026-09-09_migration-numbering.md`](2026-09-09_migration-numbering.md)).
> 그래서 아래 표는 **어떤 DDL 이 오는지**만 적고 번호는 적지 않는다.
>
> | 이 문서의 deferred 항목 | 상태 | 인도 (`dev` 머지 전) |
> |---|---|---|
> | BE persistence (자기주도) | **`dev` 에 있다** *(`[2026-09-10 정정]` 종전 **`[예정]`**)* | **#270** 이 인도 완료 — `self_enrollments` · `self_study_days` 두 표 · `/api/me/self-bots` · `/api/me/study-days`(+백필). **표와 라우트까지다** — 그것을 부르는 훅·스토어는 `dev` 에 없다(아래 「자기주도 데이터 출처」 줄) |
> | real auth-scoped self-enrollment | **`[예정]`** | 서버 쪽은 `dev` 에 있다 — **#266**(신원) + **#270**(신원별 행). 비로그인은 서버를 부르지 않고 localStorage 로 돈다(prod 는 공개·비로그인). *(`[2026-09-10 정정]`)* 그 갈림을 **FE 에서 실제로 가르는 것은 아래 줄(`[예정]` #273)** 이다 — 이 줄만 읽고 화면 PR 에 서버 소비를 걸지 마라 |
> | **자기주도 데이터 출처(훅·스토어)** — 위 두 줄의 소비 쪽 *(`[2026-09-10 정정]` 신설)* | **`[예정]`** | **#273**(「담은 봇·공부한 날의 출처를 서버로 갈아탄다 — 훅·스토어 (5b/7)」) — **식별된 사용자 = 서버 정본 / 비로그인·401 = localStorage 폴백**, 그리고 기존 로컬 기록 백필. 변경 파일은 `hooks/api/self-bots.ts` · `hooks/api/self-server.ts` · `lib/store/self-learning.ts` 이고 **화면 파일(`app/`·`components/`)은 0개**다. 그래서 **#283**(학생 화면)은 **로컬 폴백 상태로 온다** |
> | teacher-side publish to market | **`[예정]`** | **#267** — `class_bots.is_published` · `/api/teacher/bots/[botId]/publish` · `/api/marketplace/bots` · **#269**(교사 화면). 서버 쪽은 `dev` 에 들어왔다(`0004`) |
> | 학부모 × 자기주도 | **`[예정]`** | 자녀 동의 게이트([05 § 11.4](05-business-rules.md)) — 서버(`consent_logs` 축 둘 · `revoked_at`)는 **#280** 이, 학부모 화면은 **#271** 이 진다 |
> | student-created/custom tutors · adaptive(IRT) · cross-mode analytics | **여전히 deferred** | — |
> | 목표·단원 진행(§3 의 goal/path) | **FE 는 mock-first 로 돈다 · 실제 봇으로 잇는 경로가 없다** | 이 시리즈가 손대지 않는다. `officialTutors`(`lib/mock/classbot-official.ts`)에 커리큘럼이 있고, `lib/store/self-learning.ts` 가 goal·unitProgress·streak 를 들고, `/classbot/learn/[tutorId]` 가 단원 카드를 그린다 — **거기까지가 mock 위에서 돈다.** `bot_curriculum_units` 도 비어 있지 않다 — `scripts/seed.ts` 가 `botCurriculum` 을 넣는다. 없는 것은 **경로**다: 교사가 만든 봇에 커리큘럼을 붙이는 publish 쪽도, 그 표를 읽어 학습 화면에 대는 read 쪽도 없어 FE 가 여전히 mock 을 읽는다. 그래서 P5 가 뒤로 밀렸다 |
>
> 「FE/BE 를 한 PR 에 섞지 않는다」는 리포 규칙은 그대로다 — 위 작업은 **층으로 쪼갠 스택 PR**
> (신원 / 서버 / 학생 화면 / 교사 화면 / 서버화 / 학부모)로 올라간다. 여섯이 다 `dev` 에
> 들어오면 이 박스의 `[예정]` 표기를 지우고 §6 의 Out 목록에서 세 줄을 실제로 뺀다.
>
> **`[2026-09-10 정정]` 「서버화」는 화면 PR 의 몫이 아니다 — 이음매를 여기 적는다.**
> 위 표는 종전에 **규칙만 적고 인도를 적지 않았다** — `self_enrollments`·`/api/me/self-bots` 를
> 실명 범위 정본으로 두고 비로그인에만 localStorage 폴백을 허용한다는 규칙은 있는데,
> **그 전환을 어느 층이 지느냐**가 빠져 있었다. 그래서 그 파일을 스치는 PR 마다 규칙이 걸렸다.
> 배정은 이렇다:
>
> - **서버**(`self_enrollments` · `self_study_days` · `/api/me/self-bots` · `/api/me/study-days`
>   +백필) — **#270** 으로 `dev` 에 **이미 있다**.
> - **훅·스토어의 「식별된 사용자 = 서버 정본 / 401 = localStorage 폴백」 전환** —
>   **`[예정]` #273** 이 인도한다. 그 PR 의 변경 파일에 `hooks/api/self-bots.ts` 와
>   `lib/store/self-learning.ts` 가 들어 있다.
> - **학생 화면**(`/classbot/{classroom,my-bots,discover,discover/[botId]}`) — **#283**.
>   **그래서 #283 은 로컬 폴백 상태로 온다.** 화면 단위 PR 이 그 전환을 함께 하면 층이 섞이고
>   (리포 `CLAUDE.md` 최상위 MUST — 「한 PR = 한 계층」) **#273 의 몫이 통째로 사라진다.**
>
> `[예정]` 의 뜻은 이 리포 관례 그대로다 — **`dev` 에 없는 것**이고, **그 PR 이 통과해야 할
> 기준**이다([`00-index.md`](00-index.md) 2026-09-04 항목의 「읽는 법」). 그러니 **`[예정]` #273
> 의 기준을 #283 의 기준으로 읽지 않는다.**

> **[2026-09-09 개정] 자기주도는 「모드」가 아니라 「장소」다 — Locked decision 2·4 를 갈아 끼운다.**
>
> **이 박스가 아래 본문 전체보다 우선한다 — Locked decisions 목록만이 아니다.**
> Goal · §1 · §2 · §4 · §5 · §6 · §7 · §8 은 모두 「전역 `StudentMode` 토글 + 모드별
> 홈·봇 목록 + 공식 튜터」 위에 쓰였다. 그 전제가 여기서 폐기되므로 **그 절들의 해당 서술은
> 이 박스로 대체된다**(§5 의 「대체표」가 절별로 무엇이 죽고 무엇이 사는지 적는다).
> 본문을 지우지 않고 남겨 두는 이유는 그것이 **왜 그렇게 지었는지의 기록**이기 때문이다 —
> 구현 지시로 읽지 말고 **이력으로 읽는다.** 두 서술이 갈리면 **언제나 이 박스가 이긴다.**
>
> 목록은 2026-06-23 브레인스토밍
> 시점의 결정이고, 그 결정 위에 세운 구현이 `dev` 에서 **「부품은 있고 문은 닫힌」 상태로 굳었다**
> — 헤더 토글이 비노출이고 `useStudentMode()` 의 default 가 `class` 로 고정돼, 저장값이 없는
> 학생은 self 를 볼 수 없다(2026-09-04 박스가 그 사실을 적어 뒀다). 그 문을 **여는 방법**을
> 다시 보다가 두 결정을 바꾸기로 했다.
>
> **① Locked 2 「명시적 모드 토글 · 모드마다 제 홈·봇 목록」 → 폐기.**
> 되살릴 것은 토글이 아니라 **갈 곳**이다. 자기주도가 전역 토글이면 화면마다 뜻이 바뀌고
> (같은 `/classbot/chat` 이 모드에 따라 다른 목록을 그린다), 그 토글을 못 찾은 학생에게는
> 마켓에서 담은 봇이 **어느 화면에서도 열리지 않는 진열장**이 된다. 대신:
>
> | 종전 (Locked 2) | 이제 |
> |---|---|
> | 전역 `StudentMode = 'class' \| 'self'` 토글 | **없다.** 모드 상태를 읽어 화면을 가르지 않는다 |
> | 모드마다 다른 홈 | **홈은 하나다.** 참여한 반이 0곳일 때의 빈 홈은 그대로 참여 코드 히어로다 |
> | 모드마다 다른 봇 목록 | `/classbot/chat` 은 **반 봇 + 담은 봇을 한 목록**으로 그린다. 같은 봇이 양쪽이면 한 번만 싣고 **반 관계가 이긴다**(과제·교사 관제가 거기 붙으므로) |
> | self 전용 홈 | **`/classbot/my-bots`(「담은 봇」)** 라는 **장소**. 레일에 상시 자리를 갖는다 |
>
> 「담기」는 **반 참여가 아니다** — `enrollments` 행도, 교사의 학생 수도, 관제소 노출도
> 따라오지 않는다. 그래서 홈의 「참여 중인 클래스」 수와 담은 봇 수는 서로 다른 것을 센다.
>
> **② Locked 4 「자기주도 봇 = 플랫폼 공식 커리큘럼 튜터만」 → 교사가 마켓에 공유한 봇으로.**
> 공식 튜터(`lib/mock/classbot-official.ts` 의 `ot_*`)는 **mock 이고 서버에 대응 행이 없다** —
> `chat_messages.bot_id` 가 `class_bots` 를 FK 로 물어 **그 봇과의 대화는 애초에 저장될 수
> 없었다.** 반면 #267 이 `class_bots.is_published` 와 `/api/marketplace/bots` 를 이미
> `dev` 에 들였다. 그래서 마켓의 정본을 **교사가 공유한 봇**으로 옮긴다 —
> 담은 봇 id 는 `class_bots.id` 이고, 그 봇과의 대화는 그대로 저장된다.
> **student-created/custom 튜터는 여전히 deferred 다**(Locked 4 의 그 절반은 살아 있다).
>
> **③ 무엇이 그대로인가.** Locked 1(한 서비스)·3(teacher-less 학생도 혼자 선다)·5(목표/경로
> 학습 모델)는 유효하다. 특히 **3 이 이 개정의 이유 중 하나다** — 선생님이 없는 학생에게
> 참여 코드가 유일한 입구이면 그건 막다른 길이라, 마켓이 그 학생의 입구가 된다.
> `/classbot/learn/[tutorId]{,/[unitId]}`(§3 의 goal/path)는 **mock `ot_*` 위에서 그대로
> 돈다** — P5 에서 카탈로그와 함께 정리될 때까지 건드리지 않는다.
>
> **④ 옛 저장값.** `lib/store/self-learning.ts` 의 v0 는 `ot_*` 등록과 연속학습 **카운터**를
> 전역 한 통에 담았다. v1 은 `class_bots.id` 기반 「담은 봇」과 **날짜 배열**을 사용자별로
> 담는다. 셋 다 번역 대응이 없어(id 대응표 없음 · 카운터는 날짜로 못 펼침 · 누구 것인지 모름)
> **v1 목록으로 옮기지 않는다.** 다만 **지우지도 않는다** — 원본은 `legacyV0` 로 남는다.
>
> **⑤ 절별 대체표 — 본문의 어느 서술이 죽고 어느 것이 사는가.**
>
> | 절 | 죽은 서술 (구현 지시로 읽지 마라) | 사는 서술 |
> |---|---|---|
> | **Goal** | 「two student modes … adding only the **mode toggle**, a **dual home**, the **official-tutor** library + market」 | 「one classbot app · 기존 학생 층 재사용」 |
> | **§1 Mode architecture** | **절 전체.** `StudentMode` 스토어 · `pullim-student-mode` · 헤더 토글 · 「모드가 홈·nav·봇 목록·리플레이 범위를 바꾼다」 · `app/(student)/classbot/self/*` · 「self 모드에서 받은 과제를 숨긴다」 | 「`app/(student)/classbot/*` 라우트를 그대로 쓴다」 · 「`Role` 은 `student` 의 하위 맥락이지 세 번째 Role 이 아니다」 — **다만 `Role` 이 셋이 된 것은 학부모 때문이고 자기주도와 무관하다**(#281) |
> | **§2 Official tutor library + 봇 마켓** | `officialBots`(`ot_*`) 를 마켓의 정본으로 두는 것 · `SelfEnrollment`(학생↔공식 튜터) · 「모드마다 자기 목록만 보인다」 | 「봇 마켓을 학생 레일에 연다」 · 「마켓에서 담는다」 — 정본만 **교사 공유 봇**으로 갈린다 |
> | **§3 Self-directed learning layer** | 「**self 모드 홈**」이라는 그릇(오늘의 한 가지 · 내 튜터 grid 를 그 홈에 놓는 배치) | goal/path 학습 모델 자체(개념→연습→점검) · `/classbot/learn/*` 가 mock `ot_*` 위에서 도는 현재 동작 — **P5 까지 그대로** |
> | **§4 Data model** | `lib/store/student-mode.ts`(`StudentMode` persist) · `self-learning.ts` 의 `SelfEnrollment[]` · 연속학습 **카운터** | `self-learning.ts` 자체 — 다만 v1 은 **사용자별 `byUser`** · **`class_bots.id` 기반 담은 봇** · **날짜 배열**이다(④) |
> | **§5 Reuse vs new** | New 목록의 「mode toggle + dual student home」 | Reuse 목록 전부 |
> | **§6 MVP scope** | In 의 「`StudentMode` toggle + mode-aware shell/home/nav」 · 「official tutors 2–3」 · 「self home」 | Out(deferred) 의 **student-created/custom tutors** · adaptive(IRT) · cross-mode analytics. BE persistence · real auth-scoped self-enrollment · teacher-side publish 는 2026-09-04 박스가 이미 풀었다 |
> | **§7 Constraints & e2e** | 「mode 는 student 하위 맥락」이라는 전제 아래 쓰인 문장들 · 「self-home `/classbot`」이라는 표현 | **「현재 것을 전부 보존한다」와 prod-verify e2e 목록** — 유효하다. 홈이 하나가 된 뒤에도 참여한 반 0곳의 빈 홈은 참여 코드 히어로 그대로다 |
> | **§8 Phasing** | **PR-1「Mode foundation」 전체** · PR-2 의 「unlock 봇 찾기 + `SelfEnrollment`」 중 공식 튜터 전제 · PR-3「Self home」 | PR-4「Learning loop」 · PR-5「Polish + onboarding」 의 취지 — 다만 실제 인도는 아래 「인도」 줄과 2026-09-04 박스의 표를 따른다(스택 PR #266~#271·#280~#284) |
>
> **인도**: `/classbot/{classroom,my-bots,discover,discover/[botId]}` 화면과 위 ①②④ 는
> **#283**(#268 을 `dev` 위로 리베이스한 판)이 진다. 서버는 이미 `dev` 에 있다(#267·#280·**#270**) —
> 그 PR 에 `app/api/**` 변경은 없다.
>
> **`[2026-09-10 정정]` 그 화면의 데이터 출처는 아직 localStorage 다.** 자기주도 서버
> (`self_enrollments` · `self_study_days` · `/api/me/self-bots` · `/api/me/study-days`)는
> **#270** 으로 `dev` 에 있지만, **그것을 부르는 훅·스토어는 `[예정]` #273** 이 인도한다
> (「식별된 사용자 = 서버 정본 / 401 = localStorage 폴백」 + 기존 로컬 기록 백필 · 변경 파일은
> `hooks/api/self-bots.ts` · `lib/store/self-learning.ts` 이고 화면 파일 0개). **④ 의 v1
> 저장값도 그 전환 전까지는 로컬에 산다** — #283 이 세우는 것은 v1 의 **모양**(사용자별
> `byUser` · `class_bots.id` 기반 담은 봇 · 날짜 배열)이고, **출처를 서버로 옮기는 것은
> #273 이다.** 그래서 **#283 에 서버 소비를 요구하면 층이 섞인다**(리포 `CLAUDE.md` 최상위
> MUST) — 자세한 배정은 위 2026-09-04 박스의 `[2026-09-10 정정]` 항목.

## Goal

> ⚠ **[2026-09-09 개정] 이 문단은 「모드 토글 + 모드별 홈 + 공식 튜터」 전제 위에 쓰였다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


Make **classbot one service with two student modes** — **교사 주도형** (current: bots assigned by a teacher) and **학생 자기주도형** (new: student self-enrolls in official curriculum tutors and learns goal-by-goal) — reusing the existing student layer (3-col chat, quiz/study-guide rail, wellbeing, replay, primitives, DS) and adding only the mode toggle, a dual home, the official-tutor library + market, a goal/path/progress layer, and self-enrollment.

## Locked decisions (from brainstorming)

> ⚠ **[2026-09-09 개정] 결정 2·4 는 폐기됐다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


1. **One service, two modes** — not a separate product; one classbot app.
2. **Explicit mode toggle** — the student app has a top-level `교사 수업 ↔ 자기주도` switch. Each mode has its own home / bot list / replay context. A student can hold both and switch.
3. **Entry = both (standalone-capable + add-on)** — a teacher-less student can sign up and use self-directed alone (onboarding/empty states must stand without a teacher); a teacher-enrolled student gets self-directed as an add-on. Teacher-less → defaults to `self`; enrolled → defaults to `class`.
4. **Self-directed bots = official curriculum tutors only (MVP)** — platform-authored subject tutors the student self-enrolls from the 봇 마켓. Student-created/custom tutors are **deferred**.
5. **Learning model = goal/path + progress (MVP)** — pick a 목표/단원 → the tutor guides a path (개념 → 연습 퀴즈 → 점검), with progress + streak + a daily "오늘의 한 가지" nudge. (NOT free-chat-only; NOT adaptive/diagnostic — that's deferred.)

**Approach:** thin **vertical MVP** — one end-to-end self-directed loop (toggle → market → enroll → self-home → goal/path → chat/quiz/점검) with 2–3 tutors, mostly mock/reused, then broaden. (Vs horizontal-by-layer / shell-first — both delay a working loop.)

---

## 1. Mode architecture

> ⚠ **[2026-09-09 개정] 이 절은 통째로 폐기됐다 — 전역 `StudentMode` 토글은 만들지 않는다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


- New state **`StudentMode = 'class' | 'self'`** — a zustand store with `persist` (mirror `lib/store/sidebar.ts`'s pattern; key `pullim-student-mode`). Default resolved on load: `self` when the student has **no teacher enrollments**, else `class`.
- A **mode toggle** in the student shell (top of `AppHeader` or a segmented control under it; desktop + a compact mobile form). Switching re-renders the student home + nav emphasis + bot list + replay scope for that mode. Teacher role is unaffected (the toggle is student-only).
- **Routing:** keep the existing `app/(student)/classbot/*` routes. Mode is a *cross-cutting context*, not a route prefix — the same routes (home, chat, wellness, replay) render mode-aware content; **self-only** surfaces (the self home's goal/path, the tutor market) get new routes under `app/(student)/classbot/self/*` (or a `learn/*` segment). Teacher-only student surfaces (받은 과제, teacher-live) are hidden/empty in `self` mode.
- **Shell/nav (`components/shell/*`):** `AppSidebar`/`BottomNav` show a mode-aware student nav. This touches shared shell — **flag + keep additive** (the `Role` type stays `student | teacher`; mode is a sub-context of `student`, NOT a third Role).

## 2. Official tutor library + 봇 마켓

> ⚠ **[2026-09-09 개정] 마켓의 정본이 공식 튜터(`ot_*`)에서 교사 공유 봇으로 갈렸다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


- New **`officialBots`** mock (`lib/mock/classbot-official.ts`) — platform-authored curriculum tutors reusing the existing `ClassBot` shape + `botSignature`/persona system. Each tutor: subject, persona/tone, default scope, and a **curriculum** (ordered 단원 list). MVP: 2–3 subjects (e.g. 수학·영어·과학).
- **Unlock the existing `봇 찾기 (공식 봇 마켓)` nav item** (currently `locked: true` in `nav-config.ts:49`) as the self-mode discovery surface: browse official tutors → **self-enroll**.
- **`SelfEnrollment`** (student ↔ official tutor) — distinct from teacher `StudentEnrollment`. A self-mode student's "내 튜터" list = their self-enrollments; a class-mode student's bot list = teacher enrollments. (A student may have both; each mode shows only its own.)

## 3. Self-directed learning layer (goal/path + progress)

> ⚠ **[2026-09-09 개정] 「self 모드 홈」이라는 그릇이 `/classbot/my-bots` 로 갈렸다 — 학습 모델 자체는 유효하다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


- **Self home** (`self` mode home): "오늘의 한 가지" nudge + active goals + streak + 내 튜터 grid + enter-market CTA. Reuses KPI/EmptyState/SectionHeading/momentum patterns.
- **Goal/Path:** per enrolled tutor, pick a **목표/단원** → a path of steps: **개념 학습** (study-guide content + chat) → **연습 퀴즈** (the existing quiz/study-guide rail content) → **점검** (a short check). Reuse the 3-col chat (the tutor as the bot) + the `chat-study-rail` quiz/guide.
- **Progress model** (`LearningGoal`, `UnitProgress`): per tutor/unit completion state + a daily **streak** + the "오늘의 한 가지" selection. Light, mock-persisted (localStorage), standalone (no teacher).
- **Scope in self-mode:** self-set or a sensible full-help default (no exam lockdown, since no teacher policy). Reuse the existing Scope system, defaulting open.

## 4. Data model (mock-first; BE is a separate later track)

> ⚠ **[2026-09-09 개정] `student-mode` 스토어와 `SelfEnrollment`·연속학습 카운터는 폐기됐다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


New mock + stores (FE-only this track):
- `lib/mock/classbot-official.ts` — `officialBots` + their curricula (단원).
- `lib/store/student-mode.ts` — `StudentMode` (persist).
- `lib/store/self-learning.ts` — `SelfEnrollment[]`, `LearningGoal`/`UnitProgress`, streak, "오늘의 한 가지" (persist). Standalone-capable (no teacher dependency); follows the demo-fallback philosophy already in the repo.
- Reuse `ClassBot`/`botSignature`/quiz/study-guide/wellbeing types as-is.

## 5. Reuse vs new

> ⚠ **[2026-09-09 개정] New 목록의 「mode toggle + dual student home」은 폐기됐다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


- **Reuse (most):** 3-col chat (`chat/page.tsx` + `chat-study-rail`), quiz/study-guide, wellbeing (shared across modes), replay, the primitive set, the Pullim DS, auth, the sidebar toggle pattern.
- **New:** mode toggle + dual student home + official-tutor library/market (unlock 봇 찾기) + goal/path/progress layer + `SelfEnrollment` + the two new stores.

## 6. MVP scope (this spec → first plan(s))

> ⚠ **[2026-09-09 개정] In 목록의 모드·공식 튜터·self home 세 줄은 폐기됐다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


**In:** `StudentMode` toggle + mode-aware shell/home/nav · official tutors 2–3 + the 봇 마켓 self-enroll · self home (오늘의 한 가지 + goals + streak + 내 튜터) · one end-to-end goal/path loop (개념→연습 퀴즈→점검) for one subject, reusing chat + quiz rail · mock-persisted progress.
**Out (deferred):** student-created/custom tutors; adaptive/diagnostic (IRT) recommendation; BE persistence + real auth-scoped self-enrollment; cross-mode analytics; the teacher-side "publish to market" authoring.

## 7. Constraints & e2e

> ⚠ **[2026-09-09 개정] 「mode 는 student 하위 맥락」 전제 아래 쓰인 문장들만 갈렸다 — 보존 원칙과 prod-verify e2e 목록은 유효하다.** 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


- **Preserve everything current:** the teacher experience and the current student **class-mode** flows are unchanged; the mode toggle + self surfaces are **additive**. All prod-verify e2e stay green — color-palette (8 routes; self-home `/classbot` and any scanned self routes must stay green/amber-free), chat (data-slots, greeting/quick-prompts), wellness-intensity-range, mobile-and-focus (수업 종료, assignment-form testids, solve a11y), slider-variants. New self surfaces follow the same guards (no green/amber on student routes; 44px touch; focus rings; DS type scale).
- **Role stays `student | teacher`**; mode is a student sub-context (do NOT add a third Role or break `findActiveSection`/nav).
- **FE-only, mock-first.** BE write/persistence + real auth-scoped self-enrollment is a **separate BE PR track** (repo rule: FE/BE never mixed). The mock/localStorage layer makes the whole loop demoable + e2e-able without a BE (consistent with the existing demo-fallback approach).
- **Phased stacked PRs** off `dev` → PR to `dev` (team flow `dev → main`). Each FE-only + small.

## 8. Phasing (for the plan)

> ⚠ **[2026-09-09 개정] PR-1·PR-3 은 폐기되고 PR-2 의 공식 튜터 전제가 갈렸다.** — 위 개정 박스 §⑤ 대체표를 먼저 읽는다. 두 서술이 갈리면 박스가 이긴다.


1. **PR-1 — Mode foundation:** `StudentMode` store + the student-shell mode toggle + mode-aware nav/home routing scaffold (class-mode unchanged; self-mode shows a placeholder home). Default-mode resolution. e2e: class-mode flows + color-palette unchanged.
2. **PR-2 — Official tutors + market:** `classbot-official.ts` (2–3 tutors + curricula) + unlock the 봇 찾기 market (browse + self-enroll) + `SelfEnrollment` store + "내 튜터" list in self-home.
3. **PR-3 — Self home + goal/path:** self home (오늘의 한 가지 + goals + streak) + the goal/단원 picker + the path scaffold.
4. **PR-4 — Learning loop:** the 개념→연습 퀴즈→점검 loop wired to the 3-col chat + quiz/study-guide rail for one subject end-to-end + progress/streak persistence.
5. **PR-5 — Polish + onboarding:** self-mode standalone onboarding (teacher-less entry), empty states, motion, a11y, mobile.

Each PR: typecheck + lint+gates + jest + the relevant prod-verify e2e (esp. color-palette on touched routes) + boot smoke.

---

## Self-review

**Spec coverage:** the 5 locked decisions → §1 (toggle, entry) / §2 (official tutors, market) / §3 (goal-path learning) / §4 (data) ; MVP vertical → §6/§8. ✅
**Placeholder scan:** concrete file/store names + the existing-code anchors (`nav-config.ts:49` 봇 찾기, `StudentEnrollment`, `lib/store/sidebar.ts` pattern). MVP/out-of-scope explicit. No TBD.
**Consistency:** mode is a student sub-context (not a Role) — stated in §1 and §7; standalone-capable entry (§3 decision) consistent with the mock-first/demo-fallback data layer (§4/§7).
**Ambiguity:** "self surfaces get new routes under `self/*` or `learn/*`" — the plan picks one; flagged as a plan-time choice, not a spec gap.
**Scope:** large but coherently phased (5 PRs); each PR is a working increment. The first plan should cover **PR-1 (mode foundation)** only, like the DS revamp stack — subsequent phases get their own plans.
