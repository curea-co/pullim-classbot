'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import {
  depthLabels, shortcutTries, type MonitoredStudent,
} from '@/lib/mock/classbot-monitoring';
import { scopeExits } from '@/lib/mock/classbot-student-report';
import {
  ROSTER_ANCHOR, countByFilter, filterCards, filterLabels, sortOptions, visibleRoster,
  type RosterFilter, type RosterSort,
} from './roster-filters';

/**
 * 관제소 학생 명단 — 한 줄에 한 학생.
 *
 * 거르개는 두 벌 두지 않는다. 같은 거르개가 두 군데 있으면 어느 쪽이 진짜인지 알 수 없다.
 *   - 관제소(`/teacher/monitor`)  = 위 요약 카드가 거르개다. 여기서는 **지금 뭘 거르고 있는지**만
 *     보여주고 푸는 버튼 하나를 둔다 (`filter` 를 받는 쪽).
 *   - 학생 목록(`/teacher/students`) = 위에 카드가 없다. 그때만 이 안에서 알약 줄로 거른다.
 *
 * 담는 것: 이름·학년 / 도달 배지 3값 / 요구 수준 대비 깊이 / 지름길 시도 / 범위 이탈 / 최근 접속 배지.
 * 담지 않는 것: 감정·집중도·체류시간, 오늘 대화 수 같은 총량 지표.
 *
 * 상태는 **배지 두 벌**(도달 · 최근 접속)이 말한다 — 교사 홈의 「먼저 볼 학생」과 같은 배지다.
 * 줄 끝에 달려 있던 작은 글씨 이동 문구(「접속부터 확인」…)는 걷어냈다.
 * 줄마다 문구가 달라 학습이 안 되고, 글자가 작아 누르기 어렵고,
 * 줄 전체가 이미 그 학생의 기록으로 가는 링크라 같은 이동이 두 번 있던 자리였다.
 * 이제 줄 전체를 누르고, 오른쪽 끝에는 꺾쇠만 둔다.
 *
 * 지름길·이탈은 **학생을 벌주는 숫자가 아니라 과제 문항과 봇 설정을 손볼 신호**다.
 * 경고색을 쓰지 말고 중립 slate 로 둘 것.
 */

export function MonitorRoster({
  students,
  context,
  filter: filterProp,
  sort: sortProp,
  onSortChange,
  onClearFilter,
}: {
  students: MonitoredStudent[];
  context?: string;
  /** 밖(요약 카드)에서 거르개를 쥐고 있을 때만 넘긴다. 안 넘기면 이 안에서 알약 줄로 거른다. */
  filter?: RosterFilter;
  sort?: RosterSort;
  onSortChange?: (sort: RosterSort) => void;
  onClearFilter?: () => void;
}) {
  const [innerFilter, setInnerFilter] = useState<RosterFilter>('all');
  const [innerSort, setInnerSort] = useState<RosterSort>('name');

  const ownsFilter = filterProp === undefined;
  const filter = filterProp ?? innerFilter;
  const sort = sortProp ?? innerSort;
  const selectSort = onSortChange ?? setInnerSort;
  const clearFilter = ownsFilter ? () => setInnerFilter('all') : (onClearFilter ?? (() => {}));

  const visible = useMemo(() => visibleRoster(students, filter, sort), [students, filter, sort]);

  const counts = useMemo(() => countByFilter(students), [students]);

  const classShortcuts = useMemo(
    () => students.reduce((n, s) => n + shortcutTries(s), 0),
    [students],
  );
  const classExits = useMemo(
    () => students.reduce((n, s) => n + scopeExits(s), 0),
    [students],
  );

  return (
    <section id={ROSTER_ANCHOR} className="bg-card scroll-mt-20 rounded-2xl border p-5">
      {/* 어떤 값을 담는지는 화면 아래 안내(관제소)·헤더(학생 목록)가 이미 말한다 — 여기서 또 세지 않는다. */}
      <SectionHeading title="학생 한 줄 보기" />

      <div className="mb-3 space-y-2">
        {context && <p className="text-pullim-slate-400 text-micro font-semibold">{context}</p>}

        {ownsFilter ? (
          <FilterPillButtons
            options={filterCards.map(c => ({
              value: c.value,
              label: filterLabels[c.value],
              count: counts[c.value],
            }))}
            current={filter}
            onSelect={setInnerFilter}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {filter === 'all' ? (
              <span className="text-pullim-slate-500 text-2xs font-semibold">
                {`학생 ${students.length}명 전체`}
              </span>
            ) : (
              <>
                <span className="text-pullim-slate-500 text-2xs font-semibold">
                  {`${filterLabels[filter]} ${visible.length}명만 보는 중`}
                </span>
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-pullim-slate-600 hover:bg-pullim-slate-100 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
                >
                  <X className="h-3 w-3" aria-hidden />
                  전체 보기
                </button>
              </>
            )}
          </div>
        )}

        <FilterPillButtons options={sortOptions} current={sort} onSelect={selectSort} shape="tab" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="이 조건에 해당하는 학생이 없어요"
          action={{ onClick: clearFilter, label: '전체 보기' }}
        />
      ) : (
        <ul className="divide-pullim-slate-100 divide-y">
          {visible.map(s => <RosterRow key={s.id} student={s} />)}
        </ul>
      )}

      {/*
        지름길·이탈은 학생을 고르는 조건이 아니라 과제·봇 설정을 손볼 신호라
        상단 카드에서 내려 학급 합계로만 읽는다 (카드는 학생 수만 담는다).
      */}
      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        이번 과제에서 학급 전체 지름길 <b className="text-pullim-slate-700 font-mono">{`${classShortcuts}회`}</b>
        {' · 범위 이탈 '}
        <b className="text-pullim-slate-700 font-mono">{`${classExits}회`}</b>예요.
        지름길 시도는 답을 바로 요구했거나 직접 쓰지 않고 붙여넣은 횟수, 이탈은 봇이 수업 범위 밖 요청을 되돌린 횟수예요.
        학생을 나무랄 숫자가 아니라 <b className="text-pullim-slate-700">과제 문항과 봇 설정을 손볼 자리</b>를 알려주는 신호로 읽어주세요.
        {' '}
        <Link href="/teacher/settings?tab=drift" className="text-pullim-blue-600 hover:text-pullim-blue-700 font-bold">
          봇 설정에서 이탈 대응 강도 보기
        </Link>
      </p>
    </section>
  );
}

