'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { RosterTable, type RosterColumn } from '@/components/classbot/roster-table';
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
 * 이 화면이 담는 열 — 이름·학년 다음, 꺾쇠 앞.
 * 맨숫자·맨글자 칸(지름길·마지막 활동)은 이름표를 머리글로 올리고 값만 남긴다.
 */
const reachColumns: RosterColumn<MonitoredStudent>[] = [
  // 도달 상태 3값 — `s.reach` 그대로. 사고 수준은 다음 열이 따로 말한다.
  {
    head: '도달',
    cell: s => (
      <span className={cn('inline-block rounded-full px-2 py-0.5 text-2xs font-bold', reachBadgeClass[s.reach])}>
        {reachLabels[s.reach]}
      </span>
    ),
  },
  // 요구 수준 대비 깊이 — 머리글이 「목표 · 닿음」이라 칸에는 숫자만 남긴다.
  // 낱말을 「도달」이 아니라 「닿음」으로 쓰는 이유: 바로 앞 열 이름이 「도달」이라 겹친다.
  { head: '목표 · 닿음', cell: s => <DepthCell student={s} /> },
  // 지름길 시도 — 중립색. 경고 톤 금지
  {
    head: '지름길',
    cell: s => `${shortcutTries(s)}회`,
    className: 'text-pullim-slate-700 font-mono text-2xs',
  },
  // 마지막 활동 — 오늘 안 들어온 학생은 흐리게
  {
    head: '마지막 활동',
    cell: s => (
      <span className={cn('font-mono text-2xs', isOfflineToday(s) ? 'text-pullim-slate-400' : 'text-pullim-slate-500')}>
        {lastSeenText(s)}
      </span>
    ),
  },
];

/**
 * 학생별 한 줄 명단 — 교사가 훑는 화면.
 *
 * 담는 것: 이름 / 학년 / 도달 상태 3값 / 요구 수준 대비 깊이 / 지름길 시도 / 마지막 활동 시각.
 * 담지 않는 것: 오늘 대화 수 같은 총량 사용 지표, 감정·집중도·체류시간.
 *
 * 지름길 시도는 **학생을 벌주는 숫자가 아니라 과제·프롬프트를 손볼 신호**로 쓴다.
 * 문구·색을 그 톤에서 벗어나게 바꾸지 말 것 (경고색 금지, 중립 slate).
 *
 * **머리글 있는 표**다. 껍데기(머리글 줄·이름·학년 칸·줄 전체 링크·좁은 화면 처리)는
 * 관제소 「학생 한 줄 보기」·채점 허브 「학생 목록」과 같은 것을 쓴다 — `./roster-table`.
 * 칸마다 되풀이하던 이름표(「지름길 6회」)는 머리글로 올리고 값만 남긴다. 배지는 제 글자를
 * 그대로 둔다 — 스스로 무엇인지 말하는 칩이라 머리글과 겹쳐도 읽는 데 방해가 안 된다.
 *
 * **가운데 열은 관제소(`monitorColumns`)와 같지 않다.** 셋이 다르다:
 *   - 도달을 `s.reach` 그대로 읽는다(도달·**부분**·미도달). 관제소는 사고 수준까지 얹은
 *     `reachBadge()` 3값(도달·**미달**·미도달)이라 같은 학생이 다르게 나온다.
 *   - 범위 이탈 열이 없다.
 *   - 마지막 활동을 배지가 아니라 맨글자로 쓴다 (오늘 안 들어왔으면 흐리게).
 * 그래서 열 정의를 빌려 쓰지 않고 이 화면 몫으로 따로 둔다 — 빌리면 화면이 말하는 것이 바뀐다.
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
        action={
          <Link href="/teacher/replay" className="text-pullim-blue-600 inline-flex items-center gap-0.5 text-xs font-bold">
            대화 기록 전체 <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="mb-3 space-y-2">
        {context && <p className="text-pullim-slate-500 text-2xs font-semibold">{context}</p>}
        <FilterPillButtons options={filterOptions} current={filter} onSelect={setFilter} />
        <FilterPillButtons options={sortOptions} current={sort} onSelect={setSort} shape="tab" />
      </div>

      {visible.length === 0 ? (
        <EmptyState tone="plain" size="sm" title="이 조건에 해당하는 학생이 없어요" />
      ) : (
        /*
          줄 전체가 대화 기록으로 가는 링크다. 예전에는 줄 끝에 「대화 기록 →」 작은 링크가
          따로 달려 있었는데, 스무 줄이 **같은 곳으로 가는 같은 문구**라 읽어주기로도 구분이
          안 돼 `sr-only` 로 학생 이름을 덧대고 있었다. 이제 이름 자체가 링크라 그 덧댐이 필요 없다.
        */
        <RosterTable
          label="학생 한 줄 보기"
          minWidth="27rem"
          rows={visible}
          rowKey={s => s.id}
          student={s => s}
          href={() => '/teacher/replay'}
          columns={reachColumns}
        />
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        지름길 시도는 답을 바로 요구했거나 직접 쓰지 않고 붙여넣은 횟수예요.
        학생을 나무랄 숫자가 아니라 <b className="text-pullim-slate-700">과제 문항과 봇 프롬프트를 손볼 자리</b>를 알려주는 신호예요.
      </p>
    </section>
  );
}

/** 요구 수준 대비 닿은 수준 — 머리글이 「목표 · 닿음」이라 칸에는 숫자만 남는다. */
function DepthCell({ student: s }: { student: MonitoredStudent }) {
  const depthShort = s.actualDepth < s.targetDepth;
  return (
    <span
      className="text-pullim-slate-500 font-mono text-2xs"
      aria-label={`요구한 수준 ${s.targetDepth}단계 ${depthLabels[s.targetDepth]}, 닿은 수준 ${s.actualDepth}단계 ${depthLabels[s.actualDepth]}`}
      title={`목표 ${depthLabels[s.targetDepth]} · 닿음 ${depthLabels[s.actualDepth]}`}
    >
      <span>{s.targetDepth}</span>
      {' · '}
      {/* 목표에 못 미친 줄은 **굵기와 명도**로 떠오른다 — 빨강은 「미도달」 칩 한 자리에만 */}
      <span className={depthShort ? 'text-pullim-slate-900 font-bold' : 'text-pullim-slate-500'}>
        {s.actualDepth}
      </span>
    </span>
  );
}
