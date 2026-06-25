import type { Replay, ReplaySegment } from '@/lib/mock';

/**
 * 리플레이 회고 — 약점(막힌 곳) 자동 파생.
 * 기존 Replay 데이터만으로 계산하는 순수 함수(저장 안 함). spec §5.
 */
export type WeakPoint = {
  /** 안정 키 — resolved 스토어/회고 매칭용. `q:<atSec>`(오답) / `f:<atSec>`(집중저하) */
  key: string;
  atSec: number;
  label: string;
  reason: 'wrong' | 'low-focus';
};

/** 이 값 미만의 1분 집중도 빈은 '집중 저하' 구간으로 본다. */
export const FOCUS_THRESHOLD = 40;
const MAX_WEAK_POINTS = 4;

export function getReplayWeakPoints(replay: Replay): WeakPoint[] {
  const points: WeakPoint[] = [];

  // 1) 오답 퀴즈 세그먼트
  for (const s of replay.segments) {
    if (s.type === 'quiz' && s.myAnswer && s.correctAnswer && s.myAnswer !== s.correctAnswer) {
      points.push({ key: `q:${s.atSec}`, atSec: s.atSec, label: s.label, reason: 'wrong' });
    }
  }

  // 2) 집중 저하 1분 빈 → 가장 가까운 concept/attention 세그먼트로 매핑
  const anchors: ReplaySegment[] = replay.segments.filter(
    s => s.type === 'concept' || s.type === 'attention',
  );
  replay.focusBins.forEach((focus, min) => {
    if (focus >= FOCUS_THRESHOLD || anchors.length === 0) return;
    const atSec = min * 60;
    const nearest = anchors.reduce((best, s) =>
      Math.abs(s.atSec - atSec) < Math.abs(best.atSec - atSec) ? s : best,
    );
    points.push({ key: `f:${nearest.atSec}`, atSec: nearest.atSec, label: nearest.label, reason: 'low-focus' });
  });

  // atSec 기준 dedupe(오답 우선) → 정렬 → 상위 N cap
  const byAtSec = new Map<number, WeakPoint>();
  for (const p of points) {
    const existing = byAtSec.get(p.atSec);
    if (!existing || (existing.reason === 'low-focus' && p.reason === 'wrong')) {
      byAtSec.set(p.atSec, p);
    }
  }
  return [...byAtSec.values()].sort((a, b) => a.atSec - b.atSec).slice(0, MAX_WEAK_POINTS);
}
