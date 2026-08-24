'use client';

import { useState } from 'react';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Yard1Intro, Yard2Answers, Yard3Teaching } from '@/components/builder/build-yards';
import { DoneView } from '@/components/builder/done-view';
import { FilledSummary } from '@/components/builder/filled-summary';
import { YardStepBand, YardStepRail } from '@/components/builder/yard-steps';
import {
  applyClone, emptyDraft, isNameValid, pick,
  type BotDraft, type CloneSource, type FieldKey, type GroupNo, type YardNo,
} from '@/components/builder/builder-types';

/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 8단계 위저드를 걷어냈다. 갈래를 고르게 하는 대신 안내를 두 층으로 둔다 —
 *  ① 제목 아래 한 줄이 「과목만 고르면 나머지는 기본값」이라는 방침을 말하고,
 *  ② 항목 이름 옆 표시가 그 항목이 꼭 골라야 하는 것인지 기본값인지 말한다.
 * 그래서 「이대로 만들기」는 마당 하나만 지나도 누를 수 있다 — 과목만 고르면 끝난다.
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

  /** 값이 바뀌는 단 하나의 길 — 항목 옆 표시와 「채워진 것」이 같은 `own` 을 함께 읽는다. */
  function onPick(field: FieldKey, patch: Partial<BotDraft>, own = true) {
    setDraft((d) => pick(d, field, patch, own));
    if (field === 'subject') setSubjectError(false);
    if (field === 'name') setNameError(false);
  }

  function onClone(source: CloneSource) {
    setDraft(applyClone(source));
    setSubjectError(false);
    setNameError(false);
    setView('build');
    setYard(1);
    toast.success(`${source.name}의 과목 · 학년 · 말투 · 답 범위를 가져왔어요`);
  }

  function goYard(next: YardNo) {
    setView('build');
    setYard(next);
  }

  /** 「채워진 것」의 줄에서 바로 고치러 가기. 마당 4(반)는 만든 뒤 화면이 스스로 처리한다. */
  function onEdit(group: GroupNo) {
    if (group !== 4) goYard(group);
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
      toast.error('이름은 두 글자 이상 적어 주세요');
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
        // 안내 ① — 갈래 고르기가 있던 자리를 대신하는 전체 방침 한 줄
        description={
          view === 'build' ? (
            <>과목만 고르면 나머지는 <strong>기본값</strong>으로 채워져요. 기본값은 지금도, 만든 뒤에도 고칠 수 있어요.</>
          ) : (
            <>봇이 만들어졌어요. 기본값으로 들어간 것도 지금 바로 고칠 수 있어요.</>
          )
        }
      />

      {view === 'done' ? (
        <DoneView
          draft={draft}
          onPick={onPick}
          onEditYard={goYard}
          onRefine={() => goYard(1)}
          onRestart={restart}
        />
      ) : (
        <>
          <YardStepBand current={yard} onJump={goYard} />

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-4">
              {yard === 1 && (
                <Yard1Intro
                  draft={draft}
                  onPick={onPick}
                  onClone={onClone}
                  subjectError={subjectError}
                  nameError={nameError}
                />
              )}
              {yard === 2 && <Yard2Answers draft={draft} onPick={onPick} />}
              {yard === 3 && <Yard3Teaching draft={draft} onPick={onPick} />}

              <YardNav yard={yard} onJump={goYard} onMake={make} />
            </div>

            <aside className="space-y-3 xl:sticky xl:top-[76px]">
              <YardStepRail current={yard} onJump={goYard} />
              <FilledSummary draft={draft} view="build" yard={yard} onEdit={onEdit} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 나가는 줄 — 마당마다 다르다.
 * 마당 1·2 에는 「이대로 만들기」를 다음 버튼과 나란히 둔다. 갈래 고르기가 사라진 대신
 * 「짧게 끝내기」가 여기 있다는 것을 매 마당에서 보여줘야 한다.
 * 마당 3 은 더 갈 곳이 없으니 만들기 하나만 둔다.
 */
function YardNav({
  yard, onJump, onMake,
}: {
  yard: YardNo;
  onJump: (yard: YardNo) => void;
  onMake: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {yard > 1 && (
        <Button type="button" variant="secondary" size="lg" onClick={() => onJump((yard - 1) as YardNo)}>
          <ChevronLeft aria-hidden />
          이전
        </Button>
      )}

      {yard < 3 && (
        <Button type="button" variant="outline" size="lg" onClick={onMake}>
          이대로 만들기
        </Button>
      )}

      <div className="flex-1" />

      {yard === 1 && (
        <Button type="button" variant="pullim" size="lg" onClick={() => onJump(2)}>
          다음 — 보고 답할 것
          <ChevronRight aria-hidden />
        </Button>
      )}
      {yard === 2 && (
        <Button type="button" variant="pullim" size="lg" onClick={() => onJump(3)}>
          다음 — 가르치는 법
          <ChevronRight aria-hidden />
        </Button>
      )}
      {yard === 3 && (
        <Button type="button" variant="pullim" size="lg" onClick={onMake}>
          만들기
        </Button>
      )}
    </div>
  );
}
