'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import { cn } from '@/lib/utils';

/**
 * 학생 한 줄 명단의 **표 껍데기** — 관제소(「학생 한 줄 보기」)와 채점 허브(「학생 목록」)가 같이 쓴다.
 *
 * 표를 통째로 공유하지 않는 이유: 두 화면이 담는 열이 다르다.
 *   - 관제소   : 도달 · 목표 · 닿음 · 지름길 · 이탈 · 최근 접속
 *   - 채점 허브 : 도달 · 최근 접속 · 채점 대기 · 막힌 곳 · AI 초안
 * 억지로 하나로 합치면 두 화면 모두 남의 빈 칸을 이고 다닌다. 그래서 **두 화면이 똑같이 지켜야
 * 하는 것만** 여기 둔다 — 머리글 줄, 이름·학년 두 칸, 줄 전체 링크, 좁은 화면에서 표만 미는 것.
 * 가운데 열은 화면마다 `columns` 로 넘긴다.
 *
 * 지키는 것 셋:
 *   ① **머리글은 눈에 보인다** — `sr-only` 로 감추면 표가 아니라 그냥 줄 스무 개가 된다
 *   ② **줄에 누를 것은 하나** — 이름 칸의 링크를 줄 전체로 늘린다. 줄 안에 버튼을 더 두지 않는다
 *   ③ **가로로 미는 것은 표뿐** — 페이지 본문이 통째로 밀리면 안 된다
 */

/** 이름·학년 뒤에 붙는 열 하나 — 머리글과 그 줄의 값을 한자리에서 정한다. */
export type RosterColumn<T> = {
  /** 머리글 — 눈에 보이는 자리. 칸에서 되풀이하던 이름표를 여기로 올린다. */
  head: string;
  /** 그 줄에서 이 열이 담는 것 */
  cell: (row: T) => ReactNode;
  /** 칸에 더 붙일 결 (글자색·글꼴 등) */
  className?: string;
};

/**
 * 머리글 칸 — 열이 무엇인지 말하는 유일한 자리라 눈에 보여야 한다.
 * 한국어라 11px(`text-micro`)이 아니라 12px 이다 (계약 §1·§4.1 — #261).
 */
const headCell = 'text-pullim-slate-500 px-2 pb-2 text-left text-2xs font-bold whitespace-nowrap';

/**
 * 값 칸 — 줄 사이 선은 **칸에** 그린다.
 * 줄(`tr`)에 그리면 `border-separate` 에서는 보이지 않는데,
 * 표를 `separate` 로 두는 이유는 아래 줄의 `relative` 주석에 있다.
 */
const cell = 'border-pullim-slate-100 border-t px-2 py-3 align-middle whitespace-nowrap';

export function RosterTable<T>({
  label,
  minWidth,
  rows,
  rowKey,
  student,
  href,
  columns,
}: {
  /** 표의 이름 — 화면 제목과 같게 둔다. 읽어주기가 표를 목록에서 집을 때 쓴다. */
  label: string;
  /**
   * 좁은 화면에서 열이 눌리지 않게 잡아 두는 바닥 폭 (예: `'29rem'`).
   * Tailwind 의 `min-w-[…]` 로 쓰지 않는다 — 클래스 이름을 값으로 지어내면 컴파일되지 않는다.
   */
  minWidth: string;
  rows: T[];
  rowKey: (row: T) => string;
  /** 그 줄의 학생 — 이름·학년 두 칸이 읽는다 */
  student: (row: T) => MonitoredStudent;
  /** 줄 전체가 가는 곳 */
  href: (row: T) => string;
  columns: RosterColumn<T>[];
}) {
  return (
    /*
      **표만** 가로로 밀리게 감싼다 — 페이지 본문이 통째로 밀리면 안 된다.
      담는 카드의 안쪽 여백(`p-5`)만큼 밖으로 뺐다가 다시 채워, 표가 카드 선에 딱 붙어
      시작하고 끝까지 밀 수 있게 둔다. 그래서 이 표는 `p-5` 카드 안에 놓는 것을 전제한다.
    */
    <div className="-mx-5 overflow-x-auto px-5">
      {/*
        `border-separate` 를 쓰는 이유: 줄(`tr`)에 `relative` 를 걸어야 이름 링크를 줄 전체로
        늘릴 수 있는데, `border-collapse` 에서는 그 `relative` 가 무시되는 브라우저가 있다.
        대신 줄 사이 선은 칸(`cell`)에 그린다.
      */}
      <table
        aria-label={label}
        style={{ minWidth }}
        className="w-full border-separate border-spacing-0"
      >
        <thead>
          <tr>
            <th scope="col" className={headCell}>이름</th>
            <th scope="col" className={headCell}>학년</th>
            {columns.map(c => (
              <th key={c.head} scope="col" className={headCell}>{c.head}</th>
            ))}
            {/* 꺾쇠 자리 — 값이 아니라 「갈 수 있다」는 표시라 부를 이름이 없다 */}
            <th scope="col" className={headCell} />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const s = student(row);
            return (
              <tr
                key={rowKey(row)}
                className="hover:bg-pullim-slate-50 has-[a:focus-visible]:bg-pullim-blue-50 relative transition-colors"
              >
                {/*
                  이름 = 이 줄의 머리글이자 줄에 하나뿐인 링크.
                  링크 뒤(`after`)를 줄 전체로 늘려 어느 칸을 눌러도 그 학생에게 간다 —
                  줄 안에 누를 것을 둘 두지 않으려는 것이라 버튼·onClick 으로 바꾸지 말 것.
                */}
                <th scope="row" className={cn(cell, 'text-left font-normal')}>
                  <span className="flex items-center gap-2">
                    <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
                      {s.name.slice(1, 2)}
                    </span>
                    <Link
                      href={href(row)}
                      className="text-pullim-slate-900 focus-visible:ring-pullim-blue-400/50 rounded text-sm leading-tight font-bold after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2"
                    >
                      {s.name}
                    </Link>
                  </span>
                </th>

                {/* 학년 — 이름과 한 칸에 겹쳐 있던 것을 제 열로 뺐다 */}
                <td className={cn(cell, 'text-pullim-slate-500 text-2xs')}>{s.grade}</td>

                {columns.map(c => (
                  <td key={c.head} className={cn(cell, c.className)}>{c.cell(row)}</td>
                ))}

                {/*
                  줄 전체가 이미 링크라 꺾쇠는 갈 수 있다는 표시일 뿐이다.
                  칸에 너비를 못박지 말 것 — 안쪽 여백에 눌려 꺾쇠가 0px 로 찌그러진다.
                */}
                <td className={cn(cell, 'text-right')}>
                  <ChevronRight className="text-pullim-slate-400 inline h-4 w-4" aria-hidden />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
