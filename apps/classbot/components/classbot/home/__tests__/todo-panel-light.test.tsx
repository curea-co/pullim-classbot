import { render, screen, fireEvent } from '@testing-library/react';
import { TodoPanel } from '../todo-panel';
import type { Assignment } from '@/lib/mock';

// light 모드 렌더 검증 — 데이터 불변, 렌더만 줄인다(spec §4·§8).
const a = (id: string, title: string, dDay: string) =>
  ({ id, title, dDay, solveHref: `/classbot/assignment/${id}` }) as unknown as Assignment;

const assignments = [a('as_1', '도함수 마무리', '오늘'), a('as_2', '적분 예습', 'D-3')];

it('light=false(기본) — 전체 목록을 그대로 렌더한다', () => {
  render(<TodoPanel incompleteAssignments={assignments} liveBots={[]} />);
  expect(screen.getByText('도함수 마무리')).toBeTruthy();
  expect(screen.getByText('적분 예습')).toBeTruthy();
});

it('light=true — 핵심 1개 + "나머지 N개 · 펼치기" + 부드러운 카피, 펼치면 전체', () => {
  render(
    <TodoPanel incompleteAssignments={assignments} liveBots={[]} light onExitLight={() => {}} />,
  );
  expect(screen.getByText('도함수 마무리')).toBeTruthy(); // 가장 급한 1개(오늘)
  expect(screen.queryByText('적분 예습')).toBeNull(); // 나머지는 접힘
  expect(screen.getByText(/오늘은 이것 하나만/)).toBeTruthy(); // 부드러운 카피

  fireEvent.click(screen.getByRole('button', { name: /나머지 1개/ }));
  expect(screen.getByText('적분 예습')).toBeTruthy(); // 펼치기 → 전체
});

it('light=true — [평소대로 보기] 클릭 시 onExitLight 호출', () => {
  const onExitLight = jest.fn();
  render(
    <TodoPanel incompleteAssignments={assignments} liveBots={[]} light onExitLight={onExitLight} />,
  );
  fireEvent.click(screen.getByRole('button', { name: '평소대로 보기' }));
  expect(onExitLight).toHaveBeenCalled();
});

it('light=true — 할 일이 없으면 기존 빈 상태 그대로', () => {
  render(<TodoPanel incompleteAssignments={[]} liveBots={[]} light onExitLight={() => {}} />);
  expect(screen.getByText(/다 따라잡았어요/)).toBeTruthy();
});
