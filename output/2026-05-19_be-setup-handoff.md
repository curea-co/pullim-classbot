# 풀림 클래스봇 BE 셋업 · 핸드오프

> **문서 버전**: v1.0 · 2026-05-19
> **대상 독자**: BE 작업을 이어받을 개발자(+ 미래의 자기 자신)
> **선행 문서**: [`proc/spec/2026-05-18_be-api-design.md`](../proc/spec/2026-05-18_be-api-design.md) (엔티티 24·엔드포인트 36·9-phase 로드맵)
> **권위 문서(IA)**: [`input/docs-archive/07_풀림_클래스봇_핸드오프.md`](../input/docs-archive/07_풀림_클래스봇_핸드오프.md)
> **참고 핸드오프(패턴 원본)**: [`input/2026-05-18_be-setup-handoff.md`](../input/2026-05-18_be-setup-handoff.md) — 풀림 플래너 BE

---

## 1. 한 줄 요약

클래스봇 도메인을 위한 **로컬 BE 인프라**(PostgreSQL on Docker + Drizzle ORM on Next.js)를 깔고, 26 테이블에 mock 데이터를 idempotent로 시드했다. **FE 코드는 아직 mock에 붙어 있다** — API 교체는 Ph3+에서.

---

## 2. 오늘 한 일 (2026-05-19)

| Phase | 산출물 | 비고 |
|---|---|---|
| **Ph1** | Drizzle 26 테이블 · Docker Compose · API spec · setup wiring | 풀림 플래너 패턴 그대로, 클래스봇 도메인에 맞춰 확장 |
| **Ph2** | mock → DB seed 스크립트 (`bun run db:seed`, idempotent) | 학생 24명/봇 5개/리플레이 6편/과제 3건/문항 13건 등 |

### Ph1 산출물
- [`drizzle.config.ts`](../drizzle.config.ts) — `.env.local` 명시 로드, drizzle-kit 0.30
- [`docker-compose.yml`](../docker-compose.yml) — Postgres 16-alpine, `pullim-classbot-postgres`, 호스트 **5434:5432**
- [`src/lib/db/schema.ts`](../src/lib/db/schema.ts) — 26 테이블 + relations + 추론 타입
- [`src/lib/db/index.ts`](../src/lib/db/index.ts) — Pool client (Next.js hot reload 누수 방지 `globalThis` cache)
- [`drizzle/0000_stiff_ulik.sql`](../drizzle/0000_stiff_ulik.sql) — 초기 마이그레이션
- [`.env.example`](../.env.example) — `DATABASE_URL` 템플릿 (5434)

### Ph2 산출물
- [`scripts/seed.ts`](../scripts/seed.ts) — 26 테이블 idempotent seed

---

## 3. 아키텍처 — DB만 Docker, BE는 host

```
┌─── 개발자 머신 (host) ────────────────────────────┐
│  Next.js dev (bun run dev :3032)
│    ├─ FE pages /classbot/*, /teacher/*
│    ├─ API routes /api/*       (Ph3~ 구현 예정)
│    └─ drizzle-kit (generate/migrate/studio)
│           │ pg connection (localhost:5434)
│           ▼
│  Docker Engine
│    └─ pullim-classbot-postgres (Postgres 16-alpine)
│       volume: ./.docker/postgres   (gitignored)
└──────────────────────────────────────────────────┘
```

**왜 이렇게**
- **DB만 컨테이너**: 버전 고정 · 데이터 격리 · 팀 환경 동일. 컨테이너 재시작이 코드에 영향 0.
- **BE는 host bun**: hot reload 즉시(ms), IDE 디버거 그대로.
- **포트 5434**: 호스트 5432는 형제 프로젝트(`pullim-postgres`), 5433은 `pullim-q-postgres`가 점유 중이라 충돌 회피용.

---

## 4. 새 환경에서 처음 한 번 (setup)

