'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, ListChecks, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { ConceptModal } from './concept-modal';

/**
 * 챗에 내장되는 학습 카드 — 핵심 개념(학습 가이드) + 연습 퀴즈를 대화 흐름 상단에 노출.
 * 개념 항목을 누르면 상세 모달(핵심 개념·학습 팁·핵심 요소·예제 문항)이 열린다.
 *
 * 색: /classbot/chat 은 color-palette 스캔 대상 → green/amber 금지. blue/slate 만 사용.
 */
export function ChatStudyInline({ bot }: { bot: ClassBot }) {
  const lesson = getBotLesson(bot.id);
  const concepts = lesson.concepts;
  const quizzes = lesson.practiceQuizzes;
  const [open, setOpen] = useState(true);

  return (
    <section
      data-slot="chat-study-inline"
      className="border-pullim-blue-200 from-pullim-blue-50/70 rounded-2xl border bg-gradient-to-br to-white"
    >
      {/* 헤더 — 토글 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="bg-pullim-blue-600 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-blue-700 text-xs font-bold tracking-wide uppercase">
            오늘의 학습 가이드
          </div>
          <div className="text-pullim-slate-900 truncate text-sm font-bold">{lesson.topic}</div>
        </div>
        <span className="text-pullim-slate-500 hidden shrink-0 text-xs sm:inline">
          개념 {concepts.length} · 퀴즈 {quizzes.length}
        </span>
        {open ? (
          <ChevronUp className="text-pullim-slate-500 h-5 w-5 shrink-0" />
        ) : (
          <ChevronDown className="text-pullim-slate-500 h-5 w-5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {/* 핵심 개념 — 클릭 시 상세 모달 */}
          <div>
            <div className="text-pullim-slate-600 mb-2 flex items-center gap-1.5 text-xs font-bold">
              <BookOpen className="text-pullim-blue-600 h-4 w-4" />
              핵심 개념
              <span className="text-pullim-slate-400 font-normal">· 눌러서 자세히</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {concepts.map((c, i) => (
                <li key={c.id}>
                  <ConceptModal
                    concept={c}
                    trigger={
                      <button
                        type="button"
                        className="group bg-white border-pullim-slate-200 border-l-pullim-blue-400 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 w-full rounded-xl border border-l-[3px] p-3 text-left transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                            {i + 1}
                          </span>
                          <p className="text-pullim-slate-900 min-w-0 flex-1 truncate text-sm font-bold">
                            {c.title}
                          </p>
                          <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                        </div>
                        <p className="text-pullim-slate-600 mt-1 line-clamp-2 text-xs leading-relaxed">
                          {c.summary}
                        </p>
                      </button>
                    }
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* 연습 퀴즈 */}
          <div>
            <div className="text-pullim-slate-600 mb-2 flex items-center gap-1.5 text-xs font-bold">
              <ListChecks className="text-pullim-blue-600 h-4 w-4" />
              연습 퀴즈
            </div>
            <ul className="space-y-2">
              {quizzes.map(q => (
                <li key={q.id}>
                  <Link
                    href="/classbot/assignment"
                    className="group bg-white border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 flex items-center gap-2 rounded-xl border p-3 transition-colors"
                  >
                    <span className="bg-pullim-blue-100 text-pullim-blue-700 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold">
                      {q.problemNumber}
                    </span>
                    <span className="text-pullim-slate-800 min-w-0 flex-1 truncate text-sm font-bold">
                      {q.title}
                    </span>
                    <span className="bg-pullim-slate-100 text-pullim-slate-600 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
                      난이도 {q.difficulty}
                    </span>
                    <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/classbot/assignment"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-colors"
          >
            전체 학습 과제 풀러 가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
