# Phase 7 — Auth wiring (도메인 읽기 인증화 + 신원 단일화)

작성: 2026-06-03 · 트랙: Control Tower A · 도메인: pullim-classbot

## 목표

도메인 읽기 경로의 **mock 폴백을 제거**해, 도메인 데이터 조회가 (1) 로그인(인증)을
요구하고 (2) 실DB(real Postgres)를 직접 친다. 더불어 **인증 신원(auth_users)과
도메인 신원(Drizzle `users`)을 단일화**한다 — 하드코딩된 `s1 → student_001` mock
매핑을 실제 auth→도메인 링크로 대체.

## 확정 결정 (locked)

- **D1 — 로그인 월(login wall)**: 모든 도메인 라우트는 인증을 요구한다.
  데모는 **시드된 데모 계정으로 로그인**해야만 접근 가능(익명 mock 통과 제거).
- **D2 — signup 이 도메인 `users` 행을 upsert**: 가입 시 `auth_users.id` 와 같은
  id 로 도메인 `users` 행을 생성한다(신원 단일화). 모든 silo 에서 일관되게 적용.
- **D3 — 지금 구현(implement now)**.

## 상위 규칙

리포 최상위 규칙(루트 CLAUDE.md): **PR 은 FE/BE 를 한 PR 에 섞지 않는다.**
→ **Stage 1 은 BE-only → 1 개 BE PR.** Stage 2(FE)는 별도 PR.

## 스테이지 분해

### Stage 1 — 이 BE PR (`feat/classbot-phase7-be-s1`)

