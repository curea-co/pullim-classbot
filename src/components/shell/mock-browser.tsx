import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  /** 상단 바에 표시할 가짜 URL/라벨 */
  label?: string;
  /** 다크 톤 (오답정복 워크룸 같은 곳용) */
  dark?: boolean;
  className?: string;
};

/**
 * 소개하기 페이지용 mock 브라우저 프레임.
 * 실제 컴포넌트나 간이 mockup을 감싸 "이 화면이 이렇게 생겼어요" 시각 안내 제공.
 */
export function MockBrowser({ children, label, dark, className }: Props) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border shadow-pullim-md',
        dark ? 'bg-pullim-slate-950 border-pullim-slate-800' : 'bg-card',
        className,
      )}
    >
      {/* 상단 — 가짜 traffic light + 라벨 */}
      <div
        className={cn(
          'flex items-center gap-1.5 border-b px-2.5 py-1.5',
          dark ? 'bg-pullim-slate-900 border-pullim-slate-800' : 'bg-pullim-slate-100 border-pullim-slate-200',
        )}
      >
        <span className="bg-pullim-danger/50 h-2 w-2 rounded-full" />
        <span className="bg-pullim-warn/50 h-2 w-2 rounded-full" />
        <span className="bg-pullim-success/50 h-2 w-2 rounded-full" />
        {label && (
          <span
            className={cn(
              'ml-2 truncate font-mono text-[10px]',
              dark ? 'text-pullim-slate-400' : 'text-pullim-slate-500',
            )}
          >
            {label}
          </span>
        )}
      </div>
      {/* 콘텐츠 */}
      <div className="p-3">{children}</div>
    </div>
  );
}
