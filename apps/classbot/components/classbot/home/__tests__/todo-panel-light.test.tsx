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

it('light=true — 할 일이 없어도 빈 상태 + [평소대로 보기]로 같은 날 해제 가능 (Codex #182 R2)', () => {
  const onExitLight = jest.fn();
  render(<TodoPanel incompleteAssignments={[]} liveBots={[]} light onExitLight={onExitLight} />);
  expect(screen.getByText(/다 따라잡았어요/)).toBeTruthy();
  // 빈 상태에서 해제 UI가 사라지면 low 신호+빈 할 일 조합에서 하루 동안 Light Day에 갇힌다.
  fireEvent.click(screen.getByRole('button', { name: '평소대로 보기' }));
  expect(onExitLight).toHaveBeenCalled();
});

it('light=true — 라이브 1개 + 가장 급한 과제 1개만, 나머지는 라이브 포함 접힘 (Codex #182 R1·R3)', () => {
  const liveBots = [
    { bot: { id: 'cb_001', name: '미적분 봇' }, enrollment: {} },
    { bot: { id: 'cb_002', name: '영어 봇' }, enrollment: {} },
  ] as unknown as Parameters<typeof TodoPanel>[0]['liveBots'];
  render(
    <TodoPanel incompleteAssignments={assignments} liveBots={liveBots} light onExitLight={() => {}} />,
  );
  expect(screen.getByText('미적분 봇')).toBeTruthy(); // 라이브는 시간 민감 — 1개는 노출
  expect(screen.queryByText('영어 봇')).toBeNull(); // 멀티 라이브도 접힘 — 패널이 가벼워야 함(R3)
  expect(screen.getByText('도함수 마무리')).toBeTruthy(); // 핵심 1개 = 가장 급한 incomplete(R1)
  expect(screen.queryByText('적분 예습')).toBeNull(); // 나머지 과제 접힘
  // 나머지 = 라이브 1 + 과제 1 = 2개, 펼치면 전체
  fireEvent.click(screen.getByRole('button', { name: /나머지 2개/ }));
  expect(screen.getByText('영어 봇')).toBeTruthy();
  expect(screen.getByText('적분 예습')).toBeTruthy();
});

it('light 해제 후 재진입 시 다시 접힌 상태로 시작한다 (Codex #182)', () => {
  const { rerender } = render(
    <TodoPanel incompleteAssignments={assignments} liveBots={[]} light onExitLight={() => {}} />,
  );
  fireEvent.click(screen.getByRole('button', { name: /나머지 1개/ })); // 펼침
  expect(screen.getByText('적분 예습')).toBeTruthy();

  rerender(<TodoPanel incompleteAssignments={assignments} liveBots={[]} />); // 평소대로 복귀
  rerender(
    <TodoPanel incompleteAssignments={assignments} liveBots={[]} light onExitLight={() => {}} />,
  ); // 같은 세션 재진입
  expect(screen.queryByText('적분 예습')).toBeNull(); // 다시 접힘으로 시작
});
