# 풀림 클래스봇 BE — 엔티티 · API 설계

> **문서 버전**: v1.0 · 2026-05-18
> **권위 문서**: [`input/docs-archive/07_풀림_클래스봇_핸드오프.md`](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md)
> **선행 mock**: `src/lib/mock/*` (persona / family / tutor / classbot / chat / live-content)
> **참고**: 풀림 플래너 BE 셋업 패턴 — [be-setup-handoff](../../input/2026-05-18_be-setup-handoff.md)

---

## 0. 한 줄 요약

클래스봇 도메인의 24개 테이블 + 9-Phase 로드맵. **Phase 1·2는 인프라(스키마+seed)만 깔고, FE는 mock 그대로**. API 라우트는 Phase 3부터 점진 교체.

---

## 1. 도메인 맵

```
┌── Identity ────────────────────────┐
│ users · parent_child_links · consent_logs
└────────────────────────────────────┘
        │
        ▼
┌── Bot Definition ──────────────────┐
│ classrooms · class_bots · enrollments
│ bot_curriculum_units · bot_settings
└────────────────────────────────────┘
        │
        ▼
┌── Lessons & Live ──────────────────┐
│ lessons · live_sessions
│ live_quizzes · bot_questions
└────────────────────────────────────┘
        │
        ▼
┌── Replays ─────────────────────────┐
│ replays(segments/transcript JSONB)
│ replay_bookmarks · replay_teacher_questions
│ replay_watch_progress
└────────────────────────────────────┘
        │
        ▼
┌── Assignment & Chat ───────────────┐
│ assignments · assignment_questions
│ chat_messages
└────────────────────────────────────┘
        │
        ▼
┌── Grading ─────────────────────────┐
│ grading_items · grading_history
└────────────────────────────────────┘
        │
        ▼
┌── Wellbeing & Reports ─────────────┐
│ emotion_checkins · wellbeing_snapshots
│ crisis_alerts · reports
└────────────────────────────────────┘
        │
        ▼
┌── Marketplace ─────────────────────┐
│ templates
└────────────────────────────────────┘
```

총 **24 테이블**. JSONB는 (a) 한 row의 종속 메타(`bot_settings`, `replay.segments`)와 (b) 다형 KPI(`reports.kpis`)에 한정.

---

## 2. 엔티티 표

