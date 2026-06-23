import Link from 'next/link';
import { ArrowRight, BookOpen, ListChecks } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { SectionHeading } from '@/components/shell/section-heading';
import { ConceptModal } from './concept-modal';

/**
 * 봇대화 우측 레일 — 퀴즈(연습 문제) + 학습 가이드(핵심 개념 카드).
 * 개념 카드를 누르면 상세 모달이 열린다. 데이터는 classbot-lesson 단일 출처.
 *
 * 색: /classbot/chat 은 color-palette 스캔 대상 → green/amber 금지.
 * 난이도 칩은 의미색(초록/앰버) 대신 slate 중립으로 둔다.
 */
export function ChatStudyRail({ bot }: { bot: ClassBot }) {
  const lesson = getBotLesson(bot.id);
  const quizzes = lesson.practiceQuizzes;
  const concepts = lesson.concepts;

  return (
    <div className="space-y-6">
      {/* 봇 맥락 한 줄 */}
      <div className="text-pullim-slate-500 text-xs font-semibold">
        {bot.subject} · {lesson.topic}
      </div>

      {/* 퀴즈 */}
      <section>
        <SectionHeading
          title={
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="text-pullim-blue-600 h-4 w-4" />
              퀴즈
            </span>
          }
          action={
            <Link href="/classbot/assignment" className="text-pullim-slate-500 hover:text-pullim-blue-600 text-xs font-semibold">
              전체 →
            </Link>
          }
        />
        <ul className="space-y-2.5">
          {quizzes.map((q) => (
            <li key={q.id}>
              <Link
                href="/classbot/assignment"
                className="group bg-card hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 block rounded-xl border p-3.5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold">
                    {q.problemNumber}
                  </span>
                  <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                    난이도 {q.difficulty}
                  </span>
                  <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 ml-auto h-4 w-4 transition-colors" />
                </div>
                <p className="text-pullim-slate-800 mt-2 text-sm font-bold leading-snug">{q.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 학습 가이드 — 핵심 개념 카드 (클릭 시 상세 모달) */}
      <section>
        <SectionHeading
          title={
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="text-pullim-blue-600 h-4 w-4" />
              학습 가이드
            </span>
          }
        />
        <ul className="space-y-2.5">
          {concepts.map((c) => (
            <li key={c.id}>
              <ConceptModal
                concept={c}
                trigger={
                  <button
                    type="button"
                    className="group bg-card border-l-pullim-blue-400 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 w-full rounded-xl border border-l-[3px] p-3.5 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-pullim-slate-900 min-w-0 flex-1 text-sm font-bold leading-snug">{c.title}</p>
                      <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                    </div>
                    <p className="text-pullim-slate-600 mt-1 text-xs leading-relaxed">{c.summary}</p>
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
