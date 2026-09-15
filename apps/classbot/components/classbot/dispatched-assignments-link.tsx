'use client';

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

  if (!hydrated || dispatched.length === 0) return null;

  const summary = summarize(buildRows(dispatched, submissions, buildBotIndex()));

  return (
    <Link
      href="/teacher/assignment"
      data-testid="teacher-home-assignments-link"
      className="text-pullim-slate-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-lg px-1 text-2xs font-semibold outline-none focus-visible:ring-2"
    >
      <span>
        낸 과제 <span className="text-pullim-slate-900 font-mono font-bold">{summary.live}</span>건
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
