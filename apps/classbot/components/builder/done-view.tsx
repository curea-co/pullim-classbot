'use client';

import Link from 'next/link';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { botSignature } from '@/lib/tokens/bot-signature';
import { FieldLabel } from './field-mark';
import { FilledSummary } from './filled-summary';
import { PickChip } from './pick-chip';
import {
  botName, classAssignments, classroomChoices, ownCount, subjectMeta, classroomLabel,
  type BotDraft, type FieldKey,
} from './builder-types';

/**
 * 만든 뒤 화면 — 8단계의 ⑧ 테스트·배포가 있던 자리.
 *
 * 배포는 관문이 아니다. 봇은 이미 만들어졌고, 여기서 하는 일은 「어느 반에 넣을까」 하나뿐이다.
 * 반을 안 고르고 나가도 봇은 남는다. 다만 **반을 넣는 자리는 지금 이 화면뿐이다** —
 * 운영 화면에는 나중에 반을 넣는 길이 없다. 없는 경로를 카피로 약속하지 않는다.
 *
 * 「채워진 것」을 여기서 한 번 더 보여주는 이유: 기본값으로 들어간 것이 무엇인지
 * 학생이 쓰기 전에 마지막으로 확인할 자리가 여기밖에 없다(학생 화면 미리보기가 없다).
 * 고칠 것이 있으면 「이어서 고치기」로 마당 1 부터 다시 지난다 — 줄마다 붙던 「고치기」는 없앴다.
 */

type Props = {
  draft: BotDraft;
  onPick: (field: FieldKey, patch: Partial<BotDraft>, own?: boolean) => void;
  /** 마당 1 로 돌아가 이어서 고치기 */
  onRefine: () => void;
  onRestart: () => void;
};

/**
 * 만든 뒤 → 운영 화면 링크. 배정 짝에서 만든다 — `created` 가 봇 축, `rooms` 가 반 축이다.
 * 봇 id 가 아직 없어 이름을 봇 축으로 쓴다(빌더는 저장하지 않는 데모).
 */
function assignmentHref(draft: BotDraft): string {
  const bot = botName(draft);
  const assignments = classAssignments(draft, bot);
  const rooms = assignments.map((a) => a.classroomId).join(',');
  return `/teacher/classbot?created=${encodeURIComponent(bot)}&rooms=${encodeURIComponent(rooms)}`;
}

export function DoneView({ draft, onPick, onRefine, onRestart }: Props) {
  const subject = draft.subject ? subjectMeta[draft.subject] : null;
  const sig = botSignature({ subject: subject?.label });
  const count = ownCount(draft);

  function toggleClass(id: string) {
    const next = draft.classes.includes(id)
      ? draft.classes.filter((c) => c !== id)
      : [...draft.classes, id];
    onPick('classes', { classes: next }, next.length > 0);
  }

  return (
    <div className="space-y-4">
      <section className="bg-card rounded-2xl border p-4 lg:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden
            style={{ backgroundColor: sig.hex }}
            className="text-pullim-slate-900 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
          >
            {subject?.initial ?? <Bot className="h-6 w-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-pullim-slate-900 truncate text-xl font-bold tracking-tight">{botName(draft)}</h2>
            <p className="text-pullim-slate-500 mt-0.5 text-xs">
              {[subject?.label, draft.grade, draft.classes.length ? draft.classes.map(classroomLabel).join(' · ') : '아직 반에 안 넣음']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <Chip tone="info" className="shrink-0">만들어졌어요</Chip>
        </header>

        <p className="bg-pullim-blue-50 text-pullim-blue-800 mt-3.5 rounded-xl p-3 text-xs leading-relaxed">
          아홉 가지 가운데 <b data-testid="done-own-count">{count}가지</b>를 직접 정하셨어요.
          나머지는 기본값 그대로 들어갔어요.
        </p>

        <div className="mt-4">
          <FieldLabel field="classes">어느 반에 넣을까요</FieldLabel>
          <div role="group" aria-label="어느 반에 넣을까요" className="flex flex-wrap gap-1.5">
            {classroomChoices.map((c) => (
              <PickChip
                key={c.id}
                active={draft.classes.includes(c.id)}
                label={c.label}
                onSelect={() => toggleClass(c.id)}
              />
            ))}
          </div>
          <p className="text-pullim-slate-400 mt-1.5 text-micro">고른 반의 학생 홈에 이 봇이 보이게 돼요 — 데모라 아직 실제로 반영되진 않아요.</p>
        </div>

        <div className="border-pullim-slate-100 mt-4 border-t pt-4">
          <FilledSummary draft={draft} view="done" yard={1} className="border-0 p-0" />
        </div>

        <footer className="border-pullim-slate-100 mt-4 flex flex-wrap gap-2 border-t pt-4">
          {/*
            배정의 단위는 `(봇, 반)` 짝이다(`classAssignments()` · 참여 코드의 `bot_id`·`classroom_id`).
            그래서 이 경계도 짝에서 만든다 — `created` 가 봇 축, `rooms` 가 반 축이고 둘을 합쳐야
            배정이 복원된다. 반 id 만 내보내면 같은 반에 여러 봇이 붙는 정상 케이스를 되살릴 수 없다.

            봇 축을 **id 가 아니라 이름**으로 싣는 것은 아직 봇이 저장되지 않아 id 가 없기 때문이다
            (핸드오프 § 4.1 — 빌더는 데모다). 저장이 붙으면 여기서 봇 id 를 실으면 된다.

            `rooms` 가 비어 있는 것도 뜻이다 —— 반을 안 고르고 나가는 경우. 넘기지 않으면 다음
            화면이 두 경우를 구분하지 못한다. 종전엔 `?deployed=` 였는데 배포 관문이 사라져
            「배포」가 더는 이 흐름의 이름이 아니다.
          */}
          <Link
            href={assignmentHref(draft)}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
          >
            봇 운영 화면으로
          </Link>
          <Button type="button" variant="ghost" size="lg" onClick={onRefine}>
            이어서 고치기
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={onRestart}>
            봇 하나 더 만들기
          </Button>
        </footer>
      </section>
    </div>
  );
}
