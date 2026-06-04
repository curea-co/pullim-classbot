'use client';

import { CheckCircle2 } from 'lucide-react';

import { SectionHeading } from '@/components/shell/section-heading';
import { ReadErrorState } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyGrades } from '@/hooks/api/read/use-student-reads';
import type { GradeReadRow } from '@/hooks/api/read/types';
import { cn } from '@/lib/utils';

/**
 * 내 채점 결과 — Phase 7 Stage 2: `GET /api/grades`(실DB·인증) 배선.
 *
 * 받은 과제 화면 하단에 "최근 채점 결과"로 노출한다(채점된 과제는 과제와 자연 인접).
 * 미인증 게이트는 부모(받은 과제 surface)가 처리하므로 여기서는 로딩/빈/에러만 다룬다.
 */
export function MyGradesSection() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useMyGrades();

  // 부모 surface 가 이미 로그인 게이트를 띄우므로 비인증이면 아무것도 그리지 않는다.
  if (isUnauthenticated) return null;

  return (
    <section className="space-y-2">
      <SectionHeading title="최근 채점 결과" description="선생님·봇이 채점을 마친 과제예요." />

      {isError ? (
        <ReadErrorState onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : data.grades.length === 0 ? (
        <div className="bg-pullim-slate-50 border-pullim-slate-200 rounded-2xl border border-dashed px-4 py-6 text-center">
          <p className="text-pullim-slate-500 text-[11px]">아직 채점된 과제가 없어요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.grades.map(g => <GradeRow key={g.id} grade={g} />)}
        </ul>
      )}
    </section>
  );
}

function GradeRow({ grade: g }: { grade: GradeReadRow }) {
  const pct = g.maxScore === 0 ? 0 : Math.round((g.score / g.maxScore) * 100);
  const tone = pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-pullim-blue-700' : 'text-amber-700';
  return (
    <li className="bg-card flex items-center gap-3 rounded-2xl border p-3">
      <span className="bg-emerald-50 text-emerald-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-pullim-slate-900 truncate text-sm font-bold">{g.assignmentTitle}</div>
        <div className="text-pullim-slate-500 text-[11px]">{g.gradedAtLabel}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={cn('font-mono text-lg font-bold leading-none', tone)}>
          {g.score}
          <span className="text-pullim-slate-400 text-xs font-semibold">/{g.maxScore}</span>
        </div>
        <div className="text-pullim-slate-400 mt-0.5 font-mono text-[10px]">{pct}%</div>
      </div>
    </li>
  );
}