function RosterRow({ student: s }: { student: MonitoredStudent }) {
  const tries = shortcutTries(s);
  const exits = scopeExits(s);
  const depthShort = s.actualDepth < s.targetDepth;

  // 열 너비를 고정해 20줄이 세로로 정렬되게 한다 — 훑는 화면이라 정렬이 곧 가독성
  return (
    <li>
      <Link
        href={`/teacher/students/${s.id}`}
        className="hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 sm:grid-cols-[9rem_3.5rem_7rem_5rem_4.5rem_minmax(0,1fr)_auto]"
      >
        {/* 이름 · 학년 */}
        <span className="flex items-center gap-2">
          <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
            {s.name.slice(1, 2)}
          </span>
          <span className="min-w-0">
            <span className="text-pullim-slate-900 block text-sm leading-tight font-bold">{s.name}</span>
            <span className="text-pullim-slate-500 text-micro">{s.grade}</span>
          </span>
        </span>

        {/* 도달 배지 — 도달 · 미달 · 미도달 셋 중 하나 */}
        <StudentReachBadge student={s} />

        {/* 요구 수준 대비 깊이 */}
        <span
          className="text-pullim-slate-500 shrink-0 font-mono text-2xs"
          aria-label={`요구한 수준 ${s.targetDepth}단계 ${depthLabels[s.targetDepth]}, 닿은 수준 ${s.actualDepth}단계 ${depthLabels[s.actualDepth]}`}
          title={`목표 ${depthLabels[s.targetDepth]} · 닿음 ${depthLabels[s.actualDepth]}`}
        >
          <span>{`목표 ${s.targetDepth}`}</span>
          {' · '}
          {/* 목표에 못 미친 줄은 **굵기와 명도**로 떠오른다 — 빨강은 「미도달」 칩 한 자리에만 남긴다 */}
          <span className={depthShort ? 'text-pullim-slate-900 font-bold' : 'text-pullim-slate-500'}>
            {`닿음 ${s.actualDepth}`}
          </span>
        </span>

        {/* 지름길 시도 — 중립색. 경고 톤 금지 */}
        <span className="text-pullim-slate-500 shrink-0 text-2xs">
          지름길 <b className="text-pullim-slate-700 font-mono">{`${tries}회`}</b>
        </span>

        {/* 범위 이탈 — 학생 리포트와 같은 원천(scopeExits)에서 읽는다 */}
        <span className="text-pullim-slate-500 shrink-0 text-2xs">
          이탈 <b className="text-pullim-slate-700 font-mono">{`${exits}회`}</b>
        </span>

        {/*
          최근 접속 배지 + 꺾쇠. 좁은 화면에서는 둘이 한 칸에 붙어 다니고(꺾쇠만 따로 줄바꿈되지 않게),
          넓은 화면에서는 `contents` 로 풀려 원래 열 자리로 돌아간다.
          줄 전체가 이미 기록으로 가는 링크라 꺾쇠는 갈 수 있다는 표시일 뿐이다.
        */}
        <span className="ml-auto flex items-center gap-1 sm:contents">
          <LastSeenBadge student={s} className="justify-self-end" />
          <ChevronRight className="text-pullim-slate-400 ml-auto h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </li>
  );
}
