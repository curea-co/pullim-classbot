# 풀림 클래스봇 — auth ↔ 도메인 통합 plan

- 작성일: 2026-06-01
- 브랜치: `feat/auth-login-signup` (워크트리 `/private/tmp/pullim-classbot-auth`)
- 목표: **로그인한 사용자가 도메인의 주체가 되고 그 명의로 기록**되게 배선. 하드코딩 `student_001` 의존 제거.
- 선행: 로그인/회원가입(`auth_users`, NestJS `apps/backend`)은 이미 구현·동작 (plan `2026-05-29_auth-login-signup.md`).

---

## 0. 현 구조 실사 (코드·DB 직접 확인 결과)

### 0.1 인증 (NestJS `apps/backend`, port 4032)
- `auth_users`(uuid PK, role enum **student/teacher/admin**) + `auth_user_providers`(비번/소셜) + `auth_revoked_tokens`(블랙리스트). TypeORM, `synchronize:false`, 마이그레이션 단일 권위.
- JWT access payload = `{ sub, email, role, type:'access', jti }` (`passport-token.provider.ts`). **role 이 토큰 claim 에 이미 포함**.
- 글로벌 `JwtAuthGuard`(`APP_GUARD`) — 기본 전체 보호, `@Public()` 만 예외. signup/login/refresh/check-email 은 Public, logout 은 보호.
- 회원가입 트랜잭션(`signup.use-case.ts`): `AuthUser.create()` + `AuthUserProvider.create()` 를 `dataSource.transaction` 으로 원자 저장. **도메인 users 행은 만들지 않음** ← 갭.

### 0.2 도메인 (Next.js `apps/classbot`, port 3032)
- Drizzle Postgres 스키마(`lib/db/schema.ts`) 24+ 테이블. `users`(id **text** PK, role text {student|teacher|parent}), 다수 도메인 테이블이 `studentId`/`teacherId`/`userId` FK 로 `users.id` 참조.
- **결정적 사실**: 도메인 UI 는 **전부 client-side mock** 으로 동작한다.
  - `app/api/**` route 없음, server action 없음, 런타임 DB write 없음(`grep`: `getDb()`/`import { db }` 사용처 = `lib/db/index.ts` 1곳뿐).
  - 채팅(`chat/page.tsx`)은 메시지를 React `useState` 에 쌓고 `pickClassbotReply`(mock)로 응답. DB 미저장.
  - "현재 사용자" = `lib/mock/persona.ts` 의 `currentPersona`(id `student_001`)를 client 컴포넌트가 직접 import.
  - DB 는 `scripts/seed.ts` 로 mock → DB 시드만 됨(읽기 경로로 미연결).
- `student_001` **문자열 리터럴**은 `lib/mock/*` · `scripts/seed.ts` (데모/시드)에만 존재. 앱 코드는 `currentPersona.id`/`currentPersona.name` 으로 간접 참조.

### 0.3 신원 흐름 (현재)
- FE 인증: `@pullim-classbot/auth` `authService` → `ApiAuthProvider` → JWT claim 에서 `AuthUser{id,email,role}` 파생(`jwt.ts decodeAccessToken`). `AuthProvider`/`useAuth()` 로 노출(`lib/auth/auth-context.tsx`). **layout 에 이미 마운트됨**.
- 도메인 신원: `currentPersona`(student_001) — 인증 세션과 **완전 분리**. 로그인해도 도메인은 항상 서연(student_001).
- DB 실사: `auth_users` 4행 존재하나 그 uuid 에 대응하는 도메인 `users` 행 **0개**(`join` 결과 0). 브릿지 부재 실증됨.

### 0.4 역할/라우팅
- 도메인 라우트 그룹: `app/(student)/*`, `app/(teacher)/*`. 각 layout 은 `AppShell role="student|teacher"`. **role 강제 가드 없음** — URL 직접 진입 시 누구나 교사 화면 접근 가능.
- `components/features/auth/auth-guard.tsx` 존재(로그인 가드). role 가드 여부는 Phase 3 에서 확인·배선.
- `app-header.tsx` ProfileMenu = mock `currentPersona`/`currentTeacher` 기반 데모 역할 전환(실제 세션 무관). 로그아웃은 toast 데모.

---

## 1. 갭 요약

| # | 갭 | 영향 |
|---|---|---|
| G1 | 가입 시 도메인 `users` 행 미생성 | 로그인 사용자가 도메인 FK 주체가 될 수 없음 |
| G2 | 도메인 "현재 사용자" = mock 고정(student_001) | 누가 로그인하든 동일 명의 |
| G3 | role 이 도메인 분기/라우팅에 미연결 | 학생이 교사 화면 접근 가능, 교사 기능 무가드 |
| G4 | 도메인 런타임 write 경로 부재(전부 mock) | "그 명의로 기록"의 물리적 저장 지점이 없음 |