| # | 테이블 | PK | 핵심 컬럼 | 비고 |
|---|---|---|---|---|
| 1 | `users` | `id` text | `name`, `role`('student'\|'teacher'\|'parent'), `profile` jsonb | mock의 `Persona`/`currentTeacher`/`Parent` 통합. role-specific 메타는 `profile` JSONB |
| 2 | `parent_child_links` | `(parent_id, student_id)` | `relation`, `primary`, `phone`, `kakao_id` | family.ts |
| 3 | `consent_logs` | `id` text | `parent_id`, `student_id`, `type`, `granted_at`, `expires_at`, `scope_label` | 데이터 공유 동의 |
| 4 | `classrooms` | `id` text | `label`, `organization`, `teacher_id` | "고2 미적분 A반" |
| 5 | `class_bots` | `id` text | `name`, `teacher_id`, `subject`, `grade`, `tone`, `greeting`, `scope` int, `is_live` bool, `enrolled_count`, `current_lesson` jsonb, `quick_prompts` jsonb | mock `ClassBot` |
| 6 | `enrollments` | `(bot_id, student_id)` | `classroom_id`, `classroom_label`, `assigned_by`, `assigned_at`, `via` | studentEnrollments |
| 7 | `bot_curriculum_units` | `id` text | `bot_id`, `label`, `full_path`, `achievement_codes` jsonb | 봇별 단원 트리 |
| 8 | `bot_settings` | `bot_id` text | `settings` jsonb | 7카테고리 통째 JSONB (identity/voice/curriculum/teaching/scope/evaluation/safety/integration) |
| 9 | `lessons` | `id` text | `bot_id`, `classroom_id`, `title`, `chapter`, `scheduled_start`, `duration_min`, `status`, `prep_ready`, `student_count` | upcoming/live/ended |
| 10 | `live_sessions` | `id` text | `bot_id`, `classroom_id`, `lesson_id`, `started_at`, `ended_at`, `status`, `participant_count`, `total_count`, `scope`, `intensity`, `alert_count`, `roster` jsonb | liveSessions + classRoster |
| 11 | `live_quizzes` | `id` text | `live_session_id`, `question`, `type`, `options` jsonb, `answer_index`, `distribution` jsonb, `responded`, `total`, `scope`, `tier`, `status`, `started_at`, `correct_rate` | currentQuiz + quizHistory + quizDrafts(`status='draft'`) |
| 12 | `bot_questions` | `id` text | `live_session_id`, `student_id`, `question`, `scope_used`, `created_at`, `shared`, `bot_answer_preview`, `tier` | liveFeed |
| 13 | `replays` | `id` text | `lesson_id`, `bot_id`, `classroom`, `title`, `chapter`, `bot_name`, `date`, `started_at`, `ended_at`, `duration_min`, `participant_count`, `status`, `ai_processed_at`, `sent_at`, `my_accuracy`, `key_takeaways` jsonb, `segments` jsonb, `transcript` jsonb, `focus_bins` jsonb, `viewer_stats` jsonb | studentReplays. segments·transcript는 1:1 종속이라 JSONB로 |
| 14 | `replay_bookmarks` | `id` text | `replay_id`, `student_id`, `at_sec`, `label`, `created_at` | 학생 책갈피 |
| 15 | `replay_teacher_questions` | `id` text | `replay_id`, `student_id`, `at_sec`, `text`, `status`, `reply` | 시점 질문 |
| 16 | `replay_watch_progress` | `(replay_id, student_id)` | `last_sec`, `completed` | 시청 진도 |
| 17 | `assignments` | `id` text | `bot_id`, `student_id`, `title`, `scope`, `subject`, `grade`, `chapter_from`, `chapter_to`, `achievement_codes` jsonb, `question_count`, `difficulty`, `mode`, `scope_override`, `source`, `assigned_by`, `assigned_at`, `due_label`, `d_day`, `completed_count`, `recent_accuracy`, `state`, `reason_hint`, `solve_href` | studentAssignments |
| 18 | `assignment_questions` | `id` text | `assignment_id`, `order`, `type`, `prompt`, `options` jsonb, `answer_index`, `answer_key`, `model_answer`, `hints` jsonb | assignmentQuestions |
| 19 | `grading_items` | `id` text | `student_id`, `assignment_title`, `submitted_at`, `type`, `topic`, `draft_score`, `max_score`, `tier`, `ai_confidence`, `response_preview`, `draft_comment`, `rubric` jsonb, `status`, `override_delta` | gradingQueue + overriddenSample |
| 20 | `grading_history` | `id` serial | `student_id`, `assignment_title`, `graded_at`, `score`, `max_score` | gradingHistory |
| 21 | `emotion_checkins` | `id` text | `student_id`, `date`, `mood` int, `intensity`, `intensity_range` jsonb, `free_text`, `keyword_flag` | unique(student_id, date) |
| 22 | `wellbeing_snapshots` | `(student_id, date)` | `score`, `flag` | wellbeingSnapshots |
| 23 | `crisis_alerts` | `id` text | `student_id`, `trigger_type`, `severity`, `detected_at`, `summary`, `notified_teacher`, `notified_parent`, `notified_wee_center`, `resolved` | crisisAlerts |
| 24 | `reports` | `id` text | `kind`, `title`, `subject`, `generated_at`, `status`, `kpis` jsonb, `summary`, `alerts` jsonb | reports |
| 25 | `templates` | `id` text | `kind`, `title`, `author_name`, `author_organization`, `is_official`, `pricing` jsonb, `subject`, `grade`, `downloads`, `rating`, `rating_count`, `description`, `highlights` jsonb, `updated_at` | templates + myTemplateUploads(`status` 추가) |
| 26 | `chat_messages` | `id` text | `bot_id`, `student_id`, `role`('student'\|'bot'), `text`, `reply_key`, `scope_used`, `tier`, `created_at` | 향후 채팅 영속화 — Ph1엔 비어 있음 |

> 정확한 컬럼 타입·default·관계는 [`src/lib/db/schema.ts`](../../src/lib/db/schema.ts)가 SOT.

