'use client';

import { useState } from 'react';
import { Sparkles, BookOpen, ListChecks, ChevronDown, ChevronUp, MessageSquarePlus, Mic } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { useLessonActionStore } from '@/lib/store/lesson-action';
import { LessonProgressMap } from '@/components/classbot/lesson-progress-map';
import { WeaknessReviewCard } from '@/components/classbot/weakness-review-card';
import { ConceptMasteryBar } from '@/components/classbot/concept-mastery-rail';

/**
 * 챗 상단 수업 런처 — 페이지 이동/모달 없이 모든 학습을 챗에 녹인다.
 * 개념·연습 퀴즈를 누르면 우측 레일/챗 어디서든 동일하게 대화에 내용이 이어진다.
 *
 * 색: /classbot/chat 은 color-palette 스캔 대상 → green/amber 금지. blue/slate 만 사용.
 */
export function ChatStudyInline({ bot, userId }: { bot: ClassBot; userId: string }) {
  const lesson = getBotLesson(bot.id);
  const concepts = lesson.concepts;
  const quizzes = lesson.practiceQuizzes;
  const selfExplains = lesson.selfExplains ?? [];
  const dispatch = useLessonActionStore(s => s.dispatch);
  const [open, setOpen] = useState(true);

  return (
    <>
    {/* 복습할 약점(B1B2) — 개념 리스트 위. due 없으면 자체 미렌더. */}
    <WeaknessReviewCard botId={bot.id} userId={userId} />
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
          <div className="text-pullim-slate-900 truncate text-base font-bold">{lesson.topic}</div>
        </div>
        <span className="text-pullim-slate-500 hidden shrink-0 text-xs sm:inline">눌러서 대화로</span>
        {open ? (
          <ChevronUp className="text-pullim-slate-500 h-5 w-5 shrink-0" />
        ) : (
          <ChevronDown className="text-pullim-slate-500 h-5 w-5 shrink-0" />
        )}
      </button>

      {/* 레슨 진도 스텝퍼 — 토글 open 무관 항상 노출(A1) */}
      <div className="border-pullim-blue-100 border-t px-3 py-2">
        <LessonProgressMap botId={bot.id} userId={userId} variant="rail" />
      </div>

      {open && (
        <div className="space-y-4 px-4 pb-4">
          {/* 핵심 개념 — 누르면 챗에 개념 주입 */}
          <div>
            <div className="text-pullim-slate-600 mb-2 flex items-center gap-1.5 text-xs font-bold">
              <BookOpen className="text-pullim-blue-600 h-4 w-4" />
              핵심 개념
              <span className="text-pullim-slate-400 font-normal">· 눌러서 대화로 이어가기</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {concepts.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => dispatch(bot.id, 'concept', c.id)}
                    className="group bg-white border-pullim-slate-200 border-l-pullim-blue-400 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 w-full rounded-xl border border-l-[3px] p-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-pullim-slate-900 min-w-0 flex-1 truncate text-[15px] font-bold">
                        {c.title}
                      </p>
                      <MessageSquarePlus className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                    </div>
                    <p className="text-pullim-slate-600 mt-1 line-clamp-2 text-sm leading-relaxed">
                      {c.summary}
                    </p>
                    {/* 정답률 막대(B1B2) — UnitProgress(학습 단계)와 라벨로 구분 */}
                    <ConceptMasteryBar conceptId={c.id} conceptTitle={c.title} botId={bot.id} userId={userId} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 연습 퀴즈 — 누르면 챗에 인라인 퀴즈 주입 (페이지 이동 없음) */}
          <div>
            <div className="text-pullim-slate-600 mb-2 flex items-center gap-1.5 text-xs font-bold">
              <ListChecks className="text-pullim-blue-600 h-4 w-4" />
              연습 퀴즈
            </div>
            <ul className="space-y-2">
              {quizzes.map(q => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => dispatch(bot.id, 'quiz')}
                    className="group bg-white border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors"
                  >
                    <span className="bg-pullim-blue-100 text-pullim-blue-700 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold">
                      {q.problemNumber}
                    </span>
                    <span className="text-pullim-slate-800 min-w-0 flex-1 truncate text-[15px] font-bold">
                      {q.title}
                    </span>
                    <span className="bg-pullim-slate-100 text-pullim-slate-600 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
                      난이도 {q.difficulty}
                    </span>
                    <MessageSquarePlus className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 내 말로 설명 — 누르면 챗에 자기설명 프롬프트 주입(B4) */}
          {selfExplains.length > 0 && (
            <div>
              <div className="text-pullim-slate-600 mb-2 flex items-center gap-1.5 text-xs font-bold">
                <Mic className="text-pullim-blue-600 h-4 w-4" />
                내 말로 설명
                <span className="text-pullim-slate-400 font-normal">· 개념을 직접 설명해보기</span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {selfExplains.map(se => {
                  const concept = concepts.find(c => c.id === se.conceptId);
                  return (
                    <li key={se.conceptId}>
                      <button
                        type="button"
                        onClick={() => dispatch(bot.id, 'self-explain', se.conceptId)}
                        className="group bg-white border-pullim-slate-200 border-l-pullim-blue-400 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40 flex w-full items-center gap-2 rounded-xl border border-l-[3px] p-3 text-left transition-colors"
                      >
                        <span className="text-pullim-slate-800 min-w-0 flex-1 truncate text-[15px] font-bold">
                          {concept?.title ?? '오늘의 개념'}
                        </span>
                        <MessageSquarePlus className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
    </>
  );
}
