'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Edit3, Send, Check, X, Save } from 'lucide-react';
import { useReplayStore } from '@/lib/store/replay';
import type { Replay } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 교사 리플레이 검수 액션 — 핵심 메시지 편집 + 승인 (sent 전환).
 * D3 의사결정: 승인 + 핵심메시지 편집.
 */
export function ReplayReviewActions({ replay }: { replay: Replay }) {
  const override = useReplayStore(s => s.overrides[replay.id]);
  const setTakeaways = useReplayStore(s => s.setTakeaways);
  const approve = useReplayStore(s => s.approve);

  const effectiveStatus = override?.status ?? replay.status;
  const effectiveTakeaways = override?.keyTakeaways ?? replay.keyTakeaways;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(effectiveTakeaways);

  if (effectiveStatus === 'sent') {
    return (
      <section className="bg-pullim-blue-50 border-pullim-blue-200 text-pullim-blue-800 rounded-2xl border p-4">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          <strong className="text-sm">발송 완료</strong>
        </div>
        <p className="text-pullim-blue-700 mt-1 text-xs">
          학생 리플레이 탭에 노출됩니다. 핵심 메시지·status는 새로고침 시에도 유지돼요(localStorage).
        </p>
      </section>
    );
  }

  if (effectiveStatus !== 'review') return null;

  function startEdit() {
    setDraft(effectiveTakeaways);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(effectiveTakeaways);
    setEditing(false);
  }

  function saveEdit() {
    const cleaned = draft.map(d => d.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error('최소 1개 이상의 핵심 메시지가 필요해요');
      return;
    }
    setTakeaways(replay.id, cleaned);
    setEditing(false);
    toast.success('핵심 메시지 수정됨');
  }

  function handleApprove() {
    approve(replay.id);
    toast.success('🚀 학생에게 발송 완료', {
      description: `${replay.title} — 학생 리플레이 탭에 즉시 노출`,
      duration: 4000,
    });
  }

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-pullim-slate-900 text-sm font-bold">핵심 메시지 검수</h2>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-[11px] font-bold"
          >
            <Edit3 className="h-3 w-3" />
            편집
          </button>
        )}
      </header>

      {editing ? (
        <div className="space-y-2">
          {draft.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="bg-pullim-blue-100 text-pullim-blue-700 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <textarea
                value={t}
                onChange={e => {
                  const v = e.target.value;
                  setDraft(prev => prev.map((p, idx) => idx === i ? v : p));
                }}
                rows={2}
                className="border-pullim-slate-200 focus:border-pullim-blue-500 flex-1 rounded-lg border p-2 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => setDraft(prev => prev.filter((_, idx) => idx !== i))}
                aria-label={`${i + 1}번 삭제`}
                className="text-pullim-slate-400 hover:text-pullim-danger mt-1.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {draft.length < 5 && (
            <button
              type="button"
              onClick={() => setDraft(prev => [...prev, ''])}
              className="text-pullim-blue-600 hover:text-pullim-blue-700 text-[11px] font-bold"
            >
              + 메시지 추가
            </button>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="text-pullim-slate-600 hover:bg-pullim-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="bg-pullim-slate-700 hover:bg-pullim-slate-900 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            >
              <Save className="h-3 w-3" />
              저장
            </button>
          </div>
        </div>
      ) : (
        <ol className="space-y-2">
          {effectiveTakeaways.map((t, i) => (
            <li key={i} className="bg-pullim-slate-50 flex items-start gap-2 rounded-lg p-3 text-sm">
              <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-pullim-slate-700">{t}</span>
            </li>
          ))}
        </ol>
      )}

      {!editing && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleApprove}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
          >
            <Send className="h-3.5 w-3.5" />
            승인 → 학생 발송
          </button>
        </div>
      )}
    </section>
  );
}
