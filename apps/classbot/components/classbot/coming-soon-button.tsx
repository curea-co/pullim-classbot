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
  const mergedClassName = cn('opacity-60 cursor-not-allowed', className);

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
