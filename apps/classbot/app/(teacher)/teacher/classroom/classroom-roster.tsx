'use client';

import { EmptyState } from '@/components/classbot/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassroomStudents } from '@/hooks/api/classroom';

/**
 * 이 반에 들어온 학생 명단 — **머리글 있는 진짜 표**다.
 *
 * 줄 쌓기(div)로 두지 않는 이유는 관제소·리포트 명단과 같다(#264 「표 아닌 표」):
 * 한 줄에 값이 둘 이상이면 그 값이 무엇인지 말하는 자리가 머리글밖에 없다.
 * 표 껍데기(`components/classbot/roster-table.tsx`)를 그대로 쓰지 않는 것은 그 표가
 * 관제소 학생 타입(`MonitoredStudent` — 학년·도달·이탈)을 전제하는데, 여기 줄은
 * 참여 사실 둘(이름 · 들어온 날)뿐이라 남의 빈 칸을 이고 다니게 되기 때문이다.
 *
 * 카드가 열릴 때만 조회한다 — 방이 여럿이면 열지도 않은 명단을 다 읽어 올 이유가 없다.
 */

/** 머리글 칸 — 한국어라 12px(`text-2xs`)이 하한이다(계약 §7). */
const headCell = 'text-pullim-slate-500 px-2 pb-2 text-left text-2xs font-bold whitespace-nowrap';

/** 값 칸 — 줄 사이 선은 칸에 그린다(표가 `border-separate` 라 줄에 그리면 안 보인다). */
const cell = 'border-pullim-slate-100 border-t px-2 py-2.5 align-middle whitespace-nowrap';

/** 참여한 날 — 저장은 UTC ISO, 보여줄 때는 한국 날짜로. */
const joinedFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
});

function formatJoinedAt(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '—' : joinedFormatter.format(at);
}

export function ClassroomRoster({
  classroomId,
  label,
}: {
  classroomId: string;
  /** 반 이름 — 표 이름에 넣는다. 명단이 여럿 열려 있어도 어느 반 표인지 읽힌다. */
  label: string;
}) {
  // 구조 분해 대신 쿼리 객체를 그대로 둔다 — `isPending`/`isError` 로 좁힌 뒤에야
  // `query.data` 가 있다는 것이 타입에도 남는다.
  const query = useClassroomStudents(classroomId);

  if (query.isPending) {
    return (
      <div className="mt-3 space-y-2" aria-hidden>
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="text-pullim-danger mt-3 text-2xs" role="alert">
        {query.error.message}
      </p>
    );
  }

  const students = query.data.students;

  if (students.length === 0) {
    return (
      <EmptyState
        tone="plain"
        size="sm"
        className="mt-1"
        title="아직 들어온 학생이 없어요"
        description="위 참여 코드를 학생에게 알려주세요."
      />
    );
  }

  return (
    // 가로로 미는 것은 표뿐이다 — 담는 카드의 안쪽 여백(p-5)만큼 뺐다가 다시 채운다.
    <div className="-mx-5 mt-3 overflow-x-auto px-5">
      <table
        aria-label={`${label} 참여 학생 ${students.length}명`}
        style={{ minWidth: '18rem' }}
        className="w-full border-separate border-spacing-0"
      >
        <thead>
          <tr>
            <th scope="col" className={headCell}>이름</th>
            <th scope="col" className={headCell}>참여한 날</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} data-testid={`classroom-student-${student.id}`}>
              <th scope="row" className={`${cell} text-left font-normal`}>
                <span className="flex items-center gap-2">
                  <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
                    {student.name.slice(0, 1)}
                  </span>
                  <span className="text-pullim-slate-900 text-sm leading-tight font-bold">
                    {student.name}
                  </span>
                </span>
              </th>
              <td className={`${cell} text-pullim-slate-500 text-2xs`}>
                {formatJoinedAt(student.joinedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
