/**
 * 교사 과제 — 출제(발사) + 내가 낸 과제 목록 (계약 §4 「교사」).
 *
 * 발사는 학생 수만큼 행을 만들지 않는다. **행 하나**에 `student_id = NULL` 과
 * `target_student_ids` 로 대상을 적고, 학생 쪽 조회 술어가 그걸 펼쳐 읽는다
 * (`app/api/_lib/assignment-visibility.ts`). `target_student_ids = []` 는 반 전체다.
 *
 * `dispatched_at` 은 스키마 주석(lib/db/schema.ts:421)이 "실제 발사 전이에서만 기록" 하라고
 * 못박은 컬럼이다 — 이 라우트가 바로 그 전이라서 여기서 지금 시각을 적는다.
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments, classBots, enrollments } from '@/lib/db/schema';
import {
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  readTrimmed,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

const DIFFICULTIES = ['하', '중', '상'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const MODES = ['practice', 'exam', 'wrong-conquest'] as const;
type Mode = (typeof MODES)[number];

/**
 * 문항 수 상한 — **모드마다 다르다** (spec 14 § 5.1 「문항 수 1 ≤ N ≤ 50 · 시험은 60까지」).
 *
 * 예전에는 모드와 무관하게 100 이었다. 「시험 최대치를 넉넉히 덮는 방어값」이라 적어 뒀는데,
 * 넉넉한 쪽이 문제였다 — 폼을 우회하면 연습 51~100, 시험 61~100 이 그대로 저장된다.
 * 상한은 넉넉하라고 있는 게 아니라 계약을 지키라고 있다.
 */
const MAX_QUESTION_COUNT: Record<Mode, number> = {
  practice: 50,
  'wrong-conquest': 50,
  exam: 60,
};
/** 단원 표시 문자열 상한 — 화면에 한 줄로 그려지는 값이라 길 이유가 없다. */
const MAX_SCOPE_LEN = 200;

/**
 * 「봇 한 마디」 상한 — 교사 폼이 입력 단계에서 이미 `slice(0, 200)` 로 자르고 라벨에도
 * 「200자」라고 적어 둔 값과 **같다**(`assignment-form.tsx`). 단원 문자열과 같은 자리에서
 * 같은 방식으로 자른다.
 */
const MAX_REASON_HINT_LEN = 200;

/**
 * 성취기준 코드 상한 — 단원 하나에 코드 하나가 붙는 게 보통이라(`lib/mock/classbot.ts`
 * 단원표) 50개면 범위 선택까지 넉넉히 덮는다. 개수·길이 둘 다 막는 이유는 이 값이
 * `jsonb` 컬럼에 통째로 들어가서, 안 막으면 본문 한 덩어리가 그대로 저장되기 때문이다.
 */
const MAX_ACHIEVEMENT_CODES = 50;
const MAX_ACHIEVEMENT_CODE_LEN = 64;

/**
 * 시험 제한 시간(분) 경계 — 교사 폼 슬라이더의 `min`/`max` 와 **같은 값**이다
 * (`app/(teacher)/teacher/assignment/new/assignment-form.tsx`). 여기가 더 좁으면 폼에서
 * 고를 수 있는 값이 400 으로 튕긴다.
 *
 * 슬라이더의 `step={10}` 은 여기서 강제하지 않는다 — 그건 고르기 편하라고 둔 UI 간격이지
 * 도메인 규칙이 아니다. 잘못 좁히면 나중에 5분 단위를 열 때 서버부터 고쳐야 한다.
 */
const EXAM_TIME_LIMIT_MIN = 10;
const EXAM_TIME_LIMIT_MAX = 180;

/**
 * 모드별 Scope override (spec 14 § 5.2).
 *
 * 예전에는 `mode === 'exam' ? 1 : null` 이라 **오답정복이 봇 기본 Scope 로 떨어졌다.**
 * 명세는 오답정복의 기본값을 5 로 정해 두었다 — 틀린 문제를 다시 푸는 모드라 더 넓게 본다.
 * `null` 은 「봇 기본 Scope 를 쓴다」는 뜻이고 연습만 그렇다.
 */
const SCOPE_OVERRIDE_BY_MODE: Record<Mode, number | null> = {
  exam: 1,
  'wrong-conquest': 5,
  practice: null,
};

/**
 * 마감 라벨에서 D-day 를 뽑는다 — `d_day` 가 NOT NULL 이라 빈칸을 둘 수 없다.
 *
 * 라벨은 FE `formatDueLabel` 이 만든 `오늘 22:00` · `내일 22:00` · `7/3 22:00` 세 모양이다.
 * 날짜꼴이면 남은 날을 세고, 못 읽으면 `D-1`(폼 기본값) 로 둔다.
 * @param dueLabel - 마감 라벨
 * @returns `오늘` 또는 `D-n`
 */
