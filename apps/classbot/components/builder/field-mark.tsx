'use client';

import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/chip';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { fieldMarks, type BotDraft, type FieldKey } from './builder-types';

/**
 * 안내 ② — 항목 이름 옆에 붙는 표시.
 *
 * 「채워진 것」의 줄 배지와 **같은 컴포넌트**를 쓴다. 배지를 두 벌 만들면 언젠가 한쪽만 고쳐져
 * 같은 항목이 화면 두 곳에서 다르게 읽힌다. 그래서 모양도 상태(`draft.own`)도 하나로 묶는다.
 */

/** 두 자리(항목 옆 · 「채워진 것」)에서 같은 크기로 보이도록 모양을 한 곳에 둔다. */
const badgeShape = 'rounded-full px-2 py-0.5 text-micro font-bold leading-tight';

export function OwnBadge({
  own, required, className,
}: {
  own: boolean;
  required?: boolean;
  className?: string;
}) {
  if (own) {
    return <Chip tone="info" className={cn(badgeShape, className)}>내가 정함</Chip>;
  }
  if (required) {
    return <Chip tone="brand" className={cn(badgeShape, className)}>꼭 골라요</Chip>;
  }
  return <Chip tone="outline" className={cn(badgeShape, className)}>기본값</Chip>;
}

/** 배지 + 왜 비워도 되는지 한 마디. 「내가 정함」이 되면 그 한 마디는 할 일이 끝나 사라진다. */
export function FieldMark({ field, draft }: { field: FieldKey; draft: BotDraft }) {
  const mark = fieldMarks[field];
  const own = draft.own[field];

  return (
    <span
      data-testid={`field-mark-${field}`}
      className={cn(
        'inline-flex flex-wrap items-center gap-1.5 text-micro font-medium',
        own ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
      )}
    >
      <OwnBadge own={own} required={mark.required} />
      {!own && mark.why && <span>{mark.why(draft)}</span>}
    </span>
  );
}

/** 항목 이름 + 표시. 입력칸이 있는 항목만 `htmlFor` 를 준다(나머지는 라디오 묶음이라 라벨이 붙지 않는다). */
export function FieldLabel({
  field, draft, htmlFor, children,
}: {
  field: FieldKey;
  draft: BotDraft;
  htmlFor?: string;
  children: ReactNode;
}) {
  const className = 'text-pullim-slate-700 mb-2 flex flex-wrap items-center gap-2 text-xs font-bold';
  const inner = (
    <>
      {children}
      <FieldMark field={field} draft={draft} />
    </>
  );

  if (htmlFor) {
    return <Label htmlFor={htmlFor} className={className}>{inner}</Label>;
  }
  return <span className={className}>{inner}</span>;
}
