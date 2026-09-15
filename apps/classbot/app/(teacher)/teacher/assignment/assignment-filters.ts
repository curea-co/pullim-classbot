import { classBots, classRoster } from '@/lib/mock/classbot';
import { getTeacherBotRows } from '@/lib/mock/classbot-teacher-ops';
import type { Submission, UserAssignment } from '@/lib/store/assignments';
import { computeDDay, formatDueLabel } from '@/lib/assignment-due';
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
export function statusOf(a: UserAssignment, now: number = Date.now()): AssignmentRowStatus {
  if (a.dispatchStatus === 'withdrawn') return 'withdrawn';
  if (a.dispatchStatus === 'draft') return 'draft';
  // 예약은 「아직 안 나갔다」다 — 진행 중으로 접으면 회수 버튼이 붙고, 회수를 되돌릴 때
  // `sent` 로 굳어 예약이 조용히 사라진다. FE 에는 아직 이 값을 만드는 경로가 없지만
  // BE 동기화(`toUserAssignment`)가 그대로 실어 온다.
  if (a.dispatchStatus === 'scheduled') return 'scheduled';
  return isPastDue(a, now) ? 'closed' : 'live';
}

/**
 * 마감 **시각** — 없으면 null.
 *
 * `dueLabel` · `dDay` 는 **낼 때 굳은 문자열**이라 시간이 지나도 안 움직인다. 그걸로 마감을
 * 판정하면 「D-7 로 낸 과제」가 한 달 뒤에도 D-7 이고, 「D-1 로 낸 과제」는 영원히 마감 임박이다.
 */