```bash
# 1. 의존성
bun install

# 2. 환경 변수
cp .env.example .env.local

# 3. Docker daemon 켜기 (Docker Desktop 또는 OrbStack 실행 중이어야 함)
open -a Docker        # 또는 OrbStack

# 4. DB 컨테이너 + 스키마 + 시드
bun run db:up         # postgres 컨테이너 기동
bun run db:migrate    # 26 테이블 생성
bun run db:seed       # mock 데이터 삽입

# 5. (선택) Studio 또는 dev server
bun run db:studio     # 테이블 GUI, https://local.drizzle.studio → :4983
bun run dev           # FE + (Ph3 이후) API, http://localhost:3032
```

---

## 5. 명령어 cheatsheet

| 명령 | 설명 | 자주 쓰는 빈도 |
|---|---|---|
| `bun run db:up` | postgres 컨테이너 시작 | 매일 |
| `bun run db:down` | 컨테이너 종료(데이터 유지) | 가끔 |
| `bun run db:reset` | 컨테이너 + 볼륨 모두 삭제 후 재기동 | 스키마 깨졌을 때 |
| `bun run db:generate` | `schema.ts` 변경분으로 마이그레이션 SQL 생성 | 스키마 수정 시 |
| `bun run db:migrate` | 생성된 SQL을 DB에 적용 | 스키마 수정 시 |
| `bun run db:push` | SQL 생략하고 직접 sync(**dev only**) | 빠른 prototyping |
| `bun run db:seed` | mock → DB 시드 (TRUNCATE 후 재삽입) | 데이터 리셋 시 |
| `bun run db:studio` | DB GUI | 데이터 눈으로 볼 때 |
| `bun run dev` | Next.js dev (port 3032) | 매일 |

---

## 6. DB 스키마 한눈에

26 테이블 — 그룹별 (자세한 컬럼은 [API spec §2](../proc/spec/2026-05-18_be-api-design.md) + [`schema.ts`](../src/lib/db/schema.ts)):

```
A. Identity         (3) users · parent_child_links · consent_logs
B. Bots/Classrooms  (5) classrooms · class_bots · enrollments · bot_curriculum_units · bot_settings
C. Lessons/Live     (4) lessons · live_sessions · live_quizzes · bot_questions
D. Replays          (4) replays · replay_bookmarks · replay_teacher_questions · replay_watch_progress
E. Assignment/Chat  (3) assignments · assignment_questions · chat_messages
F. Grading          (2) grading_items · grading_history
G. Wellbeing        (3) emotion_checkins · wellbeing_snapshots · crisis_alerts
H. Reports/Market   (2) reports · templates
```

### 주요 invariant
- **`enrollments`** — `(bot_id, student_id)` PK · 동일 봇 중복 등록 차단
- **`bot_settings`** — 봇당 단일 row (PK = bot_id)
- **`replay_watch_progress`** — 학생-리플레이 1:1 (PK)
- **`emotion_checkins`** — `(student_id, date)` unique index
- **`wellbeing_snapshots`** — `(student_id, date)` PK
- **`enrollments.bot_id`** → `class_bots.id` ON DELETE CASCADE
- **`replay_bookmarks.replay_id`** → `replays.id` ON DELETE CASCADE
- **시각 라벨 ("오늘 19:50")** — `*_label` 컬럼에 저장. 실제 timestamp는 명시 가능한 곳만(`assigned_at`, `granted_at`, `created_at`, `detected_at`). 클라이언트가 KST로 재포맷.

---

## 7. seed가 넣는 데이터 (스냅샷 기준일: 2026-05-11)

