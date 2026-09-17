'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { botFailureMessage } from '@/lib/bot-failure-message';
import { useAssignClassBot } from '@/hooks/api/classroom';
import type { BotDto } from '@/lib/api/classbot-dto';
import { FieldLabel } from './field-mark';
import { FilledSummary } from './filled-summary';
import { PickChip } from './pick-chip';
import { subjectMeta, type BotDraft, type FieldKey } from './builder-types';

/**
 * 만든 뒤 화면 — 8단계의 ⑧ 테스트·배포가 있던 자리.
 *
 * 배포는 관문이 아니다. 봇은 **이미 정본에 생겼고**(`POST /classbot/bots` · 빌더 화면이 두드린다),
 * 여기서 하는 일은 「어느 반에 넣을까」 하나뿐이다. 반을 안 고르고 나가도 봇은 남는다 —
 * 어느 반에도 안 붙은 봇은 정상이고, 나중에 반 상세 「봇」 탭에서 붙일 수 있다.
 *
 * **붙이는 문은 반 쪽에 있다** — `PUT /classbot/classes/:classId/bot { botId }`(api.md § 3.5b).
 * 봇에 반 목록을 통째로 주는 문은 없어서, 칩 하나를 누를 때마다 그 반을 한 번 두드린다.
 * 떼는 것은 같은 문에 `{ botId: null }` 이다 — 그 반이 봇을 잃는 것이지 이 봇이 지워지는 것이 아니다.
 *
 * ⚠ **한 반은 봇을 하나만 든다**(`classes.bot_id` — 반 행의 칸 하나다). 그래서 이미 봇이 붙어 있는 반을
 * 고르면 **그 봇이 이 봇으로 바뀐다.** 한 반에 봇을 여럿 두는 것처럼 말하지 않는다 — 카피도 그렇게 적었다.
 *
 * **이 화면 안에서만 사는 값 셋**: 수업 자료(`files`) · 평소에(`style`) · 틀렸을 때(`wrong`).
 * 정본 `bots` 에 그 칸이 없어 만들 때 실려 가지 않는다(`bot-contract.ts` 머리주석 표). 「채워진 것」이
 * 보여주는 것은 교사가 고른 그대로이고, 새로고침하면 사라진다. 빌더가 아예 묻지 않는 인사말·아바타·
 * 빠른 프롬프트는 그래서 **건드리지도 않는다**(서버가 null 로 둔다).
 *
 * 「채워진 것」을 여기서 한 번 더 보여주는 이유: 기본값으로 들어간 것이 무엇인지
 * 학생이 쓰기 전에 마지막으로 확인할 자리가 여기밖에 없다(학생 화면 미리보기가 없다).
 * 고칠 것이 있으면 「이어서 고치기」로 마당 1 부터 다시 지난다 — 줄마다 붙던 「고치기」는 없앴다.
 */

/** 붙일 수 있는 반 한 칸 — `useOperatorClasses()` 한 행(`BotCardDto`)에서 `id`·`name` 만 추린 것. */
export type ClassChoice = {
  /** 반 id — `PUT /classes/:classId/bot` 의 `:classId`. */
  id: string;
  /** 반 이름. */
  name: string;
};

type Props = {
  draft: BotDraft;
  /** 방금 정본에 생긴 봇 — 반에 붙일 때 이 `id` 를 보낸다. */
  created: BotDto;
  /** 내가 운영하는 반 목록(한 행 = 반 하나). */
  classes: readonly ClassChoice[];
  /** 반 목록을 아직 읽는 중인가. */
  classesPending: boolean;
  /** 반 목록 읽기가 실패했나 — 빈 칩 줄로 「반이 없다」고 하지 않으려고 따로 받는다. */
  classesFailed: boolean;
  onPick: (field: FieldKey, patch: Partial<BotDraft>) => void;
  onRestart: () => void;
};

/**
 * 만든 뒤 → 운영 화면 링크.
 *
 * 받는 쪽(`app/(teacher)/teacher/classbot/page.tsx`)은 `created` 를 **이름 그대로 찍는다**
 * (「방금 만든 봇: …」). 그래서 봇 id 가 생긴 지금도 그 칸에는 이름을 싣는다 — id 를 실으면 배너가
 * uuid 를 읽는다. 반 축(`rooms`)은 **지금 이 봇을 든 반 id** 다: 비어 있는 것도 뜻이라 늘 싣는다
 * (반을 안 고르고 나간 경우).
 * @param bot - 방금 만들어진 봇
 * @param classIds - 이 봇이 붙은 반 id 들
 * @returns 운영 화면 경로
 */
function assignmentHref(bot: BotDto, classIds: readonly string[]): string {
  const rooms = classIds.join(',');
  return `/teacher/classbot?created=${encodeURIComponent(bot.name)}&rooms=${encodeURIComponent(rooms)}`;
}

