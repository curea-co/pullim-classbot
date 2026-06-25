import { useEffect, useState } from 'react';

/** zustand persist 스토어 — rehydration 완료 여부를 조회/구독할 수 있는 최소 인터페이스. */
type Hydratable = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
};

/**
 * 주어진 persist 스토어들이 **실제로** localStorage에서 rehydrate를 끝냈는지 반환한다.
 *
 * - 초기값은 항상 `false` → SSR/prerender와 클라이언트 첫 페인트가 동일하게 평가되어
 *   하이드레이션 불일치가 없다.
 * - mount 후 `persist.hasHydrated()`로 실제 rehydration 완료를 확인하고(또는
 *   `onFinishHydration` 구독으로 완료를 기다린 뒤) `true`로 전환한다.
 *   → 단순 mounted 플래그와 달리 "진짜 rehydration"을 보장한다.
 */
export function useStoresHydrated(...stores: Hydratable[]): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const allHydrated = () => stores.every((s) => s.persist.hasHydrated());
    if (allHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubs = stores.map((s) =>
      s.persist.onFinishHydration(() => {
        if (allHydrated()) setHydrated(true);
      }),
    );
    return () => unsubs.forEach((u) => u());
    // stores는 모듈 싱글턴이라 안정적 — 마운트 시 1회 구독.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return hydrated;
}
