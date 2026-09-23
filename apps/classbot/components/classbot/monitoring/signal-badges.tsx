'use client';

import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import type { SignalBadge, SignalMark } from '@/lib/risk-signals';
import { cn } from '@/lib/utils';

/**
 * 위험 신호 배지 한 벌 — 대화 탭 학생 목록 · 관제소 표 · 대화 기록 옆 신호 칩이 **같은 것**을 쓴다.
 *
 * 색은 둘뿐이다(`08 § 1.3` success/warn deprecated): 세기 **4 이상**만 빨강(`danger`) — 서버가 crisis 개입을 자동으로
 * 만드는 선과 같다(`lib/risk-signals.ts` `HIGH_SEVERITY_MIN`). 나머지는 중립 slate 다. 답 구하기·반복 시도·무의미 입력은
 * 학생을 벌주는 숫자가 아니라 문항·봇 규칙을 손볼 신호라 경고색을 쓰지 않는다(관제소 종전 규칙 그대로).
 *
 * 위기 신호에는 갈래(`detail.category` — 자살·자해 / 우울·무기력 / 학교폭력)를 한 마디 더 단다 — 갈래마다 교사의 대응이
 * 다르다(학교폭력은 자동 개입 없이 교사 확인 대상). 학습 문맥으로 낮춘 위기 신호(`academic`)는 「학습 문맥으로 낮춤 ·
 * 원래 세기 n」을 단다 — 서버가 침묵시키지 않고 교사 확인에 남긴 것이라 화면도 지우지 않는다(pullim-api
 * `ACADEMIC_CONTEXT_MARKERS` 머리주석).
 */

/** 종류별 건수 칩 줄 — 집계 한 행. 신호가 없으면 「없음」 한 마디. */
export function SignalKindChips({ badge, className }: { badge: SignalBadge | null; className?: string }) {
  if (badge === null || badge.kinds.length === 0) {
    return <span className={cn('text-pullim-slate-400 text-2xs', className)}>없음</span>;
  }
  return (
    <span className={cn('flex flex-wrap gap-1', className)} data-testid="signal-kind-chips">
      {badge.kinds.map((k) => (
        <Chip key={k.kind} tone="neutral" className="py-[5px] px-2">
          {k.label}
          <span className="font-mono">{k.count}</span>
        </Chip>
      ))}
    </span>
  );
}

/** 세기 칩 — 4 이상만 빨강. 낭독기에는 「세기 4 · 위험」처럼 선을 넘었는지까지 읽어 준다. */
export function SeverityChip({ severity, high, className }: { severity: number; high: boolean; className?: string }) {
  return (
    <Chip
      tone={high ? 'danger' : 'outline'}
      className={cn('py-[5px] px-2 font-mono', className)}
      aria-label={high ? `세기 ${severity} · 위험` : `세기 ${severity}`}
    >
      {high && <ShieldAlert aria-hidden />}
      {`세기 ${severity}`}
    </Chip>
  );
}

/** 미확인 수 — 0 이면 「모두 확인」. 집계 한 행. */
export function UnackedChip({ unacked, className }: { unacked: number; className?: string }) {
  if (unacked === 0) {
    return (
      <Chip tone="outline" className={cn('py-[5px] px-2', className)}>
        <CheckCircle2 aria-hidden />
        모두 확인
      </Chip>
    );
  }
  return (
    <Chip tone="info" className={cn('py-[5px] px-2', className)} aria-label={`미확인 ${unacked}건`}>
      미확인 <span className="font-mono">{unacked}</span>
    </Chip>
  );
}

/**
 * 신호 한 건의 칩 묶음 + 「확인함」 — 대화 기록의 원문 자리와 위 신호 목록이 같은 모양으로 쓴다.
 * 확인은 낙관적이라(`useAckSignal`) 누르는 즉시 「확인함 · 시각」으로 바뀐다.
 */
export function SignalMarkChips({
  mark,
  onAck,
  pending,
  readOnly = false,
  className,
}: {
  mark: SignalMark;
  onAck: (signalId: string) => void;
  /** 확인 요청이 나가 있는 동안 — 두 번 누르지 않게 잠근다. */
  pending: boolean;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-wrap items-center gap-1', className)} data-testid={`signal-mark-${mark.id}`}>
      <Chip tone={mark.high ? 'danger' : 'neutral'} className="py-[5px] px-2">
        {mark.label}
      </Chip>
      <SeverityChip severity={mark.severity} high={mark.high} />
      {mark.categoryLabel !== null && (
        // 위기 신호의 갈래(자살·자해 / 우울·무기력 / 학교폭력) — 갈래 이름 그대로. 단계는 툴팁에만.
        <Chip tone="outline" className="py-[5px] px-2" title={mark.tier !== null ? `${mark.tier}단계` : undefined}>
          {mark.categoryLabel}
        </Chip>
      )}
      {mark.academic && (
        // 원래 세기는 글자에 싣는다 — 툴팁은 키보드·낭독기·터치에서 안 보인다.
        <Chip tone="outline" className="py-[5px] px-2">
          {mark.downgradedFrom !== null ? `학습 문맥으로 낮춤 · 원래 세기 ${mark.downgradedFrom}` : '학습 문맥으로 낮춤'}
        </Chip>
      )}
      {mark.acked ? (
        <span className="text-pullim-slate-500 inline-flex items-center gap-0.5 text-2xs font-semibold">
          <CheckCircle2 aria-hidden className="h-3 w-3" />
          확인함
        </span>
      ) : readOnly ? (
        <span className="text-pullim-slate-500 text-2xs font-semibold">미확인</span>
      ) : (
        <button
          type="button"
          onClick={() => onAck(mark.id)}
          disabled={pending}
          data-testid={`signal-ack-${mark.id}`}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-7 items-center rounded-full px-2.5 text-2xs font-bold text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          확인함
        </button>
      )}
    </span>
  );
}
