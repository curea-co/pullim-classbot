# 클래스봇 완성 설계 — BE 정본은 pullim-api, 반이 척추가 된다

> **상태**: 사용자 결정 반영(2026-09-16) · **설계 정본**. 시각화 원본은 `output/2026-09-16_classbot-completion-plan.html`(v3 · 미추적 산출물)이고, 이 문서가 그것을 스펙 자리에 옮겨 적은 것이다. 둘이 어긋나면 이 문서가 이긴다.
> **plan 카드**: [`../plan/2026-09-16_classbot-completion-plan.md`](../plan/2026-09-16_classbot-completion-plan.md) — PR 목록과 상태.
> **진행**: 2026-09-17 04:00 KST 실측 — § 8 표 「상태」 열. 이 리포 PR 0·4-ci·4·5a·6 머지(#349 · #348 · #350 · #351 · #352) · pullim-api PR 0~3 브랜치 넷 로컬 준비(푸시·PR 은 소유자 게이트) · PR 5 는 5a·5b·5c 로 갈랐다 · e2e 트랙 행 신설.
> **근거 조사**: 이 리포 `dev`(#347 기준) 화면·훅·라우트·스키마 전수 · pullim-api `dev` classbot 모듈·엔티티 · pullim-api 설계 문서 [`api.md`](../../../pullim-api/docs/design/services/classbot/api.md) · [`authz.md`](../../../pullim-api/docs/design/services/classbot/authz.md) · [`data-model.md`](../../../pullim-api/docs/design/services/classbot/data-model.md) · [03](03-features-and-ia.md) · [05](05-business-rules.md) · [2026-07-03 amendment](2026-07-03_be-api-m2-amendment.md) · [2026-07-02 로드맵](../plan/2026-07-02_real-launch-roadmap.md) · [2026-07-01 SSO 런북](../plan/2026-07-01_classbot-sso-dev-deploy-runbook.md).

한 문장으로: **이 리포의 Next.js 라우트 25개는 배포에서 신원을 가질 수 없고, 봇의 진짜 응답은 pullim-api 안에만 있다.** 그래서 BE·DB 정본은 pullim-api 의 classbot 모듈 하나로 두고, 거기에 빠진 문 여섯 개를 내고, 이 리포는 화면이 그 문만 부르게 고친다.

## 0. 결정 요약 (2026-09-16 · 사용자)

**BE 정본은 pullim-api `src/classbot`** — ADR-063(2026-07-04) 이 정한 자리 그대로다. 봇 분리(③)는 그 리포의 **ADR-091 `[예정]`**(`docs/design/_platform/adr/ADR-091-classbot-bots-분리.yaml` · refines ADR-063 — pullim-api 브랜치 `docs/classbot-classroom-spine` 에만 있고 원격 ref·PR 이 아직 없다, PR 승인 대기. 경로는 머지되면 그대로 풀린다)이 진다 — 이 문서와 병행 작성됐고, 오류 관례(§ 5)·`classes.subject/grade`(§ 4)·표시명 포트(해소 5)는 그 ADR 을 따른다. 이 리포의 `app/api/**` + Drizzle(세계 B)은 지난 두 달 화면이 실제로 부른 곳이지만 **prod 에 올릴 수 없다** — 취향이 아니라 열쇠다(§ 1.1). 나머지 여섯은 추천안을 그대로 채택했다.

| # | 결정 | 그래서 하는 일 |
|---|---|---|
| ① | 이 리포의 `/api/*` 25개 · Drizzle 31표는 **겹치는 것만** 은퇴 — 반·봇·챗·과제 계열(`classrooms` · `class_bots` · `enrollments` · `join_codes` · `assignments` · `assignment_questions` · `submissions` · `chat_messages` · `interventions` 와 그 라우트). 학부모·동의·담은 봇·자기주도·마켓 계열은 손대지 않고 「로컬 전용」 표시 유지 | FE PR 8 의 범위가 이 목록이다. 개발용 신원 쿠키(`lib/dev-identity.ts`)와 `lib/current-user.ts` 의 서버 해석기도 같이 간다 — 다만 범위 밖 라우트가 그 해석기를 아직 쓰므로, 겹치는 라우트를 지운 뒤 **남는 참조가 0 인 것만** 걷는다 |
| ② | 비로그인 데모 통과는 **코어 화면에서 닫는다** — 소개(`/classbot/onboarding`)·랜딩만 공개. 나머지 학생·교사 화면은 비로그인이면 `redirectToOsLogin()`(`lib/auth/os-sso.ts`) | `role-guard.tsx` 의 「비로그인 통과」 분기를 공개 경로 목록으로 바꾼다. prod-verify 는 이미 「익명 = 로그인 안내」 규칙이라 e2e 는 게이트 화면 기대값만 손본다. 정책은 [05 § 11.1·§ 11.2](05-business-rules.md) |
| ③ | **봇과 반을 갈라낸다** — `bots` 표, 반은 `bot_id` 로 가리킨다. 한 봇이 여러 반에 붙을 수 있고, 반은 한 번에 봇 하나 | pullim-api PR 1 이 `bots` 를 세우고 `class_bot_profiles` 를 이행한다. 「할당·교체」가 `PUT /classes/:id/bot` 이라는 진짜 행위가 된다. 챗 프롬프트 빌더(`PersonaInput`)는 조인만 바뀐다. ADR-063 「bot == classes 행 재사용」은 **ADR-091 `[예정]`** 이 개정한다(refines ADR-063 · pullim-api 브랜치 `docs/classbot-classroom-spine`, PR 승인 대기) — 근거는 § 1 R4 와 § 4, 이 리포 쪽 기록은 [2026-07-03 amendment](2026-07-03_be-api-m2-amendment.md) 머리 |
| ④ | 「봇 대화」는 레일에서 **「내 수업방」 아래 한 단계**로 들여쓴다. 경로는 `/classbot/chat` 유지 | `NavSubItem.children` 한 단계 추가, `app-sidebar.tsx`·`mobile-drawer.tsx` 가 들여쓰기로 그린다. 「받은 과제」는 수업방 바로 뒤로 올린다. 셸 변경 승인은 이 결정(2026-09-16)이고 기록은 [`apps/classbot/CLAUDE.md` § 5](../../apps/classbot/CLAUDE.md) 와 [03 § 2.1](03-features-and-ia.md). `nav-config.test.ts` 의 「모든 항목에 page 가 있다」 검사는 중첩 항목까지 훑도록 넓힌다 |
| ⑤ | 위험 감지 **1차는 규칙 다섯 + 위기 키워드** — 답베끼기 · 부적절/위기 키워드 · 반복 우회 · 무의미 입력 · 장시간 무활동. 주제 이탈·강도 설정은 2차 | pullim-api PR 3 의 감지 훅은 **모델을 부르지 않는다**. 임베딩이 필요한 주제 이탈은 [실출시 로드맵 M3](../plan/2026-07-02_real-launch-roadmap.md)(LLM 게이트웨이 결정 — `spec/10-roadmap` 이 아니다) 뒤로. [05 § 3](05-business-rules.md) 표에 「차수」 열을 더해 스펙이 코드와 같은 말을 하게 한다 |
| ⑥ | 학부모·기관은 **이번 범위 밖**. 학생으로 위장시키던 매핑만 걷는다 | `mapRole` 이 `parent`·`institution` 을 그대로 돌려주고, RoleGuard 는 그 둘을 「클래스봇은 학생·교사용」 안내 한 장으로 보낸다. `packages/types` 는 건드리지 않는다 — 앱 경계 별칭 `AppUserRole`(`lib/current-user.ts:37` — 이미 `UserRole | 'parent'`)에 `institution` 하나만 더하는 것으로 끝난다 |

### 0.1 결정 뒤에 남은 모순 일곱 — 권장안으로 해소

결정 여섯이 서로 부딪히는 자리를 다시 훑어 나온 일곱이다. 2026-09-16 「권장안으로 해소하고 진행」 지시에 따라 아래대로 확정한다.

| # | 모순 | 해소 |
|---|---|---|
| 1 | prod-verify 는 익명으로 도는데 ② 가 익명을 막는다 | prod-verify 를 **두 레인**으로. 익명 레인 = 공개 화면 + 「코어 화면이 로그인 안내로 서는지」만 본다. 로그인 레인 = OS 테스트 계정 시크릿이 있을 때만 돌며(`if: secrets…`) `tests/e2e/sso-login-roundtrip.spec.ts` 골격으로 로그인 뒤 기존 스펙 파일 10개(sso 제외 · 전체 11)를 친다 — 「7」은 `prod-verify.yml:91` 의 낡은 주석에서 온 숫자다. → **PR 4-ci**, PR 4 보다 먼저. `.github/workflows/prod-verify.yml` 편집 승인은 이 지시로 난 것으로 기록한다 |
| 2 | ①·②·⑥ 을 합치면 학부모 화면에 아무도 못 들어간다 | **받아들인다.** `app/(parent)` 세 화면과 서버 라우트 둘(`/api/parent/*`)은 「학부모 별건 PR 까지 비활성」 — [05 § 11.2](05-business-rules.md) · [03 § 2.3](03-features-and-ia.md). 개발 쿠키를 학부모 트리에만 남기는 길은 택하지 않는다 — ① 과 다시 부딪힌다 |
| 3 | 채팅의 단위가 어긋난다 — 화면은 봇, 서버는 반 | 채팅 선택 단위를 **반**으로 바꾼다(FE PR 5). ④ 와 결이 같다. `messages.bot_id` 를 더해 봇 교체 뒤에도 한 반 기록에서 어느 봇과의 대화인지 남긴다(pullim-api PR 1) |
| 4 | 루트 `CLAUDE.md` 가 여전히 `apps/backend` 를 BE 로 적는다 | PR 0 에서 § 1 구조도와 § 2 BE 절을 「BE 정본은 pullim-api, `apps/backend` 는 health 스켈레톤」으로 고친다. 글로벌 작업 승인은 이 지시로 난 것으로 기록한다. 「FE/BE 를 한 PR 에 담지 않는다」 규칙은 리포가 갈렸으니 자연히 지켜진다 |
| 5 | 명단에 이름이 없다 — `class_memberships` 에는 `member_id`(sub)뿐이다 | `GET /classes/:id/members` 가 auth 의 **읽기 전용 투영 포트**(`ProfileProjectionInterface`)로 `sub` → 표시명을 받아 붙인다 — pullim-api db-structure § 2 가 도메인의 `auth.*` SELECT/JOIN 을 금하므로 **SQL 조인이 아니다**(FK 없음 — classbot 스키마 규칙 유지 · ADR-091). 스냅샷 컬럼은 두지 않는다 — 이름을 바꾼 학생이 옛 이름으로 남는 문제를 피한다(pullim-api PR 2) |
| 6 | 로컬 개발과 e2e 가 같이 바뀐다 | 로컬은 `classbot.pullim.local:3032` 로 열고([런북 § 5-1](../plan/2026-07-01_classbot-sso-dev-deploy-runbook.md) hosts), e2e 는 baseURL 을 그 호스트로 두고 로그인 픽스처를 만든다. test 블록 44(sso 제외 41)의 localStorage 시드 전제 전환은 PR 6 안의 **별도 스펙 트랙**으로 분리해 리뷰 depth 를 지킨다 |
| 7 | PR 4 순서에 구멍이 있다 — 반 만들기·명단·봇 할당은 PR 2 전까지 문이 없다 | PR 4 는 pullim-api 에 **이미 있는** 문의 훅만 옮긴다(과제 목록·상세·제출·참여·내 반·챗). 반 만들기·명단·봇 할당 훅은 PR 2 가 문을 낸 뒤 PR 5 에서 옮긴다 |

**확인해서 문제가 아닌 것**: pullim-api 의 과제 내기(`POST /classbot/classes/:classId/assignments`)는 `questions[]` 를 필수(최소 1개)로 받고, 상세 조회는 문항을 돌려준다([api.md § 3.6](../../../pullim-api/docs/design/services/classbot/api.md)). R6·R8 계획은 그대로 성립하고, 지금 FE 가 문항을 안 보내서 **그 문을 부를 수조차 없었던 것**이 드러났다.

## 1. 요구 11 × 지금 (등급표)

등급은 **로컬 DB + 개발용 신원 쿠키** 기준이다. 배포된 dev·prod 에는 DB 도 신원도 없어서([05 § 11.1](05-business-rules.md) 의 `[2026-09-14 결정]` 박스) 이 표의 모든 줄이 「목 데이터」로 내려간다. ✓ 서버까지 감 · ◐ 반쪽 · ✕ 브라우저에 갇힘.

| # | 요구 | 지금 화면 | 등급 | 막힌 자리 |
|---|---|---|---|---|
| R0 | OS 로그인 역할대로 화면이 다르다 | `RoleGuard` · 학생/교사/학부모 레이아웃 셋 | ◐ | OS `/me` 의 role 은 읽는다. 그러나 **비로그인은 그냥 통과**하고(`components/features/auth/role-guard.tsx:25` 「비로그인(데모 폴백)이면 통과시킨다」), 학부모·기관은 **학생으로 내려간다**(`lib/auth/os-sso-provider.ts:43` `mapRole` 「그 외 → student」). 서버 라우트는 OS 쿠키를 아예 못 본다 |
| R1 | 교사가 반을 만들고 참여 코드를 얻는다 | `/teacher/classroom` | ✓ | 반을 만들면 봇이 같이 만들어진다(`cr_`+`cb_` 동시 발급). 코드는 반 카드에 있고 재발급도 된다 |
| R2 | 학생이 코드를 넣어 반에 들어간다 | `/classbot/classroom` | ✓ | 서버가 401·404 를 주면 **목 참여로 조용히 갈아탄다**(`components/classbot/home/join-code-form.tsx:88`). 실패가 성공처럼 보인다 |
| R3 | 교사가 누가 들어왔는지 본다 | `classroom-roster.tsx` | ✓ | 읽기만. 내보내기 없음 |
| R4 | 교사가 반에 클래스봇을 할당한다 | 전용 화면 없음 | ◐ | 「할당」이라는 **행위가 없다.** 반 = 봇 1개 고정, 만든 뒤 바꾸거나 더할 길이 없다. 요구와 구조가 어긋나는 첫 자리 → 결정 ③ |
| R5 | 학생이 할당된 봇과 대화한다 | `/classbot/chat` | ◐ | 응답은 정규식 8개로 고른 고정 문장 40개(`lib/mock/chat.ts` `pickClassbotReply` · 900ms 가짜 지연). 저장은 서버로 가지만 **되읽는 문이 없다.** 진짜 LLM 응답은 `USE_REAL_CORE_BE`(`lib/features.ts`) 뒤 pullim-api SSE 에만 있다 — 기본 OFF |
| R5b | 「봇 대화」를 「내 수업방」 아래로 | `components/shell/nav-config.ts` | ✕ | 둘은 같은 층의 형제다. 레일은 도메인 → 항목 **한 단계만** 그린다 → 결정 ④ |
| R6 | 교사가 반에 과제를 낸다 | `/teacher/assignment/new` | ◐ | 제목·마감은 서버로, **문항 본문은 어디에도 안 간다.** 동시에 localStorage 에도 쓴다(이중 쓰기) |
| R7 | 학생이 과제를 받는다 | `/classbot/assignment` | ✓ | 서버 목록에 로컬 데모 과제가 섞여 보인다(`lib/store/assignments.ts` `useMergedAssignments`) |
| R8 | 학생이 과제를 푼다 | `…/[id]/solve` | ◐ | 겉은 서버, **문항은 로컬 시드.** 다른 기기에서 열면 선생님이 쓴 발문이 아닌 문제를 푼다 |
| R9 | 학생이 제출한다 | `solve-workspace.tsx` | ✕ | 제출이 학생 브라우저를 떠나지 않는다. 같은 오리진에 제출 API 가 없다 |
| R10 | 교사가 제출물을 본다 | `/teacher/assignment/[id]` | ✕ | 학생 localStorage 를 교사 브라우저가 읽을 방법이 없다. **끊긴 고리** |
| R11 | 교사가 자기가 낸 과제를 본다 | `/teacher/assignment` | ✕ | 서버 훅 `useTeacherAssignments`(`hooks/api/assignment-dispatch.ts:73`)는 있는데 **부르는 화면이 0개.** 화면은 스토어를 읽는다 |

### 1.1 갈림길 — B 를 prod 로 올릴 수 없는 이유는 취향이 아니라 열쇠다

| | 세계 A · pullim-api `/classbot/*` (문서상 정본 · ADR-063) | 세계 B · 이 리포 `app/api/**` + Drizzle (2026-09 #266~#331) |
|---|---|---|
| 신원 | OS 가 심는 HttpOnly 쿠키(`Domain=.pullim.ai`)를 서버가 ES256 으로 검증. 위조 창 없음 | 평문·무서명 개발 쿠키. 허용 호스트는 localhost 셋뿐 — [05 § 11.1](05-business-rules.md) 「이 경로에는 production 신원이 없다」 |
| OS 쿠키 | `JwtVerifyGuard` + `EntitlementGuard('classbot')` + 쓰기 `CsrfGuard` | 받아도 **풀 수 없다** — pullim-api 가 공개 키(JWKS)를 내놓지 않는다. introspection 도 classbot 용은 없다 |
| 데이터 | 테이블 13(uuid) · 라우트 16(assignment 5 · chat 2 · classroom 4 · intervention 4 · replay 1) · SSE 스트리밍 챗 = **진짜 LLM** · `origin/main` 에 있음 | 테이블 31(text id) 중 17 은 어느 라우트도 안 쓴다. 배포(dev·prod)에 `DATABASE_URL` 없음 → 라우트 25개 전부 익명·500 |
| 봇 응답 | 있음(ADR-064 · `claude-sonnet-4-6`) | 없음. 이 리포에 LLM 호출·키·SDK 가 하나도 없다 |
| 없는 것 | 반 만들기 · 반 명단 읽기 · 봇↔반 배정(봇 프로필 쓰기 라우트 0) · 교사의 대화 열람 · 위험 신호. 스코프 L1~L5 는 프롬프트 문장으로만 집행되고 출력 검사는 없다 | 잘 만든 것도 있다 — 가드 순서(401→403→400→404→409→410), 참여 트랜잭션 `FOR UPDATE`. **규칙은 A 로 옮겨 간다** — 단 B 의 「남의 반은 404」는 옮기지 않는다, 오류 관례는 A 를 따른다(§ 5) |

B 를 살리려면 결국 pullim-api 에 introspection 을 추가해야 하고, 그러면 DB 가 둘(Aurora classbot 스키마 + 별도 Postgres), LLM 은 여전히 A 에만 있다. 두 곳을 다 고치면서 진실 원본은 둘로 남는 길이다. **그래서 A 가 유일한 정본, B 는 은퇴(2026-09-16).**

## 2. 목표 구조 — 화면 하나, 서버 하나, 문 하나

로그인은 OS 가, 신원 검증과 데이터는 pullim-api 가, 화면은 이 리포가 맡는다. **이 리포 서버는 HTML 을 내는 일 외에 도메인 데이터를 만지지 않는다.**

```
브라우저 ── ① 비로그인 → os.pullim.ai/login?next=… → 복귀 (Set-Cookie pullim-at · HttpOnly · Domain=.pullim.ai)
   │
   ├─ classbot.pullim.ai (Vercel · 이 리포)          Next.js 화면만
   │     RoleGuard ← GET /me 의 role                 교사·학생 레일 분기
   │     hooks/api/* → domainFetch(credentials:include, 쓰기엔 X-CSRF-Token)
   │     app/api/** + Drizzle ─── 은퇴(겹치는 것부터 · FE PR 8)
   │
   └─ ② api.pullim.ai/classbot/* (pullim-api)        JwtVerifyGuard → EntitlementGuard('classbot') → CsrfGuard(쓰기)
         operator = classes.operator_id === sub · 남의 반은 403 · 남의 봇·신호는 404 (ADR-091)
         있음: bots · enrollments · join-codes · assignments · questions · targets · submit · submissions · chat(SSE) · interventions
         새로: classes POST · members · bots↔class · chat 교사 열람 · signals
         LLM 오케스트레이션 · 토큰 사용량 · rate-limit · v1 위험 감지 훅(메시지 저장 직후 · 규칙)
         Aurora classbot 스키마: classes · class_memberships · join_codes · messages · assignments · questions · submissions
                                 + bots · classes.bot_id · messages.bot_id · risk_signals · join_codes.expires_at
```

① 비로그인 화면은 OS 로그인으로 보내고 `next` 로 돌아온다 · ② 화면은 `/classbot/*` 만 부른다(쿠키 자동 첨부) · ③ 쿠키는 브라우저가 들고 있을 뿐, 화면 코드는 읽지 못하고 `/me` 로 역할만 안다.

**route handler 은퇴 범위** — 결정 ① 그대로. 겹치는 계열(반·봇·챗·과제)의 라우트·표·시드·목 파일·스토어 persist 가 FE PR 8 에서 걷힌다. 범위 밖(`/api/me/consents/*` · `/api/me/self-bots/*` · `/api/me/study-days/*` · `/api/parent/*` · `/api/marketplace/*` · `/api/wellness`)은 남되 「로컬 전용」이다 — 배포에서는 지금처럼 익명 401 이다. `lib/current-user.ts` 는 범위 밖 라우트의 참조가 0 이 되는 시점에 걷는다.

## 3. 신원과 역할 — OS 가 주는 것만 믿는다

OS 토큰에는 `student`·`teacher` 가 없다. 역할은 `/me` 가 주고, 데이터 권한은 pullim-api 가 「이 반의 operator 인가」로 판단한다. **화면의 RoleGuard 는 길 안내이고 자물쇠는 서버다.**

| `/me` 응답 | 화면 역할 | 홈 | 레일 |
|---|---|---|---|
| `role=teacher` | teacher | `/teacher` | 홈 · 내 수업방 · 내 클래스봇 · 모니터 · 봇 관리 · 봇 마켓 · 낸 과제 · 채점 · 리포트 |
| `role=student` | student | `/classbot` | 홈 · 내 수업방 ▾ 봇 대화 · 받은 과제 · 담은 봇 · 봇 마켓 · 학습 기록 · 소개 |
| `role=parent` · `institution` | 지금: student 로 내림 → **바꾼 뒤: 그대로 돌려준다** | — | 이번 범위 밖. 학생으로 위장시키지 않고 「클래스봇은 학생·교사용」 **안내 페이지 한 장**으로 세운다 |
| `globalRole=admin` | admin → 교사 홈 | `/teacher` | 현행 유지(`packages/auth/src/routes.ts:24`) |
| 401(비로그인) | — | OS 로그인 | **코어 화면은 통과시키지 않는다.** 소개(`/classbot/onboarding`)·랜딩만 공개 |

**바꾸는 파일 넷 (FE PR 4)**
- `components/features/auth/role-guard.tsx` — 비로그인 통과 분기를 **공개 경로 목록**으로 바꾼다. 코어 경로는 `redirectToOsLogin()`.
- `lib/auth/os-sso-provider.ts:43` — `mapRole` 의 「그 외 전부 student」를 걷고 `parent`·`institution` 을 별도 값으로 돌려준다.
- `lib/current-user.ts` — 서버 해석기는 더 이상 도메인 라우트에 쓰이지 않는다. 개발 쿠키 경로는 은퇴(FE PR 8 · 참조 0 조건).
- `packages/types` `UserRole` — **이번엔 건드리지 않는다.** 학부모를 실제로 열 때만 필요하고, 그건 별건 승인이다.

**OS 쪽에서 확인한 것 (pullim-fe/apps/web)**: 로그인은 이메일+비밀번호 하나(카카오·네이버는 주석). 제품 역할은 가입 2단계에서 학생·학부모·교사 중 고르고 뒤에 못 바꾼다. 기관은 관리자가 준다. OS 에는 역할별 홈이 없다 — 전원 `/os` 한 화면이고 역할은 레인 순서와 카피만 바꾼다. 그래서 「역할대로 다른 화면」은 **전적으로 클래스봇 몫**이다. 복귀 `next` 는 `https://*.pullim.ai` **포트 없는 주소만** 허용한다 → Vercel 미리보기(`*.vercel.app`)는 SSO 복귀 대상이 될 수 없고, dev 검증은 `dev-classbot.pullim.ai` 에서만 된다.

**로컬 개발이 바뀐다**: 지금은 개발 쿠키로 「나는 teacher_001」이라 선언하면 로컬 DB 가 답했다. A 세계에서는 로컬도 pullim-api 를 세워야 한다 — 기본값이 이미 `os.pullim.local:3001` · `api.pullim.local:3000` 을 가리킨다. 시드 신원 다섯(서연·민준·김수학·박영어·어머니)은 OS 로컬 계정으로 옮긴다. 쿠키가 `.pullim.local` 에만 오므로 `/etc/hosts` 에 `classbot.pullim.local` 을 넣고 그 호스트로 연다([런북 § 5-1](../plan/2026-07-01_classbot-sso-dev-deploy-runbook.md)). e2e 의 `localhost:3032` 기본값도 같이 바뀐다(해소 6).

## 4. DB — pullim-api classbot 스키마, 표 셋을 더한다

과제 축은 이미 완성돼 있고, 반·명단·대화 표도 있다. 새로 필요한 것은 **봇을 반에서 떼어 내는 표, 위험 신호를 세는 표, 코드 만료 한 칸**이다. id 는 전부 uuid(앱 생성)이고 사용자 참조는 OS `sub` 를 FK 없이 담는다(ADR-054). 정본 표 서술은 [`data-model.md`](../../../pullim-api/docs/design/services/classbot/data-model.md) 가 소유하고, 여기는 이번 변경분만 적는다.

| 테이블 | 지금 | 이번에 | 쓰는 요구 | 비고 |
|---|---|---|---|---|
| `classes` | 있음 | **+ `bot_id`** (nullable) · **+ `subject` · `grade`** (nullable) | R1 R4 | `operator_id` = 교사 sub. 지금은 반이 곧 봇(ADR-063 「bot == classes 행 재사용」 → **ADR-091 `[예정]`** 이 갈라낸다). 봇은 선택이라 **반이 과목·학년을 스스로 든다** — 봇 없는 반도 서고, 봇을 갈아도 반의 과목·학년은 남는다 |
| `bots` | 없음 | **새 표** | R4 R5 | `id` · `operator_id` · `name` · `subject` · `grade` · `tone` · `greeting` · `scope`(1~5) · `avatar_emoji` · `quick_prompts` · `is_published` · `created_at`. `class_bot_profiles` 의 칸이 여기로 옮겨 온다(결정 ③) |
| `class_bot_profiles` | 있음(반과 1:1) | **`bots` 로 흡수** | — | 챗 프롬프트 빌더가 이 표를 읽는다. 이 표·`bot_settings`·`bot_curriculum_units` 를 만들거나 고치는 라우트는 하나도 없다 — 봇 빌더가 붙을 자리가 통째로 비어 있다 |
| `class_memberships` | 있음 | 그대로 | R2 R3 | `uq(class_id, member_id)` · `is_active`. 읽는 라우트만 없다 |
| `join_codes` | 있음 | **+ `expires_at`** | R1 R2 | [03 § 4.3](03-features-and-ia.md) 「코드는 언제까지 사나 — 만료 `[예정]`」 그대로: 기본 +48h, NULL 이면 안 닫힘. 판정은 참여 트랜잭션 안 |
| `messages` | 있음 | **+ `bot_id`** (nullable) | R5 모니터링 | `class_id` · `student_id` · `role('user'/'assistant')` · `content` · `card` · `token_usage`. 반 단위로 긁을 키가 이미 있다. 봇을 교체(③)해도 한 반 기록에 두 봇이 섞이지 않게 **보낸 시점의 봇**을 적는다 |
| `risk_signals` | 없음 | **새 표** | 모니터링 | `id` · `class_id` · `student_id` · `message_id?` · `kind` · `severity`(1~5) · `detail` jsonb · `created_at` · `acked_by?` · `acked_at?`. `kind` 는 [05 § 3](05-business-rules.md) 여섯 종 + `crisis_keyword` |
| `assignments` | 있음 | 그대로 | R6 R7 R11 | `class_id` 가 있다 — 이 리포 스키마와 달리 **반에 붙어 있다** |
| `assignment_questions` | 있음 | 그대로 | R6 R8 | 정규화 표(`order` · `type` · `prompt` · `options` · `answer_key` · `auto_gradable`). FE 가 문항을 여기까지 보내기만 하면 된다 |
| `assignment_targets` | 있음 | 그대로 | R6 | 행이 없으면 반 전체 |
| `submissions` | 있음 | 그대로 | R9 R10 | `uq(assignment_id, student_id)` · `answers` jsonb · `score_percent` · `graded_at` |
| `interventions` | 있음 | 그대로 | 모니터링 | remind · requiz · comment · crisis. `crisis` 는 pullim-api `intervention.service.ts:27` 의 `INTERVENTION_TYPES` 에 이미 있어 **교사의 수동 발송(POST)은 된다.** 없는 것은 **감지에서 자동 생성**하는 경로다(§ 7 · PR 3) |

**마이그레이션**: classbot 13표는 베이스라인 `InitSchema` 안에 있고 전용 파일은 0개다 — PR 1 이 **새 마이그레이션 파일 하나** + `class_bot_profiles → bots` 데이터 이행 + `PersonaInput` 로더 조인 교체를 진다. 엔티티·리포지토리만, 라우트 없음.

**이 리포의 Drizzle 31표는**: 반·봇·챗·과제 계열은 A 와 겹치므로 은퇴(결정 ①). 학부모·동의·담은 봇·자기주도·마켓 계열은 범위 밖 — 손대지 않는다. 라이브·리플레이·채점·웰빙·리포트 계열은 어차피 어느 라우트도 안 쓴다.

**옮겨 갈 규칙 (B 에서 잘 만든 것)**: 참여 트랜잭션에서 코드 행을 `FOR UPDATE` 로 잠근 뒤 만료·중복을 판정한다 · **재발급은 갈아 끼우기** — 옛 코드 삭제와 새 발급을 한 트랜잭션에 묶어 반 하나에 살아 있는 코드는 늘 하나다(`app/api/teacher/classrooms/[id]/join-codes/route.ts:4-6` · pullim-api 의 `createJoinCode()` 는 지금 저장만 한다) · 시드는 멱등하게(공식 봇 셋 포함 — [03 § 4.13.1](03-features-and-ia.md)).

## 5. API — 있는 문 열둘, 새 문 여섯

경로는 모두 `api.pullim.ai/classbot/*`. 읽기는 Jwt+Entitlement, 쓰기는 +CSRF. 「operator」는 그 반의 `operator_id` 와 `sub` 가 같은 교사다. 요청/응답 계약은 [`api.md`](../../../pullim-api/docs/design/services/classbot/api.md), 접근 술어는 [`authz.md § 1.5`](../../../pullim-api/docs/design/services/classbot/authz.md) 가 소유한다 — 여기는 요구 ↔ 문의 대응만 적는다.

| 요구 | 메서드 · 경로 | 상태 | 누가 | 메모 |
|---|---|---|---|---|
| R1 | `POST /classes` | **새로** | 교사 | 이름·과목·학년(+`bot_id` 선택) → 반 생성 + 첫 참여 코드 발급. `api.md § 1` 에 설계는 있으나(「후속 구현」) **코드 라우트가 없다** — 반은 시드·수동 삽입으로만 생긴다(`ClassEntity` 를 참조하는 곳은 전부 읽기 — INSERT 없음). 가장 큰 구멍 |
| R1 | `POST /classes/:id/join-codes` | 있음 | operator | `expires_at` 채우기 + **재발급 시 옛 코드 삭제 규칙을 옮겨 온다.** pullim-api `createJoinCode()` 는 저장만 한다 — 「반 하나에 살아 있는 코드는 하나」는 이 리포 B 세계의 규칙(`app/api/teacher/classrooms/[id]/join-codes/route.ts:4-6`)이라 § 4 「옮겨 갈 규칙」에 든다(PR 2) |
| R1 R11 | `GET /bots?role=teacher` | 있음(뜻 바뀜) | 교사 | 지금은 「내 반 = 내 봇」 목록. `bots` 표가 생기면 `GET /classes?role=teacher` 로 갈라 낸다 |
| R2 | `POST /enrollments {code}` | 있음 | 학생 | L0 예외(멤버십 전제 없음) · **만료 판정 추가 → 410** |
| R2 | `GET /bots?role=student` | 있음 | 학생 | 내가 든 반(과 그 봇) 목록 |
| R3 | `GET /classes/:id/members` | **새로** | operator | `class_memberships` + 표시명(해소 5 — `ProfileProjectionInterface` 읽기 전용 투영 포트 · `auth.*` 직접 SELECT/JOIN 금지 · FK 없음) · 최근 활동(마지막 메시지·제출 시각) |
| R4 | `POST /bots` · `PATCH /bots/:id` | **새로** | 교사 | 봇을 반과 따로 만들고 고친다(빌더·봇 관리 화면의 정본) |
| R4 | `PUT /classes/:id/bot {botId}` | **새로** | operator | 할당·교체. 봇의 operator 와 반의 operator 가 같아야 한다(B 세계 `join_codes` 복합 FK 규칙을 옮김 — [2026-07-03 amendment § 1](2026-07-03_be-api-m2-amendment.md)) |
| R5 | `POST /classes/:id/chat` (SSE) | 있음 | 멤버 | 진짜 LLM. 시스템 프롬프트는 class + `class_bot_profiles` 에서 합성(`system-prompt.builder.ts`). `bots` 표로 옮기면 `PersonaInput` 로더의 조인만 바뀐다 |
| R5 | `GET /classes/:id/chat?limit=` | 있음 | 학생 본인 | 내 기록만 |
| 모니터 | `GET /classes/:id/chat?studentId=…` *(`[2026-09-17 정정]` — 종전 `?student=` · PR 3 브랜치 실물 `chat.controller.ts` 는 `studentId`)* | **새로** | operator | 학생별 대화 열람. **`authz.md` 개정 필요** — 지금 문서는 「읽을 수 있는 사람 = 학생 본인뿐 · 교사 열람은 이 카드 범위 밖」(§ 1.5 📌). [05 § 11.3](05-business-rules.md) |
| 모니터 | `GET /classes/:id/signals` · `PATCH /signals/:id/ack` | **새로** | operator | 학생별 신호 집계 + 원문 위치. 감지 훅은 챗 저장 직후 동기 실행(§ 7) |
| R6 | `POST /classes/:id/assignments` | 있음 | operator | 본문에 `questions[]` 를 실어 `assignment_questions` 까지 한 트랜잭션. FE 가 지금 안 보내고 있을 뿐 |
| R7 | `GET /assignments?audience=student` | 있음 | 멤버 | 술어: 현재 멤버 AND (타겟 없음 OR 본인 타겟) |
| R8 | `GET /assignments/:id` | 있음 | 멤버 | 문항 포함. 학생 응답에 `answer_key` 미노출 |
| R9 | `POST /assignments/:id/submit` | 있음 | 멤버 | upsert (assignment, student) |
| R10 | `GET /assignments/:id/submissions` | 있음 | operator | 제출 현황 · 점수 |
| R11 | `GET /assignments?audience=teacher` | 있음(반 필터 없음) | operator | 내가 operator 인 모든 반의 과제를 합쳐 준다(기준은 `created_by` 가 아니라 현재 operator). 반 상세 탭용으로 **`&classId=` 한 칸**을 DTO 에 더한다 |

**가드 순서는 B 세계에서 옮겨 오되, 오류 관례는 pullim-api 를 따른다(ADR-091)**: 401(신원 없음) → 403(권한 없음 — **남의 반 = operator 불일치는 403**, pullim-api 기존 관례) → 400(본문) → 404(없는 자원 — **남의 봇 · 남의 신호는 404**) → 409(중복) → 410(닫힌 코드). *(정정)* 이 리포 route handler 의 「남의 반은 404」(`app/api/_lib/guards.ts`)는 **옮기지 않는다** — 정본이 이미 `CLASS_OPERATOR_FORBIDDEN` 403 으로 서 있고(`MEMBER_FORBIDDEN` 은 멤버십 불일치 쪽 — 둘 다 403)([`authz.md`](../../../pullim-api/docs/design/services/classbot/authz.md) § 1.5), 한 표면에 두 관례를 두지 않는다.

## 6. 화면 — 반이 척추가 된다

교사에게는 **반 상세 한 장**(명단 · 봇 · 과제 · 대화)이 생기고, 학생에게는 「봇 대화」가 「내 수업방」 아래로 들어간다. 데이터층은 zustand persist 에서 서버 캐시로 옮기고, **목 폴백은 걷는다.**

### 6.1 학생 레일 (결정 ④ · 확정)

```
지금 (nav-config.ts:65–88)          바꾼 뒤
풀림 클래스봇                       풀림 클래스봇
  홈                                  홈
  내 수업방                           내 수업방
  담은 봇                               └ 봇 대화        /classbot/chat (matchPrefix)
  봇 마켓                             받은 과제
  받은 과제                           담은 봇
  봇 대화                             봇 마켓
  학습 기록                           학습 기록
  소개                                소개
```

`NavSubItem` 에 `children` 한 단계를 더하고 `app-sidebar.tsx`·`mobile-drawer.tsx` 가 그것을 들여쓰기로 그린다. `href` 는 `/classbot/chat` 그대로(봇 전환은 화면 안), 활성 판정은 `matchPrefix`. 「받은 과제」를 수업방 바로 뒤로 올리는 것은 덤 — **반에서 나오는 것 둘이 붙는다.** `nav-config.test.ts:47` 의 flatMap 은 지금 도메인 → 항목 한 단계만 훑으므로 중첩 항목까지 넓힌다. 셸 변경 승인은 2026-09-16 이 문서로 났고, PR 0 이 [`apps/classbot/CLAUDE.md` § 5](../../apps/classbot/CLAUDE.md) 에 옮겨 적는다. **인도: FE PR 5.**

### 6.2 화면 표

| 화면 | 지금 | 바꾼 뒤 | 걷는 것 | 인도 |
|---|---|---|---|---|
| 교사 · 내 수업방 `/teacher/classroom` | 반 카드 + 코드 + 명단(서버) | 카드에 **봇 칸**(할당·교체) · 남은 코드 시간 · 「자세히」 → 반 상세 | 반 만들 때 봇 자동 생성 | FE PR 5 |
| 교사 · **반 상세** `/teacher/classroom/[id]` (새 화면) | 없음 — 제출 현황·개입은 `/teacher/classbot` 에 얹혀 있음 | **탭 넷**: 명단(R3) · 봇(R4) · 과제(R11 → R10) · 대화(학생별 기록 + 신호 배지) | `/teacher/monitor` 의 목 관제소(`lib/mock/classbot-monitoring`)는 「대화」 탭이 대신한다 | 껍데기·명단·봇 = FE PR 5 · 과제 = PR 6 · 대화 = PR 7 |
| 교사 · 봇 관리 / 빌더 `/teacher/bots` · `/teacher/builder` | 목 카탈로그 `cb_001~005`(`lib/mock/classbot.ts`) | `GET/POST/PATCH /bots` 정본 · 만든 뒤 화면에서 「반에 붙이기」 | `lib/mock/classbot.ts` 카탈로그 | FE PR 5 |
| 학생 · 내 수업방 `/classbot/classroom` | 코드 입력(서버) + 실패 시 목 참여 | 실패는 실패로 보인다 — 「없는 코드」(404)와 「닫힌 코드」(410)를 갈라 말한다 | `join-code-form.tsx:88` 목 폴백 · `pullim-class-enrollment` persist | FE PR 5 |
| 학생 · 봇 대화 `/classbot/chat` | 목 응답 + POST 저장 | **SSE 한 레인** · 기록은 `GET …/chat` · **선택 단위는 반**(해소 3 — `useStudentBots` 의 봇 id 병합을 반 목록으로) · 상단 고지 **「선생님이 이 대화를 볼 수 있어요」** | `pickClassbotReply` · 900ms 가짜 지연 · `USE_REAL_CORE_BE` 분기 | FE PR 5 |
| 교사 · 과제 내기 `/teacher/assignment/new` | 메타는 서버, 문항은 버림, 로컬에도 씀 | 문항까지 한 요청 · 대상 반은 반 상세에서 진입한 그 반 | `dispatch(a)` 로컬 쓰기 · 시드 문항 폴백 | FE PR 6 |
| 학생 · 받은 과제 → 풀이 → 제출 → 결과 | 목록만 서버, 문항 로컬, 제출 로컬 | **넷 다 서버.** 결과는 `submissions` 의 점수 | `pullim-assignments` persist · `useMergedAssignments` | FE PR 6 |
| 교사 · 낸 과제 / 과제 상세 `/teacher/assignment` · `/[id]` | 스토어 + 목 | `useTeacherAssignments`(있음, 소비자 0)를 드디어 부른다 · 상세는 `/submissions` | `allGradingItems` 목 | FE PR 6 |
| 교사 · 반 상세 「대화」 탭 | — | 학생별 기록 뷰어(`teacher/students/[id]/transcript-viewer.tsx` 골격 재사용) · 신호 배지·확인 | 관제소 목 표 | FE PR 7 |
| 데이터층 `hooks/api/*` | 같은 오리진 `/api/*` | 훅 이름은 유지, URL 만 `domainFetch` 로. 401 은 로그인 유도 | 플래그 둘(`USE_REAL_CORE_BE` · `NEXT_PUBLIC_OS_SSO`) · `read-fetch.ts` 의 항상-null 토큰 게이트 | FE PR 4(있는 문) · PR 5(새 문) |

**고지 문구**(학생 · 봇 대화 상단): 「선생님이 이 대화를 볼 수 있어요」 — 학생 화면 카피 규칙([07](07-branding.md))대로 한자어 없이. **학생이 그 화면을 보는 시점에 이미 떠 있어야 한다** — 교사 열람이 서버 인가로 열리는 pullim-api PR 3 보다 늦지 않게 FE PR 5 가 싣는다.

## 7. 위험 신호와 이상 징후 — 1차는 규칙으로 센다

지금 리포에 **실제 문장을 보는 감지기는 하나도 없다.** `crisisKeywords` 배열(`lib/mock/classbot.ts`)은 아무도 import 하지 않고, 이탈 횟수는 학생 id → 숫자 표다. [05 § 3](05-business-rules.md) 의 여섯 종 가운데 **모델 없이 셀 수 있는 다섯을 1차로**, 임베딩이 필요한 주제 이탈은 2차로 둔다(결정 ⑤).

| 종류 (05 § 3) | 1차 규칙 (pullim-api 챗 훅) | 세기 | 교사에게 | 차수 |
|---|---|---|---|---|
| 답베끼기 | 「답 알려줘」류 정규식 + 같은 문항 번호 반복 요청 | 2 | 즉시 신호 | 1차 |
| 부적절 질문 · 위기 키워드 | [13 § 5.2](13-reports-and-emotion-checkin.md) 키워드 게이트(자살·자해 5단계 / 우울 3단계 / 학교폭력) | 3~5 | 즉시 · **4 이상은 `interventions.crisis` 자동 생성** | 1차 |
| 반복 우회 | 정규화한 문장이 3회 이상 같음 | 2 | 즉시 | 1차 |
| 무의미 입력 | 길이 < 3 또는 문자 엔트로피 낮음, 3회 누적 | 1 | 누적 시 | 1차 |
| 장시간 무활동 | 저장 시각 간격 > 10분(조회 시 계산 · 표 없음) | 1 | 명단 「최근 활동」 열 | 1차 |
| 주제 이탈 | 임베딩 유사도 < 0.6 — LLM 게이트웨이 비용 축 | 1~2 | 누적 3회 | **2차** |
| 강도 설정(관대·보통·엄격) | 임계치 배수 — `bots.settings` | — | 봇 설정 탭 | **2차** |

**어디서 도나**: pullim-api 챗 모듈에는 이미 `SCOPE_GUARDRAILS`(L1~L5 주제 범위·힌트 상한·「어떤 등급에서도 최종 답 금지」)가 있다 — 그러나 전부 프롬프트 문장이고, 들어온 문장이나 나간 문장을 검사하는 코드는 없다. 감지는 그 옆에 새로 선다: **학생 메시지를 `messages` 에 저장한 직후, 같은 트랜잭션 밖에서 동기 규칙을 돌려 `risk_signals` 에 쓴다.** LLM 응답과는 무관하게 돈다 — 응답이 실패해도 신호는 남는다. 인도: pullim-api PR 3.

**교사가 보는 것**: 반 상세 「대화」 탭 — 학생 줄마다 신호 배지(종류·개수), 누르면 원문 위치로 점프. 「확인함」 한 번이면 배지가 가라앉는다(`acked_at`). 학급 관제소의 목 표는 이것으로 대체(FE PR 7).

## 8. PR 순서 — 문서 먼저, BE 와 FE 는 섞지 않고, 전부 dev 로

리포 최상위 규칙 둘을 지킨다. pullim-api 쪽 PR 은 **그 리포의 `dev`** 로 올라가고 릴리스 오너의 dev→main 승격을 탄다. 「←」는 「먼저 머지돼야」다.

| PR | 리포 · 층 | 내용 | ← 의존 | 메모 | 상태 (2026-09-17 04:00 KST) |
|---|---|---|---|---|---|
| **PR 0** | docs · 두 리포 | 이 문서 + [03 § 2.1·§ 2.2·§ 2.3](03-features-and-ia.md) · [05 § 3·§ 11.1·§ 11.2·§ 11.3](05-business-rules.md) · [2026-07-03 amendment](2026-07-03_be-api-m2-amendment.md) 「bots 분리」 · [`apps/classbot/CLAUDE.md` § 5](../../apps/classbot/CLAUDE.md) 승인 기록 · 루트 `CLAUDE.md` § 1·§ 2 BE 절. pullim-api: `authz.md` 교사 대화 열람 · `data-model.md` `bots`·`risk_signals` | — | **코드 무변경.** 리뷰가 base 스펙을 보므로 맨 앞 | 이 리포 **#349 머지**(2026-09-16). pullim-api 쪽은 로컬 브랜치 `docs/classbot-classroom-spine` `50d04e20`(ADR-091) — 푸시·PR 대기(소유자) |
| **PR 1** | pullim-api · schema | `bots` · `classes.bot_id` · `messages.bot_id` · `risk_signals` · `join_codes.expires_at` — 마이그레이션 파일 하나 + `class_bot_profiles → bots` 이행 + `PersonaInput` 로더 조인 교체. 엔티티·리포지토리만 | PR 0 | 라우트 없음 | 로컬 `feat/classbot-bots-schema` `c4a5c685`(엔티티 + `uq_risk_signals_message_kind`) · `origin/dev` `97e0d624` 위 — PR 0 문서 브랜치 `50d04e20` 과 **형제** · 세션 리뷰 「푸시 가능」 · `pnpm migration:generate ClassbotBotsAndRiskSignals` 는 승인 뒤 같은 PR |
| **PR 2** | pullim-api · routes A | `POST /classes` · `GET /classes/:id/members` · `POST/PATCH /bots` · `PUT /classes/:id/bot` · 참여 만료 410 · 재발급 시 옛 코드 삭제 · `GET /assignments?audience=teacher&classId=` | PR 1 | 가드 순서는 B 에서 옮기되 오류 관례는 pullim-api(남의 반 403 · 남의 봇·신호 404 — ADR-091). 단위 테스트 필수 | 로컬 `feat/classbot-classroom-doors` `6ce7bfd2` · 리뷰 반영 · 세션 리뷰 「푸시 가능」 · PR 1(`c4a5c685`) 위에 쌓임 |
| **PR 3** | pullim-api · routes B | `GET /classes/:id/chat?studentId=`(operator) *(`[2026-09-17 정정]` — 종전 `?student=` · 브랜치 실물 `chat.controller.ts` 는 `studentId`)* · `GET /classes/:id/signals` · `PATCH /signals/:id/ack` · 챗 저장 훅에 규칙 다섯 · 과제 본문 `questions[]` 수용 확인 | PR 1 | PR 2 와 병렬(계획) | 로컬 `feat/classbot-monitoring-doors` `00acb39e` · 세션 리뷰 3회 반영 · 세션 리뷰 「푸시 가능」 · **PR 2(`6ce7bfd2`) 위에 쌓임 — 브랜치 실물은 직렬**, 병렬로 두려면 ② 위로 rebase *(`[2026-09-17 정정]` — 종전 「PR 1 위에 쌓임」은 부모 SHA 와 다르다)* |
| **PR 4-ci** | classbot · ci | prod-verify 를 두 레인으로(해소 1) | PR 0 | **PR 4 보다 먼저** — 아니면 PR 4 가 prod-verify 를 빨갛게 만든다. 워크플로 편집 승인 2026-09-16 | **#348 머지**(2026-09-16 20:03 KST) |
| **PR 4** | classbot · FE 신원 | RoleGuard 공개 경로 목록 · `mapRole` 정리 · 안내 한 장(학부모·기관) · 플래그 둘 제거 · **이미 pullim-api 에 있는 문**의 훅만 `domainFetch` 로(과제 목록·상세·제출·참여·내 반·챗) | PR 0 · PR 4-ci | e2e: 게이트 화면 「로그인 안내」로. 반 만들기·명단·봇 할당 훅은 PR 5(해소 7) | **#350 머지**(2026-09-16 20:25 KST) |
| **PR 5a** *(`[2026-09-17 정정]` — 종전 한 행 「PR 5 · FE 수업방 · `/teacher/classroom/[id]` 탭 넷의 껍데기와 명단·봇 탭 · 반 카드 봇 칸 · 반·명단·봇 할당 훅 · **학생 레일 중첩** · 챗은 반을 고른다 · SSE 한 레인 + 기록 + 고지 · 목 참여 폴백 제거 ← PR 2 · PR 4」 를 5a·5b·5c 로 갈랐다)* | classbot · FE 수업방 (1/2) | **학생 레일 중첩**(「봇 대화」는 「내 수업방」 아래) · 챗 단위 = 반(선택기·기록·전송) + 고지 「선생님이 이 대화를 볼 수 있어요」 · 교사 반 목록·상세(`/teacher/classroom/[id]`)는 정본을 읽는다 — 같은 오리진 명단 칸은 내렸다(5b 가 새 DTO 로 다시) · 봇 마켓 공유 칸은 `/teacher/marketplace` 「내 봇 공유」 절로 | PR 4 | 셸 변경 승인 2026-09-16. pullim-api 새 문 없이 되는 몫만 | **#351 머지**(2026-09-17 03:39 KST) |
| **PR 5b** | classbot · FE 수업방 (2/2) | 반 만들기(`POST /classes`) 열기 · 반 상세 명단·봇 탭(`GET /classes/:id/members` · 해소 5 표시명 투영) · 봇 할당/교체(`PUT /classes/:id/bot`) · 반 카드 봇 칸 · 참여 코드 만료 표시(410) · 봇 관리/빌더를 pullim-api `bots` 로 · 목 참여 폴백 제거 | PR 2(dev-api 에 들어간 뒤) · PR 5a | 종전 PR 5 의 나머지 | 대기 |
| **PR 5c** | classbot · FE 교사 개입 | 리마인드·코멘트 되살리기 — #352 가 로컬 제출 레인과 그 위의 리마인드 버튼·제출 현황 시트(`remind-button.tsx` · `submission-status-sheet.tsx`)를 걷었으므로, pullim-api `POST /classes/:classId/interventions`(**있는 문** — [`api.md`](../../../pullim-api/docs/design/services/classbot/api.md) 개입 절) + 정본 명단 위에서 다시 세운다 · 학생 인박스 `GET /interventions?audience=student` | PR 5b | 학생 카피는 한자어 없이 | 대기 |
| **PR 6** | classbot · FE 과제 | 과제 내기에 `questions[]` · 풀이는 서버 문항 · 제출은 `/submit` · 결과는 점수 · 교사 목록은 `useTeacherAssignments` · 상세는 `/submissions` · `pullim-assignments` persist 은퇴 | PR 3 · PR 4 | e2e: baseURL `classbot.pullim.local` + 로그인 픽스처 + 실API 시드 — test 블록 41(sso 제외)의 전환은 **별도 스펙 트랙**(해소 6 · 아래 「e2e 트랙」 행) | **#352 머지**(2026-09-17 03:50 KST · squash `1a14886`). PR 3 보다 먼저 들어갔다 — `questions[]` 수용은 있는 문 위에서 됐다 |
| **PR 7** | classbot · FE 모니터링 | 반 상세 「대화」 탭 · 학생별 기록 뷰어 · 신호 배지·확인 · 관제소 목 표 은퇴 | PR 3(dev-api 에 들어간 뒤) · PR 5a *(`[2026-09-17 정정]` — 종전 「PR 3 · PR 5」)* | — | 대기 |
| **PR 8** | classbot · 정리 | B 세계 은퇴 — 겹치는 `app/api/**` 라우트 · Drizzle 표 · 시드 · 개발 쿠키 경로 · `lib/mock` 반·봇·챗·과제 파일 · 스토어 persist. 범위 밖 계열은 남긴다 | PR 5b · 5c · 6 · 7 *(`[2026-09-17 정정]` — 종전 「PR 5 · 6 · 7」)* | **맨 마지막** | 대기 |
| **e2e 트랙** | classbot · e2e | `mixed-role-pending` 다섯 스펙(`assignment-dispatch` · `color-palette` · `feedback-loop` · `mobile-and-focus` · `student-live-and-flows`) 재작성 + 로그인 픽스처(`tests/e2e/auth.setup.ts`) — PR 6 메모의 「별도 스펙 트랙」 | GitHub secrets `E2E_OS_{STUDENT,TEACHER}_{EMAIL,PASSWORD}` | 시크릿이 없으면 로그인 레인이 건너뛴다(`HAS_E2E_*`) | 대기 · 시크릿 미등록 |

```
PR 0✓ ─┬─→ PR 1 ─┬─→ PR 2 ─→ PR 5b ─→ PR 5c ─┐     ✓ = dev 머지(2026-09-17 04:00 KST)
       │         └─→ PR 3 ─→ PR 7 ───────────┼─→ PR 8     PR 0✓ 는 이 리포 몫(#349)만 — pullim-api 문서 몫 50d04e20 은 미푸시(PR 1 의 앞은 아직 안 열렸다)
       └─→ PR 4-ci✓ ─→ PR 4✓ ─┬─→ PR 5a✓     │     교차 의존(선 생략): PR 5b ← PR 5a · PR 7 ← PR 5a · PR 6 ← PR 3
                              └─→ PR 6✓ ─────┘
```
*(`[2026-09-17 정정]` — 종전 그림은 PR 5 한 칸이었다. 5a·5b·5c 로 가른 뒤의 그림. PR 6 은 PR 3 이 dev-api 에 들어가기 전에 #352 로 머지됐다 — `questions[]` 수용은 있는 문 위에서 됐고, 표의 「← PR 3」 은 감지 훅 몫으로 남는다)*

상태 열의 「세션 리뷰」 = 이 세션(session_01V1F4LGiFNG6JjYBpiDx32G)의 에이전트 리뷰 판정이다. pullim-api 에 PR 이 없어 두 리포 어디에도 리뷰 코멘트 기록이 없다 — 여기 적힌 것이 유일한 기록이고, 소유자가 PR 을 열면 그 PR 의 리뷰가 이것을 대신한다. pullim-api 브랜치 실물(부모 SHA · 2026-09-17 실측): `origin/dev` `97e0d624` ─┬ `50d04e20`(PR 0 문서) · └ `c4a5c685`(PR 1) → `6ce7bfd2`(PR 2) → `00acb39e`(PR 3).

## 9. 사람 액션 — 코드 밖에서 해야 할 것

2026-09-17 04:00 KST 기준 **전부 미완**이다. 코드가 먼저 막히는 순서로 위에 둔다.

- **pullim-api 푸시 + PR 넷, 순서대로** — 로컬 브랜치 넷은 세션 리뷰를 지나 「푸시 가능」인데 `origin/` ref 가 없다. 브랜치마다 `git push -u origin <branch>` 뒤 `gh pr create --base dev …`: ① `docs/classbot-classroom-spine`(PR 0 · ADR-091) ② `feat/classbot-bots-schema`(PR 1) ③ `feat/classbot-classroom-doors`(PR 2) ④ `feat/classbot-monitoring-doors`(PR 3). ①·② 는 `origin/dev` `97e0d624` 위의 **형제**, ③ 은 ② 위, ④ 는 **③ 위** — base 는 넷 다 그 리포 `dev`, **머지 순서는 ② → ③ → ④**(④ 의 diff 에는 ③ 이 머지되기 전까지 ③ 의 변경이 함께 실린다. ③·④ 를 병렬로 하려면 ④ 를 ② 위로 rebase 한 뒤 푸시) *(`[2026-09-17 정정]` — 종전 「③·④ 는 ② 위에 쌓인다」)*.
- **`pnpm migration:generate ClassbotBotsAndRiskSignals` 승인** — 생성 파일은 ② 와 같은 PR 에 들어간다(§ 4 「마이그레이션 파일 하나」).
- **dev RDS `migration:run` 승인** — ② 가 그 리포 `dev` 에 들어간 뒤. 이것이 없으면 FE PR 5b·7 이 부를 문이 dev-api 에 없다.
- **GitHub secrets** `E2E_OS_STUDENT_EMAIL` · `E2E_OS_STUDENT_PASSWORD` · `E2E_OS_TEACHER_EMAIL` · `E2E_OS_TEACHER_PASSWORD`(선택 `E2E_OS_URL`, 기본 `https://os.pullim.ai`) — 아래 「OS 테스트 계정 시크릿」의 이름. 없으면 `prod-verify.yml` 의 `HAS_E2E_STUDENT`·`HAS_E2E_TEACHER` 가 거짓이라 로그인 레인이 건너뛴다.
- **OS 복귀 허용목록**에 `dev-classbot.pullim.ai` · `classbot.pullim.ai` — 포트 없는 `*.pullim.ai` 규칙이라 미리보기 도메인은 불가([2026-07-01 B-8 핸드오프](../plan/2026-07-01_b8-os-redirect-allowlist-handoff.md)).
- **Vercel env**: `NEXT_PUBLIC_OS_URL` · `NEXT_PUBLIC_OS_API_URL`(dev = `https://dev-api.pullim.ai` · prod = `https://api.pullim.ai`). 지금은 프로젝트에 환경변수가 **하나도 없다**([05 § 11.1](05-business-rules.md) 2026-09-14 실측).
- **pullim-api CORS** 에 두 오리진([런북 § 3-3](../plan/2026-07-01_classbot-sso-dev-deploy-runbook.md)).
- **pullim-api dev→main 승격** 요청 — PR 1·2·3 이 그 리포 `dev` 에 들어간 뒤.
- **dev-os Deployment Protection 우회** — [`2026-07-05_m0-infra-reassessment.md:38`](../plan/2026-07-05_m0-infra-reassessment.md) 「Dev SSO 라이브 검증 — `dev-os` 의 Vercel Deployment Protection 해제/bypass 필요(헤드리스 라운드트립 블로커)」. 런북은 hosts·env 절차(§ 2 · § 5)만 인용한다.
- **OS 테스트 계정 시크릿** — 로그인 레인(PR 4-ci)이 도는 조건.
- 로컬 `/etc/hosts` 에 `classbot.pullim.local`(런북 § 5-1) — 개발자 각자.
