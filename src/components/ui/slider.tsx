'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Track 색 보정 — 기본 풀림 블루 */
  accentClassName?: string;
};

function Slider({
  className,
  accentClassName,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative flex w-full touch-none items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full grow items-center">
        <SliderPrimitive.Track className="bg-pullim-slate-200 relative h-1.5 w-full grow overflow-hidden rounded-full">
          <SliderPrimitive.Indicator
            className={cn('bg-pullim-blue-500 absolute h-full rounded-full', accentClassName)}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'bg-pullim-blue-600 ring-offset-background block size-4 shrink-0 cursor-grab rounded-full border-2 border-white shadow-sm transition-transform',
            'hover:scale-110 active:scale-115 active:cursor-grabbing',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
