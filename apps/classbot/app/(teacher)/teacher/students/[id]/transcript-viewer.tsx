'use client';

import { useMemo, useState } from 'react';
import { CircleAlert, PenLine } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { TranscriptTurn } from '@/lib/mock/classbot-student-report';
import { cn } from '@/lib/utils';

type ViewFilter = 'all' | 'off-topic' | 'shortcut';

/**
 * 대화 기록 뷰어 — 턴 단위 타임스탬프 · 범위 이탈 턴 표시 · 교사 메모 자리.
 *
 * 메모는 지금 **화면 안에서만** 붙는다(새로고침하면 사라짐).
 * 저장은 BE 가 생기면 붙일 자리이고 아래 handleAttach 에 표시해 뒀다.
 */
export function TranscriptViewer({
  turns,
  studentName,
  botName,
}: {
  turns: TranscriptTurn[];
  studentName: string;
  botName: string;
}) {
  const [filter, setFilter] = useState<ViewFilter>('all');
  /** turnId → 교사 메모 (화면 안에서만 유지) */
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [openMemo, setOpenMemo] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: turns.length,
    'off-topic': turns.filter(t => t.offTopic).length,
    shortcut: turns.filter(t => t.kind === 'shortcut' && t.speaker === 'student').length,
  }), [turns]);

  const options = [
    { value: 'all',       label: '전체 턴',   count: counts.all },
    { value: 'off-topic', label: '범위 이탈', count: counts['off-topic'] },
    { value: 'shortcut',  label: '지름길',    count: counts.shortcut },
  ] as const;

  const visible = useMemo(() => {
    if (filter === 'all') return turns;
    if (filter === 'off-topic') return turns.filter(t => t.offTopic);
    return turns.filter(t => t.kind === 'shortcut' && t.speaker === 'student');
  }, [turns, filter]);

  function handleAttach(turnId: string, text: string) {
    // TODO(BE): 저장 자리 — POST /api/teacher/students/{id}/turns/{turnId}/memo
    // 지금은 화면 상태로만 붙인다. 새로고침하면 사라지는 것이 의도된 동작.
    setMemos(prev => ({ ...prev, [turnId]: text }));
    setOpenMemo(null);
  }

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title="대화 기록"
        description={`${studentName} 학생과 ${botName}이 주고받은 기록이에요. 범위를 벗어난 턴은 따로 표시했어요.`}
      />

      <FilterPillButtons
        className="mb-3"
        options={options}
        current={filter}
        onSelect={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState tone="plain" size="sm" title="이 조건에 해당하는 턴이 없어요" />
      ) : (
        <ol className="space-y-2">
          {visible.map(t => {
            const isStudent = t.speaker === 'student';
            const memo = memos[t.id];
            return (
              <li
                key={t.id}
                className={cn(
                  'rounded-xl p-3',
                  t.offTopic
                    ? 'border-pullim-danger/30 bg-pullim-danger-bg border'
                    : isStudent
                      ? 'bg-pullim-slate-50'
                      : 'bg-pullim-blue-50/60',
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-pullim-slate-400 font-mono text-micro">{t.at}</span>
                  <span className="text-pullim-slate-700 text-2xs font-bold">
                    {isStudent ? studentName : botName}
                  </span>
                  {t.offTopic && (
                    <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-bold text-white">
                      <CircleAlert className="h-2.5 w-2.5" aria-hidden />
                      범위 밖
                    </span>
                  )}
                  {isStudent && t.kind === 'shortcut' && (
                    <span className="bg-pullim-slate-200 text-pullim-slate-700 rounded-full px-1.5 py-0.5 text-micro font-bold">
                      지름길
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenMemo(openMemo === t.id ? null : t.id)}
                    className="text-pullim-blue-600 hover:text-pullim-blue-700 ml-auto inline-flex items-center gap-0.5 text-micro font-bold"
                  >
                    <PenLine className="h-3 w-3" aria-hidden />
                    {memo ? '메모 고치기' : '메모 달기'}
                  </button>
                </div>

                <p className="text-pullim-slate-900 mt-1 text-sm leading-relaxed">{t.text}</p>

                {memo && (
                  <p className="border-pullim-blue-200 text-pullim-slate-700 mt-2 border-l-2 bg-white px-2.5 py-1.5 text-2xs leading-relaxed">
                    <b className="text-pullim-slate-500">선생님 메모</b> · {memo}
                  </p>
                )}

                {openMemo === t.id && (
                  <TurnMemoForm
                    turnId={t.id}
                    initial={memo ?? ''}
                    onAttach={handleAttach}
                    onCancel={() => setOpenMemo(null)}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        메모는 아직 저장되지 않아요. 지금은 화면에서 어떻게 붙는지만 볼 수 있어요.
      </p>
    </section>
  );
}

function TurnMemoForm({
  turnId,
  initial,
  onAttach,
  onCancel,
}: {
  turnId: string;
  initial: string;
  onAttach: (turnId: string, text: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);

  return (
    <div className="mt-2">
      <label htmlFor={`memo-${turnId}`} className="sr-only">이 턴에 남길 교사 메모</label>
      <Textarea
        id={`memo-${turnId}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={2}
        placeholder="이 턴에 남길 메모 — 예: 여기서 스스로 고쳐 말했음"
        className="rounded-xl bg-white text-sm"
      />
      <div className="mt-1.5 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onAttach(turnId, draft.trim())}
          disabled={draft.trim().length === 0}
        >
          메모 붙이기
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
