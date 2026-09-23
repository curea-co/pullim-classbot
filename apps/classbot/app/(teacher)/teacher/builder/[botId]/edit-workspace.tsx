'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Bot, ChevronLeft, ChevronRight, MessageSquare, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { customTone, draftFromBot, patchFromDraft } from '@/components/builder/bot-contract';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardSteps } from '@/components/builder/yard-steps';
import {
  faultAnchorId, faultBefore, firstFault,
  type BotDraft, type Fault, type FieldKey, type YardNo,
} from '@/components/builder/builder-types';
import { botFailureMessage } from '@/lib/bot-failure-message';
import { useMyBot, useUpdateBot } from '@/hooks/api/bot';
import { isUnauthorized } from '@/lib/api/classbot-client';
import type { BotDto } from '@/lib/api/classbot-dto';

/**
 * 봇 수정 — 이미 있는 봇을 빌더의 마당 셋으로 다시 연다.
 *
 * 새로 만드는 화면(`app/(teacher)/teacher/builder/page.tsx`)과 **묻는 것이 같다** — 마당도,
 * 항목도, 막는 판정(`firstFault` · `faultBefore`)도 같은 것을 쓴다. 그래서 마당 컴포넌트와
 * 판정 함수를 그대로 가져다 쓰고, 여기서 새로 그리는 것은 없다.
 *
 * 다른 것은 셋뿐이다:
 *  ① 첫 값이 빈 드래프트가 아니라 **정본이 든 그 봇의 지금 값**이다 — `GET /classbot/me/bots` 에서 이 봇을 골라
 *     (`useMyBot`) `draftFromBot` 으로 옮긴다. 봇 하나를 읽는 정본 문이 없어 목록에서 고른다(그 훅 머리주석).
 *  ② 끝내는 버튼이 「생성」이 아니라 「저장」이다 — `PATCH /classbot/bots/:id`(`useUpdateBot`).
 *  ③ **어느 반에 넣을지는 여기서 고치지 않는다.** 반 배정은 봇의 칸이 아니라 반의 칸이고(`classes.bot_id` ·
 *     `PUT /classes/:classId/bot`), 학생이 이미 들어와 있는 반을 이 화면에서 떼는 것은 봇을 고치는 일이 아니라
 *     운영이다. 그래서 이 화면에는 반 고르개가 없다 — 붙이고 떼는 자리는 만든 뒤 화면과 반 상세 「봇」 탭이고,
 *     여기서는 「채워진 것」이 몇 반에 붙어 있는지만 읽어 준다.
 *
 * **바뀐 칸만 보낸다**(`patchFromDraft`). 정본 `tone` 은 자유 문자열인데 빌더는 셋으로만 묻고, 인사말·아바타·
 * 빠른 프롬프트는 **아예 묻지 않는다** — 안 건드린 칸을 매번 다시 적으면 교사가 다른 화면에서 적어 둔 말이
 * 말없이 깎인다(`bot-contract.ts` 머리주석 ⚠). 그래서 「저장」은 정말 바뀐 것이 없으면 서버를 두드리지도 않는다.
 *
 * **이 화면 안에서만 사는 값 셋**: 수업 자료(`files`) · 평소에(`style`) · 틀렸을 때(`wrong`). 정본 `bots` 에
 * 칸이 없어 **열 때 기본값이고 저장해도 실려 가지 않는다** — 없는 값을 지어내지도, 교사가 정할 수 있던 것을
 * 걷어내지도 않는다. 칸이 생기는 날 이 셋을 그대로 실으면 된다.
 *
 * 오케스트레이션(마당 오가기 · 막기 · 초점 옮기기)이 빌더 화면과 겹치는 것은 알고 두는 것이다.
 * 하나로 합치려면 빌더 화면을 갈라야 하는데, 그 파일은 지금 다른 손이 타고 있다.
 * 합칠 때는 이 파일과 빌더 화면이 같이 읽는 자리로 올린다.
 */
