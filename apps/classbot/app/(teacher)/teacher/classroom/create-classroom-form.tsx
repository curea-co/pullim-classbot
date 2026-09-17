'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateClassroom } from '@/hooks/api/classroom';
import { statusOf } from '@/lib/api/classbot-client';
import type { CreateClassBody, JoinCodeDto } from '@/lib/api/classbot-dto';
import { GRADES } from '@/lib/grades';

/** 만들어진 반 중 배너가 쓰는 것만 — 코드가 주인공이라 코드와 이름, 그리고 반 상세로 가는 id 다. */
export interface CreatedClassroom {
  classId: string;
  name: string;
  /** 반과 한 트랜잭션에서 나온 첫 코드 — `expiresAt` 이 함께 온다(기본 +48h). */
  joinCode: JoinCodeDto;
}

/** 폼 컨트롤 공통 결 — 출제 폼(`assignment/new`)의 select 와 같은 눈금을 쓴다. */
const controlClass =
  'border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none';

/**
 * 반 만들기 실패 → 교사가 읽는 한 줄. 서버가 가른 뜻을 뭉개지 않는다.
 *  - 400 은 본문 검증(이름 비었음·너무 김) · 403 은 entitlement(교사 계정이 아니거나 classbot 쓰기 권한 없음) ·
 *    404 는 `botId` 를 보냈을 때만 나오는데 이 폼은 보내지 않는다 — 그래도 뜻은 적어 둔다.
 * @param error - `useCreateClassroom` 이 던진 오류
 * @returns 폼 아래 한 줄
 */
export function createFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 400:
      return '반 이름을 다시 확인해 주세요. 100자까지 적을 수 있어요.';
    case 401:
      return '로그인이 필요해요.';
    case 403:
      return '선생님 계정만 반을 만들 수 있어요.';
    case 404:
      return '붙이려던 봇을 찾을 수 없어요.';
    default:
      return '반을 만들지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

/**
 * 반 만들기 — `POST /classbot/classes`(계획 PR 5b · 완성 설계 § 5 R1). 반과 첫 참여 코드가 한 트랜잭션으로 생긴다.
 *
 * 묻는 것은 셋이고 **반 이름만 필수**다(`CreateClassDto`). 과목·학년은 반이 스스로 갖는 칸이라 봇과 따로 묻는다 —
 * 비우면 보내지 않는다(null 을 지어 보내지 않는다). 봇은 여기서 만들지 않는다 — 정본이 그렇다(반 생성은 봇을 만들지
 * 않고 `botId` 로 **있는 봇**을 붙일 뿐). 내 봇 목록을 읽는 문이 아직 없어 고르개도 없다 — 반을 만든 뒤 반 상세
 * 「봇」 탭에서 새 봇을 만들어 붙인다(`[id]/class-bot-tab.tsx`).
 *
 * 종전(같은 오리진 `POST /api/teacher/classrooms`)은 반·봇·코드를 한 번에 만들고 학원·학교 이름을 물었다 — 정본에는
 * 그 칸(`orgId`)을 **받지 않는다**(L2 org 검증 없이 저장하면 소속 아닌 조직으로 등록된다 · `CreateClassDto` 머리주석).
 * 그래서 묻지 않는다.
 */
export function CreateClassroomForm({
  onCreated,
}: {
  /** 코드가 나온 순간을 위쪽 배너로 올려 보낸다 — 교사가 지금 할 일은 그 코드를 건네는 것이다. */
  onCreated: (created: CreatedClassroom) => void;
}) {
  const fieldId = useId();
  const create = useCreateClassroom();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<string>('');

  const filled = name.trim() !== '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filled || create.isPending) return;

    const body: CreateClassBody = {
      name: name.trim(),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      ...(grade ? { grade } : {}),
    };

    create.mutate(body, {
      onSuccess: ({ class: klass, joinCode }) => {
        onCreated({ classId: klass.id, name: klass.name, joinCode });
        setName('');
        setSubject('');
        setGrade('');
      },
    });
  }

  return (
    <section id="create-classroom" className="bg-card rounded-2xl border p-5 lg:p-6" data-testid="create-classroom-form">
      <SectionHeading
        title="반 만들기"
        description="반을 만들면 첫 참여 코드가 함께 나와요. 봇은 반 상세의 「봇」 탭에서 붙여요."
      />

      <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
        <Field label="반 이름" htmlFor={`${fieldId}-name`}>
          <Input
            id={`${fieldId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="예: 고2 미적분 A반"
            data-testid="classroom-name-input"
            className="h-10 text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="과목" hint="선택" htmlFor={`${fieldId}-subject`}>
            <Input
              id={`${fieldId}-subject`}
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 50))}
              placeholder="예: 수학Ⅱ"
              data-testid="classroom-subject-input"
              className="h-10 text-sm"
            />
          </Field>

          <Field label="학년" hint="선택" htmlFor={`${fieldId}-grade`}>
            <select
              id={`${fieldId}-grade`}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              data-testid="classroom-grade-select"
              className={controlClass}
            >
              <option value="">안 정함</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>

        {create.isError && (
          <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="create-classroom-error">
            {createFailureMessage(create.error)}
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
          {create.isPending ? '만드는 중…' : '반 만들기'}
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
