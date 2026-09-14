'use client';

import {
  lastSeenColumn, reachColumn,
} from '@/components/classbot/roster-columns';
import { RosterTable, type RosterColumn } from '@/components/classbot/roster-table';
import { stuckConceptLabel, type MonitoredStudent } from '@/lib/mock/classbot-monitoring';

/**
 * 교사 홈 「먼저 볼 학생」 명단 — 관제소·리포트 센터와 **같은 표 껍데기**를 쓴다
 * (`components/classbot/roster-table.tsx`). 머리글 줄이 보이고, 이름·학년이 갈리고,
 * 줄 전체가 링크이고, 좁은 화면에서는 표만 가로로 민다.
 *
 * 홈이라 짧게 끊는다 — 전체 명단은 관제소 몫이고, 여기는 `pickAttentionStudents` 가
 * 골라 준 몇 줄만 받는다. 남은 인원 안내는 이 표 밖(페이지)이 맡는다.
 *
 * **파일이 따로 있는 이유**: 교사 홈(`page.tsx`)은 서버 컴포넌트다. `RosterTable` 에 넘기는
 * `columns`·`href` 는 함수라 서버→클라이언트 경계를 못 넘는다. 그래서 함수를 만드는 자리를
 * 클라이언트 쪽인 이 파일로 내렸다 — 관제소·리포트 센터 명단이 각자 파일을 갖는 것과 같은 꼴이다.
 */

/**
 * 홈이 담는 열 — 이름·학년 다음, 꺾쇠 앞.
 *
 * 도달·최근 접속은 관제소·리포트 센터와 **같은 열**이라 `roster-columns` 에서 가져다 쓴다.
 * 판정이 같다는 것은 `teacher-home.test` 가 이미 못박고 있다 —
 * 줄 배지가 상단 카드와 같은 `reachBadge()` 를 읽는지 검사한다.
 *
 * 「막힌 곳」만 홈 몫이다. 세는 곳(`stuckConceptLabel`)은 채점 허브와 같지만 **말이 다르다** —
 * 채점 허브는 「외 2개」까지 세어 붙이고 빈 자리를 「없음」이라 하는데, 홈은 개념 하나만 보이고
 * 빈 자리를 「아직 안 보여요」라고 말한다(아직 안 나타났을 뿐이라는 뜻). 그래서 열을 합치지 않는다.
 */
const attentionColumns: RosterColumn<MonitoredStudent>[] = [
  // 배지가 말하지 못하는 것 — 대화에서 막힌 자리
  { head: '막힌 곳', cell: s => <StuckCell student={s} /> },
  reachColumn,
  lastSeenColumn,
];

/** 머리글이 「막힌 곳」이라 칸에는 개념 이름만 남는다. 길면 칸 안에서 자른다. */
function StuckCell({ student: s }: { student: MonitoredStudent }) {
  const stuck = stuckConceptLabel(s);

  if (!stuck) return <span className="text-pullim-slate-400 text-2xs">아직 안 보여요</span>;
  return (
    <span className="text-pullim-slate-600 block max-w-[12rem] truncate text-2xs">{stuck}</span>
  );
}

export function AttentionRoster({ students }: { students: MonitoredStudent[] }) {
  return (
    <RosterTable
      label="먼저 볼 학생"
      minWidth="28rem"
      rows={students}
      rowKey={s => s.id}
      student={s => s}
      // 되돌아갈 곳을 넘긴다 — 없으면 학생 상세의 뒤로 가기가 관제소로 튄다.
      href={s => `/teacher/students/${s.id}?from=home`}
      columns={attentionColumns}
    />
  );
}
