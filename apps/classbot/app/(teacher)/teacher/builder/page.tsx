'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AlertCard } from '@/components/classbot/alert-card';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { Button } from '@/components/ui/button';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { createBodyFromDraft } from '@/components/builder/bot-contract';
import { DoneView, type ClassChoice } from '@/components/builder/done-view';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardSteps } from '@/components/builder/yard-steps';
import {
  emptyDraft, faultAnchorId, faultBefore, firstFault,
  type BotDraft, type Fault, type FieldKey, type YardNo,
} from '@/components/builder/builder-types';
import { botFailureMessage } from '@/lib/bot-failure-message';
import { useCreateBot } from '@/hooks/api/bot';
import { useOperatorClasses } from '@/hooks/api/classroom';
import type { BotDto } from '@/lib/api/classbot-dto';

/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 8단계 위저드를 걷어냈다. 갈래를 고르게 하는 대신 항목 이름 옆에서 필수와 선택을 가른다 —
 * 꼭 골라야 하는 것은 빨간 `*`, 나머지는 `(선택)` 이다.
 * 그래서 「생성」은 마당 하나만 지나도 누를 수 있다 — 과목만 고르면 끝난다.
 * 그 버튼은 마당마다 반복하지 않고 **페이지 헤더 오른쪽 한 자리**에 둔다. 다만 더 갈 곳이
 * 없는 마당 3 에서는 「다음」이 쓰던 아래 자리를 그대로 이어받는다 — 그 자리에서 손이 멈추는데
 * 끝내는 길만 저 위에 있으면 길이 끊긴다.
 *
 * 필수를 안 채우면 **앞으로 가는 길이 모두** 막힌다 — 「생성」도, 「다음」도, 위쪽 「단계」를
 * 눌러 건너뛰는 길도. 셋이 같은 판정(`firstFault` · `faultBefore`)을 읽으므로 한쪽만 열린
 * 창구가 없다. 막으면 그 항목이 사는 마당으로 돌려보내고, 왜 막혔는지 말하고, 초점을 옮긴다.
 * **뒤로 가는 길은 막지 않는다** — 「이전」도 「단계」로 되돌아가는 것도. 이미 지나온 마당은
 * 필수가 차 있고, 고치러 돌아가는 길을 막으면 교사가 갇힌다.
 *
 * **「생성」은 정본에 봇을 만든다** — `POST /classbot/bots`(api.md § 3.5b · `useCreateBot`). 드래프트를 본문으로
 * 옮기는 일은 `components/builder/bot-contract.ts` 의 `createBodyFromDraft` 하나가 한다. 성공해야 만든 뒤 화면으로
 * 넘어가고, 그때부터 그 화면은 **진짜 봇 id** 를 들고 반에 붙인다. 실패하면 마당에 그대로 서서 까닭을 말한다 —
 * 넘어가 놓고 「만들어졌어요」라고 하지 않는다.
 *
 * **이 화면 안에서만 사는 값 셋**: 수업 자료(`files`) · 평소에(`style`) · 틀렸을 때(`wrong`). 정본 `bots` 에
 * 그 칸이 없어 본문에 실리지 않는다(`bot-contract.ts` 머리주석 표) — 교사가 고른 그대로 화면이 보여주지만
 * 새로고침하면 사라진다. **걷어내지 않고 그대로 묻는다**: 칸이 생기는 날 그대로 실어 보내면 되고, 지금 지우면
 * 교사가 정할 수 있던 것이 먼저 사라진다. 반대로 빌더가 **아예 묻지 않는** 인사말·아바타·빠른 프롬프트는
 * 본문에도 싣지 않는다 — 서버가 null 로 둔다.
 */
