'use client';

import { useMemo, useState } from 'react';
import { ArrowDownToLine, LayoutTemplate } from 'lucide-react';
import { formatChatDayLabel, formatChatTime } from '@/components/classbot/chat-transcript';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import {
  cardTypeLabel,
  groupMarksByMessage,
  type SignalMark,
  type TranscriptRow,
} from '@/lib/risk-signals';
import { cn } from '@/lib/utils';
import { SignalMarkChips } from './signal-badges';

/**
 * 교사가 읽는 한 학생의 대화 기록 — 턴 단위 시각 · 화자 · 원문 자리에 붙은 신호 · 「확인함」.
 *
 * 골격은 학생 상세의 목 뷰어(`app/(teacher)/teacher/students/[id]/transcript-viewer.tsx`)에서 가져왔다 — 한 줄에
 * 시각·화자·본문, 학생 줄은 slate, 봇 줄은 blue-50. 거기서 **뺀 것**: 범위 이탈·지름길 거르개(서버 원천이 없다 — 주제
 * 이탈은 2차 · 완성 설계 § 7)와 교사 메모(저장할 문이 없다). **더한 것**: 서버 신호가 `messageId` 로 가리키는 자리에
 * 칩을 붙이고, 위 신호 목록에서 「원문 보기」로 그 자리로 뛴다.
 *
 * 줄은 정본 `MemberMessageDto` 를 `toTranscriptRow` 로 옮긴 것이다(`id` = 신호의 `messageId`). 카드 블록은 본문이 null
 * 이라 「카드 · 퀴즈」처럼 종류만 말한다 — 교사 화면은 카드를 다시 그리지 않는다(학생이 본 것은 학생 챗 렌더러 몫).
 * 봇 이름은 행에 없다(`botId` 뿐) — 화자는 「봇」으로 적는다.
 *
 * 확인은 낙관적이다(`hooks/api/monitoring.ts` `useAckSignal`) — 이 컴포넌트는 `onAck` 을 부르고 `marks` 가 바뀌길 기다린다.
 */
export function MemberTranscript({
  studentName,
  rows,
  marks,
  onAck,
  pendingAckIds,
}: {
  studentName: string;
  rows: TranscriptRow[];
  /** 이 학생의 신호 — 최근순. `messageId` 가 줄에 있으면 그 자리에도 붙는다. */
  marks: SignalMark[];
  onAck: (signalId: string) => void;
  /** 확인 요청이 나가 있는 신호 id. */
  pendingAckIds: ReadonlySet<string>;
}) {
  const marksByMessage = useMemo(() => groupMarksByMessage(marks), [marks]);
  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  /** 「원문 보기」로 뛴 줄 — 한 박자 테두리를 밝힌다. */
  const [focusId, setFocusId] = useState<string | null>(null);

  function jumpTo(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    setFocusId(messageId);
    el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }

  return (
    <section className="bg-card rounded-2xl border p-5" data-testid="member-transcript">
      <SectionHeading
        title="대화 기록"
        description={`${studentName} 학생과 봇이 주고받은 기록이에요. 신호가 잡힌 자리는 따로 표시했어요.`}
      />

      {marks.length > 0 && (
        <div className="border-pullim-slate-200 bg-pullim-slate-50 mb-4 rounded-xl border p-3">
          <h3 className="text-pullim-slate-700 text-2xs font-bold">{`신호 ${marks.length}건`}</h3>
          <ol className="mt-2 space-y-1.5" data-testid="signal-list">
            {marks.map((m) => {
              const canJump = m.messageId !== null && rowIds.has(m.messageId);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-pullim-slate-400 font-mono text-micro">{formatChatTime(new Date(m.createdAt).getTime())}</span>
                  <SignalMarkChips mark={m} onAck={onAck} pending={pendingAckIds.has(m.id)} />
                  {canJump ? (
                    <button
                      type="button"
                      onClick={() => jumpTo(m.messageId as string)}
                      className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-0.5 text-2xs font-bold"
                    >
                      <ArrowDownToLine className="h-3 w-3" aria-hidden />
                      원문 보기
                    </button>
                  ) : (
                    <span className="text-pullim-slate-400 text-2xs">원문 없음</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState tone="plain" size="sm" title="아직 기록이 없어요" description="이 학생이 봇과 이야기하면 여기 쌓여요." />
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const isStudent = r.role === 'user';
            const rowMarks = marksByMessage.get(r.id) ?? [];
            const high = rowMarks.some((m) => m.high);
            const dayBreak = i === 0 || !sameDay(rows[i - 1].at, r.at);
            return (
              <li key={r.id} className="space-y-2">
                {dayBreak && (
                  <p className="text-pullim-slate-500 pt-2 text-center text-2xs font-semibold">{formatChatDayLabel(r.at)}</p>
                )}
                <div
                  id={`msg-${r.id}`}
                  tabIndex={-1}
                  data-testid={`transcript-msg-${r.id}`}
                  onBlur={() => setFocusId((cur) => (cur === r.id ? null : cur))}
                  className={cn(
                    'rounded-xl p-3 outline-none',
                    high ? 'border-pullim-danger/30 bg-pullim-danger-bg border' : isStudent ? 'bg-pullim-slate-50' : 'bg-pullim-blue-50/60',
                    focusId === r.id && 'ring-pullim-blue-400/60 ring-2',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-pullim-slate-400 font-mono text-micro">{formatChatTime(r.at)}</span>
                    <span className="text-pullim-slate-700 text-2xs font-bold">{isStudent ? studentName : '봇'}</span>
                  </div>
                  {r.content !== null && r.content.length > 0 ? (
                    <p className="text-pullim-slate-900 mt-1 text-sm leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  ) : r.cardType ? (
                    <Chip tone="outline" className="mt-1">
                      <LayoutTemplate aria-hidden />
                      {`카드 · ${cardTypeLabel(r.cardType)}`}
                    </Chip>
                  ) : (
                    <p className="text-pullim-slate-400 mt-1 text-2xs">(비어 있는 줄)</p>
                  )}
                  {rowMarks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {rowMarks.map((m) => (
                        <SignalMarkChips key={m.id} mark={m} onAck={onAck} pending={pendingAckIds.has(m.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
