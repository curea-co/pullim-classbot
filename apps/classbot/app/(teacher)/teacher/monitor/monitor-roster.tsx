'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import { RosterTable, type RosterColumn } from '@/components/classbot/roster-table';
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
 * 담는 것: 이름 / 학년 / 도달 배지 3값 / 요구 수준 대비 깊이 / 지름길 시도 / 범위 이탈 / 최근 접속 배지.
 * 담지 않는 것: 감정·집중도·체류시간, 오늘 대화 수 같은 총량 지표.
 *
 * **머리글 있는 표**다. 예전에는 줄을 격자(grid)로만 세워 두어 어느 칸이 무엇인지 말해주는 줄이
 * 아예 없었다. 대신 칸마다 「지름길 3회」처럼 이름표를 달고 다녔는데, 20줄이 깔리면 같은 낱말이
 * 스무 번 반복되면서 정작 숫자가 안 읽혔다. 이름표는 머리글 한 줄로 올리고 칸에는 값만 남긴다 —
 * 열이 좁아져 좁은 화면에도 유리하다. 머리글을 눈에서 감추지 말 것(`sr-only` 금지).
 * 다만 **배지는 제 글자를 그대로 둔다**(「도달」·「6분 전」) — 스스로 무엇인지 말하는 칩이라
 * 머리글과 겹쳐도 읽는 데 방해가 안 된다. 이름표를 걷어낸 것은 맨숫자 칸(지름길·이탈)뿐이다.
 *
 * 표 껍데기(머리글 줄·이름·학년 칸·줄 전체 링크·좁은 화면 처리)는 채점 허브 「학생 목록」과
 * 같은 것을 쓴다 — `components/classbot/roster-table.tsx`. 여기서는 가운데 열만 정한다.
 *
 * 상태는 **배지 두 벌**(도달 · 최근 접속)이 말한다 — 교사 홈의 「먼저 볼 학생」과 같은 배지다.
 * 줄 끝에 달려 있던 작은 글씨 이동 문구(「접속부터 확인」…)는 걷어냈다.
 * 줄마다 문구가 달라 학습이 안 되고, 글자가 작아 누르기 어렵고,
 * 줄 전체가 이미 그 학생의 기록으로 가는 링크라 같은 이동이 두 번 있던 자리였다.
 * 이제 줄 전체를 누르고, 오른쪽 끝에는 꺾쇠만 둔다.
 *
 * 지름길·이탈은 **학생을 벌주는 숫자가 아니라 과제 문항과 봇 규칙을 손볼 신호**다.
 * 경고색을 쓰지 말고 중립 slate 로 둘 것.
 */

/**
 * 관제소가 담는 열 — 이름·학년 다음, 꺾쇠 앞.
 * 맨숫자 칸(지름길·이탈)은 이름표를 머리글로 올리고 값만 남긴다.
 */
const monitorColumns: RosterColumn<MonitoredStudent>[] = [
  // 도달 배지 — 도달 · 미달 · 미도달 셋 중 하나
  { head: '도달', cell: s => <StudentReachBadge student={s} /> },
  // 요구 수준 대비 깊이 — 머리글이 「목표 · 닿음」이라 칸에는 숫자만 남긴다
  { head: '목표 · 닿음', cell: s => <DepthCell student={s} /> },
  // 지름길 시도 — 중립색. 경고 톤 금지
  {
    head: '지름길',
    cell: s => `${shortcutTries(s)}회`,
    className: 'text-pullim-slate-700 font-mono text-2xs',
  },
  // 범위 이탈 — 학생 리포트와 같은 원천(scopeExits)에서 읽는다
  {
    head: '이탈',
    cell: s => `${scopeExits(s)}회`,
    className: 'text-pullim-slate-700 font-mono text-2xs',
  },
  { head: '최근 접속', cell: s => <LastSeenBadge student={s} /> },
];

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

      <div className="mb-4 space-y-2">
        {context && <p className="text-pullim-slate-500 text-2xs font-semibold">{context}</p>}

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
        <RosterTable
          label="학생 한 줄 보기"
          minWidth="29rem"
          rows={visible}
          rowKey={s => s.id}
          student={s => s}
          // 되돌아갈 곳을 명시한다 — 기본값이 우연히 관제소인 것에 기대지 않는다 (spec 11 § 3.3.3 R1).
          href={s => `/teacher/students/${s.id}?from=monitor`}
          columns={monitorColumns}
        />
      )}

      {/*
        지름길·이탈은 학생을 고르는 조건이 아니라 과제·봇 규칙을 손볼 신호라
        상단 카드에서 내려 학급 합계로만 읽는다 (카드는 학생 수만 담는다).
      */}
      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        이번 과제에서 학급 전체 지름길 <b className="text-pullim-slate-700 font-mono">{`${classShortcuts}회`}</b>
        {' · 범위 이탈 '}
        <b className="text-pullim-slate-700 font-mono">{`${classExits}회`}</b>예요.
        지름길 시도는 답을 바로 요구했거나 직접 쓰지 않고 붙여넣은 횟수, 이탈은 봇이 수업 범위 밖 요청을 되돌린 횟수예요.
        학생을 나무랄 숫자가 아니라 <b className="text-pullim-slate-700">과제 문항과 봇 규칙을 손볼 자리</b>를 알려주는 신호로 읽어주세요.
        {' '}
        {/* 관제소 mock 은 이 학급의 봇 id 를 모른다 — 봇 관리 목록으로 보내고 탭만 실어 나른다 */}
        <Link
          href="/teacher/bots?tab=drift"
          aria-label="봇 관리에서 이탈 대응 강도 보기"
          className="text-pullim-blue-600 hover:text-pullim-blue-700 font-bold"
        >
          봇 관리
        </Link>
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
      {/* 목표에 못 미친 줄은 **굵기와 명도**로 떠오른다 — 빨강은 「미도달」 칩 한 자리에만 남긴다 */}
      <span className={depthShort ? 'text-pullim-slate-900 font-bold' : 'text-pullim-slate-500'}>
        {s.actualDepth}
      </span>
    </span>
  );
}
