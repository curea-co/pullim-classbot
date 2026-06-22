import { ReactNode } from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BotNoteProps {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function BotNote({ children, icon: Icon = Sparkles, className }: BotNoteProps) {
  return (
    <div
      className={cn(
        'text-pullim-blue-700 bg-pullim-blue-50/60 rounded-lg px-3 py-2 text-2xs leading-relaxed',
        className
      )}
    >
      <Icon className="-mt-0.5 mr-0.5 inline h-3 w-3" aria-hidden />
      {children}
    </div>
  );
}
