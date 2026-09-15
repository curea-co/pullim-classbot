import { classBots, classRoster } from '@/lib/mock/classbot';
import { getTeacherBotRows } from '@/lib/mock/classbot-teacher-ops';
import { computeProgress, type Submission, type UserAssignment } from '@/lib/store/assignments';
import type { AssignmentMode } from '@/lib/mock';

/**
 * 낸 과제 목록의 거르기·상태 판정 — 화면이 읽는 **순수 규칙**만 여기 산다
 * (`proc/spec/14 § 3.3.3`).
 *
 * `'use client'` 를 붙이지 않는다. 채점 허브(`../grading/grading-filters.ts`)가 같은 이유로
 * 규칙만 떼어 놓은 자리이고, 붙이는 순간 서버 컴포넌트에서 부를 수 없게 된다.
 *
 * ## 상태가 둘인 이유 — `dispatchStatus` 와 `Assignment.state` 는 다른 축이다
 *
 * `dispatchStatus` 는 **교사 시점**(초안·냈다·예약·회수)이고 `state` 는 **학생 시점**
 * (todo·in-progress·submitted·overdue)이다. 목록이 보여 줘야 하는 것은 「이 과제가 지금
 * 어느 단계인가」 하나라서, 둘을 섞어 **화면용 상태 하나**로 접는다(`statusOf`).
 * 접는 순서가 규칙이다 — 교사 시점이 먼저다. 회수된 과제에도 이미 제출한 학생이 남아
 * `state` 가 `submitted` 인 경우가 있는데, 그걸 「진행 중」으로 읽으면 회수가 없던 일이 된다.
 */

/** 화면에 뜨는 과제 상태 — `dispatchStatus` + `state` 를 접은 값. */
export type AssignmentRowStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'withdrawn';

export type StatusFilter = 'all' | AssignmentRowStatus;
export type ModeFilter = 'all' | AssignmentMode;

export const STATUS_FILTER_DEFAULT: StatusFilter = 'all';
export const MODE_FILTER_DEFAULT: ModeFilter = 'all';

export const statusLabels: Record<AssignmentRowStatus, string> = {
  draft: '초안',
  scheduled: '예약됨',
  live: '진행 중',
  closed: '마감',
  withdrawn: '회수됨',
};

export const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'live', label: '진행 중' },
  { value: 'closed', label: '마감' },
  { value: 'draft', label: '초안' },
  { value: 'scheduled', label: '예약됨' },
  { value: 'withdrawn', label: '회수됨' },
];

export const modeFilterOptions: { value: ModeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'practice', label: '연습' },
  { value: 'exam', label: '시험' },
  { value: 'wrong-conquest', label: '오답정복' },
];

export function toStatusFilter(v: string | undefined | null): StatusFilter {
  return v === 'draft' || v === 'scheduled' || v === 'live' || v === 'closed' || v === 'withdrawn'
    ? v
    : STATUS_FILTER_DEFAULT;
}

export function toModeFilter(v: string | undefined | null): ModeFilter {
  return v === 'practice' || v === 'exam' || v === 'wrong-conquest' ? v : MODE_FILTER_DEFAULT;
}

export interface AssignmentListFilter {
  status: StatusFilter;
  mode: ModeFilter;
  /** 반 id — 그 반에 붙은 봇의 과제만 남긴다 */
  roomId?: string;
  /** 봇 id — 반보다 좁다. 둘 다 오면 둘 다 건다 */
  botId?: string;
}

/**
 * 목록 URL — 기본값은 적지 않는다(주소만 길어진다). 채점 허브 `studentViewHref` 와 같은 결.
 */
export function assignmentListHref(f: AssignmentListFilter): string {
  const q = new URLSearchParams();
  if (f.status !== STATUS_FILTER_DEFAULT) q.set('status', f.status);
  if (f.mode !== MODE_FILTER_DEFAULT) q.set('mode', f.mode);
  if (f.roomId) q.set('room', f.roomId);
  if (f.botId) q.set('bot', f.botId);
  const query = q.toString();
  return query ? `/teacher/assignment?${query}` : '/teacher/assignment';
}

/**
 * 화면용 상태 — 교사 시점(`dispatchStatus`)이 학생 시점(`state`)보다 먼저다(위 머리주석).
 */
export function statusOf(a: UserAssignment): AssignmentRowStatus {
  if (a.dispatchStatus === 'withdrawn') return 'withdrawn';
  if (a.dispatchStatus === 'draft') return 'draft';
  // 예약은 「아직 안 나갔다」다 — 진행 중으로 접으면 회수 버튼이 붙고, 회수를 되돌릴 때
  // `sent` 로 굳어 예약이 조용히 사라진다. FE 에는 아직 이 값을 만드는 경로가 없지만
  // BE 동기화(`toUserAssignment`)가 그대로 실어 온다.
  if (a.dispatchStatus === 'scheduled') return 'scheduled';
  return a.state === 'overdue' ? 'closed' : 'live';
}

/**
 * 마감이 급한가 — 진행 중인 과제에만 묻는다.
 *
 * `dDay` 는 문자열 라벨이다(`'D-1'` · `'오늘'`). 날짜 계산을 여기서 새로 하지 않는 이유는
 * 라벨을 만드는 주인이 따로 있기 때문이다 — 봇 운영 화면(`/teacher/classbot`)의 `isUrgent`
 * 도 같은 두 값을 본다. 판정이 두 벌이 되면 같은 과제가 화면마다 다르게 급해진다.
 */