export function BotEditWorkspace({ botId }: { botId: string }) {
  const { bot, isPending, error } = useMyBot(botId);

  if (isPending) {
    return (
      <Shell title="봇 수정">
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </Shell>
    );
  }

  /*
    401 은 고장이 아니다 — `classbotRead` 가 이미 OS 로그인으로 보내는 중이고 RoleGuard 가 비로그인을
    먼저 막는다. 그 한 박자를 게이트가 든다(반 상세와 같은 자리 · `class-detail.tsx`).
  */
  if (error && isUnauthorized(error)) {
    return (
      <Shell title="봇 수정">
        <ReadLoginGate label="봇" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title="봇 수정">
        <ReadErrorState />
      </Shell>
    );
  }

  /*
    다 읽었는데 목록에 없다 — **「모른다」가 아니라 「내 봇 중에 없다」** 다(`useMyBot` 머리주석).
    지워졌거나 남의 봇이고, 정본도 남의 봇을 404 로 가른다. 빈 빌더를 열어 「고치는 중」인 척하지 않는다.
  */
  if (!bot) {
    return (
      <Shell title="봇 수정">
        <EmptyState
          icon={SearchX}
          title="없는 봇이에요"
          description="지워졌거나 내 봇이 아닐 수 있어요. 봇 관리에서 골라 주세요."
          action={{ href: '/teacher/bots', label: '봇 관리', ariaLabel: '봇 관리로 가기' }}
        />
      </Shell>
    );
  }

  if (bot.state === 'archived') {
    return (
      <Shell title="봇 수정">
        <EmptyState
          icon={Bot}
          title="보관된 봇은 읽기 전용이에요"
          description="봇 관리에서 다시 사용으로 복구한 뒤 내용을 수정할 수 있어요. 기존 반과 대화 기록은 그대로 보존돼요."
          action={{
            href: `/teacher/bots/${encodeURIComponent(bot.id)}`,
            label: '봇 관리에서 복구',
            ariaLabel: `${bot.name} 봇 관리에서 복구하기`,
          }}
        />
      </Shell>
    );
  }

  // 첫 값은 **한 번만** 심는다 — 목록이 뒤에서 다시 읽혀도 교사가 고치던 값을 덮지 않게, 봇이 바뀔 때만 새로 연다.
  return <BotEditForm key={bot.id} bot={bot} />;
}

/**
 * 머리(뒤로 가기 · 제목)는 상태와 상관없이 같은 자리에 선다 — 읽는 중에도 어디인지는 알아야 한다.
 * @param title - 페이지 제목
 * @param children - 본문
 */
function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <TeacherPageShell
      backHref="/teacher/classbot"
      backLabel="내 클래스봇"
      header={{ eyebrow: { icon: Bot, text: '봇 빌더' }, title }}
    >
      {children}
    </TeacherPageShell>
  );
}

/**
 * 마당 셋 — 첫 값이 심어진 뒤의 본문.
 * @param bot - 고칠 봇(정본 한 행)
 */