| 테이블 | 건수 | 비고 |
|---|---|---|
| `users` | 24 | 학생 18 (s1=서연/`student_001`, s2~s18) + 교사 5 + 학부모 1 |
| `parent_child_links` | 1 | 어머니(parent_001) ↔ 서연 |
| `classrooms` | 5 | cr_math_a, cr_eng_b, cr_sci_2024, cr_kor_a, cr_soc_a |
| `class_bots` | 5 | cb_001 수학이형 · cb_002 영어누나 · cb_003 과학쌤 · cb_004 국어누나 · cb_005 사회코치 |
| `enrollments` | 5 | 서연이 5봇 모두 등록 |
| `bot_curriculum_units` | 13 | 봇별 단원 트리 |
| `bot_settings` | 5 | cb_001은 풀세팅, 나머지는 빈 JSONB |
| `lessons` | 3 | upcomingLessons (live/upcoming/upcoming) |
| `live_sessions` | 5 | liveSessions — live/starting/ended 혼재 |
| `live_quizzes` | 9 | currentQuiz 1 + history 5 + drafts 3 |
| `bot_questions` | 5 | liveFeed — ls_a 세션 종속 |
| `replays` | 6 | sent 4 / processing 1 / review 1 |
| `replay_bookmarks` | 3 | 서연이 남긴 책갈피 |
| `replay_teacher_questions` | 1 | 시점 질문 1건 (replied) |
| `replay_watch_progress` | 6 | 서연 시청 진도 (각 리플레이당 1행) |
| `assignments` | 3 | as_today / as_prescription / as_exam_prep |
| `assignment_questions` | 13 | 시드 문항 (각 과제 일부) |
| `grading_items` | 7 | gradingQueue 6 + overriddenSample 1 |
| `grading_history` | 15 | 학생별 과거 채점 이력 |
| `emotion_checkins` | 17 | 7일 감정 기록 (s1, s2, s4, s5) |
| `wellbeing_snapshots` | 24 | 일자별 0~6일 전 — `(student_id, date)` PK |
| `crisis_alerts` | 2 | 도현·예은 |
| `reports` | 6 | parent/student/lesson-end/class/period/realtime 각 1 |
| `templates` | 8 | 마켓 6 + 내 업로드 추가 2 (mt2 review · mt3 draft) |
| `chat_messages` | 0 | Ph1엔 비어 있음 — 채팅 영속화는 Ph5+ |

seed는 **idempotent** — 매 실행마다 26 테이블 TRUNCATE RESTART IDENTITY CASCADE 후 재삽입.

### id 매핑 규칙
- `s1` (서연, classRoster) → `student_001` (currentPersona)
- `s2`~`s18` → 그대로 유지 (`s2`, `s3`, ...)
- 교사 5명 → `teacher_001`~`teacher_005` (mock에 teacher id 없어 봇 매핑으로 부여)

---

## 8. 자주 부딪힐 이슈

| 증상 | 원인 | 조치 |
|---|---|---|
| `docker.sock: no such file` | Docker daemon 안 떠 있음 | `open -a Docker` 후 메뉴바 아이콘이 안정될 때까지 대기 |
| `port is already allocated` (5434) | 다른 컨테이너가 5434 점유 | `docker ps`로 충돌 컨테이너 확인 → 우리 게 아니면 stop |
| `DATABASE_URL is not set` (seed/drizzle-kit) | `.env.local` 미생성 | `cp .env.example .env.local` |
| Drizzle Studio "Connecting…" 무한 (Safari/Brave) | localhost 자체서명 인증서 차단 | `brew install mkcert` → `mkcert -install` → studio 재시작. Chrome/Arc/Firefox는 그냥 됨 |
| Next.js connection pool 누수 (hot reload) | dev 모드에서 module re-eval 시 Pool 중복 생성 | [`src/lib/db/index.ts`](../src/lib/db/index.ts)의 `globalThis` cache가 처리 |
| seed에서 외래키 위반 | mock의 lesson id가 upcomingLessons에 없음 | seed에서 `knownLessonIds` Set 검증 후 `null`로 떨어뜨림 (이미 적용) |

---

