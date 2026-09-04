'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateClassroom } from '@/hooks/api/classroom';

/** 만들어진 수업방 중 배너가 쓰는 것만 — 코드가 주인공이라 코드와 이름뿐이다. */
export interface CreatedClassroom {
  classroomId: string;
  label: string;
  joinCode: string;
}

/** 학년 — 초1~고3. 손으로 적게 두면 「고2」·「고 2」·「2학년」이 한 화면에 섞인다. */
const grades = [
  '초1', '초2', '초3', '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
] as const;

/** 폼 컨트롤 공통 결 — 출제 폼(`assignment/new`)의 select 와 같은 눈금을 쓴다. */
const controlClass =
  'border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none';

/**
 * 수업방 만들기 — 반 · 봇 · 참여 코드가 한 번에 생긴다(서버가 한 트랜잭션으로 묶는다).
 *
 * 묻는 것을 넷으로 줄였다. 반 이름 · 과목 · 학년은 없으면 반을 못 만들고(서버 400),
 * 학원·학교 이름은 안 적으면 **내가 이미 연 반의 소속**을 서버가 물려준다 —
 * 그래서 여기서 다시 묻지 않고 「선택」으로 둔다.
 * 봇 이름도 묻지 않는다 — 비우면 `{과목} 도우미`로 열리고, 이름은 봇 관리에서 바꾼다.
 */
export function CreateClassroomForm({
  onCreated,
}: {
  /** 코드가 나온 순간을 위쪽 배너로 올려 보낸다 — 교사가 지금 할 일은 그 코드를 건네는 것이다. */
  onCreated: (created: CreatedClassroom) => void;
}) {
  const fieldId = useId();
  const create = useCreateClassroom();

  const [label, setLabel] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<string>('고2');
  const [organization, setOrganization] = useState('');

  const filled = label.trim() !== '' && subject.trim() !== '' && grade !== '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filled || create.isPending) return;

    create.mutate(
      {
        label: label.trim(),
        subject: subject.trim(),
        grade,
        ...(organization.trim() ? { organization: organization.trim() } : {}),
      },
      {
        onSuccess: ({ classroom, joinCode }) => {
          onCreated({ classroomId: classroom.id, label: classroom.label, joinCode });
          setLabel('');
          setSubject('');
          setOrganization('');
        },
      },
    );
  }

  return (
    <section className="bg-card rounded-2xl border p-5 lg:p-6" data-testid="create-classroom-form">
      <SectionHeading
        title="수업방 만들기"
        description="반을 열면 그 반의 봇과 참여 코드가 함께 생겨요."
      />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <Field label="반 이름" htmlFor={`${fieldId}-label`}>
          <Input
            id={`${fieldId}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 40))}
            placeholder="예: 고2 미적분 A반"
            data-testid="classroom-label-input"
            className="h-10 text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="과목" htmlFor={`${fieldId}-subject`}>
            <Input
              id={`${fieldId}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 20))}
              placeholder="예: 수학Ⅱ"
              data-testid="classroom-subject-input"
              className="h-10 text-sm"
            />
          </Field>

          <Field label="학년" htmlFor={`${fieldId}-grade`}>
            <select
              id={`${fieldId}-grade`}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              data-testid="classroom-grade-select"
              className={controlClass}
            >
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="학원·학교 이름" hint="선택" htmlFor={`${fieldId}-org`}>
          <Input
            id={`${fieldId}-org`}
            value={organization}
            onChange={(e) => setOrganization(e.target.value.slice(0, 40))}
            placeholder="비워 두면 이미 연 반과 같은 곳으로 열려요"
            data-testid="classroom-org-input"
            className="h-10 text-sm"
          />
        </Field>

        {create.isError && (
          <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="create-classroom-error">
            {create.error.message}
          </p>
        )}

        <Button
          type="submit"
          variant="pullim"
          size="lg"
          disabled={!filled || create.isPending}
          data-testid="create-classroom-submit"
        >
          <Plus />
          {create.isPending ? '여는 중…' : '수업방 열기'}
        </Button>
      </form>
    </section>
  );
}

/** 이름표 + 컨트롤 한 쌍 — 출제 폼의 `Field` 와 같은 모양을 이 화면에도 그대로 쓴다. */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="text-pullim-slate-700 mb-1 flex items-center justify-between text-xs font-bold"
      >
        <span>{label}</span>
        {hint && <span className="text-pullim-slate-500 text-2xs">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