function dueAtOf(a: UserAssignment): number | null {
  if (!a.dueAt) return null;
  const t = new Date(a.dueAt).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * 마감이 지났는가.
 *
 * `dueAt` 이 있으면 그것이 답이다. 없으면 **서버 판정**(`state === 'overdue'`)으로 떨어진다 —
 * BE 동기화로 온 행은 마감 시각을 안 싣고 상태만 싣는다. 둘 다 없으면 「안 지났다」이고,
 * 그건 옛 로컬 행(마감 시각이 없던 시절)뿐이다.
 */
export function isPastDue(a: UserAssignment, now: number = Date.now()): boolean {
  const at = dueAtOf(a);
  if (at != null) return at <= now;
  return a.state === 'overdue';
}

/**
 * 화면에 찍을 마감 — **굳은 라벨이 아니라 지금 기준으로 다시 센다.**
 *
 * 이 PR 의 논지가 「`dDay` 는 낼 때 굳으니 판정에 쓰지 마라」인데, 정작 화면이 그 문자열을
 * 그대로 찍고 있었다: 한 달 전에 D-1 로 낸 과제가 오늘도 빨간 「D-1」로 뜨고, 목록 줄은
 * 「D-7」을 위험 색으로 칠했다(색은 살아 있는 판정, 글자는 굳은 라벨이라 서로 어긋났다).
 * `dueAt` 이 있으면 그것으로 다시 세고, 없는 옛 행에서만 저장된 라벨로 떨어진다.
 */
export function dueDisplay(a: UserAssignment, now: number = Date.now()): {
  label: string;
  dDay: string;
} {
  const at = dueAtOf(a);
  if (at == null) return { label: a.dueLabel, dDay: a.dDay };
  const iso = new Date(at).toISOString();
  /*
    **지난 마감은 「오늘」이 아니다.** `computeDDay` 는 지난 시각을 전부 `'오늘'` 로 접는다 —
    낼 때는 마감이 늘 미래라 안전한 규칙이지만, 지나간 과제를 **되보는** 이 화면에서는
    3주 전에 끝난 과제가 「오늘」로 뜨고 옆의 「마감」 칩과 어긋난다.
    지난 것은 며칠 지났는지로 말한다(`08 § 15.6` 의 지연 표기와 같은 말).
  */
  if (at <= now) {
    /*
      **라벨도 함께 고쳐야 한다.** `formatDueLabel` 은 `computeDDay` 에 기대는데 그쪽이 지난
      시각을 전부 `'오늘'` 로 접으므로, 그대로 쓰면 3주 전 마감이 「지난 21일 (**오늘** 09:00)」로
      나온다 — D-day 만 고치고 라벨을 두면 같은 칸 안에서 스스로 모순된다.
      지난 것은 언제였는지를 날짜로 말한다.
    */
    const d = new Date(at);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const daysLate = Math.floor((now - at) / 86_400_000);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`,
      dDay: daysLate >= 1 ? `지난 ${daysLate}일` : '마감',
    };
  }
  return { label: formatDueLabel(iso, now), dDay: computeDDay(iso, now) };
}

/** 하루 — 「마감 임박」의 창. */
const DUE_SOON_MS = 24 * 60 * 60 * 1000;

/**
 * 마감이 급한가 — 진행 중인 과제에만 묻는다.
 *
 * 하루 안에 닫히면 급하다. **라벨을 보지 않는다** — 위 `dueAtOf` 주석대로 라벨은 낼 때
 * 굳어서, `dDay === 'D-1'` 로 재면 그렇게 낸 과제가 영원히 급한 상태로 남는다.
 * `dueAt` 을 모르는 옛 행은 급하지 않은 것으로 본다(모를 때 빨갛게 칠하지 않는다).
 */
export function isDueSoon(a: UserAssignment, now: number = Date.now()): boolean {
  if (statusOf(a, now) !== 'live') return false;
  const at = dueAtOf(a);
  if (at == null) return false;
  return at - now <= DUE_SOON_MS;
}

/** 봇 한 대의 이름·과목·얼굴·붙은 반 — 목록 행이 필요로 하는 것만. */
export interface BotFacts {
  botId: string;
  botName: string;
  /** 아바타 이니셜의 1순위 출처(`BotAvatar`). 없으면 이름 첫 글자로 내려간다. */
  subject: string;
  /** 데이터 계약([08 § 14.1.1] 예외 2) — 목록 행은 읽지 않지만 지우지 않는다. */
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
      subject: row.bot.subject,
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
      subject: bot.subject,
      avatarEmoji: bot.avatarEmoji,
      classrooms: [],
    });
  }
  return index;
}

export interface AssignmentRow {
  assignment: UserAssignment;
  botName: string;
  /**
   * 아바타 이니셜의 출처. **비지 않는다** — 봇을 못 찾아도 과제 행이 제 과목을 들고 있다.
   *
   * 학생 쪽 같은 자리(`app/(student)/classbot/assignment/page.tsx` 의 `meta?.subject ?? a.subject`)와
   * **같은 폴백 체인**이어야 한다. 갈리면 같은 과제의 봇이 교사 화면에서는 「김」(`assignedBy`
   * 첫 글자), 학생 화면에서는 「수」로 떠서 [08 § 14.1.1] 예외 2 의 「역할을 가리지 않는다」가
   * 그 자리에서 깨진다.
   */
  subject: string;
  /** 데이터 계약([08 § 14.1.1] 예외 2) — 목록 행은 읽지 않지만 지우지 않는다. */
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
 *
 * ⚠️ **로그인 교사의 실제 반은 아직 이 셈에 안 들어온다.** `classRoster` 는 mock 18명
 * (`s1…s18`)이고, 실제 수업방 명단은 `useClassroomStudents` 가 따로 읽는다. 제출도 마찬가지로
 * 학생의 실제 제출은 교사 브라우저의 `submissions` 에 오지 않는다. 그래서 **데모 경로에서만**
 * 이 숫자가 참이다. 이 어긋남은 이 PR 이 만든 것이 아니라(아래 패널·리마인드가 이미
 * `classRoster` 를 편다) 과제·제출이 실DB 로 옮겨 가는 PR 이 함께 걷어야 할 자리다.
 */
export function wholeClassSize(): number {
  return classRoster.length;
}

/**
 * 이 과제를 받은 학생 id — 대상이 비어 있으면 반 전체.
 *
 * 아래 `SubmissionStatusPanel` 이 쓰는 규약과 **같은 문장**이다(그 파일의 `eligible`).
 */
export function eligibleStudentIds(a: UserAssignment): Set<string> {
  const roster = classRoster.map((r) => r.id);
  const targets = a.targetStudentIds;
  if (targets.length === 0) return new Set(roster);
  /*
    **명단과 **교집합**을 낸다 — 아래 패널·리마인드가 하는 것과 같다
    (`submission-status-sheet.tsx` 의 `eligible`, `remind-button.tsx`).
    날것 그대로 쓰면 로그인 교사의 실제 반 id 는 mock 명단과 하나도 안 겹치므로
    「대상 3명 · 제출 0명」인데 아래 명단은 **비어 있고** 회수 모달은 「3명 중 0명」을 말한다.
    셋이 같은 셈을 쓰면 적어도 한 화면 안에서는 어긋나지 않는다(실제 반을 못 보는 한계는
    `wholeClassSize` 주석에 적어 두었다).
  */
  const rosterSet = new Set(roster);
  return new Set(targets.filter((id) => rosterSet.has(id)));
}

/**
 * 낸 학생 수 — **대상 밖 제출은 세지 않는다.**
 *
 * `computeProgress` 는 `assignmentId` 만으로 거른다. 그래서 대상이 아닌 학생이 딥링크로
 * 들어와 제출하면(풀이 화면은 대상 필터를 안 건다 — 그 파일 주석) 이 화면만 숫자가 부풀었다:
 * 「대상 1명 · 제출 2명 · 미제출 0명」에 회수 모달은 「1명 중 2명이 이미 풀었어요」.
 * 아래 패널은 같은 제출을 이미 빼고 있어서(Codex #186 R2) 한 화면이 두 숫자를 갖는다.
 */
export function progressForTargets(
  a: UserAssignment,
  submissions: Submission[],
): { submittedCount: number; avgScore: number | null } {
  const eligible = eligibleStudentIds(a);
  const mine = submissions.filter((s) => s.assignmentId === a.id && eligible.has(s.studentId));
  /*
    **학생당 한 번만 센다 — 평균도 마찬가지다.** 제출은 학생 수로 세면서 평균만 제출 건으로
    세면 두 번 낸 학생이 평균을 두 배로 끌어당긴다(「제출 2명 · 평균은 세 건의 평균」).
    같은 학생의 여러 제출 중에서는 **마지막 것**이 그 학생의 답이다(`recordSubmission` 도
    같은 학생을 upsert 한다).
  */
  const latest = new Map<string, Submission>();
  for (const sub of mine) {
    const prev = latest.get(sub.studentId);
    if (!prev || sub.submittedAt > prev.submittedAt) latest.set(sub.studentId, sub);
  }
  const scores = [...latest.values()].map((sub) => sub.scorePercent);
  const avgScore =
    scores.length === 0
      ? null
      : Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length);
  return { submittedCount: latest.size, avgScore };
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
      // 봇을 못 찾아도 과목은 과제 행이 안다 — 학생 화면과 같은 체인이다(위 타입 주석).
      subject: facts?.subject ?? assignment.subject,
      avatarEmoji: facts?.avatarEmoji ?? '🤖',
      classroomLabels: facts?.classrooms.map((c) => c.label) ?? [],
      targetCount: assignment.targetStudentIds.length || wholeClassSize(),
      submittedCount: progressForTargets(assignment, submissions).submittedCount,
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
    /*
      **회수한 과제는 기본 목록에서 내린다.** 「전체」가 회수된 것까지 보여 주면 교사 홈·봇 운영의
      「낸 과제 N건」과 목록의 줄 수가 늘 어긋난다(그 숫자들은 회수된 것을 안 센다). 회수는 끝난
      결정이라 기본값에 있을 이유도 없다 — 볼 길은 「회수됨」 칩 하나로 남긴다.
    */
    if (f.status === 'all' && row.status === 'withdrawn') return false;
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
 * 순서: 급한 진행 중 → 나머지 진행 중 → 예약 → 초안 → 마감 → 회수됨. 같은 칸 안에서는 낸 순서
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
  closed: number;
  scheduled: number;
} {
  return {
    live: rows.filter((r) => r.status === 'live').length,
    dueSoon: rows.filter((r) => r.dueSoon).length,
    draft: rows.filter((r) => r.status === 'draft').length,
    closed: rows.filter((r) => r.status === 'closed').length,
    scheduled: rows.filter((r) => r.status === 'scheduled').length,
  };
}