## 9. 다음 차례 — Phase 3 (read endpoints)

[API spec §4](../proc/spec/2026-05-18_be-api-design.md) 카탈로그 참조.

### 권장 시작 순서
1. `src/app/api/me/route.ts` — 가장 단순(테이블 1개), `x-user-id` 헤더 폴백 패턴 잡기
2. `src/app/api/bots/route.ts` — 학생 시점(`enrollments` join), 교사 시점(`teacherId` 필터) 분기
3. `src/app/api/bots/[id]/route.ts` — bot 단건 + curriculum + settings 통합 응답
4. `src/app/api/lessons/route.ts`, `src/app/api/live-sessions/route.ts` — 상태 필터 패턴
5. `src/app/api/replays/route.ts`, `/[id]/route.ts` — audience(student/teacher) 분기, segments/transcript JSONB 그대로 반환
6. `src/app/api/assignments/route.ts`, `/[id]/route.ts` — 과제 + 문항 join

### 검증 패턴
```bash
curl -H "x-user-id: student_001" http://localhost:3032/api/me
curl -H "x-user-id: teacher_001" http://localhost:3032/api/bots
```

### 이후
- **Ph4**: 봇/반/과제/감정 체크인 CRUD + invariant 트랜잭션
- **Ph5**: 라이브 시작/종료 상태 전이, 리플레이 자동 생성 트리거
- **Ph6**: 리포트 집계 (mock 함수 → SQL aggregate)
- **Ph7**: FE `from '@/lib/mock'` import → `fetch('/api/...')` 점진 교체
- **Ph8**: 인증 (NextAuth v5 vs lucia-auth vs 자체 — 결정 필요)
- **Ph9**: prod DB (Neon/Supabase/RDS 중 결정)

---

## 10. 관련 파일 한눈에

```
pullim-classbot/
├── docker-compose.yml                              # Postgres 컨테이너 정의 (5434)
├── drizzle.config.ts                               # Drizzle Kit 설정
├── .env.example                                    # DATABASE_URL 템플릿
├── drizzle/
│   ├── 0000_stiff_ulik.sql                         # 초기 마이그레이션
│   └── meta/                                       # snapshot, _journal
├── scripts/
│   └── seed.ts                                     # mock → DB seed
├── src/lib/db/
│   ├── schema.ts                                   # 26 테이블 + relations + 추론 타입
│   └── index.ts                                    # Pool + drizzle client
├── proc/
│   └── spec/2026-05-18_be-api-design.md            # 엔티티 24 · 엔드포인트 36 · 9-phase 로드맵
├── input/
│   └── 2026-05-18_be-setup-handoff.md              # 풀림 플래너 BE 핸드오프 (패턴 원본)
└── output/
    └── 2026-05-19_be-setup-handoff.md              # ← 이 문서
```

---

## 11. 한 발짝 더 — 미해결·결정 보류

- **인증 전략 (Ph8)**: NextAuth.js v5 vs lucia-auth vs 자체 구현. 미결. Ph7까지는 `x-user-id` 헤더 폴백.
- **prod DB 선택 (Ph9)**: Neon(serverless Postgres) / Supabase / RDS. 미결.
- **마이그레이션 정책**: 현재는 `drizzle-kit migrate`로 dev/prod 동일. prod에선 별도 release flow 필요.
- **Connection pooling (prod)**: 현재 `pg.Pool max=10`. serverless 환경(Vercel)에선 pgbouncer 또는 Neon의 pooling endpoint 검토 필요.
- **chat 영속화**: `chat_messages` 테이블만 정의해두고 Ph1 시드는 비어 있음. LLM gateway 결정 후 Ph5+에서 채움.
- **JSONB vs 정규화 (replays)**: segments / transcript / focus_bins를 JSONB로 저장 중. 리플레이당 평균 50줄·~5MB 이내라 안전. 검색·집계 요구 생기면 별도 테이블로 분리.
