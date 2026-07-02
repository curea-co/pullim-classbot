# BE assignment 모듈 — `submissions` 테이블 제안 + assignments 스키마 gap

> **원본**: `proc/spec/2026-05-18_be-api-design.md` (읽기 권위) · `proc/spec/2026-07-03_be-api-m2-amendment.md`
> **근거**: 실출시 로드맵 M2 — assignment 도메인 모듈(BE). FE 스토어
> `apps/classbot/lib/store/assignments.ts` 의 `Submission`(recordSubmission
> upsert)·`UserAssignment`(dispatch) 의미의 실전화.

## 1. 배경 — 스키마 소유권

도메인 테이블은 Drizzle(`apps/classbot/lib/db/schema.ts`, FE 레이어) 소유다.
BE PR 에 FE 파일을 섞지 않는 리포 규칙에 따라, 본 문서는 BE `assignment`
모듈이 **존재를 전제로 구현해 둔** `submissions` 테이블의 DDL 초안과 Drizzle
스키마 diff 를 후속 FE 스키마 PR 로 인도하기 위해 기록한다.

BE 구현(레포지토리 `apps/backend/src/modules/assignment/infrastructure/assignment.repository.ts`)은
이 DDL 과 정확히 일치하는 raw SQL 을 사용하며, 테이블 생성 전까지
`POST/GET /api/assignments/:id/submissions` 는 500 (relation does not exist).

## 2. `submissions` DDL 초안 (26번째 도메인 테이블)

```sql
CREATE TABLE "submissions" (
  "id"            text PRIMARY KEY,
  "assignment_id" text NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE,
  "student_id"    text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "submitted_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "answers"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "score_percent" integer NOT NULL,
  CONSTRAINT "submissions_assignment_student_uq" UNIQUE ("assignment_id", "student_id")
);
CREATE INDEX "submissions_assignment_idx" ON "submissions" ("assignment_id");
CREATE INDEX "submissions_student_idx" ON "submissions" ("student_id");
```

- **멱등 invariant** — `(assignment_id, student_id)` unique: FE
  `recordSubmission` 의 "동일 assignment+student 는 갱신(upsert)" 의미를 DB 로
  강제. BE 는 `INSERT ... ON CONFLICT DO UPDATE`(id 유지, submitted_at NOW()
  갱신) 로 upsert 한다.
- `answers` — `{ [questionId]: answer }` (FE `Submission.answers` 그대로).
- `score_percent` — 0~100 정수 (FE `computeMockScore` 산출).

### Drizzle 스키마 diff 제안 (`apps/classbot/lib/db/schema.ts`)

```ts
export const submissions = pgTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id').notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    answers: jsonb('answers').$type<Record<string, string>>().notNull().default({}),
    scorePercent: integer('score_percent').notNull(),
  },
  (t) => ({
    byAssignmentStudent: uniqueIndex('submissions_assignment_student_uq')
      .on(t.assignmentId, t.studentId),
    byAssignment: index('submissions_assignment_idx').on(t.assignmentId),
    byStudent: index('submissions_student_idx').on(t.studentId),
  }),
);
```

## 3. assignments 스키마 gap — 발사(dispatch) 필드

FE `UserAssignment` 확장 필드 중 assignments 테이블에 컬럼이 없는 것들.
BE `POST /api/assignments` 는 현재 다음과 같이 처리한다:

| FE 필드 | 현재 BE 처리 | 후속 컬럼 제안 |
|---|---|---|
| `targetStudentIds: []`(전체) | `student_id = NULL` 로 표현 — 목록 필터가 enrolled 스코프로 재현 | (현행 유지 가능) |
| `targetStudentIds: [1명]` | `student_id = 그 학생` | (현행 유지 가능) |
| `targetStudentIds: [2명+]` | **400 거부** — 표현 불가 | `target_student_ids jsonb` 추가 시 단일 행 다중 대상 지원 |
| `dispatchedAt` | 미저장(`assigned_at_label='방금 발사'` 고정 라벨) | `dispatched_at timestamptz DEFAULT now()` — 목록 정렬 키로도 필요(현재 id DESC) |
| `examTimeLimitMin` | 타입 검증만, 미저장 | `exam_time_limit_min integer` |
| `requizQuestionIds` | 타입 검증만, 미저장(문항 콘텐츠는 M3) | `requiz_question_ids jsonb` — M3 문항 레이어와 함께 |
| `dispatchStatus` | 미저장(발사 즉시 `sent` 의미로 insert) | draft/scheduled/withdrawn 지원 시 `dispatch_status` |

> 이 gap 들은 M2 core 플로우(전체/단일 발사 → 학생 목록 노출 → 제출 → 교사
> 제출 현황)에는 영향이 없다. FE 스키마 PR 에서 컬럼이 추가되면 BE 는
> parse 단계의 400 제거 + insert 컬럼 확장만으로 수용한다.