### 주요 invariant
- **`enrollments`** — 한 학생이 같은 봇에 중복 등록 불가 (PK).
- **`bot_settings`** — 한 봇당 단일 row (PK = bot_id).
- **`replay_watch_progress`** — 학생-리플레이 1:1 (PK).
- **`emotion_checkins`** — 한 학생/하루 1회 (unique index).
- **`wellbeing_snapshots`** — 학생/하루 PK.
- **`enrollments.bot_id`** → `class_bots.id` ON DELETE CASCADE.
- **`replay_bookmarks.replay_id`** → `replays.id` ON DELETE CASCADE.

---

## 3. API 응답 컨벤션

- 모든 응답 `application/json; charset=utf-8`.
- 성공: 데이터 그대로 (`{ id, ... }` 또는 `[ ... ]`). 별도 wrapper 없음.
- 에러: `{ error: { code: 'NOT_FOUND'|'FORBIDDEN'|'VALIDATION', message: string } }` + 적절한 HTTP status.
- 인증: `x-user-id` 헤더. 없으면 mock `student_001` 또는 `teacher_001`로 fallback (Ph8 전 — 도메인 read/write 라우트 한정). **auth 라우트(`/auth/*`)는 Ph8 인도 완료로 JWT Bearer 기반이며, 매 요청 서명 검증한다 (§6.1).**
- 시각: ISO-8601 UTC 문자열. mock의 "오늘 19:50" 같은 상대 라벨은 client에서 포맷.
- 빈 컬렉션은 `[]`, 빈 객체는 `null` 또는 키 누락.

---

## 4. 엔드포인트 카탈로그 (Phase 3~7 누적)

> 표기: `🟢` Phase 3 read, `🟡` Phase 4 mutate (planner CRUD 격), `🟠` Phase 5 advanced

### 4.1 Identity

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/me` | 현재 사용자(헤더 기반) | 🟢 |
| `GET /api/me/parent` | 주 보호자 | 🟢 |
| `POST /api/me/consents` | 데이터 공유 동의 push | 🟡 |

### 4.2 Bots & Classrooms

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/bots?role=student\|teacher` | 내 봇 목록 (학생: enrollment / 교사: owned) | 🟢 |
| `GET /api/bots/{id}` | 봇 상세 (+ curriculum + settings) | 🟢 |
| `GET /api/bots/{id}/curriculum` | 봇별 단원 트리 | 🟢 |
| `PATCH /api/bots/{id}/settings` | 봇 설정 부분 갱신 | 🟡 |
| `POST /api/bots` | 봇 생성 (교사) | 🟡 |
| `GET /api/classrooms` | 내 반 목록 | 🟢 |
| `POST /api/classrooms/{id}/enrollments` | 학생 배정 | 🟡 |

### 4.3 Live & Lessons

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/lessons?botId=...&status=...` | 수업 목록 | 🟢 |
| `GET /api/lessons/upcoming` | 교사 홈 다가오는 수업 | 🟢 |
| `GET /api/live-sessions?status=live` | 현재 라이브 세션 | 🟢 |
| `POST /api/live-sessions` | 라이브 시작 | 🟡 |
| `PATCH /api/live-sessions/{id}` | 종료/Scope 변경/intensity 갱신 | 🟡 |
| `GET /api/live-sessions/{id}/feed` | 실시간 봇 질문 피드 | 🟢 |
| `POST /api/live-sessions/{id}/quizzes` | 즉석 퀴즈 출제 | 🟡 |
| `PATCH /api/quizzes/{id}` | 분포 갱신·종료 | 🟠 |

### 4.4 Replays

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/replays?audience=student\|teacher` | 리플레이 목록 (학생: sent만) | 🟢 |
| `GET /api/replays/{id}` | 리플레이 상세 (segments/transcript) | 🟢 |
| `PATCH /api/replays/{id}/status` | processing→review→sent 전이 | 🟡 |
| `POST /api/replays/{id}/bookmarks` | 책갈피 저장 | 🟡 |
| `POST /api/replays/{id}/teacher-questions` | 시점 질문 등록 | 🟡 |
| `PATCH /api/replays/{id}/watch-progress` | 시청 진도 갱신 | 🟡 |

