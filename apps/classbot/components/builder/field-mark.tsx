'use client';

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { isRequired, type Fault, type FieldKey } from './builder-types';

/**
 * 항목 이름 옆 표시.
 *
 * 꼭 골라야 하는 것은 **빨간 `*`**, 나머지는 **`(선택)`** 하나로 끝낸다.
 * 종전의 배지 세 벌(`꼭 골라요` / `기본값` / `내가 정함`)과 항목마다 붙던
 * 「왜 비워도 되는지 한 마디」는 걷어냈다 — `(선택)` 이 그 자리를 대신한다.
 *
 * `*` 는 눈으로만 읽히는 기호라 화면 낭독기에는 말로 따로 붙인다.
 */
function FieldMark({ field }: { field: FieldKey }) {
  const required = isRequired(field);

  return (
    <span data-testid={`field-mark-${field}`} className="text-micro font-medium">
      {required ? (
        <>
          <span aria-hidden className="text-pullim-danger font-bold">*</span>
          <span className="sr-only">꼭 골라야 해요</span>
        </>
      ) : (
        <span className="text-pullim-slate-400">(선택)</span>
      )}
    </span>
  );
}

/** 항목 이름 + 표시. 입력칸이 있는 항목만 `htmlFor` 를 준다(나머지는 라디오 묶음이라 라벨이 붙지 않는다). */
export function FieldLabel({
  field, htmlFor, children,
}: {
  field: FieldKey;
  htmlFor?: string;
  children: ReactNode;
}) {
  const className = 'text-pullim-slate-700 mb-2 flex flex-wrap items-center gap-1 text-xs font-bold';
  const inner = (
    <>
      {children}
      <FieldMark field={field} />
    </>
  );

  if (htmlFor) {
    return <Label htmlFor={htmlFor} className={className}>{inner}</Label>;
  }
  return <span className={className}>{inner}</span>;
}

/**
 * 막힌 까닭을 그 항목 밑에서 말한다.
 *
 * 「다음」과 「이대로 만들기」가 **같은 자리**를 쓴다 — 막는 길이 둘이라고 알리는 방식까지
 * 둘이 되면 교사는 같은 잘못을 두 모양으로 만나게 된다. 막힌 항목이 아니면 아무것도 그리지 않는다.
 */
export function FieldError({ fault, field }: { fault: Fault | null; field: FieldKey }) {
  if (fault?.field !== field) return null;

  return (
    <p role="alert" className="text-pullim-danger mt-1.5 text-micro font-bold">
      {fault.message}
    </p>
  );
}
