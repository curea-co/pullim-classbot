import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/components/ui/button';

export interface ComingSoonButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'type' | 'aria-disabled'> {
  children: ReactNode;
  note?: string;
  asButton?: boolean;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  icon?: LucideIcon;
  className?: string;
}

export function ComingSoonButton({
  children,
  note,
  asButton = false,
  variant,
  size,
  icon: Icon,
  className,
  ...props
}: ComingSoonButtonProps) {
  const title = note ? `준비 중 (v2 — ${note})` : '준비 중 (v2)';
  // 두 분기 모두 항상 `disabled` 다 → 접두사 variant 로 쓴다(계약 §4.1: JS 조건·무접두사 금지).
  // asButton 분기에서는 ui/button 의 기본 `disabled:opacity-50` 과 같은 그룹이라
  // tailwind-merge 가 병합해 60 이 이긴다(종전 실효값 50 → 60, 약간 밝아진다).
  const mergedClassName = cn('disabled:opacity-60 cursor-not-allowed', className);

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </>
  );

  if (asButton) {
    return (
      <Button
        disabled
        aria-disabled="true"
        title={title}
        variant={variant}
        size={size}
        className={mergedClassName}
        {...props}
      >
        {content}
      </Button>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={title}
      className={mergedClassName}
      {...props}
    >
      {content}
    </button>
  );
}
