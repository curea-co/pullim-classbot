import type { ReactNode } from 'react';

/**
 * 페이지 하단 데이터 플라이휠 안내 카드 — 공통 톤.
 *
 * 사용:
 * ```tsx
 * <FlywheelNote>
 *   오늘 풀이한 문제는 <strong>풀림 인덱스</strong>의 IRT θ를 갱신해요.
 * </FlywheelNote>
 * ```
 */
export function FlywheelNote({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-pullim-blue-50 border-pullim-blue-100 text-pullim-blue-800 rounded-xl border p-3.5 text-xs leading-relaxed">
      <strong className="text-pullim-blue-700">데이터 플라이휠</strong>
      <span className="text-pullim-blue-700/80"> · </span>
      {children}
    </aside>
  );
}
