import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import type { ReteachConcept } from '@/lib/mock/classbot-monitoring';

/**
 * 학급 단위 「다시 가르칠 개념」 — 학생 20명치 숫자보다 교사에게 실질적인 것.
 *
 * 조사에서 교사가 원한다고 답한 건 개인별 지표가 아니라 「다음 시간에 다시 가르칠 개념」 목록이었다.
 * 개념마다 몇 명이 걸렸는지 + 다음 수업에서 뭘 할지 한 줄을 붙인다
 * (지표가 "무엇이 논의되는지"만 보여주고 "무엇을 해야 할지"는 안 알려준다는 불만에 대한 답).
 */
export function ReteachConcepts({
  concepts,
  totalStudents,
}: {
  concepts: ReteachConcept[];
  totalStudents: number;
}) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title="다시 가르칠 개념 3개"
        description="이번 과제 대화에서 학급이 공통으로 무너진 자리예요."
        action={
          <Link href="/teacher/builder" className="text-pullim-blue-600 inline-flex items-center gap-0.5 text-xs font-bold">
            봇 설명 손보기 <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      {concepts.length === 0 ? (
        <EmptyState tone="plain" size="sm" title="공통으로 무너진 개념이 없어요" />
      ) : (
        <ol className="grid gap-2.5 sm:grid-cols-3">
          {concepts.map((c, i) => (
            <li key={c.id} className="bg-pullim-slate-50 flex flex-col rounded-xl p-3">
              <div className="flex items-start gap-2.5">
                <span className="bg-pullim-blue-600 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-micro font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 text-sm font-bold">{c.label}</div>
                  <div className="text-pullim-slate-500 mt-0.5 text-2xs">
                    <b className="text-pullim-slate-700 font-mono">{`${c.studentCount}/${totalStudents}명`}</b>
                    <span>이 여기서 막혔어요</span>
                  </div>
                  <p className="text-pullim-slate-500 mt-0.5 line-clamp-2 text-micro">
                    {c.studentNames.join(' · ')}
                  </p>
                </div>
              </div>

              {/* 그래서 뭘 하나 */}
              <div className="mt-2 flex flex-1 flex-col items-start justify-end gap-1.5">
                <span className="text-pullim-slate-600 rounded-lg bg-white px-2 py-1 text-2xs leading-relaxed">
                  {c.nextStep}
                </span>
                <ComingSoonButton
                  note="다음 수업 계획에 담기"
                  className="text-pullim-blue-600 text-2xs font-bold"
                >
                  다음 수업에 넣기
                </ComingSoonButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