> **G4 정직 경계**: 도메인은 현재 mock-only 다. 이번 작업은 (a) 신원 단일화·프로비저닝(실DB), (b) 도메인 "현재 사용자" 해석을 mock → 세션 기반으로 전환, (c) role 기반 라우팅·가드를 **실제 동작**으로 만든다. 도메인 테이블 전반에 대한 런타임 영속화(chat_messages 등 write API 신설)는 **별도 대형 작업**으로 이 plan 범위 밖 — 단, "그 명의로 기록"을 **실DB 로 실증**하기 위해 **채팅 1개 write 경로**(POST → chat_messages, getCurrentUserId 경유)를 thin slice 로 신설해 다유저 격리를 증명한다. 나머지 도메인은 해석기 전환까지(읽기·표시) 적용.

---

## 2. 통합 아키텍처 (구현 기준)

1. **신원 단일화**: `auth_users.id`(uuid) 가 정본. **가입 시 도메인 `users` 행을 `id = auth_user.id` 로 동일 트랜잭션에 생성**. role 매핑 student→student / teacher→teacher (admin 은 도메인 행 생략, 예약). `student_001` 은 데모 시드로만 잔존.
   - 구현: signup 트랜잭션의 동일 `manager` 로 `users` 테이블에 **raw SQL insert**(TypeORM 은 도메인 테이블을 소유하지 않음 — 비파괴 제약 준수, Drizzle 스키마 무변경). `name`= 가입 이름, `role`= 매핑 role, `profile`= `{}`.
2. **현재 사용자 해석기**(도메인, client): `useCurrentUser()` → `{ id, role, name }`. 세션 있으면 그 사용자, 없으면 `student_001`(student, 서연) 폴백. mock 직접 import(`currentPersona`) 를 대체. (req 기반 `getCurrentUserId(req)` 는 서버 write 경로(2.thin-slice)에서 JWT 헤더 파싱 helper 로 제공.)
3. **쓰기 가드**: 도메인 write(신설 chat thin-slice) 는 인증 필수(세션 없으면 401). 읽기는 데모 폴백 유지.
4. **RBAC 배선**: `role` 을 도메인 학생/교사 분기에 연결. `(teacher)/*` 라우트는 **role=teacher 가드**(아니면 학생 홈 리다이렉트). 교사 전용 진입(봇 빌더·채점·라이브 개설 등)은 교사만. 학생은 `(student)/*`.

---

## 3. Phase 계획 (각 Phase 후 audit 통과해야 다음)

### Phase 1 — 프로비저닝 + 해석기
- **BE**: signup 트랜잭션에 도메인 `users` 행 insert(raw SQL, 동일 manager, role 매핑). idempotent/충돌 안전(이미 있으면 무시). admin 은 생략.
- **FE**: `lib/current-user.ts` — `useCurrentUser()`/`useCurrentUserId()` (세션 우선, student_001 폴백, 폴백 시 mock 서연 메타 사용). 서버 helper `getCurrentUserIdFromRequest(req)`(Authorization Bearer → decode → sub, 없으면 student_001).
- 완료기준: 신규 가입 → `auth_users` + `users` 동일 id 행 동시 존재. 해석기가 세션 id 반환.

### Phase 2 — 하드코딩 → 해석기 교체
- `currentPersona.id`/`.name` 을 "현재 사용자"로 쓰는 앱 코드(페이지·컴포넌트, §0.2)를 `useCurrentUser()` 로 교체.
  - 대상: `(student)/classbot/page.tsx`, `chat/page.tsx`, `wellness/page.tsx`+`check-in-form.tsx`, `assignment/page.tsx`+`[id]/result`+`[id]/solve`, `me/report/page.tsx`, `components/shell/app-header.tsx`, `components/classbot/grading-notification-card.tsx`, `live-overlay.tsx`.
  - `currentPersona` 의 **데모 페르소나 메타**(grade/streak 등 표시값)는 폴백 사용자일 때만 mock 에서, 세션 사용자일 때는 세션 name/role + (있으면) 도메인 profile 사용.
- 완료기준: `grep -rn currentPersona apps/classbot/app apps/classbot/components` → "현재 사용자" 용도 잔존 0(순수 데모 표시 메타는 해석기 경유). `student_001` 리터럴은 mock/seed 외 0.