function deriveDDay(dueLabel: string): string {
  if (dueLabel.startsWith('오늘')) return '오늘';
  if (dueLabel.startsWith('내일')) return 'D-1';

  const match = /^(\d{1,2})\/(\d{1,2})/.exec(dueLabel);
  if (!match) return 'D-1';

  const now = new Date();
  const due = new Date(now.getFullYear(), Number(match[1]) - 1, Number(match[2]));
  // 해가 바뀌는 마감(12월 → 1월)은 과거로 계산되므로 한 해를 더한다.
  if (due.getTime() < now.getTime() - 86400000 * 180) {
    due.setFullYear(due.getFullYear() + 1);
  }
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  return diffDays <= 0 ? '오늘' : `D-${diffDays}`;
}

/**
 * 마감 시각을 읽는다 — **표시용 라벨이 아니라 진짜 시각**이다.
 *
 * spec 14 § 5.1 은 마감이 **미래**여야 한다고 정한다. 그런데 이 라우트는 오래도록
 * `dueLabel`(「내일 22:00」 같은 표시 문자열)만 받아서, 비어 있는지 말고는 아무것도 검증할 수
 * 없었다 — 폼을 우회하면 임의 문자열도 이미 지난 날짜도 그대로 발사됐다.
 *
 * 그래서 ISO 시각을 함께 받는다. 교사 폼은 이미 그 값을 들고 있다
 * (`assignment-form.tsx` 의 `dueIso` — 라벨과 D-day 둘 다 거기서 파생한다).
 *
 * **지금은 선택이다.** 보내는 쪽(#269)이 아직 안 싣기 때문이고, 그쪽이 실으면 필수로 좁히는
 * 것이 다음 단계다. 온 경우에는 반드시 검증한다 — 있으나 마나 한 필드를 두지 않는다.
 *
 * @param value - 본문의 `dueAt`(ISO 8601)
 * @param now - 기준 시각(테스트 주입용)
 * @returns `{ ok: true, value }` — 없으면 `value: null`. 형식이 틀리거나 과거면 `{ ok: false }`
 */
function readDueAt(
  value: unknown,
  now: Date,
): { ok: true; value: Date | null } | { ok: false } {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  if (typeof value !== 'string') return { ok: false };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  // 미래여야 한다 — 이미 지난 마감으로 발사하면 학생 화면에 태어나자마자 지각으로 뜬다.
  if (parsed.getTime() <= now.getTime()) return { ok: false };

  return { ok: true, value: parsed };
}

/**
 * 시험 제한 시간을 읽는다.
 *
 * `null` 이 **정상값**이라 `readStudentIds` 처럼 null 로 잘못을 알릴 수 없다 — 그래서
 * 성공/실패를 따로 싣는다.
 *
 * @param value - 본문의 `examTimeLimitMin`
 * @param mode - 과제 방식. 시험이 아니면 값이 와도 `null` 로 떨어뜨린다(거절하지 않는다)
 * @returns `{ ok: true, value }` 또는 범위를 벗어났을 때 `{ ok: false }`
 */
function readExamTimeLimit(
  value: unknown,
  mode: Mode,
): { ok: true; value: number | null } | { ok: false } {
  if (mode !== 'exam') return { ok: true, value: null };
  if (value === undefined || value === null) return { ok: true, value: null };
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < EXAM_TIME_LIMIT_MIN ||
    value > EXAM_TIME_LIMIT_MAX
  ) {
    return { ok: false };
  }
  return { ok: true, value };
}

/**
 * 성취기준 코드 배열을 읽는다.
 *
 * `readStudentIds` 와 같은 규약이다 — 생략은 빈 배열, **형식이 틀리면 null**(호출부가 400).
 * 컬럼이 `NOT NULL DEFAULT '[]'` 라 「없음」은 빈 배열 하나로만 적는다.
 *
 * @param value - 본문의 `achievementCodes`
 * @returns 다듬은 코드 배열(중복 제거), 형식이 틀리면 null
 */
function readAchievementCodes(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_ACHIEVEMENT_CODES) return null;

  const codes: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const code = item.trim();
    if (!code || code.length > MAX_ACHIEVEMENT_CODE_LEN) return null;
    codes.push(code);
  }
  return [...new Set(codes)];
}

/**
 * 마감 시각에서 D-day 를 센다 — 날짜 경계로 자른다(시:분은 안 본다).
 * @param due - 마감 시각
 * @param now - 기준 시각
 * @returns `오늘` 또는 `D-n`
 */
