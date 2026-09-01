'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { GradingItem } from '@/lib/mock';
import { useGradingStore, useMergedGradingItems } from '@/lib/store/grading';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { cn } from '@/lib/utils';

/**
 * 이 학생의 채점 — 채점 허브 ↔ 학생 상세 왕복 (spec 11 § 3.3.3).
 *
 * 채점 허브 목록에서 「대기 2건」을 보고 학생을 눌러 들어왔는데 여기서 그 2건으로 돌아갈 길이
 * 없으면 교사는 뒤로 가기를 눌러야 한다. 그 두 화면을 잇는 자리다.
 *
 * 건수는 교사 확정(store)을 얹은 뒤 센다 — 목록의 「대기」 배지와 같은 값이어야 한다.
 */

const statusMeta = {
  queue:      { label: '검수 대기', className: 'bg-pullim-lemon-soft text-pullim-lemon-ink' },
  reviewing:  { label: '검토중',    className: 'bg-pullim-blue-100 text-pullim-blue-700' },
  approved:   { label: '승인됨',    className: 'bg-pullim-blue-50 text-pullim-blue-700' },
  overridden: { label: '오버라이드', className: 'bg-pullim-slate-100 text-pullim-slate-700' },
} as const;

export function StudentGradingPanel({
  items,
  studentName,
}: {
  items: GradingItem[];
  studentName: string;
}) {
  const hydrated = useStoresHydrated(useGradingStore);
  const merged = useMergedGradingItems(items);
  const pending = merged.filter(item => item.status === 'queue').length;

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={hydrated && pending > 0 ? `검수 대기 ${pending}건` : '이 학생의 채점'}
        description={`${studentName} 학생이 낸 답과 AI 초안이에요.`}
      />

      {!hydrated ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : merged.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="아직 채점할 제출이 없어요"
          description="이 학생이 과제를 내면 여기에 쌓여요."
        />
      ) : (
        <ul className="space-y-2">
          {merged.map(item => {
            const status = statusMeta[item.status];
            return (
              <li key={item.id}>
                <Link
                  href={`/teacher/grading/${item.id}`}
                  className="bg-pullim-slate-50/60 hover:bg-pullim-slate-50 group flex items-center gap-3 rounded-xl p-3 transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-pullim-slate-900 truncate text-2xs font-bold">
                        {item.assignmentTitle}
                      </span>
                      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-bold', status.className)}>
                        {status.label}
                      </span>
                    </span>
                    <span className="text-pullim-slate-500 mt-1 block truncate text-2xs">
                      {item.responsePreview}
                    </span>
                  </span>

                  <span className="text-pullim-slate-500 shrink-0 font-mono text-2xs">
                    <span className="text-pullim-slate-400">AI 초안 </span>
                    <b className="text-pullim-slate-700">{`${item.draftScore}/${item.maxScore}`}</b>
                  </span>
                  <ChevronRight className="text-pullim-slate-400 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        점수는 아직 <b className="text-pullim-slate-700">AI 초안</b>이에요. 선생님이 확정해야 학생·학부모에게 보여요.
      </p>
    </section>
  );
}
