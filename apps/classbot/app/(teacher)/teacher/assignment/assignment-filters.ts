import { classNameOf, type AssignmentSummaryDto, type BotCardDto } from '@/lib/api/classbot-dto';
import { remainingDDay } from '@/lib/assignment-due';
import { dDayLabel } from '@/lib/assignment-labels';
import type { AssignmentMode } from '@/lib/mock';

/**
 * 낸 과제 목록의 거르기·상태 판정 — 화면이 읽는 **순수 규칙**만 여기 산다
 * (`proc/spec/14 § 3.3.3` · 2026-09-16 계획 §06 R11).
 *
 * 입력은 정본 행(`AssignmentSummaryDto` — `GET /classbot/assignments?audience=teacher`)이다. 종전의
 * `UserAssignment`(localStorage) + `Submission` 합산은 PR 6 에서 걷었다. 그래서 둘이 바뀐다:
 *  - **제출 수는 여기 없다.** 목록 DTO 에 제출 집계가 없고, 줄마다 `/submissions` 를 부르면 N+1 이다.
 *    「누가 냈나」는 상세(`[id]`)가 답한다.
 *  - **상태는 마감 하나로 갈린다 — 진행 중 · 마감.** 정본은 내는 순간 `dispatch_status='sent'` 로 저장하고 초안·예약·
 *    회수를 만드는 문이 없다(계획 §05 표에 그 줄이 없다). 없는 상태의 칩·빈 상태를 두지 않는다 — 그 값이 생기는 날
 *    `statusOf` 가 접는 자리다.
 *
 * 마감은 **지금 기준**이다 — 정본 `dDay` 는 낼 때 굳힌 정수라 `dispatchedAt` 부터 지난 날수를 빼서 다시 센다
 * (`remainingDDay`). 그래야 「D-3 으로 낸 과제」가 닷새 뒤에 「마감」으로 선다.
 *
 * `'use client'` 를 붙이지 않는다. 채점 허브(`../grading/grading-filters.ts`)가 같은 이유로 규칙만 떼어 놓은
 * 자리이고, 붙이는 순간 서버 컴포넌트에서 부를 수 없게 된다.
 */

/**
 * 과제 축이 읽는 반 한 칸 — 정본 반 카드(`useOperatorClasses` · `GET /classbot/bots?role=teacher`, #351)에서
 * 필요한 것만. 카드 탐색 키가 아직 반이라 `id` 가 곧 반 id 이며, 과제 내기 경로의 `:classId` 와 과제 행의 `classId` 가 이 값이다.
 */
export interface TeacherClass {
  id: string;
  /**
   * **반** 이름(카드의 `className`) — 봇 이름이 아니다.
   *
   * ⚠ 이 칸이 과제 배포 드롭다운의 선택지 라벨이다(`new/assignment-form.tsx`). 봇 이름을 넣으면
   * **같은 봇을 건 두 반이 완전히 같은 선택지**가 된다 — 함께 붙는 과목·학년도 같은 `bots` 행에서 와서
   * 그것으로도 안 갈린다. 표시 회귀가 아니라 **오배포 위험**이다(`classNameOf` 머리주석).
   */
  name: string;
  /** 프로필이 없으면 빈 문자열 — 채우는 쪽(과제 내기)이 폴백을 정한다. */
  subject: string;
  grade: string;
  /** 참여 학생 수 — 프로필이 없으면 null(모른다). */
  enrolledCount: number | null;
  isActive: boolean;
}

/**
 * `BotCardDto` → `TeacherClass`. 붙은 봇이 없는 반은 `profile` 이 null 이라 과목·학년이 비고 인원을 모른다.
 * @param card - `useOperatorClasses` 한 장
 */
export function toTeacherClass(card: BotCardDto): TeacherClass {
  return {
    id: card.id,
    // **`card.name` 이 아니다** — 위 `name` 주석의 오배포 위험이 이 한 줄에 달려 있다.
    name: classNameOf(card),
    subject: card.profile?.subject ?? '',
    grade: card.profile?.grade ?? '',
    enrolledCount: card.profile?.enrolledCount ?? null,
    isActive: card.isActive,
  };
}

/** 화면에 뜨는 과제 상태 — 정본이 만드는 값은 이 둘뿐이다(머리주석). */
export type AssignmentRowStatus = 'live' | 'closed';

export type StatusFilter = 'all' | AssignmentRowStatus;
export type ModeFilter = 'all' | AssignmentMode;

export const STATUS_FILTER_DEFAULT: StatusFilter = 'all';
export const MODE_FILTER_DEFAULT: ModeFilter = 'all';

export const statusLabels: Record<AssignmentRowStatus, string> = {
  live: '진행 중',
  closed: '마감',
};

export const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'live', label: '진행 중' },
  { value: 'closed', label: '마감' },
];

export const modeFilterOptions: { value: ModeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'practice', label: '연습' },
  { value: 'exam', label: '시험' },
  { value: 'wrong-conquest', label: '오답정복' },
];

export function toStatusFilter(v: string | undefined | null): StatusFilter {
  return v === 'live' || v === 'closed' ? v : STATUS_FILTER_DEFAULT;
}

export function toModeFilter(v: string | undefined | null): ModeFilter {
  return v === 'practice' || v === 'exam' || v === 'wrong-conquest' ? v : MODE_FILTER_DEFAULT;
}

export interface AssignmentListFilter {
  status: StatusFilter;
  mode: ModeFilter;
  /** 반(=bot) id — 그 반의 과제만 남긴다. bot == class 라 종전의 `room`·`bot` 두 칸이 하나로 접혔다. */
  classId?: string;
}

