import type { LucideIcon } from 'lucide-react';
import { ListChecks, PenLine, Type, Hash } from 'lucide-react';

export type QuestionType = 'mc' | 'essay' | 'short' | 'numeric';

export const questionTypeMeta: Record<
  QuestionType,
  { label: string; icon: LucideIcon }
> = {
  mc: { label: '객관식', icon: ListChecks },
  essay: { label: '서술형', icon: PenLine },
  short: { label: '단답', icon: Type },
  numeric: { label: '수치', icon: Hash },
};

export function questionTypeLabel(t: string): string {
  return (questionTypeMeta as Record<string, { label: string }>)[t]?.label ??
    t;
}