### 4.5 Assignments & Chat

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/assignments?audience=student\|teacher` | 과제 목록 | 🟢 |
| `GET /api/assignments/{id}` | 상세 + 문항 | 🟢 |
| `POST /api/assignments` | 출제 | 🟡 |
| `PATCH /api/assignments/{id}` | 진행도/state 전이 (`todo`→`in-progress`→`submitted`) | 🟡 |
| `POST /api/bots/{id}/chat` | 봇 채팅 1턴 (저장 + reply 생성) | 🟠 |
| `GET /api/bots/{id}/chat?studentId=...` | 채팅 이력 | 🟢 |

### 4.6 Grading

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/grading/queue` | 채점 큐 | 🟢 |
| `GET /api/grading/{id}` | 채점 상세 (rubric 포함) | 🟢 |
| `PATCH /api/grading/{id}` | 점수/코멘트/status 갱신 (overrideDelta 계산) | 🟡 |
| `GET /api/students/{id}/grading-history` | 학생 채점 이력 | 🟢 |

### 4.7 Wellbeing

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/me/emotion-checkins?from=...&to=...` | 7일 체크인 | 🟢 |
| `POST /api/me/emotion-checkins` | 오늘 체크인 (upsert) | 🟡 |
| `GET /api/me/wellbeing?from=...&to=...` | 웰빙 트렌드 | 🟢 |
| `GET /api/crisis-alerts?resolved=false` | 위기 알림 (교사) | 🟢 |
| `PATCH /api/crisis-alerts/{id}` | resolve/notify 토글 | 🟡 |

### 4.8 Reports & Marketplace

| Method · Path | 의미 | Phase |
|---|---|---|
| `GET /api/reports?kind=...&status=...` | 리포트 목록 | 🟢 |
| `GET /api/reports/{id}` | 상세 | 🟢 |
| `PATCH /api/reports/{id}/status` | approval 전이 | 🟡 |
| `GET /api/templates?kind=...` | 템플릿 마켓 | 🟢 |
| `GET /api/me/templates` | 내가 올린 템플릿 | 🟢 |

총 **~36 endpoints** (Ph3 read 약 18 + mutate 약 18). Ph7에서 FE의 `from '@/lib/mock'`을 fetch로 점진 교체. (auth 슬라이스가 fetch 데이터 레이어 — `packages/api-client` — 를 Ph7 일정보다 먼저 인도했다. §5 Ph7·§6.1 참조.)

---

## 5. 9-Phase 로드맵

| Phase | 목표 | 산출물 | 상태 |
|---|---|---|---|
| **Ph1** | 인프라 | Docker · Drizzle config · schema · 초기 migration · `.env.example` | **2026-05-18 완료** |
| **Ph2** | seed | mock → DB 1:1 idempotent seed (`bun run db:seed`) | **2026-05-18 완료** |
| **Ph3** | read API | `/api/me`, `/api/bots`, `/api/bots/{id}`, `/api/lessons`, `/api/live-sessions`, `/api/replays`, `/api/assignments`, `/api/grading/queue` 등 | TBD |
| **Ph4** | mutate (CRUD) | 봇/반/과제/감정 체크인 POST·PATCH. 트랜잭션 invariant 검증 | TBD |
| **Ph5** | 상태 전이 + 집계 | 라이브 시작/종료, 리플레이 status 전이, replay 자동 생성 트리거 | TBD |
| **Ph6** | 리포트 집계 | mock 함수 → SQL aggregate (정답률·웰빙 평균·KPI) | TBD |
| **Ph7** | FE 교체 | `lib/mock` 의존 → `fetch('/api/...')` 점진 교체 | **데이터 레이어 조기 인도** (auth PR #89, 2026-06-02) — auth 슬라이스가 `packages/api-client`(`auth-fetch` 토큰 첨부 + 401 자동 refresh + `token-manager`) 기반을 먼저 깔았다. 나머지 도메인의 mock→fetch 교체는 여전히 TBD (auth 시점에 50개 파일이 아직 `@/lib/mock` import). |
| **Ph8** | 인증 | ~~NextAuth v5 / lucia-auth / 자체 — 결정 보류~~ | **결정·인도 완료** (auth PR #88/#89, 2026-06-02) — 자체 구현(이메일/비밀번호 + JWT access/refresh). 상세 §6.1 참조. |
| **Ph9** | prod DB | Neon / Supabase / RDS — 결정 보류 | TBD |

---

## 6. 결정 보류 / 미결 항목

- ~~**인증 (Ph8)**: NextAuth.js v5 vs lucia-auth vs 자체.~~ → **§6.1에서 해소** (자체 구현, auth PR #88/#89, 2026-06-02).
- **prod DB (Ph9)**: Neon(serverless) / Supabase / RDS.
- **chat 영속화**: Ph5에서 LLM gateway 결정 후 풀 어떻게 잡을지 정함. Ph1 시드에는 `chat_messages` 비어 있음.
- **replay segments/transcript JSONB vs 별도 테이블**: JSONB로 시작. 한 리플레이 평균 50줄·5MB 미만이라 안전. 검색·집계 요구 생기면 분리.
- **마이그레이션 정책**: 도메인(Drizzle) 자산은 dev/prod 동일하게 `drizzle-kit migrate`. **단, auth는 TypeORM 마이그레이션으로 인도됨 — §6.2 공존 노트 참조.** prod release flow는 Ph9에서.

---

## 6.1 Ph8 인증 — 인도된 결정 (auth PR #88/#89, 2026-06-02)

> 컨트롤타워가 **명시적으로 수용한 예외**: 인증 방식 확정이 Ph8 일정보다 먼저 일어났다.
> 본 절은 새 범위를 발명하지 않고 **실제로 인도된 것만** 기록한다.

**방식**: 자체 구현(NextAuth/lucia 미채택). 이메일/비밀번호 + JWT (access/refresh).

- **별도 `auth_*` 테이블** — 도메인 `users`(Drizzle)와 충돌하지 않도록 `auth_` 프리픽스로 분리.
  - `auth_users` (uuid PK, role `student`|`teacher`|`admin`, 살아있는 행 기준 email unique, soft delete).
  - `auth_user_providers` (provider `email`|`kakao`|`naver`, 비밀번호 보관, `failed_login_count`/`locked_at`). 소셜(kakao/naver)은 enum에만 존재하고 동작은 GATED.
  - `auth_revoked_tokens` (jti PK + `expires_at` 인덱스) — **토큰 블랙리스트를 Redis 대신 Postgres 테이블로 구현**.
- **신원 단일화**: 가입 시 동일 트랜잭션에서 같은 id로 도메인 `users` 행을 프로비저닝(admin 제외) → 로그인 사용자가 도메인 FK 주체.

**인도된 보안 자세** (코드 검증):
- JWT 서명을 **매 요청 검증**(전역 `JwtAuthGuard`, `@Public()`만 우회).
- **공개 회원가입은 admin 권한을 부여할 수 없음** — role은 서버 할당, 외부 입력으로 `admin` 요청 시 거부(`AUTH_ROLE_NOT_ALLOWED`). 공개 가입은 student/teacher만.
- **refresh 회전(rotation) + 로그아웃 시 블랙리스트** — 사용된 refresh 토큰을 원자적으로 블랙리스트에 등록해 동시 요청 중복 사용 차단.

**비고**: `x-user-id` 헤더 폴백(§3)은 도메인 read/write 라우트에 대해 Ph7 fetch 교체 전까지 잔존. 도메인 라우트의 JWT 가드 적용 범위 확장은 Ph7 진행과 함께 추후 정렬 대상.

## 6.2 Drizzle(도메인) + TypeORM(auth) 마이그레이션 공존 — 정합 노트

본 spec은 원래 마이그레이션을 `drizzle-kit migrate` 단일로 가정했으나, auth는 **TypeORM 마이그레이션**(`CreateAuthTables1748476800000`, `CREATE EXTENSION IF NOT EXISTS pgcrypto` 포함)으로 인도되어 현재 레포는 **Drizzle + TypeORM이 공존**한다.

- **경계**: TypeORM 마이그레이션은 `auth_*` 네임스페이스만 다루며 **Drizzle 자산을 일절 건드리지 않는다**(마이그레이션 주석에 명시). 도메인 스키마는 계속 `drizzle-kit`이 SOT.
- **근거**: auth는 NestJS(`apps/backend`) + TypeORM 본체 pullim 패턴에 정렬해 인도됨. `gen_random_uuid()`가 의존하는 `pgcrypto`를 마이그레이션이 멱등 보장.
- **⚠ 후속 통합 플래그**: 두 마이그레이션 도구의 장기 공존은 의도된 최종 상태가 아니다. prod release flow(Ph9) 설계 시 **(a) 단일 도구로 통일할지, (b) auth↔도메인 `users` 신원 단일화를 스키마 레벨에서 어떻게 유지할지**를 함께 결정해야 한다. 본 노트는 결정이 아니라 미결 플래그로 남긴다.
