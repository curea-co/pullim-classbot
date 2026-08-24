'use client';

import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { DoneView } from '@/components/builder/done-view';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardSteps } from '@/components/builder/yard-steps';
import {
  emptyDraft, isNameValid,
  type BotDraft, type FieldKey, type YardNo,
} from '@/components/builder/builder-types';

/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 8단계 위저드를 걷어냈다. 갈래를 고르게 하는 대신 항목 이름 옆에서 필수와 선택을 가른다 —
 * 꼭 골라야 하는 것은 빨간 `*`, 나머지는 `(선택)` 이다.
 * 그래서 「이대로 만들기」는 마당 하나만 지나도 누를 수 있다 — 과목만 고르면 끝난다.
 * 그 버튼은 마당마다 반복하지 않고 **페이지 헤더 오른쪽 한 자리**에 둔다.
 *
 * 봇을 굳히는 자리는 아직 데모다. 현행 빌더와 마찬가지로 화면 안 상태로만 움직이고
 * DB 에 쓰지 않는다 (`lib/db/schema.ts` 무관).
 */
export default function BotBuilderPage() {
  const [draft, setDraft] = useState<BotDraft>(emptyDraft);
  const [yard, setYard] = useState<YardNo>(1);
  const [view, setView] = useState<'build' | 'done'>('build');
  const [subjectError, setSubjectError] = useState(false);
  const [nameError, setNameError] = useState(false);

  /** 값이 바뀌는 단 하나의 길. `field` 는 그 항목의 오류 표시를 지우는 데 쓴다. */
  function onPick(field: FieldKey, patch: Partial<BotDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    if (field === 'subject') setSubjectError(false);
    if (field === 'name') setNameError(false);
  }

  function goYard(next: YardNo) {
    setView('build');
    setYard(next);
  }

  /** 어느 마당에서나 누를 수 있다. 남은 항목은 기본값으로 들어간다. */
  function make() {
    if (!draft.subject) {
      goYard(1);
      setSubjectError(true);
      toast.error('과목을 골라야 봇을 만들 수 있어요');
      return;
    }
    if (!isNameValid(draft)) {
      goYard(1);
      setNameError(true);
      toast.error('이름은 두 글자에서 서른 글자 사이로 적어 주세요');
      return;
    }
    setView('done');
    toast.success('봇이 만들어졌어요 (데모)');
  }

  function restart() {
    setDraft(emptyDraft);
    setSubjectError(false);
    setNameError(false);
    setView('build');
    setYard(1);
  }

  return (
    <div className="space-y-4 py-4 lg:py-6">
      <PageHeader
        eyebrow={{ icon: Bot, text: '봇 빌더' }}
        title="새 클래스봇 만들기"
        // 「고르지 않으면 어떻게 되는지」는 `(선택)` 만으로는 알 수 없다 — 한 줄로 여기서만 말한다
        description={view === 'build' ? '과목만 고르면 나머지는 기본값으로 채워져요.' : undefined}
        // 마당마다 반복하던 「이대로 만들기」를 여기 한 자리로 올렸다 — 어느 마당에서 눌러도 같다
        action={
          view === 'build' ? (
            <Button type="button" variant="pullim" size="lg" onClick={make}>
              이대로 만들기
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
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-4">
            <YardSteps current={yard} onJump={goYard} />

            {yard === 1 && (
              <Yard1Intro
                draft={draft}
                onPick={onPick}
                subjectError={subjectError}
                nameError={nameError}
              />
            )}
            {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
            {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

            <YardNav yard={yard} onJump={goYard} />
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
 * 나가는 줄 — 마당을 앞뒤로 오가는 것만 남았다.
 * 마당 3 은 더 갈 곳이 없어 「다음」이 없다. 거기서 끝내는 것은 헤더의 「이대로 만들기」다.
 */
function YardNav({ yard, onJump }: { yard: YardNo; onJump: (yard: YardNo) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {yard > 1 && (
        <Button type="button" variant="secondary" size="lg" onClick={() => onJump((yard - 1) as YardNo)}>
          <ChevronLeft aria-hidden />
          이전
        </Button>
      )}

      <div className="flex-1" />

      {yard < 3 && (
        <Button type="button" variant="pullim" size="lg" onClick={() => onJump((yard + 1) as YardNo)}>
          다음
          <ChevronRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
