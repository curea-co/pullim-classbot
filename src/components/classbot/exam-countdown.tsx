'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

/**
 * 시험 모드 카운트다운 — 60분 기본.
 * spec 12 § 5.4.
 */
export function ExamCountdown({ totalSeconds = 60 * 60, onTimeout }: { totalSeconds?: number; onTimeout?: () => void }) {
  const [remain, setRemain] = useState(totalSeconds);

  useEffect(() => {
    if (remain <= 0) {
      onTimeout?.();
      return;
    }
    const id = setInterval(() => setRemain(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remain, onTimeout]);

  const min = Math.floor(remain / 60);
  const sec = remain % 60;
  const isLow = remain < 5 * 60;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold ${isLow ? 'bg-pullim-danger text-white' : 'bg-pullim-slate-900 text-pullim-lemon'}`}>
      {isLow ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </div>
  );
}
