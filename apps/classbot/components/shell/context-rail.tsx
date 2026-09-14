import { cn } from '@/lib/utils';

export interface ContextRailProps {
  children: React.ReactNode;
  rail?: React.ReactNode;
  railWidth?: 'sm' | 'md' | 'lg';
  stickyRail?: boolean;
  className?: string;
}

const RAIL_WIDTH_MAP: Record<NonNullable<ContextRailProps['railWidth']>, string> = {
  sm: 'lg:grid-cols-[1fr_280px]',
  md: 'lg:grid-cols-[1fr_320px]',
  lg: 'lg:grid-cols-[1fr_360px]',
};

/**
 * 본문 + 옆 레일 2단 레이아웃.
 *
 * 간격은 [TeacherPageShell](../classbot/teacher-page-shell.tsx) 의 눈금을 따른다 —
 * 본문 칼럼은 페이지 섹션과 같은 층위라 28px, 두 칼럼 사이는 24px.
 * 레일은 320px 짜리 좁은 칼럼이라 24px 로 한 눈금 조인다.
 *
 * `railGap` prop 은 걷어냈다. 아무도 넘기지 않았고, `space-y-${railGap}` 처럼
 * 조립한 클래스명은 Tailwind v4 가 소스를 훑을 때 안 보여 생성되지 않는다 —
 * 다른 파일에 우연히 같은 이름이 있을 때만 먹던 값이다.
 */
export function ContextRail({
  children,
  rail,
  railWidth = 'md',
  stickyRail = false,
  className,
}: ContextRailProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6',
        rail && RAIL_WIDTH_MAP[railWidth],
        className,
      )}
    >
      <div className="min-w-0 space-y-7">{children}</div>
      {rail && (
        <aside className={cn('space-y-6', stickyRail && 'lg:sticky lg:top-20')}>
          {rail}
        </aside>
      )}
    </div>
  );
}
