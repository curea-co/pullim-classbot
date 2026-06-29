'use client';

import { useRouter } from 'next/navigation';
import { RotateCcw, Play, MessageCircle } from 'lucide-react';
import { type Replay, formatReplayTime } from '@/lib/mock';
import { getReplayWeakPoints, type WeakPoint } from '@/lib/mock/classbot-replay-recap';
import { getReplayQuiz } from '@/lib/mock/classbot-replay-exam';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { useResolvedWeakPoints, useReplayStore } from '@/lib/store/replay';
import { useProficiencyStore } from '@/lib/store/proficiency';
import { useCurrentUser } from '@/lib/current-user';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { cn } from '@/lib/utils';

/**
 * 약점 label → 레슨 개념 id 추론. label 부분일치(개념명 포함) 우선,
 * 실패 시 첫 개념 폴백(레슨이 비면 'c1').
 */
function inferConceptId(botId: string, label: string): string {
  const concepts = getBotLesson(botId).concepts;
  const lower = label.toLowerCase();
  const hit = concepts.find(
    (c) => lower.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(lower),
  );
  return hit?.id ?? concepts[0]?.id ?? 'c1';
}

/**
 * 리플레이 회고 카드 — 핵심 정리 + 자동 약점(막힌 곳) + 다음 행동. spec §8.
 * 약점은 getReplayWeakPoints(순수)에서, 해결 상태는 replay 스토어(persist)에서.
 * persist hydration 전에는 resolved를 빈 것으로 취급해 ✓ 플래시/SSR 불일치를 막는다.
 */
export function ReplayRecap({
  replay,
  onSeek,
  onReattempt,
}: {
  replay: Replay;
  onSeek: (atSec: number) => void;
  onReattempt: (weakPoint: WeakPoint) => void;
}) {
  const hydrated = useStoresHydrated(useReplayStore);
  const resolvedRaw = useResolvedWeakPoints(replay.id);
  const resolved = hydrated ? resolvedRaw : [];
  const router = useRouter();
  const me = useCurrentUser();

  // 회고 '질문' — 약점을 복습 deck(proficiency)에 합류시킨 뒤 챗으로 이동.
  // 기존 ask= 평문 prefill 도 유지(즉문즉답) — deck=구조화 재학습이라 중복 아님.
  function handleAsk(w: WeakPoint) {
    const conceptId = inferConceptId(replay.botId, w.label);
    useProficiencyStore.getState().addReplayWeakness(me.id, {
      botId: replay.botId,
      replayId: replay.id,
      atSec: w.atSec,
      conceptId,
      label: w.label,
    });
    router.push(
      `/classbot/chat?bot=${replay.botId}&ask=${encodeURIComponent(`${w.label} 다시 설명해 줄래?`)}`,
    );
  }

  const weakPoints = getReplayWeakPoints(replay);
  const open = weakPoints.filter(w => !resolved.includes(w.key));
  const resolvedCount = weakPoints.length - open.length;

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-pullim-sm">
      {/* 헤더 */}
      <div className="bg-pullim-slate-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pullim-slate-400">
            🧑‍🏫 {replay.botName} · 수업 정리
          </span>
          <span className="text-xs text-pullim-slate-300">{replay.date}</span>
        </div>
        <h2 className="mt-1.5 text-lg font-bold leading-tight">{replay.title}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-pullim-slate-800 px-2.5 py-0.5 text-xs font-bold text-pullim-slate-200">정답률 {replay.myAccuracy}%</span>
          <span className="rounded-full bg-pullim-slate-800 px-2.5 py-0.5 text-xs font-bold text-pullim-slate-200">
            {replay.durationMin}분 · {replay.watchProgress.completed ? '끝까지 봄' : '이어 보기'}
          </span>
        </div>
      </div>

      {/* 핵심 정리 */}
      {replay.keyTakeaways.length > 0 && (
        <div className="border-b border-pullim-slate-100 p-4">
          <p className="mb-2 text-sm font-bold text-pullim-slate-900">핵심 정리</p>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-pullim-slate-600">
            {replay.keyTakeaways.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {/* 막힌 곳 */}
      <div className="p-4">
        <p className="mb-2.5 text-sm font-bold text-pullim-slate-900">
          ⚠ 내가 막힌 곳 <span className="text-pullim-blue-600">{open.length}</span>
        </p>

        {open.length === 0 ? (
          <p className="rounded-xl bg-pullim-slate-50 px-3 py-4 text-center text-sm text-pullim-slate-500">
            막힌 곳을 모두 정리했어요 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map(w => {
              const hasQuiz = getReplayQuiz(replay.id, w.atSec) !== null;
              return (
                <li key={w.key} className="rounded-xl border border-pullim-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-bold text-pullim-slate-800">{w.label}</span>
                    <ReasonChip reason={w.reason} />
                  </div>
                  <div className="mt-0.5 text-xs text-pullim-slate-500">{formatReplayTime(w.atSec)}</div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {w.reason === 'wrong' && hasQuiz && (
                      <ActionButton primary onClick={() => onReattempt(w)} icon={RotateCcw} label="다시 풀기" />
                    )}
                    <ActionButton onClick={() => onSeek(w.atSec)} icon={Play} label="다시 보기" />
                    <button
                      type="button"
                      onClick={() => handleAsk(w)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-pullim-slate-50 px-3 text-xs font-bold text-pullim-slate-600 hover:bg-pullim-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> 질문
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {resolvedCount > 0 && (
          <p className="mt-2.5 px-1 text-xs text-pullim-slate-400">✓ 해결한 약점 {resolvedCount}개</p>
        )}
      </div>
    </section>
  );
}

function ReasonChip({ reason }: { reason: WeakPoint['reason'] }) {
  if (reason === 'wrong') {
    return <span className="shrink-0 rounded-full bg-pullim-danger/10 px-2 py-0.5 text-2xs font-bold text-pullim-danger">오답</span>;
  }
  // 집중 저하 — amber/green 금지 → slate 틴트
  return <span className="shrink-0 rounded-full bg-pullim-slate-100 px-2 py-0.5 text-2xs font-bold text-pullim-slate-500">집중 ↓</span>;
}

function ActionButton({
  onClick, icon: Icon, label, primary,
}: {
  onClick: () => void;
  icon: typeof Play;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
        primary
          ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
          : 'bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100',
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
