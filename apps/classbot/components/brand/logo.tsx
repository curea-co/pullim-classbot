import { cn } from '@/lib/utils';

type Props = {
  size?: number;
  className?: string;
  /** 로고만, 워드마크 숨김 */
  iconOnly?: boolean;
  tone?: 'brand' | 'mono' | 'inverse';
};

const toneToClass: Record<NonNullable<Props['tone']>, string> = {
  brand:   'text-pullim-blue-500',
  mono:    'text-pullim-slate-900',
  inverse: 'text-white',
};

/**
 * 풀림 로고 — 기존 프로토타입 primitives.jsx의 SVG 형태 유지.
 * 워드마크는 Pretendard로 표기.
 */
export function PullimLogo({ size = 24, className, iconOnly, tone = 'brand' }: Props) {
  const colorClass = toneToClass[tone];
  return (
    <span className={cn('inline-flex items-center gap-2', colorClass, className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 6 L6 26 M6 6 Q16 6 20 10 Q24 14 20 18 Q16 22 6 16"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="22" r="2.5" fill="currentColor" />
      </svg>
      {!iconOnly && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.72, letterSpacing: '-0.03em' }}
        >
          풀림
        </span>
      )}
    </span>
  );
}
