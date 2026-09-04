/**
 * 학부모가 자녀 과제 한 줄을 읽는 법 — 상태를 부르는 말, 급한 차례, 세는 법.
 *
 * 학생 화면의 `lib/tokens/assignment-state.ts` 를 부르지 않는 이유는 두 가지다.
 *  ① 타입이 안 맞는다 — 그 표는 mock `Assignment`(선택 필드 `recentAccuracy?: number`)를 받는데
 *     API 가 주는 `AssignmentRow` 는 같은 자리가 `number | null` 이라 그대로 넘길 수 없다.
 *  ② 볼 사람이 다르다 — 학생 카드는 모드(시험·오답정복)를 상태보다 앞세운다. 그게 「지금 뭘 푸는가」를
 *     말해야 하는 화면이라 맞다. 학부모가 묻는 것은 「우리 아이가 했나 안 했나」 하나뿐이라,
 *     모드는 상태를 덮지 않는다.
 *
 * 그래서 말은 새로 짓되 **색은 같은 규약**을 따른다 — 블루·슬레이트·위험(빨강) 셋뿐,
 * 초록·앰버 없음, 색만으로 뜻을 전하지 않게 칸마다 글자가 함께 붙는다.
 */

import type { AssignmentRow, ParentChildItem } from '@/hooks/api/types';

/** 학부모 시점 과제 상태 넷 — 서로 배타다. */
export type ChildAssignmentStatus = 'todo' | 'doing' | 'done' | 'late';

/** 칸에 보이는 글자. 「제출·미제출」 같은 운영 용어 대신 부모가 쓰는 말로 둔다. */
export const childAssignmentStatusLabel: Record<ChildAssignmentStatus, string> = {
  todo: '시작 전',
  doing: '푸는 중',
  done: '다 냈어요',
  late: '늦었어요',
};

/** 배지 면·글자색. 끝난 일은 물러나고(옅은 회색), 늦은 것만 빨강으로 떠오른다. */
export const childAssignmentStatusTone: Record<ChildAssignmentStatus, string> = {
  todo: 'bg-pullim-slate-100 text-pullim-slate-700',
  doing: 'bg-pullim-blue-100 text-pullim-blue-700',
  done: 'bg-pullim-slate-100 text-pullim-slate-500',
  late: 'bg-pullim-danger-bg text-pullim-danger',
};

/**
 * `dDay` 문자열에서 남은 날짜를 뽑는다 — 「오늘」 0, 「내일」 1, 「D-9」 9, 「지난 2일」 -2.
 * 못 읽는 값은 맨 뒤로 보낸다(999). 서버가 만드는 표기라 형식은 학생 화면과 같다.
 */
function daysLeft(dDay: string): number {
  if (dDay === '오늘') return 0;
  if (dDay === '내일') return 1;
  const overdue = dDay.match(/지난\s*(\d+)/);
  if (overdue) return -Number(overdue[1]);
  const ahead = dDay.match(/D-(\d+)/);
  if (ahead) return Number(ahead[1]);
  return 999;
}

/** 마감이 오늘·내일인가 — 아직 안 낸 과제에서만 뜻이 있다. */
export function isDueSoon(a: AssignmentRow): boolean {
  return childAssignmentStatus(a) !== 'done' && daysLeft(a.dDay) <= 1 && daysLeft(a.dDay) >= 0;
}

/**
 * 과제 한 건의 상태.
 *
 * 「다 냈다」를 먼저 본다 — 마감이 지났어도 이미 낸 과제를 늦었다고 부르면 안 되기 때문이다.
 * 그 다음이 늦음, 그 다음이 손을 댔는지 여부다.
 */
export function childAssignmentStatus(a: AssignmentRow): ChildAssignmentStatus {
  if (a.state === 'submitted' || a.completedCount >= a.questionCount) return 'done';
  if (a.state === 'overdue' || daysLeft(a.dDay) < 0) return 'late';
  if (a.state === 'in-progress' || a.completedCount > 0) return 'doing';
  return 'todo';
}

