/**
 * 받은 과제 목록이 **제출에 대해 무엇을 말하는가** — 서버가 말해 준 것만 센다(pullim-api #681).
 *
 * 여기서 못박는 것:
 *  1. 모든 행이 「모른다」면(#681 배포 전 서버) **제출 요약 바를 아예 그리지 않는다** — 0 을 세우면
 *     「다 안 냈다」로 읽힌다. 카드의 진척 막대·`N/N` 도 같은 이유로 안 선다.
 *  2. 전부 알면 「냈어요 / 아직이에요」가 서고, 두 수의 합이 머리줄의 건수와 맞는다.
 *  3. 한 줄이라도 모르면 다시 안 그린다 — 합이 어긋난 수는 「나머지는 안 냈다」로 읽힌다.
 *  4. 낸 과제의 칩은 「완료」, 서버가 안 냈다고 한 과제는 「시작 전」이다(「진행 중」은 모를 때만).
 */

import { render, screen } from '@testing-library/react';
import StudentAssignmentListPage from '../page';
import type { AssignmentReadRow } from '@/hooks/api/read/types';

jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyRooms: () => ({
    rooms: [{ bot: { id: 'cls_1', name: '수학이 형', subject: '수학' }, enrollment: {}, source: 'api' }],
    isLoading: false,
    isError: false,
    retry: jest.fn(),
  }),
}));

let rows: AssignmentReadRow[];
jest.mock('../use-assignment-reads', () => ({
  ...jest.requireActual('../use-assignment-reads'),
  useVisibleAssignments: () => ({
    data: { assignments: rows },
    isLoading: false,
    isUnauthenticated: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

/** 한 행 — 세 칸만 갈아 끼운다. `completedCount` 는 매핑 규칙대로 `submitted` 의 투영이다. */
function rowWith(id: string, submitted: boolean | null): AssignmentReadRow {
  return {
    id,
    botId: 'cls_1',
    studentId: null,
    title: `과제 ${id}`,
    scope: '3단원',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '',
    chapterTo: '',
    achievementCodes: [],
    questionCount: 10,
    difficulty: '중',
    mode: 'practice',
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '',
    assignedAtLabel: '2026-09-18 17:30',
    dueLabel: '9월 25일까지',
    dDay: 'D-5',
    completedCount: submitted === true ? 10 : 0,
    recentAccuracy: null,
    submitted,
    submittedAt: submitted === true ? '2026-09-19T00:00:00.000Z' : null,
    scorePercent: submitted === true ? 0 : null,
    state: 'todo',
    reasonHint: null,
    solveHref: `/classbot/assignment/${id}/solve?step=1`,
  };
}

it('전부 「모른다」면 제출 요약 바도 진척 막대도 안 그린다 — 0 은 「안 냈다」로 읽힌다', () => {
  rows = [rowWith('a1', null), rowWith('a2', null)];
  render(<StudentAssignmentListPage />);

  expect(screen.queryByText('냈어요')).not.toBeInTheDocument();
  expect(screen.queryByText('아직이에요')).not.toBeInTheDocument();
  expect(screen.queryByText('0/10')).not.toBeInTheDocument();
  expect(screen.queryByText('0/20문항')).not.toBeInTheDocument();
  // 과제 자체는 그대로 선다 — 사라지는 것은 제출을 읽어 그리던 것뿐이다.
  expect(screen.getByText('과제 a1')).toBeInTheDocument();
  expect(screen.getAllByText('진행 중')).toHaveLength(2);
});

it('전부 알면 「냈어요 / 아직이에요」가 서고 합이 머리줄 건수와 맞는다', () => {
  rows = [rowWith('a1', true), rowWith('a2', false), rowWith('a3', false)];
  render(<StudentAssignmentListPage />);

  expect(screen.getByText('냈어요')).toBeInTheDocument();
  expect(screen.getByText('1건')).toBeInTheDocument();
  expect(screen.getByText('아직이에요')).toBeInTheDocument();
  expect(screen.getByText('2건')).toBeInTheDocument();
  // 칩은 라벨로 상태를 말한다 — 낸 것은 완료, 안 낸 것은 시작 전. 「진행 중」은 모를 때만 선다.
  // 낸 카드에서 「완료」는 둘이다 — 마감 칩(`dDayLabel`)과 글자 라벨(`semanticLabel`)이 같은 말을 한다.
  expect(screen.getAllByText('완료')).toHaveLength(2);
  expect(screen.getAllByText('시작 전')).toHaveLength(2);
  expect(screen.queryByText('진행 중')).not.toBeInTheDocument();
});

it('한 줄이라도 모르면 다시 안 그린다 — 합이 어긋난 수는 거짓말이 된다', () => {
  rows = [rowWith('a1', true), rowWith('a2', null)];
  render(<StudentAssignmentListPage />);

  expect(screen.queryByText('냈어요')).not.toBeInTheDocument();
  expect(screen.queryByText('아직이에요')).not.toBeInTheDocument();
});