### Phase 3 — 쓰기 가드 + RBAC
- **RBAC 라우팅**: `(teacher)/layout.tsx` 에 role 가드(세션 role !== teacher → `/` 리다이렉트, 미로그인 → `/login?next=`). `(student)/layout.tsx` 는 교사 세션이면 `/teacher` 권유(또는 허용). `app-header.tsx` 역할 전환을 실제 세션 role 기반으로(교사만 교사뷰).
- **쓰기 가드(thin slice)**: `POST /api/chat`(Next route handler) — `getCurrentUserIdFromRequest` 로 studentId 확정, 세션 없으면 401, chat_messages insert. chat UI 의 send 가 이 경로로 본인 명의 저장. (교사 전용 mutation thin-slice 가 마땅찮으면 라우팅 가드로 교사 전용 보장 + plan 에 사유.)
- 완료기준: 학생 세션 교사 라우트 접근 차단. write 가 세션 user_id 로 저장. 미로그인 write 401.

---

## 4. 매 Phase audit 체크리스트
- [ ] `grep -rn student_001 apps/classbot` → 데모/시드 외 잔존 0
- [ ] per-user 쓰기 전부 `getCurrentUserId` 경유
- [ ] mutation 가드 + 교사 전용 role 가드 적용
- [ ] **실DB(5434) 다유저·역할 테스트**: 학생1·학생2·교사1 가입 → 각자 행동 → `users`/도메인테이블에 **서로 다른 user_id 로 분리** + 교사 기능은 교사만 통과
- [ ] typecheck / lint / build 통과
- [ ] audit 결과를 이 plan 하단에 기록

---

## 5. 하드 제약
- push/PR/merge 금지(로컬 커밋까지). `games`·`games-arcade` 미접근. 다른 워크트리·`.github/workflows`·root 글로벌 미수정. 스키마 변경은 정식 마이그레이션. Drizzle `users`/도메인 테이블 구조 무변경(insert 만, 비파괴).

---

## 6. Audit 로그 (Phase별 기록)

### Phase 1 audit — 프로비저닝 + 해석기 (PASS)
- 변경:
  - BE `signup.use-case.ts`: 트랜잭션에 도메인 users 프로비저닝 추가(admin 제외).
  - BE `auth-user.repository.ts` + interface: `provisionDomainUser()` raw INSERT … ON CONFLICT DO NOTHING(비파괴, 멱등).
  - FE `lib/current-user.ts`: `useCurrentUser()`/`useCurrentUserId()`/`getCurrentUserIdFromRequest()` + `DEMO_FALLBACK_USER_ID`.
- 실DB 다유저 테스트(포트 5434, BE :4032):
  - student1/student2/teacher1 가입 → 각자 고유 uuid 발급.
  - `auth_users LEFT JOIN users ON u.id = a.id::text` → **3건 모두 bridge=OK**, auth_role == domain_role:
    ```
    student  0bee5f9c… 통합학생1  domain student
    student  58c23ea7… 통합학생2  domain student
    teacher  03f44f5f… 통합교사1  domain teacher
    ```
  - 학생1·학생2가 **서로 다른 domain user_id** 로 분리됨, 교사는 teacher role.
- typecheck: BE `nest build` PASS, FE `tsc --noEmit` PASS.
- 결과: **PASS** — 가입 시 신원 단일화(auth_users.id == users.id) 실DB 실증.

### Phase 2 audit — 하드코딩 → 해석기 교체 (PASS)
- 교체 위치(현재 사용자 식별을 `currentPersona`/`s${...}` → 해석기):
  - `app/(student)/classbot/page.tsx` (홈, `useRosterMe`; `s${currentPersona.id}` 버그 제거 — sstudent_001 → roster id)
  - `app/(student)/classbot/chat/page.tsx` (인사·아바타 이니셜·라이브 질문 → `useCurrentUser`)
  - `app/(student)/classbot/wellness/page.tsx` (server, `resolveRosterMe(DEMO_FALLBACK)`)
  - `app/(student)/classbot/wellness/check-in/check-in-form.tsx` (`useRosterMe`)
  - `app/(student)/classbot/assignment/page.tsx` / `[id]/result/page.tsx` / `[id]/solve/solve-workspace.tsx` (`useRosterMe`; 제출 명의 일치)
  - `app/(student)/classbot/me/report/page.tsx` (server, `resolveRosterMe(DEMO_FALLBACK)`)
  - `components/shell/app-header.tsx` (프로필 이름 → `useCurrentUser`, 데모 메타만 persona 잔존)
  - `components/classbot/grading-notification-card.tsx` (`useRosterMe`; sstudent_001 버그 제거)
  - `components/classbot/live-overlay.tsx` (라이브 질문 명의 → `useCurrentUser`)