/**
 * 목록 URL — 기본값은 적지 않는다(주소만 길어진다). 채점 허브 `studentViewHref` 와 같은 결.
 */
export function assignmentListHref(f: AssignmentListFilter): string {
  const q = new URLSearchParams();
  if (f.status !== STATUS_FILTER_DEFAULT) q.set('status', f.status);
  if (f.mode !== MODE_FILTER_DEFAULT) q.set('mode', f.mode);
  if (f.classId) q.set('class', f.classId);
  const query = q.toString();
  return query ? `/teacher/assignment?${query}` : '/teacher/assignment';
}

/** 서버가 string 으로 준 모드를 화면 union 으로 — 낯선 값은 연습으로 접는다(학생 목록과 같은 폴백). */
export function modeOf(a: AssignmentSummaryDto): AssignmentMode {
  return a.mode === 'exam' || a.mode === 'wrong-conquest' ? a.mode : 'practice';
}

/** 지금 기준 남은 날수 — 정본의 굳힌 `dDay` 를 `dispatchedAt` 로 다시 센 값(`remainingDDay`). */
export function remainingOf(a: AssignmentSummaryDto, now: number = Date.now()): number {
  return remainingDDay(a.dDay, a.dispatchedAt, now);
}

/** 화면용 상태 — 남은 날수가 음수면 마감, 아니면 진행 중. */
export function statusOf(a: AssignmentSummaryDto, now: number = Date.now()): AssignmentRowStatus {
  return remainingOf(a, now) < 0 ? 'closed' : 'live';
}

/** 마감이 급한가 — 진행 중이고 오늘(0)·내일(1)이면 급하다. */
export function isDueSoon(a: AssignmentSummaryDto, now: number = Date.now()): boolean {
  const remaining = remainingOf(a, now);
  return remaining >= 0 && remaining <= 1;
}

export interface AssignmentRow {
  assignment: AssignmentSummaryDto;
  /** 반 이름 — 반 목록에서 못 찾으면 빈 문자열(화면이 「반 이름 없음」으로 말한다). */
  className: string;
  /**
   * 아바타 이니셜의 출처. **비지 않는다** — 반을 못 찾아도 과제 행이 제 과목을 들고 있다.
   * 학생 쪽 같은 자리(`app/(student)/classbot/assignment/page.tsx` 의 `meta?.subject ?? a.subject`)와 같은 폴백 체인이다.
   */
  subject: string;
  mode: AssignmentMode;
  status: AssignmentRowStatus;
  dueSoon: boolean;
  /** 「내일 22:00」 같은 낼 때 굳힌 라벨. */
  dueLabel: string;
  /** 지금 기준 남은 날수 → 「D-3」·「오늘」·「지난 2일」. */
  dDayLabel: string;
}

/**
 * 정본 행 + 반 목록 → 목록 행.
 * @param assignments - `useTeacherAssignments` 결과
 * @param classes - `useOperatorClasses` 결과를 `toTeacherClass` 로 옮겨 id 로 색인한 것
 * @param now - 기준 시각(테스트 주입용)
 */
export function buildRows(
  assignments: AssignmentSummaryDto[],
  classes: ReadonlyMap<string, TeacherClass>,
  now: number = Date.now(),
): AssignmentRow[] {
  return assignments.map((assignment) => {
    const klass = classes.get(assignment.classId);
    return {
      assignment,
      className: klass?.name ?? '',
      subject: klass?.subject || assignment.subject,
      mode: modeOf(assignment),
      status: statusOf(assignment, now),
      dueSoon: isDueSoon(assignment, now),
      dueLabel: assignment.dueLabel,
      dDayLabel: dDayLabel(remainingOf(assignment, now)),
    };
  });
}

export function filterRows(rows: AssignmentRow[], f: AssignmentListFilter): AssignmentRow[] {
  return rows.filter((row) => {
    if (f.status !== 'all' && row.status !== f.status) return false;
    if (f.mode !== 'all' && row.mode !== f.mode) return false;
    if (f.classId && row.assignment.classId !== f.classId) return false;
    return true;
  });
}

/**
 * 마감 임박순 — 급한 것이 위로.
 *
 * 순서: 급한 진행 중 → 나머지 진행 중 → 마감. 같은 칸 안에서는 낸 순서 역순(새것이 위)이다.
 * 목록의 일은 「지금 돌봐야 할 것」을 위에 두는 것이다 — 끝난 과제가 밑이다.
 */
const STATUS_ORDER: Record<AssignmentRowStatus, number> = {
  live: 0,
  closed: 1,
};

export function sortRows(rows: AssignmentRow[]): AssignmentRow[] {
  return [...rows].sort((a, b) => {
    if (a.dueSoon !== b.dueSoon) return a.dueSoon ? -1 : 1;
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    const at = a.assignment.dispatchedAt ?? '';
    const bt = b.assignment.dispatchedAt ?? '';
    if (at !== bt) return at < bt ? 1 : -1;
    return a.assignment.title.localeCompare(b.assignment.title, 'ko');
  });
}

/** 요약 띠 — 목록이 아니라 **전체**를 센다(거르기를 걸어도 숫자는 그대로다). */
export function summarize(rows: AssignmentRow[]): {
  live: number;
  dueSoon: number;
  closed: number;
} {
  return {
    live: rows.filter((r) => r.status === 'live').length,
    dueSoon: rows.filter((r) => r.dueSoon).length,
    closed: rows.filter((r) => r.status === 'closed').length,
  };
}