function BotEditForm({ bot }: { bot: BotDto }) {
  const [draft, setDraft] = useState<BotDraft>(() => draftFromBot(bot));
  /**
   * 열 때의 값 — `patchFromDraft` 가 **무엇이 바뀌었나**를 여기에 견준다.
   * 저장에 성공하면 서버가 돌려준 행으로 다시 심는다(아래 `save`).
   */
  const [initial, setInitial] = useState<BotDraft>(() => draftFromBot(bot));
  const [yard, setYard] = useState<YardNo>(1);
  const [fault, setFault] = useState<Fault | null>(null);
  const update = useUpdateBot();

  /** 막힌 자리로 초점을 옮긴다 — 마당을 옮긴 뒤라야 그 자리가 화면에 있다. */
  useEffect(() => {
    if (!fault) return;
    document.getElementById(faultAnchorId(fault.field))?.focus();
  }, [fault]);

  /** 값이 바뀌는 단 하나의 길. `field` 는 그 항목의 오류 표시를 지우는 데 쓴다. */
  function onPick(field: FieldKey, patch: Partial<BotDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setFault((f) => (f?.field === field ? null : f));
  }

  function goYard(next: YardNo) {
    setYard(next);
  }

  /** 막혔을 때 하는 일 — 그 항목이 사는 마당으로 보내고, 왜 막혔는지 말한다. */
  function block(f: Fault) {
    goYard(f.yard);
    setFault(f);
    toast.error(f.message);
  }

  /** **앞으로 가는 단 하나의 길.** 「다음」도 위쪽 「단계」도 여기를 지난다. */
  function goForward(next: YardNo) {
    const blocked = faultBefore(draft, yard, next);
    if (blocked) {
      block(blocked);
      return;
    }
    goYard(next);
  }

  function goNext() {
    if (yard < 3) goForward((yard + 1) as YardNo);
  }

  /** 뒤로 가는 점프는 막지 않는다 — 고치러 돌아가는 길이다. */
  function jumpYard(next: YardNo) {
    if (next > yard) {
      goForward(next);
      return;
    }
    goYard(next);
  }

  /**
   * 어느 마당에서나 누를 수 있다. 막는 판정은 「생성」과 같은 것을 읽는다.
   *
   * 보내는 것은 **바뀐 칸뿐**이고(머리주석), 바뀐 것이 없으면 서버를 두드리지 않는다 — 빈 `PATCH` 는 아무 일도
   * 하지 않으면서 「저장했어요」만 남긴다. 성공하면 서버가 돌려준 행으로 첫 값을 다시 심어, 곧바로 또 누를 때
   * 같은 칸이 다시 실려 가지 않게 한다.
   */
  function save() {
    if (update.isPending) return;
    const blocked = firstFault(draft);
    if (blocked) {
      block(blocked);
      return;
    }

    const patch = patchFromDraft(initial, draft);
    if (Object.keys(patch).length === 0) {
      toast.message('바꾼 것이 없어요');
      return;
    }

    update.mutate(
      { botId: bot.id, patch },
      {
        onSuccess: (saved) => {
          // 첫 값은 **정본이 돌려준 행**으로 심는다 — 화면에만 사는 셋(수업 자료·평소에·틀렸을 때)은 여기 없지만
          // `patchFromDraft` 가 그 셋을 보지 않으므로(정본에 칸이 없다) 견주는 데 모자람이 없다.
          setInitial(draftFromBot(saved));
          toast.success('고친 값을 저장했어요');
        },
        onError: (error) => toast.error(botFailureMessage(error, 'update')),
      },
    );
  }

  /*
    「채워진 것」의 반 줄은 `classroomLabel()` 로 id → 이름을 찾는데, 그 표는 **mock 학급**이다
    (`builder-types.ts` 의 `classroomChoices`). 정본 반 id 는 그 표에 없어 그대로 찍힌다 — 교사에게 uuid 를
    보여주게 된다. 이 화면은 반을 고치지 않으므로(머리주석 ③) 이름을 얻자고 반 목록을 한 번 더 읽지 않고,
    **보여주기용 사본**에 갯수만 담는다.
  */
  const summaryDraft: BotDraft = draft.classes.length
    ? { ...draft, classes: [`${draft.classes.length}개 반에 붙어 있어요`] }
    : draft;

  /** 셋으로 표현되지 않는 정본 말투의 원문 — 있으면 아래에서 그대로 든다(없으면 null). */
  const toneNote = customTone(bot.tone);

  return (
    <TeacherPageShell
      backHref="/teacher/classbot"
      backLabel="내 클래스봇"
      header={{
        eyebrow: { icon: Bot, text: '봇 빌더' },
        title: `${bot.name} 수정하기`,
        description: '지금 값이 그대로 들어 있어요. 고칠 것만 바꾸면 돼요.',
        action: (
          <Button
            type="button"
            variant="pullim"
            size="lg"
            onClick={save}
            disabled={update.isPending}
            aria-label="고친 그대로 저장하기"
          >
            {update.isPending ? '저장 중' : '저장'}
          </Button>
        ),
      }}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          {/*
            **빌더가 표현하지 못하는 말투를 든 봇.** 정본 `tone` 은 자유 문자열이라 반 상세 「봇」 탭에서
            「차분하고 다정하게」 같은 말을 적을 수 있는데, 이 화면은 셋 중 하나로만 묻는다. 그래서 아래 마당에는
            가장 가까운 셋 중 하나가 눌린 채로 서고 — **그것만 두면 교사는 자기가 적은 말이 사라진 줄 안다.**
            저장은 이미 안전하다(`patchFromDraft` 가 안 건드린 말투를 안 싣는다). 모자란 것은 **말해 주는 것**이라
            여기서 원문을 그대로 든다.

            교사가 말투를 실제로 건드린 뒤에는 걷는다 — 그때부터는 고른 것이 저장될 값이라, 남겨 두면 그 말이
            남는다는 뜻으로 읽힌다.
          */}
          {toneNote && draft.tone === initial.tone && (
            <AlertCard tone="notice" icon={MessageSquare} title={`지금 말투는 「${toneNote}」예요`}>
              <p className="text-pullim-slate-700 text-sm" data-testid="bot-edit-custom-tone">
                이 화면은 말투를 셋 중 하나로만 물어요. 아래에서 고르면 그 말로 바뀌고, 그대로 두면 지금 말투가 남아요.
              </p>
            </AlertCard>
          )}

          <YardSteps current={yard} onJump={jumpYard} />

          {yard === 1 && <Yard1Intro draft={draft} onPick={onPick} fault={fault} />}
          {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
          {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

          <YardNav
            yard={yard}
            saving={update.isPending}
            onPrev={() => goYard((yard - 1) as YardNo)}
            onNext={goNext}
            onSave={save}
          />
        </div>

        <aside className="xl:sticky xl:top-[76px]">
          <FilledSummary draft={summaryDraft} view="build" yard={yard} />
        </aside>
      </div>
    </TeacherPageShell>
  );
}

/**
 * 나가는 줄 — 마당을 앞뒤로 오가는 자리.
 * 마당 3 은 더 갈 곳이 없어 「다음」 대신 「저장」이 **같은 자리**에 선다. 헤더의 「저장」과
 * 같은 `save` 를 부르므로 판정도 하나다.
 */
function YardNav({
  yard, saving, onPrev, onNext, onSave,
}: {
  yard: YardNo;
  /** `PATCH /classbot/bots/:id` 가 가 있는 중 — 두 번 눌러 같은 수정이 두 번 가지 않게 막는다. */
  saving: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {yard > 1 && (
        <Button type="button" variant="secondary" size="lg" onClick={onPrev}>
          <ChevronLeft aria-hidden />
          이전
        </Button>
      )}

      <div className="flex-1" />

      {yard < 3 ? (
        <Button type="button" variant="pullim" size="lg" onClick={onNext}>
          다음
          <ChevronRight aria-hidden />
        </Button>
      ) : (
        <Button
          type="button"
          variant="pullim"
          size="lg"
          onClick={onSave}
          disabled={saving}
          aria-label="고친 그대로 저장하기"
        >
          {saving ? '저장 중' : '저장'}
        </Button>
      )}
    </div>
  );
}
