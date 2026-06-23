'use client';

import type { ReactElement } from 'react';
import { BookOpen, Lightbulb, Layers, HelpCircle } from 'lucide-react';
import type { LessonConcept } from '@/lib/mock/classbot-lesson';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RichText } from './rich-text';

/**
 * 학습 개념 상세 모달 — 핵심 개념 · 학습 팁 · 핵심 요소 · 예제 문항.
 * 인라인 학습카드 / 우측 레일 / 대화 속 개념 카드 어디서든 동일 모달.
 *
 * 색: 챗 페이지 color-palette 스캔 대상 → blue/slate 만 사용.
 */
export function ConceptModal({
  concept,
  trigger,
}: {
  concept: LessonConcept;
  trigger: ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-pullim-slate-900 text-lg">{concept.title}</DialogTitle>
          <DialogDescription className="text-pullim-slate-600 text-sm">
            {concept.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 핵심 개념 */}
          <section>
            <SectionLabel icon={<BookOpen className="h-4 w-4" />}>핵심 개념</SectionLabel>
            <div className="text-pullim-slate-700 text-sm">
              <RichText text={concept.detail} />
            </div>
            {concept.formula && (
              <code className="bg-pullim-slate-50 border-pullim-slate-200 text-pullim-slate-800 mt-2 block rounded-lg border px-3 py-2 font-mono text-xs">
                {concept.formula}
              </code>
            )}
          </section>

          {/* 학습 팁 */}
          {concept.tips.length > 0 && (
            <section>
              <SectionLabel icon={<Lightbulb className="h-4 w-4" />}>학습 팁</SectionLabel>
              <ul className="space-y-1.5">
                {concept.tips.map((t, i) => (
                  <li
                    key={i}
                    className="bg-pullim-blue-50/60 text-pullim-slate-800 flex gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-pullim-blue-600 shrink-0 font-bold">✓</span>
                    <span className="min-w-0 flex-1">{t}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 핵심 요소 */}
          {concept.coreElements.length > 0 && (
            <section>
              <SectionLabel icon={<Layers className="h-4 w-4" />}>핵심 요소</SectionLabel>
              <ul className="flex flex-wrap gap-1.5">
                {concept.coreElements.map((el, i) => (
                  <li
                    key={i}
                    className="bg-pullim-slate-100 text-pullim-slate-700 rounded-full px-2.5 py-1 text-xs font-semibold"
                  >
                    {el}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 예제 문항 */}
          {concept.sampleQuestions.length > 0 && (
            <section>
              <SectionLabel icon={<HelpCircle className="h-4 w-4" />}>예제 문항</SectionLabel>
              <ol className="space-y-2">
                {concept.sampleQuestions.map((s, i) => (
                  <li
                    key={i}
                    className="bg-card border-pullim-slate-200 rounded-xl border p-3"
                  >
                    <p className="text-pullim-slate-900 text-sm font-semibold">
                      <span className="text-pullim-blue-600 mr-1 font-mono">Q{i + 1}.</span>
                      {s.q}
                    </p>
                    {s.a && (
                      <p className="text-pullim-slate-600 mt-1.5 text-xs">
                        <span className="text-pullim-blue-700 font-bold">정답 ·</span> {s.a}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ icon, children }: { icon: ReactElement; children: React.ReactNode }) {
  return (
    <div className="text-pullim-blue-700 mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
      {icon}
      {children}
    </div>
  );
}