export function isDueSoon(a: UserAssignment): boolean {
  if (statusOf(a) !== 'live') return false;
  return a.dDay === 'D-1' || a.dDay === '오늘';
}

/** 봇 한 대의 이름·얼굴·붙은 반 — 목록 행이 필요로 하는 것만. */
export interface BotFacts {
  botId: string;
  botName: string;
  avatarEmoji: string;
  classrooms: { classroomId: string; label: string; studentCount: number }[];
}

/**
 * 봇 id → 이름·붙은 반. 운영 기록(`getTeacherBotRows`)이 권위다 — 「붙은 학급과 인원」을
 * 이미 그쪽이 세고 있어서, 여기서 다시 세면 두 화면의 인원이 갈린다.
 */
export function buildBotIndex(): Map<string, BotFacts> {
  const index = new Map<string, BotFacts>();
  for (const row of getTeacherBotRows()) {
    index.set(row.bot.id, {
      botId: row.bot.id,
      botName: row.bot.name,
      avatarEmoji: row.bot.avatarEmoji,
      classrooms: row.ops.classrooms.map((c) => ({
        classroomId: c.id,
        label: c.label,
        studentCount: c.studentCount,
      })),
    });
  }
  // 운영 기록에 없는 봇도 카탈로그에는 있다 — 이름이 빈 행을 만들지 않으려고 채워 둔다.
  for (const bot of classBots) {
    if (index.has(bot.id)) continue;
    index.set(bot.id, {
      botId: bot.id,
      botName: bot.name,
      avatarEmoji: bot.avatarEmoji,
      classrooms: [],
    });
  }
  return index;
}

export interface AssignmentRow {
  assignment: UserAssignment;
  botName: string;
  avatarEmoji: string;
  classroomLabels: string[];
  /** 이 과제를 받은 학생 수 */
  targetCount: number;
  /** 그중 낸 학생 수 */
  submittedCount: number;
  status: AssignmentRowStatus;
  dueSoon: boolean;
}

/**
 * 「반 전체」의 인원 — **학생별 현황 패널과 같은 명단에서 센다.**
 *
 * 종전에는 봇 운영 기록의 반 인원 합(`ops.classrooms`)을 썼다. 그런데 상세 화면 아래의
 * `SubmissionStatusPanel` 과 `RemindButton` 은 `classRoster` 를 편다 — 같은 화면에서
 * 「대상 12명」인데 명단은 18줄이 뜨고, 13명이 내면 회수 모달이 「12명 중 13명이 이미
 * 풀었어요」를 말했다. 세는 곳이 둘이면 반드시 갈린다. 패널이 실제로 보여 주는 명단이
 * 교사가 읽는 사실이므로 그쪽을 권위로 삼는다.
 */
export function wholeClassSize(): number {
  return classRoster.length;
}

/**
 * 과제 + 제출 기록 + 봇 사실 → 목록 행.
 *
 * 대상 인원은 `targetStudentIds` 가 비어 있으면 **반 전체**라는 뜻이다(store 계약).
 */
export function buildRows(
  assignments: UserAssignment[],
  submissions: Submission[],
  botIndex: Map<string, BotFacts>,
): AssignmentRow[] {
  return assignments.map((assignment) => {
    const facts = botIndex.get(assignment.botId);
    return {
      assignment,
      botName: facts?.botName ?? assignment.assignedBy,
      avatarEmoji: facts?.avatarEmoji ?? '🤖',
      classroomLabels: facts?.classrooms.map((c) => c.label) ?? [],
      targetCount: assignment.targetStudentIds.length || wholeClassSize(),
      submittedCount: computeProgress(assignment, submissions).submittedStudentCount,
      status: statusOf(assignment),
      dueSoon: isDueSoon(assignment),
    };
  });
}

export function filterRows(
  rows: AssignmentRow[],
  f: AssignmentListFilter,
  botIndex: Map<string, BotFacts>,
): AssignmentRow[] {
  return rows.filter((row) => {
    if (f.status !== 'all' && row.status !== f.status) return false;
    if (f.mode !== 'all' && row.assignment.mode !== f.mode) return false;
    if (f.botId && row.assignment.botId !== f.botId) return false;
    if (f.roomId) {
      // 과제는 반이 아니라 **봇**에 달린다(`Assignment.botId`). 그래서 반 거르기는
      // 「그 반에 붙은 봇인가」로 옮겨 묻는다 — 한 반에 여러 봇이 붙는 것이 정상이라
      // 반 id 만으로는 과제를 특정할 수 없다(`builder-types.ts` 의 `ClassAssignment` 주석).
      const facts = botIndex.get(row.assignment.botId);
      if (!facts?.classrooms.some((c) => c.classroomId === f.roomId)) return false;
    }
    return true;
  });
}

/**
 * 마감 임박순 — 급한 것이 위로.
 *
 * 순서: 급한 진행 중 → 나머지 진행 중 → 초안 → 마감 → 회수됨. 같은 칸 안에서는 낸 순서
 * 역순(새것이 위)이다. 회수된 과제를 맨 아래로 내리는 이유는 목록의 일이 「지금 돌봐야 할
 * 것」을 위에 두는 것이라서다 — 회수는 이미 끝난 결정이다.
 */
const STATUS_ORDER: Record<AssignmentRowStatus, number> = {
  live: 0,
  scheduled: 1,
  draft: 2,
  closed: 3,
  withdrawn: 4,
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
  draft: number;
} {
  return {
    live: rows.filter((r) => r.status === 'live').length,
    dueSoon: rows.filter((r) => r.dueSoon).length,
    draft: rows.filter((r) => r.status === 'draft').length,
  };
}
