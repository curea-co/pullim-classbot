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
- 인증: `x-user-id` 헤더. 없으면 mock `student_001` 또는 `teacher_001`로 fallback (Ph8 전).
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

총 **~36 endpoints** (Ph3 read 약 18 + mutate 약 18). Ph7에서 FE의 `from '@/lib/mock'`을 fetch로 점진 교체.

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
| **Ph7** | FE 교체 | `lib/mock` 의존 → `fetch('/api/...')` 점진 교체 | TBD |
| **Ph8** | 인증 | NextAuth v5 / lucia-auth / 자체 — 결정 보류 | TBD |
| **Ph9** | prod DB | Neon / Supabase / RDS — 결정 보류 | TBD |

---

## 6. 결정 보류 / 미결 항목

- **인증 (Ph8)**: NextAuth.js v5 vs lucia-auth vs 자체. mock은 `x-user-id` 헤더 폴백.
- **prod DB (Ph9)**: Neon(serverless) / Supabase / RDS.
- **chat 영속화**: Ph5에서 LLM gateway 결정 후 풀 어떻게 잡을지 정함. Ph1 시드에는 `chat_messages` 비어 있음.
- **replay segments/transcript JSONB vs 별도 테이블**: JSONB로 시작. 한 리플레이 평균 50줄·5MB 미만이라 안전. 검색·집계 요구 생기면 분리.
- **마이그레이션 정책**: dev/prod 동일하게 `drizzle-kit migrate`. prod release flow는 Ph9에서.
