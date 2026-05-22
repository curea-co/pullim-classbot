'use client';

import { useEffect, useState } from 'react';

/**
 * 마운트 시점의 현재 HH:MM을 표시.
 * [13 § 3.3.3·9.3] 봇 코멘트 카드의 시간 메타용 — server-rendered 고정값으로 즉시성을 깨지 않기 위해 client mount 시점 캡처.
 * SSR/hydration mismatch 회피를 위해 초기값은 fallback 라벨, mount 후 실제 시간으로 치환.
 */
export function CurrentTimeLabel({ fallback = '오늘' }: { fallback?: string }) {
  const [label, setLabel] = useState<string>(fallback);
  useEffect(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setLabel(`${hh}:${mm}`);
  }, []);
  return <span className="font-mono">{label}</span>;
}
