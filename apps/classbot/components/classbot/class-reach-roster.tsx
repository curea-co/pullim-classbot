'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import {
  depthLabels, isOfflineToday, lastSeenRank, lastSeenText, reachLabels, shortcutTries,
  type MonitoredStudent, type ReachStatus,
} from '@/lib/mock/classbot-monitoring';
import { cn } from '@/lib/utils';

type RosterFilter = 'all' | ReachStatus | 'offline';
type RosterSort = 'name' | 'shortcut' | 'stale';

const reachBadgeClass: Record<ReachStatus, string> = {
  reached:       'bg-pullim-blue-100 text-pullim-blue-700',
  partial:       'bg-pullim-slate-100 text-pullim-slate-700',
  'not-reached': 'bg-pullim-danger-bg text-pullim-danger',
};

const sortOptions = [
  { value: 'name',     label: '이름순' },
  { value: 'shortcut', label: '지름길 많은 순' },
  { value: 'stale',    label: '활동 오래된 순' },
] as const;

/**
 * 학생별 한 줄 명단 — 교사가 훑는 화면.
 *
 * 담는 것: 이름·학년 / 도달 상태 3값 / 요구 수준 대비 깊이 / 지름길 시도 / 마지막 활동 시각.
 * 담지 않는 것: 오늘 대화 수 같은 총량 사용 지표, 감정·집중도·체류시간.
 *
 * 지름길 시도는 **학생을 벌주는 숫자가 아니라 과제·프롬프트를 손볼 신호**로 쓴다.
 * 문구·색을 그 톤에서 벗어나게 바꾸지 말 것 (경고색 금지, 중립 slate).
 */
export function ClassReachRoster({ students, context }: { students: MonitoredStudent[]; context?: string }) {
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [sort, setSort] = useState<RosterSort>('name');

  const counts = useMemo(() => ({
    all: students.length,
    'not-reached': students.filter(s => s.reach === 'not-reached').length,
    partial: students.filter(s => s.reach === 'partial').length,
    reached: students.filter(s => s.reach === 'reached').length,
    offline: students.filter(isOfflineToday).length,
  }), [students]);

  const filterOptions = [
    { value: 'all',         label: '전체',   count: counts.all },
    { value: 'not-reached', label: '미도달', count: counts['not-reached'] },
    { value: 'partial',     label: '부분',   count: counts.partial },
    { value: 'reached',     label: '도달',   count: counts.reached },
    { value: 'offline',     label: '미접속', count: counts.offline },
  ] as const;

  const visible = useMemo(() => {
    const filtered = students.filter(s => {
      if (filter === 'all') return true;
      if (filter === 'offline') return isOfflineToday(s);
      return s.reach === filter;
    });
    const sorted = [...filtered];
    if (sort === 'shortcut') {
      sorted.sort((a, b) => shortcutTries(b) - shortcutTries(a) || a.name.localeCompare(b.name, 'ko'));
    } else if (sort === 'stale') {
      sorted.sort((a, b) => lastSeenRank(b) - lastSeenRank(a) || a.name.localeCompare(b.name, 'ko'));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return sorted;
  }, [students, filter, sort]);

  return (
    <section id="class-roster" className="bg-card scroll-mt-20 rounded-2xl border p-5">
      <SectionHeading
        title="학생 한 줄 보기"
        description="도달 상태 · 요구한 수준까지 닿았는지 · 지름길 시도 · 마지막 활동을 한 줄에 담았어요."
        action={
          <Link href="/teacher/replay" className="text-pullim-blue-600 inline-flex items-center gap-0.5 text-xs font-bold">
            대화 기록 전체 <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="mb-3 space-y-2">
        {context && <p className="text-pullim-slate-400 text-micro font-semibold">{context}</p>}
        <FilterPillButtons options={filterOptions} current={filter} onSelect={setFilter} />
        <FilterPillButtons options={sortOptions} current={sort} onSelect={setSort} shape="tab" />
      </div>

      {visible.length === 0 ? (
        <EmptyState tone="plain" size="sm" title="이 조건에 해당하는 학생이 없어요" />
      ) : (
        <ul className="divide-pullim-slate-100 divide-y">
          {visible.map(s => (
            <RosterRow key={s.id} student={s} />
          ))}
        </ul>
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        지름길 시도는 답을 바로 요구했거나 직접 쓰지 않고 붙여넣은 횟수예요.
        학생을 나무랄 숫자가 아니라 <b className="text-pullim-slate-700">과제 문항과 봇 프롬프트를 손볼 자리</b>를 알려주는 신호예요.
      </p>
    </section>
  );
}

function RosterRow({ student: s }: { student: MonitoredStudent }) {
  const tries = shortcutTries(s);
  const depthShort = s.actualDepth < s.targetDepth;

  // 열 너비를 고정해 20줄이 세로로 정렬되게 한다 — 훑는 화면이라 정렬이 곧 가독성
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[9rem_3.5rem_7rem_5rem_6.5rem_minmax(0,1fr)]">
      {/* 이름 · 학년 */}
      <div className="flex items-center gap-2">
        <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
          {s.name.slice(1, 2)}
        </span>
        <span className="min-w-0">
          <span className="text-pullim-slate-900 block text-sm leading-tight font-bold">{s.name}</span>
          <span className="text-pullim-slate-500 text-micro">{s.grade}</span>
        </span>
      </div>

      {/* 도달 상태 3값 */}
      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold', reachBadgeClass[s.reach])}>
        {reachLabels[s.reach]}
      </span>

      {/* 요구 수준 대비 깊이 */}
      <span
        className="text-pullim-slate-500 shrink-0 font-mono text-2xs"
        aria-label={`요구한 수준 ${s.targetDepth}단계 ${depthLabels[s.targetDepth]}, 닿은 수준 ${s.actualDepth}단계 ${depthLabels[s.actualDepth]}`}
        title={`목표 ${depthLabels[s.targetDepth]} · 도달 ${depthLabels[s.actualDepth]}`}
      >
        <span>{`목표 ${s.targetDepth}`}</span>
        {' · '}
        <b className={depthShort ? 'text-pullim-danger' : 'text-pullim-slate-700'}>
          {`도달 ${s.actualDepth}`}
        </b>
      </span>

      {/* 지름길 시도 — 중립색. 경고 톤 금지 */}
      <span className="text-pullim-slate-500 shrink-0 text-2xs">
        지름길 <b className="text-pullim-slate-700 font-mono">{`${tries}회`}</b>
      </span>

      {/* 마지막 활동 */}
      <span className={cn('shrink-0 font-mono text-2xs', isOfflineToday(s) ? 'text-pullim-slate-400' : 'text-pullim-slate-500')}>
        {lastSeenText(s)}
      </span>

      {/* 그래서 뭘 하나 */}
      <Link
        href="/teacher/replay"
        className="text-pullim-blue-600 hover:text-pullim-blue-700 ml-auto inline-flex shrink-0 items-center gap-0.5 text-2xs font-bold"
      >
        기록 보기 <ArrowRight className="h-3 w-3" />
        <span className="sr-only">{s.name} 대화 기록</span>
      </Link>
    </li>
  );
}