export default function BotBuilderPage() {
  const [draft, setDraft] = useState<BotDraft>(emptyDraft);
  const [yard, setYard] = useState<YardNo>(1);
  /** 정본에 생긴 봇 — 이것이 있으면 만든 뒤 화면이다. 화면 전환과 「만들어졌나」를 두 상태로 두지 않는다. */
  const [created, setCreated] = useState<BotDto | null>(null);
  const [fault, setFault] = useState<Fault | null>(null);

  const create = useCreateBot();
  /*
    만든 뒤 화면에서 반에 붙일 때 고를 목록 — **한 행이 반 하나**다(`GET /bots?role=teacher` · 이 문은 아직
    bot == class 라 `name` 이 반 이름이다). 마당에 있는 동안에도 미리 읽는다: 봇이 만들어지는 순간 칩이 서 있어야
    「만들었는데 붙일 반이 없는」 한 박자가 안 생긴다. 목록 하나라 값싸고, 반을 안 고르고 나가도 손해가 없다.
  */
  const classesQuery = useOperatorClasses();
  const classChoices: ClassChoice[] = (classesQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  /**
   * 막힌 자리로 초점을 옮긴다 — 오류만 띄우고 어디인지 안 알려주면 교사가 찾아 헤맨다.
   * 마당을 옮긴 **뒤라야** 그 자리가 화면에 있으므로 그리고 난 다음에 옮긴다.
   * 같은 항목에서 다시 막혀도 `fault` 는 새 값이라 초점이 한 번 더 온다.
   */
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

  /** 막혔을 때 하는 일 — 그 항목이 사는 마당으로 보내고, 왜 막혔는지 말한다. 초점은 위 effect 가 옮긴다. */
  function block(f: Fault) {
    goYard(f.yard);
    setFault(f);
    toast.error(f.message);
  }

  /**
   * **앞으로 가는 단 하나의 길.** 「다음」도 위쪽 「단계」도 여기를 지난다 —
   * 판정을 두 벌로 두면 한쪽만 막는 창구가 생긴다. 지나치는 마당의 필수가 다 차야 넘어간다.
   */
  function goForward(next: YardNo) {
    const blocked = faultBefore(draft, yard, next);
    if (blocked) {
      block(blocked);
      return;
    }
    goYard(next);
  }

  /** 다음 마당으로. 마당 3 은 더 갈 곳이 없어 그 자리에 「생성」이 선다. */
  function goNext() {
    if (yard < 3) goForward((yard + 1) as YardNo);
  }

  /**
   * 위쪽 「단계」로 옮기기. **점프는 그대로 유지한다** — 대상 셋도, 「1 → 2 → 3」 진행이
   * 보이는 것도 그대로다 (핸드오프 § 4.1 「단계 점프는 유지한다」). 바뀌는 것은 **앞으로**
   * 가는 점프가 「다음」과 같은 판정을 지난다는 것뿐이다. 필수를 건너뛰는 창구를 남겨 두면
   * 「다음」에서 막은 것이 여기서 열린다.
   *
   * 뒤로 가는 점프(3 → 1)는 막지 않는다 — 고치러 돌아가는 길이다.
   */
  function jumpYard(next: YardNo) {
    if (next > yard) {
      goForward(next);
      return;
    }
    goYard(next);
  }

  /**
   * 어느 마당에서나 누를 수 있다. 남은 항목은 기본값으로 들어간다.
   *
   * 막는 판정(`firstFault`)이 **먼저**다 — 서버가 400 으로 되돌려 보내기 전에 화면이 어디가 빈지 말한다.
   * 통과하면 `POST /classbot/bots` 를 보내고, **201 이 와야** 만든 뒤 화면으로 넘어간다. 실패하면 마당에
   * 그대로 서고 까닭은 아래 카드가 든다(`create.isError`).
   */
  function make() {
    if (create.isPending) return;
    const blocked = firstFault(draft);
    if (blocked) {
      block(blocked);
      return;
    }
    create.mutate(createBodyFromDraft(draft), {
      onSuccess: (bot) => {
        setCreated(bot);
        toast.success(`「${bot.name}」 봇을 만들었어요`);
      },
    });
  }

  /** 하나 더 만들기 — 앞 봇의 값도, 앞 봇 자신도 데려오지 않는다(지난 실패 문구까지 걷는다). */
  function restart() {
    setDraft(emptyDraft);
    setFault(null);
    setCreated(null);
    setYard(1);
    create.reset();
  }

  return (
    /*
      **돌아갈 길을 화면이 직접 든다.**

      종전에는 안 들었다 — 교사 레일에 [봇 빌더] 행이 있어서, 그 행이 「여기가 어디인지」를
      두 표면에서 말해 줬기 때문이다. 켜진 레일 행이 하나, 그리고 빵부스러기 막대가 하나.
      **빵부스러기는 레일을 읽는다** — `buildBreadcrumb()` 이 `navForRole()` 을 훑어 지금
      경로를 먹는 항목을 찾고, 없으면 뿌리 한 칸만 남는다. 뿌리 한 칸이면 `breadcrumb.tsx`
      가 막대를 통째로 안 그린다(`trail.length <= 1`).

      그래서 레일에서 행을 내리면 **둘이 같이 꺼진다.** 그대로 두면 이 화면은 켜진 레일 행도,
      빵부스러기도, 돌아갈 링크도 없는 화면이 된다 — 들어온 자리가 여럿이라 브라우저 뒤로가기
      말고는 나갈 길을 화면이 말하지 않는다.

      **그 자리를 여기서 메운다.** 다른 교사 화면이 쓰는 관용구 그대로 `TeacherPageShell` 의
      `backHref` 다. 도착지는 [봇 관리](`/teacher/bots`) — 지어낸 자리가 아니라
      `proc/spec/03 § 4.4.7` 이 빌더의 종착지로 못박아 둔 부모다(빌더는 `/teacher/bots/new`
      로 들어가고 [봇 관리]의 「새 클래스봇」이 유일한 진입점이 된다). 경로 이동이 오는 날
      이 링크는 **고칠 것이 없다** — 이미 그 부모를 가리키고 있다.

      레일을 되살리거나 `buildBreadcrumb` 이 `matchPrefix` 를 읽게 넓히는 쪽은 택하지 않았다.
      앞은 내리기로 한 결정을 뒤집는 것이고, 뒤는 공유 셸의 판정을 바꿔 **`matchPrefix` 를 든
      다른 항목의 빵부스러기까지 함께 움직인다**(`/teacher/students/*` 가 「학급 관제소」를,
      `/classbot/learn/*` 가 「봇 대화」를 달게 된다). 이 화면 한 칸이 잃은 것은 이 화면에서
      메운다.
    */
    <TeacherPageShell
      backHref="/teacher/bots"
      backLabel="봇 관리"
      header={{
        eyebrow: { icon: Bot, text: '봇 빌더' },
        title: '새 클래스봇 만들기',
        // 「고르지 않으면 어떻게 되는지」는 `(선택)` 만으로는 알 수 없다 — 한 줄로 여기서만 말한다
        description: created ? undefined : '과목만 고르면 나머지는 기본값으로 채워져요.',
        // 마당마다 반복하던 「생성」을 여기 한 자리로 올렸다 — 어느 마당에서 눌러도 같다
        action: created ? undefined : (
          <Button
            type="button"
            variant="pullim"
            size="lg"
            onClick={make}
            disabled={create.isPending}
            aria-label="채운 그대로 봇 생성하기"
          >
            {create.isPending ? '만드는 중' : '생성'}
          </Button>
        ),
      }}
    >
      {created ? (
        <DoneView
          draft={draft}
          created={created}
          classes={classChoices}
          classesPending={classesQuery.isPending}
          classesFailed={classesQuery.isError}
          onPick={onPick}
          onRestart={restart}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-6">
            {/*
              만들기가 실패한 자리. 토스트로만 알리면 스크롤 밖에서 사라져 「눌렀는데 아무 일도 없다」가 된다 —
              문구는 화면 넷이 함께 읽는 표(`lib/bot-failure-message.ts`)에서 가져와 같은 실패를 두 말로 하지 않는다.
            */}
            {create.isError && (
              <AlertCard tone="danger" icon={TriangleAlert} title="봇을 만들지 못했어요">
                <p className="text-pullim-slate-700 text-sm" data-testid="builder-create-error">
                  {botFailureMessage(create.error, 'create')}
                </p>
              </AlertCard>
            )}

            <YardSteps current={yard} onJump={jumpYard} />

            {yard === 1 && <Yard1Intro draft={draft} onPick={onPick} fault={fault} />}
            {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
            {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

            <YardNav
              yard={yard}
              making={create.isPending}
              onPrev={() => goYard((yard - 1) as YardNo)}
              onNext={goNext}
              onMake={make}
            />
          </div>

          <aside className="xl:sticky xl:top-[76px]">
            <FilledSummary draft={draft} view="build" yard={yard} />
          </aside>
        </div>
      )}
    </TeacherPageShell>
  );
}

/**
 * 나가는 줄 — 마당을 앞뒤로 오가는 자리다.
 * 마당 3 은 더 갈 곳이 없어 「다음」 대신 「생성」이 **같은 자리**에 선다. 헤더의 「생성」과
 * 같은 `make` 를 부르므로 판정도 하나다 — 자리가 둘이라고 길이 둘이 되지는 않는다.
 *
 * 「다음」은 이 마당의 필수가 다 차야 넘어간다 — 판정은 `goForward` 가 한다(위쪽 「단계」와 같은
 * 자리다). 뒤로 가는 「이전」은 막지 않는다(채운 것을 되짚는 길이라 막을 까닭이 없다).
 */
function YardNav({
  yard, making, onPrev, onNext, onMake,
}: {
  yard: YardNo;
  /** `POST /classbot/bots` 가 가 있는 중 — 두 번 눌러 봇이 둘 생기지 않게 막는다. */
  making: boolean;
  onPrev: () => void;
  onNext: () => void;
  onMake: () => void;
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
          onClick={onMake}
          disabled={making}
          aria-label="채운 그대로 봇 생성하기"
        >
          {making ? '만드는 중' : '생성'}
        </Button>
      )}
    </div>
  );
}