- audit grep:
  - `grep currentPersona app components` → 잔존은 **app-header 의 데모 표시 메타(streak/grade/school)** 와 주석뿐. 신원 용도 0.
  - `student_001` 리터럴(mock/seed 외) → `lib/current-user.ts` 의 **의도된 데모 폴백**(주석/상수)뿐. 도메인 하드코딩 0.
- typecheck PASS, lint 0 errors(기존 warning 만), build PASS.
- 결과: **PASS** — 도메인 "현재 사용자"가 해석기(세션 우선·student_001 폴백) 단일 경로로 흐름. 부수효과로 기존 sstudent_001 매칭 버그 2건(home·grading-card) 해소.
- 부기(정직): wellness/me-report 는 **server 컴포넌트**라 SSR 시점 세션 토큰(client) 접근 불가 → 데모 폴백 고정. 세션별 분기는 client 경로(home/chat/assignment/live/header)에서 동작. 도메인 users.name 조회 API 신설 시 세션 사용자 실명 표기로 승급 가능(현재는 email 로컬파트).
- 토큰 저장 정정: tokenManager 는 localStorage 가 아니라 **SameSite=Lax 쿠키**(classbot_*)에 저장. 서버 write 경로는 `Authorization: Bearer` 헤더로 access 를 받는다.

### Phase 3 audit — 쓰기 가드 + RBAC (PASS)
- 변경(3a + 3b):
  - **RBAC 라우팅**(3a): `components/features/auth/role-guard.tsx` — 로그인 세션 role≠라우트 그룹 role → 본인 홈 리다이렉트(비로그인 데모는 통과). `(student)`/`(teacher)` layout 배선. app-header: 역할 전환은 데모만 노출, 로그아웃은 세션이면 실제 signOut.
  - **쓰기 thin-slice**(3b): `app/api/chat/route.ts` — 학생 메시지 영속화. 명의는 **JWT claim(sub)** 에서만(본문 studentId 무시). 미로그인 401. chat UI `send()` 가 로그인 시 본인 명의로 POST.
  - **교사 전용 mutation**(3b): `app/api/teacher/bots/route.ts` — 봇 생성. 미로그인 401 / role≠teacher 403 / teacher 201(teacherId=세션 id). 명의는 claim 에서만.
- 실DB 다유저·역할 테스트(BE :4032, FE dev :3032, DB 5434) — 신규 가입 학생A·학생B·교사A:
  - **프로비저닝 bridge**: `auth_users LEFT JOIN users` 3건 모두 OK, role 일치(student/student/teacher).
  - **쓰기 가드**: 미로그인 `POST /api/chat` → **401**.
  - **명의 격리**: 학생A·학생B 가 같은 봇(cb_001)에 전송 → `chat_messages.student_id` **서로 다른 uuid 로 분리** 저장.
    ```
    b8014d13…(학생A) 학생A의 질문: 극값이 뭐예요?
    f6273fef…(학생B) 학생B의 질문: 미분 다시 알려줘
    ```
  - **명의 위조 차단**: 학생A 토큰 + 본문 studentId=학생B → 저장 student_id = **학생A**(본문 무시). 위조 불가 실증.
  - **교사 전용 RBAC**: `POST /api/teacher/bots` — 미로그인 401 / **학생 토큰 403(FORBIDDEN_ROLE)** / **교사 토큰 201**. 생성 봇 teacher_id = 교사A 세션 id, teacher_name=감사교사A.
- grep: `student_001`(mock/seed/current-user 폴백 외) → **0**. per-user 쓰기(chat/teacher-bots)는 전부 `getCurrentUserIdFromRequest` 경유. mutation 가드 + 교사 전용 role 가드 적용.
- typecheck PASS / lint 0 errors / BE build PASS / FE build PASS.
- 결과: **PASS** — 로그인 사용자가 도메인 주체로서 **본인 명의로 분리 기록**되고, 교사 전용 기능은 교사만 통과함을 실DB 로 실증.

---

## 7. 완주 요약
- Phase 1·2·3 전부 audit PASS, 로컬 커밋 완료(push/PR/merge 없음, games/arcade 미접근).
- 신원 단일화(가입→도메인 user 동일 id) · 현재 사용자 해석기 전면 적용 · 쓰기 가드 + 학생/교사 RBAC 배선 + 실DB 다유저·역할 격리 실증.
- 범위 밖(후속): 도메인 전 테이블 런타임 영속화(현재는 chat/teacher-bots thin-slice + 나머지 mock), server 컴포넌트(wellness/me-report) 세션 분기(쿠키 SSR 연동 시 승급), 도메인 users.name 조회로 세션 실명 표기.
