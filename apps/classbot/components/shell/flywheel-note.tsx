import type { ReactNode } from 'react';

/**
 * 페이지 하단 「쌓인 기록이 하는 일」 안내 카드 — 공통 톤.
 *
 * 사용:
 * ```tsx
 * <FlywheelNote>
 *   쓰는 동안 자동으로 저장돼요.
 * </FlywheelNote>
 * ```
 */
export function FlywheelNote({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-pullim-blue-50 border-pullim-blue-100 text-pullim-blue-800 rounded-xl border p-4 text-xs leading-relaxed">
      <strong className="text-pullim-blue-700">쌓이면 이렇게 쓰여요</strong>
      <span className="text-pullim-blue-700/80"> · </span>
      {children}
    </aside>
  );
}
