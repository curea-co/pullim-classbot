'use client';

import { useEffect, useState } from 'react';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { Button } from '@/components/ui/button';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardSteps } from '@/components/builder/yard-steps';
import {
  faultAnchorId, faultBefore, firstFault,
  type BotDraft, type Fault, type FieldKey, type YardNo,
} from '@/components/builder/builder-types';

/**
 * 봇 수정 — 이미 있는 봇을 빌더의 마당 셋으로 다시 연다.
 *
 * 새로 만드는 화면(`app/(teacher)/teacher/builder/page.tsx`)과 **묻는 것이 같다** — 마당도,
 * 항목도, 막는 판정(`firstFault` · `faultBefore`)도 같은 것을 쓴다. 그래서 마당 컴포넌트와
 * 판정 함수를 그대로 가져다 쓰고, 여기서 새로 그리는 것은 없다.
 *
 * 다른 것은 셋뿐이다:
 *  ① 첫 값이 빈 드래프트가 아니라 **그 봇의 지금 값**이다 (`bot-draft.ts`).
 *  ② 끝내는 버튼이 「생성」이 아니라 「저장」이다 — 만들어지는 봇이 없으니 만든 뒤 화면도 없다.
 *  ③ 어느 반에 넣을지는 여기서 고치지 않는다. 반 배정은 참여 코드가 가리키는 짝이라
 *     (`(bot_id, classroom_id)`) 학생이 이미 들어와 있는 반을 이 화면에서 떼는 것은
 *     봇을 고치는 일이 아니라 운영이다. 지금 붙어 있는 반은 「채워진 것」이 읽어준다.
 *
 * 저장은 아직 데모다 — 빌더와 마찬가지로 화면 안 상태로만 움직이고 카탈로그(`lib/mock`)에
 * 쓰지 않는다. 그래서 「저장했어요」라고만 하고 끝내지 않는다. 그렇게 말하면 교사가 고친 것이
 * 남아 있다고 믿고 나간다.
 *
 * 오케스트레이션(마당 오가기 · 막기 · 초점 옮기기)이 빌더 화면과 겹치는 것은 알고 두는 것이다.
 * 하나로 합치려면 빌더 화면을 갈라야 하는데, 그 파일은 지금 다른 손이 타고 있다.
 * 합칠 때는 이 파일과 빌더 화면이 같이 읽는 자리로 올린다.
 */
export function BotEditWorkspace({
  botName, initialDraft,
}: {
  botName: string;
  initialDraft: BotDraft;
}) {
  const [draft, setDraft] = useState<BotDraft>(initialDraft);
  const [yard, setYard] = useState<YardNo>(1);
  const [fault, setFault] = useState<Fault | null>(null);

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

  /** 어느 마당에서나 누를 수 있다. 막는 판정은 「생성」과 같은 것을 읽는다. */
  function save() {
    const blocked = firstFault(draft);
    if (blocked) {
      block(blocked);
      return;
    }
    toast.success('고친 값을 확인했어요 — 데모라 아직 봇에 남지는 않아요');
  }

  return (
    <TeacherPageShell
      backHref="/teacher/classbot"
      backLabel="내 클래스봇"
      header={{
        eyebrow: { icon: Bot, text: '봇 빌더' },
        title: `${botName} 수정하기`,
        description: '만들 때 고른 값이 그대로 들어 있어요. 고칠 것만 바꾸면 돼요.',
        action: (
          <Button type="button" variant="pullim" size="lg" onClick={save} aria-label="고친 그대로 저장하기">
            저장
          </Button>
        ),
      }}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <YardSteps current={yard} onJump={jumpYard} />

          {yard === 1 && <Yard1Intro draft={draft} onPick={onPick} fault={fault} />}
          {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
          {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

          <YardNav yard={yard} onPrev={() => goYard((yard - 1) as YardNo)} onNext={goNext} onSave={save} />
        </div>

        <aside className="xl:sticky xl:top-[76px]">
          <FilledSummary draft={draft} view="build" yard={yard} />
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
  yard, onPrev, onNext, onSave,
}: {
  yard: YardNo;
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
        <Button type="button" variant="pullim" size="lg" onClick={onSave} aria-label="고친 그대로 저장하기">
          저장
        </Button>
      )}
    </div>
  );
}