function dDayFromDate(due: Date, now: Date): string {
  const startOfDay = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(due) - startOfDay(now)) / 86400000);
  return diffDays <= 0 ? '오늘' : `D-${diffDays}`;
}

/** 문자열 배열인지 확인하고 다듬어 돌려준다. 배열이 아니면 null. */
function readStudentIds(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) return null;
    ids.push(item.trim());
  }
  return [...new Set(ids)];
}

/**
 * 내가 낸 과제 목록 — `created_by` 가 나인 행.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { assignments } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 볼 수 있어요.');

  const rows = await getDb()
    .select()
    .from(assignments)
    .where(eq(assignments.createdBy, actor.id))
    // id 는 uuid 라 시간순이 아니다 — 발사 시각으로 정렬한다.
    .orderBy(desc(assignments.dispatchedAt), desc(assignments.id));

  return NextResponse.json({ assignments: rows });
}

/**
 * 과제를 발사한다 — 반 전체(`targetStudentIds` 생략) 또는 지정 학생.
 * @param req - body `{ botId, title, dueLabel, questionCount, difficulty, mode, scope?,
 *   chapterFrom?, chapterTo?, achievementCodes?, reasonHint?, examTimeLimitMin?,
 *   dueAt?, targetStudentIds? }`
 * @returns 201 { assignment } | 400 | 401 | 403(역할) | 404(내 봇이 아님)
 */
