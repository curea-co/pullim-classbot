'use client';

import { useSyncExternalStore } from 'react';

/**
 * prefers-reduced-motion: reduce 여부 (A5).
 * useSyncExternalStore 로 matchMedia 변화를 구독한다.
 * SSR/미지원 환경은 false 를 반환해 hydration 불일치를 막는다(서버=클라 첫 페인트 일치).
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/** SSR/서버 스냅샷 — 항상 false (hydration 안전). */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
