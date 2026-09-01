'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { DoneView } from '@/components/builder/done-view';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardSteps } from '@/components/builder/yard-steps';
import {
  emptyDraft, faultAnchorId, faultBefore, firstFault,
  type BotDraft, type Fault, type FieldKey, type YardNo,
} from '@/components/builder/builder-types';

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
 * 봇을 굳히는 자리는 아직 데모다. 현행 빌더와 마찬가지로 화면 안 상태로만 움직이고
 * DB 에 쓰지 않는다 (`lib/db/schema.ts` 무관).
 */
export default function BotBuilderPage() {
  const [draft, setDraft] = useState<BotDraft>(emptyDraft);
  const [yard, setYard] = useState<YardNo>(1);
  const [view, setView] = useState<'build' | 'done'>('build');
  const [fault, setFault] = useState<Fault | null>(null);

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
    setView('build');
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

  /** 어느 마당에서나 누를 수 있다. 남은 항목은 기본값으로 들어간다. */
  function make() {
    const blocked = firstFault(draft);
    if (blocked) {
      block(blocked);
      return;
    }
    setView('done');
    toast.success('봇이 만들어졌어요 (데모)');
  }

  function restart() {
    setDraft(emptyDraft);
    setFault(null);
    setView('build');
    setYard(1);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={{ icon: Bot, text: '봇 빌더' }}
        title="새 클래스봇 만들기"
        // 「고르지 않으면 어떻게 되는지」는 `(선택)` 만으로는 알 수 없다 — 한 줄로 여기서만 말한다
        description={view === 'build' ? '과목만 고르면 나머지는 기본값으로 채워져요.' : undefined}
        // 마당마다 반복하던 「생성」을 여기 한 자리로 올렸다 — 어느 마당에서 눌러도 같다
        action={
          view === 'build' ? (
            <Button type="button" variant="pullim" size="lg" onClick={make} aria-label="채운 그대로 봇 생성하기">
              생성
            </Button>
          ) : undefined
        }
      />

      {view === 'done' ? (
        <DoneView
          draft={draft}
          onPick={onPick}
          onRefine={() => goYard(1)}
          onRestart={restart}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-6">
            <YardSteps current={yard} onJump={jumpYard} />

            {yard === 1 && <Yard1Intro draft={draft} onPick={onPick} fault={fault} />}
            {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
            {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

            <YardNav yard={yard} onPrev={() => goYard((yard - 1) as YardNo)} onNext={goNext} onMake={make} />
          </div>

          <aside className="xl:sticky xl:top-[76px]">
            <FilledSummary draft={draft} view="build" yard={yard} />
          </aside>
        </div>
      )}
    </div>
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
  yard, onPrev, onNext, onMake,
}: {
  yard: YardNo;
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
        <Button type="button" variant="pullim" size="lg" onClick={onMake} aria-label="채운 그대로 봇 생성하기">
          생성
        </Button>
      )}
    </div>
  );
}