export function DoneView({
  draft, created, classes, classesPending, classesFailed, onPick, onRestart,
}: Props) {
  const subject = draft.subject ? subjectMeta[draft.subject] : null;
  const assign = useAssignClassBot();

  /** 지금 두드리고 있는 반 — 문이 반마다 따로라 진행도 반마다 따로 보여준다. */
  const [busyId, setBusyId] = useState<string | null>(null);
  /** 반 id → 실패한 까닭. 성공하면 지운다. */
  const [failures, setFailures] = useState<Record<string, string>>({});

  /** 반 id → 이름. **못 찾으면 null 이다** — id 를 대신 돌려주면 그게 그대로 화면에 찍힌다. */
  const nameOf = (id: string): string | null => classes.find((c) => c.id === id)?.name ?? null;

  /**
   * 붙인 반을 사람 말로 — **전부 풀렸을 때만 이름을 잇고, 하나라도 못 풀면 개수로 물러선다.**
   *
   * 일부만 이으면 못 찾은 반이 **말없이 사라져** 두 반에 넣은 봇이 한 반에만 넣은 것처럼 보인다.
   * 반 상세 「봇」 탭의 고르개(`class-bot-tab.tsx`)와 운영 화면의 「방금 만든 봇」 배너
   * (`app/(teacher)/teacher/classbot/page.tsx`)가 쓰는 규칙과 같다 — **세 자리가 한 규칙이다.**
   * @param ids - 이 봇이 붙은 반 id 들
   * @returns 이름을 이은 한 줄 · 하나라도 못 풀면 개수 · 붙은 반이 없으면 null
   */
  function attachedLabel(ids: readonly string[]): string | null {
    if (ids.length === 0) return null;
    const names = ids.map(nameOf).filter((name): name is string => name !== null);
    return names.length === ids.length ? names.join(' · ') : `${ids.length}개 반`;
  }

  const attached = attachedLabel(draft.classes);

  /*
    「채워진 것」의 반 줄은 `classroomLabel()` 로 id → 이름을 찾는데, 그 표는 **mock 학급**이다
    (`builder-types.ts` 의 `classroomChoices`). 정본 반 id 는 그 표에 없어 그대로 찍힌다 —
    교사에게 uuid 를 보여주게 된다. 그래서 요약에는 **보여주기용 사본**을 넘긴다.
    진짜 드래프트는 id 를 그대로 든다(붙이고 떼는 판정이 그것을 읽는다).
  */
  const summaryDraft: BotDraft = attached ? { ...draft, classes: [attached] } : draft;

  /**
   * 칩 하나 = 반 하나. 붙어 있으면 떼고, 아니면 붙인다 — 문은 하나이고 `botId` 가 `null` 이냐가 가른다.
   * 성공한 뒤에야 드래프트를 옮긴다: 먼저 옮기면 실패했을 때 화면이 붙었다고 거짓말한다.
   */
  function toggleClass(id: string) {
    if (busyId) return;
    const attached = draft.classes.includes(id);
    setBusyId(id);
    assign.mutate(
      { classId: id, botId: attached ? null : created.id },
      {
        onSuccess: () => {
          setBusyId(null);
          setFailures((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          onPick('classes', {
            classes: attached ? draft.classes.filter((c) => c !== id) : [...draft.classes, id],
          });
        },
        onError: (error) => {
          setBusyId(null);
          setFailures((prev) => ({ ...prev, [id]: botFailureMessage(error, attached ? 'detach' : 'attach') }));
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-card rounded-2xl border p-4 lg:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <BotAvatar subject={subject?.label} name={created.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-pullim-slate-900 truncate text-xl font-bold tracking-tight">{created.name}</h2>
            <p className="text-pullim-slate-500 mt-0.5 text-xs" data-testid="done-facts">
              {/* 머리의 사실 줄도 요약과 **같은 값**을 읽는다 — 한쪽만 고치면 다른 쪽에 id 가 남는다. */}
              {[subject?.label, draft.grade, attached ?? '아직 반에 안 넣음']
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <Chip tone="info" className="shrink-0">만들어졌어요</Chip>
        </header>

        <div className="mt-4">
          <FieldLabel field="classes">어느 반에 넣을까요</FieldLabel>
          <ClassPicker
            classes={classes}
            picked={draft.classes}
            pending={classesPending}
            failed={classesFailed}
            busyId={busyId}
            failures={failures}
            onToggle={toggleClass}
          />
        </div>

        <div className="border-pullim-slate-100 mt-4 border-t pt-4">
          <FilledSummary draft={summaryDraft} view="done" yard={1} className="border-0 p-0" />
        </div>

        <footer className="border-pullim-slate-100 mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Link
            href={assignmentHref(created, draft.classes)}
            aria-label="봇 운영 화면으로 가기"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
          >
            봇 운영
          </Link>
          {/*
            **마당으로 되돌아가지 않고 수정 화면으로 보낸다.** 종전에는 「고치기」가 마당 1 로 돌아갔는데,
            그때는 만들기가 화면 안 상태라 돌아가도 잃을 것이 없었다. 이제는 봇이 **정본에 이미 있다** —
            돌아가서 「생성」을 다시 누르면 `POST /classbot/bots` 가 한 번 더 가서 **같은 봇이 둘** 생긴다.
            그래서 고치는 일은 그 봇을 아는 한 자리(`/teacher/builder/[botId]` — `PATCH /bots/:id`)에 맡긴다.
            거기서는 이 화면에만 사는 셋(수업 자료·평소에·틀렸을 때)이 기본값으로 열린다 — 정본에 칸이 없어
            애초에 저장된 적이 없는 값이다(머리주석).
          */}
          <Link
            href={`/teacher/builder/${encodeURIComponent(created.id)}`}
            aria-label="이 봇을 이어서 고치기"
            className="text-pullim-slate-700 hover:bg-pullim-slate-100 inline-flex min-h-11 items-center rounded-xl px-3.5 text-sm font-bold"
          >
            고치기
          </Link>
          <Button type="button" variant="ghost" size="lg" onClick={onRestart} aria-label="봇 하나 더 만들기">
            새 클래스봇
          </Button>
        </footer>
      </section>
    </div>
  );
}

/**
 * 반 고르는 줄 — 읽는 중 · 못 읽음 · 한 반도 없음 · 목록, 넷으로 갈라 그린다.
 *
 * 못 읽었는데 빈 칩 줄을 그리면 「연 반이 하나도 없다」로 읽힌다 — 교사가 멀쩡한 반을 두고
 * 수업방을 또 만들러 간다. 그래서 넷을 뭉개지 않는다.
 * @param classes - 붙일 수 있는 반
 * @param picked - 지금 이 봇이 붙어 있는 반 id 들
 * @param pending - 목록을 읽는 중인가
 * @param failed - 목록 읽기가 실패했나
 * @param busyId - 지금 두드리고 있는 반 id · 없으면 null
 * @param failures - 반 id → 실패한 까닭
 * @param onToggle - 칩을 눌렀을 때
 */
function ClassPicker({
  classes, picked, pending, failed, busyId, failures, onToggle,
}: {
  classes: readonly ClassChoice[];
  picked: readonly string[];
  pending: boolean;
  failed: boolean;
  busyId: string | null;
  failures: Record<string, string>;
  onToggle: (id: string) => void;
}) {
  if (pending) {
    return (
      <p className="text-pullim-slate-500 text-xs" data-testid="done-classes-pending">
        반 목록을 불러오는 중이에요.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-pullim-slate-500 text-xs" data-testid="done-classes-failed">
        반 목록을 불러오지 못했어요. 봇은 만들어졌으니 나중에{' '}
        <Link href="/teacher/classroom" className="text-pullim-blue-600 font-bold underline">
          내 수업방
        </Link>
        에서 붙일 수 있어요.
      </p>
    );
  }

  if (classes.length === 0) {
    return (
      <p className="text-pullim-slate-500 text-xs" data-testid="done-classes-empty">
        아직 연 반이 없어요. 봇은 만들어졌으니{' '}
        <Link href="/teacher/classroom" className="text-pullim-blue-600 font-bold underline">
          내 수업방
        </Link>
        에서 반을 먼저 열어 주세요.
      </p>
    );
  }

  return (
    <>
      <div role="group" aria-label="어느 반에 넣을까요" className="flex flex-wrap gap-1.5">
        {classes.map((c) => (
          <PickChip
            key={c.id}
            active={picked.includes(c.id)}
            label={busyId === c.id ? `${c.name} 보내는 중` : c.name}
            onSelect={() => onToggle(c.id)}
            data-testid={`done-class-${c.id}`}
          />
        ))}
      </div>
      {/*
        한 반이 드는 봇은 하나다(`classes.bot_id`). 「여러 봇을 담는다」로 읽히면 교사가 이미 쓰고 있는
        봇을 모르고 갈아 끼운다 — 그래서 바뀐다는 것을 여기서 말한다.
      */}
      <p className="text-pullim-slate-500 mt-1.5 text-xs">
        고른 반의 학생 홈에 이 봇이 보이게 돼요. 한 반은 봇을 하나만 들어서, 이미 봇이 있는 반을 고르면 그 봇이 이 봇으로 바뀌어요.
      </p>
      {Object.entries(failures).map(([id, reason]) => (
        <p key={id} className="text-pullim-danger mt-1.5 text-xs" data-testid={`done-class-error-${id}`} role="alert">
          {reason}
        </p>
      ))}
    </>
  );
}
