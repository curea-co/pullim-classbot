'use client';

import type { AssignmentRow } from '@/hooks/api/types';
import { cn } from '@/lib/utils';
import {
  childAssignmentStatus,
  childAssignmentStatusLabel,
  childAssignmentStatusTone,
  isDueSoon,
  sortByUrgency,
} from '../assignment-status';

/**
 * 자녀 과제 표 — 한 줄에 한 과제.
 *
 * **진짜 `<table>` 이다.** 이 리포는 명단·목록을 `div` 로 흉내 내지 않는다
 * (`components/classbot/roster-table.tsx`, 「표 아닌 표」 정정 커밋). 다섯 값이 줄마다 같은 자리에
 * 오는 자료라 머리글이 있어야 하고, 머리글은 `sr-only` 로 감추지 않는다 — 감추면 표가 아니라
 * 그냥 줄 여러 개가 된다.
 *
 * 학생 명단의 `RosterTable` 을 가져다 쓰지 않은 것은 그쪽이 줄마다 **학생 한 명**을 전제하기 때문이다
 * (이름·학년 두 칸과 줄 전체 링크가 붙박이). 여기 줄은 과제이고, 부모가 눌러서 갈 곳도 없다 —
 * 풀이 화면(`solveHref`)은 학생 자리다. 그래서 줄에 링크를 두지 않는다.
 * 대신 껍데기 규칙은 그대로 지킨다: 머리글은 보이게, 줄 사이 선은 칸에, 가로로 미는 것은 표뿐.
 */

/** 머리글 칸 — 한국어라 12px(`text-2xs`)이 하한이다(계약 §7). */
const headCell =
  'text-pullim-slate-500 px-2 pb-2 text-left text-2xs font-bold whitespace-nowrap';

/** 값 칸 — 줄 사이 선은 칸에 그린다(`border-separate` 라 줄에 그리면 안 보인다). */
const cell = 'border-pullim-slate-100 border-t px-2 py-3 align-middle';

/** 마감 칩 — 늦음(빨강) · 코앞(진한 블루) · 끝남(물러난 회색) · 그 밖(회색). */
function dueTone(a: AssignmentRow): string {
  const status = childAssignmentStatus(a);
  if (status === 'late') return 'bg-pullim-danger-bg text-pullim-danger';
  if (status === 'done') return 'bg-pullim-slate-100 text-pullim-slate-500';
  if (isDueSoon(a)) return 'bg-pullim-blue-800 text-white';
  return 'bg-pullim-slate-100 text-pullim-slate-600';
}

export function ChildAssignmentTable({
  childName,
  assignments,
}: {
  childName: string;
  assignments: AssignmentRow[];
}) {
  const rows = sortByUrgency(assignments);

  return (
    /* 표만 가로로 밀린다 — 담는 카드의 `p-5` 만큼 뺐다가 다시 채워 카드 선에 붙여 시작한다 */
    <div className="-mx-5 overflow-x-auto px-5">
      <table
        aria-label={`${childName} 과제 ${rows.length}개`}
        style={{ minWidth: '32rem' }}
        className="w-full border-separate border-spacing-0"
      >
        <thead>
          <tr>
            <th scope="col" className={headCell}>과제</th>
            <th scope="col" className={headCell}>과목</th>
            <th scope="col" className={headCell}>마감</th>
            <th scope="col" className={headCell}>상태</th>
            <th scope="col" className={cn(headCell, 'text-right')}>문항</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(a => {
            const status = childAssignmentStatus(a);
            return (
              <tr key={a.id} className="hover:bg-pullim-slate-50 transition-colors">
                {/* 과제 이름 = 이 줄의 머리글. 길 수 있으니 여기만 줄바꿈을 막지 않는다 */}
                <th scope="row" className={cn(cell, 'text-left font-normal')}>
                  <span className="text-pullim-slate-900 text-sm leading-tight font-bold">
                    {a.title}
                  </span>
                </th>

                <td className={cn(cell, 'text-pullim-slate-600 text-2xs whitespace-nowrap')}>
                  {a.subject}
                </td>

                <td className={cn(cell, 'whitespace-nowrap')}>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold',
                      dueTone(a),
                    )}
                  >
                    {a.dDay}
                  </span>
                  <span className="text-pullim-slate-500 mt-0.5 block text-2xs">
                    {a.dueLabel}
                  </span>
                </td>

                <td className={cn(cell, 'whitespace-nowrap')}>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold',
                      childAssignmentStatusTone[status],
                    )}
                  >
                    {childAssignmentStatusLabel[status]}
                  </span>
                </td>

                {/* 「푼 것 / 전체」 — 숫자만이라 고정폭으로 세로줄이 맞는다 */}
                <td
                  className={cn(
                    cell,
                    'text-pullim-slate-700 text-right font-mono text-2xs whitespace-nowrap',
                  )}
                >
                  {a.completedCount}/{a.questionCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