export async function POST(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 과제를 낼 수 있어요.');

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const botId = readTrimmed(body.botId);
  const title = readTrimmed(body.title);
  const dueLabel = readTrimmed(body.dueLabel);
  if (!botId) return invalidInput('어느 수업방에 낼지 골라 주세요.');
  if (!title) return invalidInput('과제 이름을 적어 주세요.');
  if (!dueLabel) return invalidInput('마감을 정해 주세요.');

  const now = new Date();
  const dueAt = readDueAt(body.dueAt, now);
  if (!dueAt.ok) {
    return invalidInput('마감은 지금보다 뒤인 시각으로 적어 주세요.');
  }

  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) {
    return invalidInput('난이도는 하·중·상 중에서 골라 주세요.');
  }
  const difficulty = body.difficulty as Difficulty;

  // 문항 수 상한이 모드에 걸리므로 **모드를 먼저** 정한다.
  if (!MODES.includes(body.mode as Mode)) {
    return invalidInput('과제 방식이 올바르지 않아요.');
  }
  const mode = body.mode as Mode;

  const maxQuestions = MAX_QUESTION_COUNT[mode];
  const questionCount = body.questionCount;
  if (
    typeof questionCount !== 'number' ||
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > maxQuestions
  ) {
    return invalidInput(`문항 수는 1에서 ${maxQuestions} 사이 정수로 적어 주세요.`);
  }

  /*
    단원 — 교사가 고른 값을 그대로 싣는다.

    예전엔 여기서 '단원 미정'·''·'' 을 박아 넣었다. 그래서 교사 화면의 로컬 사본에는 고른
    단원이 남는데 **서버에서 읽는 학생·학부모 화면은 그 단원을 영영 잃었다**(계약 14 §1·§3.3.1·§5.4
    는 발사 payload 에 단원이 따라가야 한다고 정한다).

    길이 상한은 표시용 문자열 기준으로 넉넉히 둔다 — 없으면 본문 한 덩어리가 그대로 컬럼에 들어간다.
    비워 보내면 예전 기본값으로 떨어진다(단원을 안 고르고 낸 경로가 실제로 있다).
  */
  const scope = readTrimmed(body.scope).slice(0, MAX_SCOPE_LEN);
  const chapterFrom = readTrimmed(body.chapterFrom).slice(0, MAX_SCOPE_LEN);
  const chapterTo = readTrimmed(body.chapterTo).slice(0, MAX_SCOPE_LEN);

  /*
    성취기준 코드 · 봇 한 마디 — 단원과 **같은 모양의 유실**이었다. 컬럼
    (`achievement_codes` · `reason_hint`)은 진작 있는데 쓰는 경로가 없어서, 교사가 단원을
    고르고 한 마디를 적어도 서버에는 빈 배열과 null 만 남았다. 그래서 실DB 를 읽는 학생
    개요가 「왜 이 과제가 왔는지」를 영영 못 보여 준다(spec 12 § 3.3.2 · 14 § 3.3.1 · § 5.4).

    코드는 형식이 틀리면 400 이고(배열이 아님·문자열 아님·빈 값·개수/길이 초과), 한 마디는
    단원 문자열과 같이 다듬어 자른다 — 폼이 입력 단계에서 이미 같은 길이로 자르고 있다.
  */
  const achievementCodes = readAchievementCodes(body.achievementCodes);
  if (achievementCodes === null) {
    return invalidInput('성취기준 코드가 올바르지 않아요.');
  }

  const reasonHint = readTrimmed(body.reasonHint).slice(0, MAX_REASON_HINT_LEN);

  /*
    시험 제한 시간 — 단원과 **같은 모양의 유실**이었다. 컬럼(`exam_time_limit_min`)은 진작
    있는데 쓰는 경로가 없어서, 교사가 슬라이더로 30분을 고르든 90분을 고르든 서버에는 늘
    null 이 남았다. 그래서 실DB 를 읽는 학생·교사 화면이 제한 시간을 복원하지 못한다.

    시험 모드가 아닐 때 온 값은 **거절이 아니라 무시**한다(null). 폼이 모드를 바꾸는 순간
    남아 있던 슬라이더 값이 같이 날아가는 게 정상인데, 그걸 400 으로 되받으면 교사는
    「시간 제한」이 보이지도 않는 화면에서 이유 모를 오류를 만난다. `scope_override` 가
    `mode === 'exam'` 에서만 1 인 것과 같은 결이다.
  */
  const timeLimit = readExamTimeLimit(body.examTimeLimitMin, mode);
  if (!timeLimit.ok) {
    return invalidInput(
      `시험 시간은 ${EXAM_TIME_LIMIT_MIN}분에서 ${EXAM_TIME_LIMIT_MAX}분 사이 정수로 적어 주세요.`,
    );
  }

  const targetStudentIds = readStudentIds(body.targetStudentIds);
  if (targetStudentIds === null) {
    return invalidInput('보낼 학생 목록이 올바르지 않아요.');
  }

  const db = getDb();

  // 봇 소유권 — 요청이 준 botId 를 그대로 믿지 않고 **조회 조건에 명의를 넣는다**.
  // 남의 봇이면 0행 → 404. 403 으로 답하면 그 봇이 존재한다는 사실이 새 나간다.
  const [bot] = await db
    .select({
      id: classBots.id,
      name: classBots.name,
      subject: classBots.subject,
      grade: classBots.grade,
    })
    .from(classBots)
    .where(and(eq(classBots.id, botId), eq(classBots.teacherId, actor.id)))
    .limit(1);
  if (!bot) return notFound('수업방을 찾을 수 없어요.');

  // 지정 발사면 그 학생들이 정말 이 방에 있는지 본다 — 밖의 학생에게 새는 걸 막는다.
  if (targetStudentIds.length > 0) {
    const enrolled = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.botId, botId),
          inArray(enrollments.studentId, targetStudentIds),
        ),
      );
    if (enrolled.length !== targetStudentIds.length) {
      return invalidInput('이 수업방에 없는 학생이 섞여 있어요.');
    }
  }

  const id = `as_${randomUUID()}`;
  let assignment: typeof assignments.$inferSelect | undefined;
  try {
    [assignment] = await db
      .insert(assignments)
      .values({
        id,
        botId,
        // 반 단위 발사 — 학생별 행을 만들지 않는다.
        studentId: null,
        title,
        scope: scope || '단원 미정',
        subject: bot.subject,
        grade: bot.grade,
        chapterFrom,
        chapterTo,
        achievementCodes,
        questionCount,
        difficulty,
        mode,
        // spec 14 § 5.2 — 시험은 1 강제, 오답정복은 5 가 기본, 연습은 봇 기본 Scope(null).
        scopeOverride: SCOPE_OVERRIDE_BY_MODE[mode],
        examTimeLimitMin: timeLimit.value,
        source: 'teacher-assigned',
        assignedBy: bot.name,
        assignedAtLabel: '방금 발사',
        dueLabel,
        // 진짜 시각이 왔으면 그걸로 센다 — 라벨 파싱보다 정확하다.
        dDay: dueAt.value ? dDayFromDate(dueAt.value, now) : deriveDDay(dueLabel),
        // 안 적고 내는 경로가 정상이다 — 빈 문자열 대신 null 로 둔다(컬럼이 nullable).
        reasonHint: reasonHint || null,
        state: 'todo',
        solveHref: `/classbot/assignment/${id}/solve?step=1`,
        // 빈 배열 = 반 전체(스키마가 정한 규약 — null 이중표현 금지).
        targetStudentIds,
        dispatchStatus: 'sent',
        createdBy: actor.id,
        // 지금이 실제 발사 전이다 — 그래서 여기서만 적는다.
        dispatchedAt: new Date(),
      })
      .returning();
  } catch {
    // FK 위반 등 쓰기 실패 — 정본 라우트와 같게 400 으로 답한다(500 을 흘리지 않는다).
    return invalidInput('과제를 내지 못했어요.');
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