/** 정렬 묶음 — 늦은 것, 아직 남은 것, 끝난 것 순. */
const statusGroup: Record<ChildAssignmentStatus, number> = {
  late: 0,
  todo: 1,
  doing: 1,
  done: 2,
};

/**
 * 급한 것부터 — ① 늦은 것(더 오래 지난 것이 위) ② 남은 것(마감이 가까운 것이 위) ③ 끝난 것.
 * 원본 배열을 건드리지 않는다(react-query 캐시가 준 배열이다).
 */
export function sortByUrgency(rows: AssignmentRow[]): AssignmentRow[] {
  return [...rows].sort((a, b) => {
    const ga = statusGroup[childAssignmentStatus(a)];
    const gb = statusGroup[childAssignmentStatus(b)];
    if (ga !== gb) return ga - gb;
    // 늦은 묶음에서는 값이 음수라, 오름차순이 곧 「더 오래 지난 것부터」가 된다.
    return daysLeft(a.dDay) - daysLeft(b.dDay);
  });
}

/** 자녀 한 명의 과제를 셋으로 센다 — 남은 것 · 다 낸 것 · 그중 늦은 것. */
export function countChildAssignments(rows: AssignmentRow[]): {
  remaining: number;
  done: number;
  late: number;
} {
  let remaining = 0;
  let done = 0;
  let late = 0;
  for (const row of rows) {
    const status = childAssignmentStatus(row);
    if (status === 'done') done += 1;
    else remaining += 1;
    if (status === 'late') late += 1;
  }
  return { remaining, done, late };
}

/**
 * 이 자녀에 대해 **숫자를 적어도 되는가** — 반·과제 KPI 를 그릴지 가르는 하나뿐인 판정.
 *
 * ## 왜 「0개」를 그냥 그리면 안 되나
 *
 * 반·과제가 자녀 동의 뒤로 옮겨 간 뒤(계약 §2), `GET /api/parent/children` 은 **동의하지
 * 않은 자녀에게 빈 배열**을 준다. 그 배열을 그대로 세면 화면은 `수업방 0개 · 남은 과제
 * 0개` 라고 **확정해서** 적는데, 실제로는 반도 과제도 있고 다만 안 보여주기로 한 것이다.
 * 숨긴 것을 「없음」으로 바꿔 말하는 자리라, 부모는 있지도 않은 사실을 읽게 된다.
 *
 * ## 그렇다고 「알 수 없음」이라고 적을 수도 없다
 *
 * 미동의만 「알 수 없음」으로 적으면 **동의했는데 아직 반이 없는 아이**와 갈린다.
 * 갈리는 순간 그 차이가 곧 동의 여부가 되어, 부모가 아이의 동의를 화면에서 읽어 낸다 —
 * 자기주도 화면이 `hasSomethingToShow` 로 막아 둔 것과 **똑같은 누출**이다
 * (`./self-study/self-study-visibility.ts` 머리주석의 표).
 *
 * 그래서 답은 하나뿐이다: **아무것도 안 온 자녀에게는 숫자를 아예 안 적는다.** 미동의도
 * 무활동도 같은 자리(숫자 없는 카드)로 접히고, 접힌 안에서는 둘이 갈리지 않는다.
 * 숫자가 있는 카드는 「보여주기로 했고 활동도 있다」 하나뿐이라 언제나 참이다.
 *
 * ⛔ **되살리고 싶어질 것이다.** 「0개라도 칸은 있어야 정렬이 예쁘다」는 이유로 KPI 를
 * 되돌리는 것은 위 두 문제를 동시에 되살리는 일이다.
 * @param child - 응답에 실려 온 자녀
 * @returns 반이든 과제든 하나라도 왔으면 true
 */
export function hasSchoolWorkToShow(child: ParentChildItem): boolean {
  return child.classrooms.length > 0 || child.assignments.length > 0;
}

/** 나와 자녀의 관계 — API 가 주는 세 값. */
export const relationLabel: Record<'mother' | 'father' | 'guardian', string> = {
  mother: '어머니',
  father: '아버지',
  guardian: '보호자',
};
