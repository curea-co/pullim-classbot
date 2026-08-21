'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { KpiStatBar } from '@/components/classbot/kpi-stat';
import type { MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import { cn } from '@/lib/utils';
import { MonitorRoster } from './monitor-roster';
import {
  ROSTER_ANCHOR, countByFilter, filterCards, filterLabels,
  type RosterFilter, type RosterSort,
} from './roster-filters';

/**
 * 관제소 본체 — 상단 요약 카드와 아래 학생 명단을 한 상태로 묶는다.
 *
 * 예전에는 카드마다 작은 글씨 링크(「명단 보기」·「누구인지 보기」·「먼저 볼 학생」…)가 달려 있었다.
 * 카드마다 문구가 달라 학습이 안 되고, 글자가 작아 누르기 어렵고,
 * 숫자와 링크가 무슨 사이인지(거르개인지 이동인지) 읽히지 않았다.
 *
 * 그래서 **카드 자체를 누르는 거르개**로 바꿨다. 같은 화면 안에서 끝나는 일은 이동이 아니라 거르기다.
 * 카드 = 명단 거르개 하나뿐이라 아래 명단의 거르개 알약 줄(같은 값이 한 번 더 있던 자리)은 걷어냈다.
 * 문구는 카드마다 다르지 않다 — 전부 「누르면 그 학생만 보인다」 하나로 같다.
 */
export function MonitorBoard({
  students,
  context,
  children,
}: {
  students: MonitoredStudent[];
  context?: string;
  /** 카드와 명단 사이에 끼우는 학급 단위 블록 (다시 가르칠 개념) */
  children?: ReactNode;
}) {
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [sort, setSort] = useState<RosterSort>('name');

  const counts = useMemo(() => countByFilter(students), [students]);

  function selectFilter(next: RosterFilter) {
    // 누른 카드를 다시 누르면 전체로 돌아온다 — 거르개를 푸는 자리를 따로 찾지 않게.
    const applied = next === filter ? 'all' : next;
    setFilter(applied);
    if (applied !== 'all') {
      // 거르고 나면 명단으로 데려간다 — 아래가 바뀌는데 화면은 그대로면 눌린 줄 모른다.
      document.getElementById(ROSTER_ANCHOR)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <KpiStatBar cols={6}>
          {filterCards.map(card => (
            <FilterCard
              key={card.value}
              label={filterLabels[card.value]}
              value={`${counts[card.value]}명`}
              tone={card.tone}
              active={filter === card.value}
              srHint={filterSrHint(card.value === 'all', filter === card.value)}
              onSelect={() => selectFilter(card.value)}
            />
          ))}
        </KpiStatBar>
        <p className="text-pullim-slate-400 px-1 text-micro font-semibold">
          카드를 누르면 아래 명단에 그 학생만 남아요.
        </p>
      </div>

      {children}

      <MonitorRoster
        students={students}
        context={context}
        filter={filter}
        sort={sort}
        onSortChange={setSort}
        onClearFilter={() => setFilter('all')}
      />
    </>
  );
}

/** 화면에는 안 보이고 읽어주기만 하는 안내 — 카드가 거르개라는 것을 소리로도 알린다 */
function filterSrHint(isAll: boolean, active: boolean): string {
  if (isAll) return active ? '지금 전체를 보는 중' : '전체 보기';
  return active ? '지금 이 학생만 보는 중' : '이 학생만 보기';
}

const toneValueClass = {
  default: 'text-pullim-slate-900',
  accent: 'text-pullim-blue-600',
  alert: 'text-pullim-danger',
} as const;

/** KpiStat 과 같은 자리·같은 글자 크기. 다른 점은 누를 수 있다는 것 하나. */
function FilterCard({
  label, value, tone, active, srHint, onSelect,
}: {
  label: string;
  value: string;
  tone: keyof typeof toneValueClass;
  active: boolean;
  srHint: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          'w-full rounded-lg border-2 px-3 py-2 text-left transition-colors',
          'focus-visible:ring-pullim-blue-400/50 focus-visible:outline-none focus-visible:ring-2',
          active
            ? 'border-pullim-blue-600 bg-pullim-blue-50'
            : 'border-transparent bg-pullim-slate-50/50 hover:bg-pullim-slate-100',
        )}
      >
        <span className={cn(
          'block text-micro font-semibold tracking-wider uppercase',
          active ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
        )}>
          {label}
        </span>
        <span className={cn('mt-0.5 block font-mono text-base font-bold', toneValueClass[tone])}>
          {value}
        </span>
        <span className="sr-only">{` — ${srHint}`}</span>
      </button>
    </li>
  );
}