1. **신원 단일화(D2)** — *이미 main 에 인도됨* (auth+도메인통합 머지, PR #88).
   NestJS `SignupUseCase` 가 가입 트랜잭션 안에서
   `AuthUserRepository.provisionDomainUser()` 로 도메인 `users` 행을
   `INSERT ... ON CONFLICT (id) DO NOTHING`(멱등) 으로 생성한다. admin 은 제외.
   → 이 PR 에서는 **읽기 API 가 그 링크된 신원으로 per-user 데이터를 조회**하도록
   소비 경로를 추가한다(신원 단일화의 read-side 실증).

2. **기초 읽기 API 라우트(JWT 가드, 실DB, no-mock)** — 이 PR 의 주 산출물.
   `lib/current-user.ts:getCurrentUserIdFromRequest()` 로 JWT 서명검증 후
   현재 사용자 id/role 을 얻고, 토큰 없으면 **401**(mock 누수 없음).
   - `GET /api/bots` — 내가 수강(enrolled) 중인 class_bots (학생 시점)
   - `GET /api/assignments` — 내게 배정된 assignments (학생 시점)
   - `GET /api/grades` — 내 채점 이력(grading_history) (학생 시점) *(quick add)*
   - `GET /api/wellness` — 내 웰빙 스냅샷 + 최근 감정 체크인 (학생 시점) *(quick add)*

3. **데모 시드(D1 함의)** — *이미 존재* (`apps/classbot/scripts/seed.ts`,
   `bun run db:seed`). `student_001`(서연) + class_bots(cb_001~cb_005) +
   enrollments + assignments 등 전체 도메인을 멱등(TRUNCATE→재삽입) 시드한다.
   → D1 로그인월 하에서 데모는 이 계정으로 로그인해 읽는다. 이 PR 은 시드의
   인증 연동(데모 계정이 로그인 가능하도록)을 검증한다.

**검증 바**: 빌드는 실DB 없이도 통과(`DATABASE_URL='postgres://u:p@localhost:5432/d'
bun run build:classbot`), typecheck 5/5 유지. 도커 PG + 마이그레이션 + 시드 +
앱 기동 후: 가입→auth_users+users 양쪽 행 생성(id 링크) SQL 확인; 읽기 API 토큰
有 200·無 401; 데모 계정 로그인 후 읽기 동작.

### Stage 2 — FE PR (별도)

- **59개 mock 소비 파일 → 실 읽기 API 로 전환.** `@/lib/mock/*` 직접 import 와
  `currentPersona`/하드코딩 신원 의존을 React Query 훅(읽기 API) 으로 교체.
- **RoleGuard / 로그인월 플립** — 데모가 더 이상 익명으로 통과하지 못하게
  `lib/current-user.ts` 의 `DEMO_FALLBACK_USER`(비로그인 student_001 폴백)를
  제거/게이트하고, 미로그인 시 `/login` 으로 보낸다.
- **교사 mutation 라우트/폼** — 봇 생성(이미 `/api/teacher/bots` 존재) 외
  과제 배정·채점 override·라이브 개설 등 교사 쓰기 경로와 폼.

#### Stage 2 가 채울 나머지 읽기 API (이 PR 범위 밖, 문서화만)

학생 시점:
- `GET /api/bots/[botId]` — 봇 상세(+settings, +curriculum)
- `GET /api/chat?botId=` — 봇별 내 채팅 이력(chat_messages)
- `GET /api/replays`, `GET /api/replays/[id]` — 내 리플레이 + 북마크/진행률
- `GET /api/assignments/[id]` (+`/questions`) — 과제 상세·문항
- `GET /api/emotion-checkins` — 내 감정 체크인 시계열
- `GET /api/reports?kind=parent|student` — 내게 공개된 리포트

교사 시점(role=teacher 가드):
- `GET /api/teacher/bots` — 내가 만든 봇 (현재 라우트는 POST 만)
- `GET /api/teacher/grading` — 채점 큐(grading_items)
- `GET /api/teacher/live` — 라이브 세션·퀴즈·피드(live_sessions/live_quizzes/bot_questions)
- `GET /api/teacher/lessons` — 예정 수업(lessons)
- `GET /api/teacher/classrooms` — 내 반(classrooms) + 명단(enrollments)
- `GET /api/teacher/students/[id]/wellness` — 학생 웰빙(동의 스코프 게이트)
- `GET /api/teacher/reports` — 리포트 승인 큐
- `GET /api/templates` — 마켓 템플릿 + 내 업로드

보호자 시점(향후, parent role):
- `GET /api/parent/children`, `GET /api/parent/consents`, `GET /api/parent/reports`

#### Stage 2 가 건드릴 59-file 영역 (mock/신원 소비)

- `app/(student)/classbot/*` — 홈/chat/discover/replay/replay[id]/onboarding (페이지 + 위젯)
- `app/(teacher)/teacher/{,classbot,builder}/*` — 교사 홈/내 봇/봇 빌더
- `components/classbot/*`, `components/builder/*` (13 파일) — 도메인 컴포넌트
- `lib/store/*` (assignments/quiz/replay/live) — mock 기반 클라이언트 스토어
- `lib/current-user.ts` — `useCurrentUser`/`useRosterMe` mock 브리지(폴백 제거 대상)
- `hooks/api/*` — React Query 훅(읽기 API 훅 신설 위치)
- `lib/mock/{persona,family,tutor,classbot,chat}.ts` — 데이터 권위(전환 후 점진 제거)

## 신원 단일화 구현 메모 (D2, 이미 main)

- 정본: `auth_users.id`(uuid). 가입 시 같은 id 로 도메인 `users` 행 생성.
- TypeORM(auth)·Drizzle(도메인)는 같은 Postgres 를 공유하나 다른 ORM 이 다른
  테이블을 소유한다(수용된 예외: TypeORM-vs-Drizzle 공존, PR #90 spec).
  도메인 `users` 는 TypeORM 이 소유하지 않으므로 raw SQL `INSERT ... ON CONFLICT`
  로 비파괴 프로비저닝한다(멱등).
- 도메인 `users` 필수 컬럼(`name`,`role`,`profile`)은 가입 입력으로 충족
  (`name`=가입 이름, `role`=가입 role, `profile`={} 기본값). 스키마 결정 불필요.
```
