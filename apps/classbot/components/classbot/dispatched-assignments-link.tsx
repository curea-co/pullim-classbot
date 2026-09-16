'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { isDueSoon } from '@/app/(teacher)/teacher/assignment/assignment-filters';

/**
 * 교사 홈에서 낸 과제 목록으로 가는 한 줄 (`proc/spec/14 § 3.2` 진입점 3).
 *
 * 교사 홈은 서버 컴포넌트이고 낸 과제는 정본(`GET /classbot/assignments?audience=teacher`)에서 온다 — 그래서
 * 숫자를 읽는 이 한 조각만 클라이언트로 떼어 둔다. 종전의 localStorage 스토어 읽기는 PR 6 에서 걷었다.
 *
 * **낸 과제가 없으면(또는 아직 모르면) 아무것도 그리지 않는다.** 0건 링크는 누를 이유가 없는데 자리만 차지하고,
 * 홈 헤더 바로 아래라 그 자리가 비싸다. 과제를 내는 길은 바로 위 [과제 내기] 버튼이 이미 연다.
 * 「낸 과제」는 정본 목록 전부다(진행 중·마감) — 도착지 목록의 「전체」와 같은 셈이다. 마감 임박은 지금 기준
 * (`isDueSoon` — 굳힌 `dDay` 를 `dispatchedAt` 로 다시 센다).
 */
export function DispatchedAssignmentsLink() {
  const { data } = useTeacherAssignments();
  const rows = data ?? [];
  const dueSoon = rows.filter((a) => isDueSoon(a)).length;

  if (rows.length === 0) return null;

  return (
    <Link
      href="/teacher/assignment"
      data-testid="teacher-home-assignments-link"
      className="text-pullim-slate-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-lg px-1 text-2xs font-semibold outline-none focus-visible:ring-2"
    >
      <span>
        낸 과제 <span className="text-pullim-slate-900 font-mono font-bold">{rows.length}</span>건
        {dueSoon > 0 && (
          <>
            {' · 마감 임박 '}
            <span className="text-pullim-danger font-mono font-bold">{dueSoon}</span>건
          </>
        )}
      </span>
      <ArrowRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}
