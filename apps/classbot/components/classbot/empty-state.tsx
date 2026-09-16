import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** @default 'neutral' */
  tone?: 'neutral' | 'danger' | 'plain';
  /**
   * 빈 상태의 단 하나뿐인 나가는 길.
   * `label` 은 **보이는 글자**라 단어로 줄인다([07 § 6.6](../../../../proc/spec/07-branding.md)).
   * 줄이며 잃은 뜻은 `ariaLabel` 에 남긴다 — 낭독기에는 「받은 과제」가 아니라
   * 「받은 과제로 가기」로 읽혀야 어디로 가는 길인지 안다 (§ 6.6.2(3)).
   */
  action?:
    | { href: string; label: string; ariaLabel?: string }
    | { onClick: () => void; label: string; ariaLabel?: string };
  /** @default 'lg' */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 빈 상태 세로 여백.
 * 카드(p-5) 안에 들어가는 일이 많아 예전 py-10(40px)은 카드째 빈 상자로 보였다.
 * 카드 패딩 20px 과 같은 눈금 위에 올려 lg=28 / md=24 / sm=20 으로 낮춘다.
 */
const sizePadding = {
  lg: 'py-7',
  md: 'py-6',
  sm: 'py-5',
} as const;

const chipSize = {
  lg: 'h-10 w-10',
  md: 'h-8 w-8',
  sm: 'h-7 w-7',
} as const;

const iconSize = {
  lg: 'h-5 w-5',
  md: 'h-4 w-4',
  sm: 'h-3.5 w-3.5',
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  action,
  size = 'lg',
  className,
}: EmptyStateProps) {
  const isPlain = tone === 'plain';

  const wrapperClass = cn(
    'flex flex-col items-center gap-2 text-center px-5',
    sizePadding[size],
    !isPlain && 'rounded-2xl border border-dashed',
    tone === 'neutral' && 'bg-pullim-slate-50 border-pullim-slate-200',
    tone === 'danger' && 'bg-pullim-danger/5 border-pullim-danger/30',
    className,
  );

  const chipClass = cn(
    'flex items-center justify-center rounded-xl',
    chipSize[size],
    tone === 'neutral' && 'bg-pullim-slate-100 text-pullim-slate-500',
    tone === 'danger' && 'bg-pullim-danger/10 text-pullim-danger',
  );

  const actionClass =
    'bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-1.5 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold text-white transition-colors';

  // Determine action element
  let actionEl: ReactNode = null;
  if (action) {
    if ('href' in action) {
      actionEl = (
        <Link href={action.href} aria-label={action.ariaLabel} className={actionClass}>
          {action.label}
        </Link>
      );
    } else {
      actionEl = (
        <button type="button" onClick={action.onClick} aria-label={action.ariaLabel} className={actionClass}>
          {action.label}
        </button>
      );
    }
  }

  if (isPlain) {
    return (
      <div className={wrapperClass}>
        <p className="text-pullim-slate-500 text-sm font-bold">{title}</p>
        {description && (
          <p className="text-pullim-slate-500 text-2xs">{description}</p>
        )}
        {actionEl}
      </div>
    );
  }

  return (
    <section className={wrapperClass}>
      {Icon && (
        <span className={chipClass}>
          <Icon className={iconSize[size]} aria-hidden />
        </span>
      )}
      <p className="text-pullim-slate-900 text-sm font-bold">{title}</p>
      {description && (
        <p className="text-pullim-slate-500 text-2xs">{description}</p>
      )}
      {actionEl}
    </section>
  );
}

/**
 * 빈 상태·에러 상태를 **세로만** 가운데로 두는 껍데기.
 *
 * 종전에는 화면마다 `flex h-full min-h-0 items-center justify-center` 를 직접 적었는데,
 * 그러면 가로도 같이 가운데가 되면서 **flex 아이템이 글자 폭으로 줄어든다.** 같은
 * `EmptyState` 인데도 블록으로 놓인 곳(봇 마켓 목록 안)보다 눈에 띄게 좁은 상자가 됐다.
 * 안쪽 `w-full` 이 그 수축을 막는다 — `justify-center` 는 아이템이 가로를 꽉 채우면
 * 남는 공간이 없어 할 일이 없으므로 **적지 않는다**(적어 두면 「가로도 가운데」로 읽혀
 * 다음 사람이 `w-full` 을 걷어낸다).
 *
 * 화면마다 손으로 `w-full` 을 붙이지 않고 여기로 모은 이유: 한 번 빠뜨리면 그 화면만
 * 조용히 좁아지고 테스트는 초록으로 지나간다 — 봇 대화·학습 기록이 실제로 그랬고,
 * 두 화면 모두 **에러 상태 쪽은 고쳐지지 않은 채로** 한 라운드를 더 갔다.
 *
 * 안에 여러 줄을 넣을 때 `items-center` 를 쓰지 마라 — 세로 열에서 그건 다시 「글자 폭」이다.
 * 가운데로 보이고 싶은 글자에는 `text-center` 를 준다.
 */
export function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 items-center">
      <div className="w-full">{children}</div>
    </div>
  );
}
