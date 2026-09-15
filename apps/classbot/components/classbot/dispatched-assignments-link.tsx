'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { buildBotIndex, buildRows, summarize } from '@/app/(teacher)/teacher/assignment/assignment-filters';

/**
 * 교사 홈에서 낸 과제 목록으로 가는 한 줄 (`proc/spec/14 § 3.2` 진입점 3).
 *
 * 교사 홈은 서버 컴포넌트이고 낸 과제는 클라이언트 스토어(localStorage persist)에 산다.
 * 그래서 숫자를 읽는 이 한 조각만 클라이언트로 떼어 둔다 — 홈 전체를 `'use client'` 로
 * 돌리면 서버에서 읽던 mock 집계까지 다 브라우저로 넘어간다.
 *
 * **낸 과제가 없으면 아무것도 그리지 않는다.** 0건 링크는 누를 이유가 없는데 자리만 차지하고,
 * 홈 헤더 바로 아래라 그 자리가 비싸다. 과제를 내는 길은 바로 위 [과제 내기] 버튼이 이미 연다.
 */
export function DispatchedAssignmentsLink() {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const submissions = useAssignmentStore((s) => s.submissions);
  const hydrated = useStoresHydrated(useAssignmentStore);

  // `buildBotIndex()` 는 mock 카탈로그를 매번 다시 훑는다 — 교사 홈은 자주 다시 그려지는 화면이라
  // 렌더마다 세우지 않는다. 훅은 조기 반환보다 **위**에 있어야 호출 순서가 안 흔들린다.
  const botIndex = useMemo(() => buildBotIndex(), []);
  const rows = useMemo(
    () => buildRows(dispatched, submissions, botIndex),
    [dispatched, submissions, botIndex],
  );
  const summary = useMemo(() => summarize(rows), [rows]);

  /*
    **보이는 숫자와 가리는 기준을 같게 둔다.** 이게 어긋나면 「낸 과제 0건 →」이 뜬다.
    `buildRows` 는 1:1 매핑이라 `rows.length` 는 `dispatched.length` 와 **같다** — 종전의
    「목록이 그릴 줄 수로 잰다」는 말은 사실이 아니었다(같은 값을 다른 이름으로 부른 것뿐).

    그래서 숫자 쪽을 고친다: 「낸 과제」가 가리키는 것은 **지금 살아 있는 것**(회수 뺀 전부 —
    진행 중과 마감 둘 다)이고, 그 수가 0 일 때만 가린다. 마감된 과제만 남은 교사에게서
    낸 과제로 가는 길을 없애지 않는다 — 회수만 남은 교사에게 0건을 보이지도 않는다.
  */
  const openCount = summary.live + summary.closed;
  if (!hydrated || openCount === 0) return null;

  return (
    <Link
      href="/teacher/assignment"
      data-testid="teacher-home-assignments-link"
      className="text-pullim-slate-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-lg px-1 text-2xs font-semibold outline-none focus-visible:ring-2"
    >
      <span>
        낸 과제 <span className="text-pullim-slate-900 font-mono font-bold">{openCount}</span>건
        {summary.dueSoon > 0 && (
          <>
            {' · 마감 임박 '}
            <span className="text-pullim-danger font-mono font-bold">{summary.dueSoon}</span>건
          </>
        )}
      </span>
      <ArrowRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}
