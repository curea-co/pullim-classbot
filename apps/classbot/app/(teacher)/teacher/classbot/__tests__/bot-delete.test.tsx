/**
 * 교사 운영 메인(SCR-C-17) — 봇 카드 「더보기 → 봇 삭제」와 되묻는 판.
 *
 * 여기서 재는 것은 **화면 안 상태로 도는 삭제**다. 이 화면의 봇 목록은 mock
 * (`lib/mock/classbot-teacher-ops`)이고, 이 PR 은 DB·API 를 건드리지 않는다.
 * 그래서 「지웠다」는 곧 「이 화면에서 걸러졌다」이며, **그 봇을 세던 자리가 전부 함께
 * 줄어드는지**가 이 파일의 핵심이다 — 카드만 사라지고 상단 통계가 그대로면,
 * 교사는 지워지지 않았다고 읽는다.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeacherClassbotPage from '../page';
import { useAssignmentStore, type UserAssignment } from '@/lib/store/assignments';
import {
  getTeacherBotRows, getTeacherBotSummary,
} from '@/lib/mock/classbot-teacher-ops';

const ROWS = getTeacherBotRows();
/** 반이 둘이라 「붙은 학급」·「등록 학생」이 함께 줄어드는 걸 한 봇으로 볼 수 있다 */
const TARGET = ROWS.find(r => r.bot.id === 'cb_004')!;
const REST = ROWS.filter(r => r.bot.id !== TARGET.bot.id);

/** 사용자가 정한 고정 문구 — 누가 말을 다듬으면 여기서 빨개진다 */
const WARNING =
  '현재 이 봇으로 학습 중인 학생들이 있어요. 봇을 삭제하면 해당 학생은 봇을 이용할 수 없어요.';

const dispatchedFor = (botId: string, id: string): UserAssignment => ({
  id, botId, title: `${id} 과제`, mode: 'practice', questionCount: 2,
  subject: '국어', grade: '중3', scope: '문법', chapterFrom: '', chapterTo: '',
  achievementCodes: [], difficulty: 3, source: 'teacher-assigned', assignedBy: '국어봇',
  assignedAt: '방금 냈어요', dueLabel: '오늘 23:59', dDay: '오늘', completedCount: 0,
  state: 'todo',
} as unknown as UserAssignment);

beforeEach(() => {
  act(() => useAssignmentStore.setState({ dispatched: [], submissions: [] }));
});

/**
 * 상단 통계 묶음 — 「붙은 학급」은 이 묶음에만 있다(카드 쪽은 「붙어 있는 학급」).
 * 「운영 중」·「낸 과제」는 카드·섹션 제목에도 나와서 화면 전체에서 찾으면 여럿이 걸린다.
 */
function statBar() {
  return screen.getByText('붙은 학급').closest('ul')!;
}

/** 상단 통계 한 칸의 값 — KpiStat·KpiStatLink 둘 다 라벨과 값이 한 `<li>` 안에 있다 */
function kpi(label: string) {
  return within(statBar()).getByText(label).closest('li')!.textContent ?? '';
}

/** 「더보기 → 봇 삭제」로 되묻는 판을 연다 */
function openDeleteDialog(botName: string) {
  const trigger = screen.getByRole('button', { name: `${botName} 더보기` });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('menuitem', { name: '봇 삭제' }));
  return trigger;
}

it('카드의 나가는 길은 여전히 「더보기」 하나뿐이고, 그 안에 「봇 삭제」가 있다', () => {
  render(<TeacherClassbotPage />);
  const card = screen.getByTestId(`bot-ops-card-${TARGET.bot.id}`);
  // 카드 위에 삭제 버튼을 따로 깔지 않았다
  expect(within(card).queryByRole('button', { name: /삭제/ })).toBeNull();

  fireEvent.click(within(card).getByRole('button', { name: `${TARGET.bot.name} 더보기` }));
  const menu = screen.getByRole('menu');
  expect(within(menu).getByRole('menuitem', { name: '봇 삭제' })).toBeInTheDocument();
  // 종전 둘도 그대로다
  expect(within(menu).getByRole('menuitem', { name: '수정하기' })).toBeInTheDocument();
  expect(within(menu).getByRole('menuitem', { name: '과제 내기' })).toBeInTheDocument();
});

it('판이 열리면 정해진 문구가 그대로 뜬다 — 제목·본문·버튼 둘', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  const dialog = screen.getByTestId('bot-delete-dialog');
  expect(within(dialog).getByText(WARNING)).toBeInTheDocument();
  expect(dialog).toHaveTextContent(`${TARGET.bot.name}을 삭제할까요?`); // 국어봇 → 받침 있음
  expect(within(dialog).getByRole('button', { name: '그만두기' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: `${TARGET.bot.name} 삭제` })).toBeInTheDocument();
});

it('되묻는 판은 alertdialog 이고 제목·본문이 연결돼 있다', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  const dialog = screen.getByTestId('bot-delete-dialog');
  expect(dialog).toHaveAttribute('role', 'alertdialog');

  const labelledBy = dialog.getAttribute('aria-labelledby');
  const describedBy = dialog.getAttribute('aria-describedby');
  expect(labelledBy).toBeTruthy();
  expect(describedBy).toBeTruthy();
  expect(document.getElementById(labelledBy!)).toHaveTextContent('삭제할까요?');
  expect(document.getElementById(describedBy!)).toHaveTextContent(WARNING);
});

/*
  포커스 이동은 판이 뜬 **뒤** 한 틱 늦게 일어난다(base-ui 의 focus manager). 그래서
  이 둘만 `waitFor` 다 — 동기 단정으로 두면 늘 `body` 를 보고 빨개진다.
*/
// 위험한 쪽에 포커스가 먼저 가면 엔터 한 번에 지워진다.
it('열리면 포커스는 「그만두기」에 있다', async () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  const cancel = within(screen.getByTestId('bot-delete-dialog'))
    .getByRole('button', { name: '그만두기' });
  await waitFor(() => expect(document.activeElement).toBe(cancel));
});

it('「그만두기」를 누르면 아무것도 지워지지 않고 포커스가 「더보기」로 돌아온다', async () => {
  render(<TeacherClassbotPage />);
  const before = kpi('운영 중');
  const trigger = openDeleteDialog(TARGET.bot.name);

  fireEvent.click(screen.getByRole('button', { name: '그만두기' }));

  expect(screen.queryByTestId('bot-delete-dialog')).toBeNull();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.bot.id}`)).toBeInTheDocument();
  expect(kpi('운영 중')).toBe(before);
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('Escape 로 닫아도 지워지지 않는다', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  fireEvent.keyDown(screen.getByTestId('bot-delete-dialog'), { key: 'Escape' });

  expect(screen.queryByTestId('bot-delete-dialog')).toBeNull();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.bot.id}`)).toBeInTheDocument();
});

it('「삭제」를 누르면 카드와 상단 통계 넉 칸이 함께 줄어든다', () => {
  render(<TeacherClassbotPage />);

  const before = getTeacherBotSummary(ROWS);
  expect(kpi('운영 중')).toContain(`${before.runningCount}/${before.botCount}개`);
  expect(kpi('붙은 학급')).toContain(`${before.classroomCount}개`);
  expect(kpi('등록 학생')).toContain(`${before.studentCount}명`);

  openDeleteDialog(TARGET.bot.name);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.bot.name} 삭제` }));

  // 카드가 사라진다
  expect(screen.queryByTestId(`bot-ops-card-${TARGET.bot.id}`)).toBeNull();
  expect(screen.getByTestId(`bot-ops-card-${REST[0].bot.id}`)).toBeInTheDocument();

  // 그 봇을 세던 자리가 전부 함께 줄어든다 — 지운 봇 몫만큼, 정확히
  const after = getTeacherBotSummary(REST);
  expect(after.botCount).toBe(before.botCount - 1);
  expect(after.classroomCount).toBe(before.classroomCount - TARGET.ops.classrooms.length);
  expect(after.studentCount).toBe(before.studentCount - TARGET.studentCount);

  expect(kpi('운영 중')).toContain(`${after.runningCount}/${after.botCount}개`);
  expect(kpi('붙은 학급')).toContain(`${after.classroomCount}개`);
  expect(kpi('등록 학생')).toContain(`${after.studentCount}명`);
});

it('「낸 과제」도 함께 줄어든다 — 지운 봇의 과제 묶음이 남지 않는다', () => {
  act(() =>
    useAssignmentStore.setState({
      dispatched: [
        dispatchedFor(TARGET.bot.id, 'as_del_1'),
        dispatchedFor(REST[0].bot.id, 'as_keep_1'),
      ],
    }),
  );
  render(<TeacherClassbotPage />);
  expect(kpi('낸 과제')).toContain('2건');
  expect(screen.getByTestId(`dispatched-group-${TARGET.bot.id}`)).toBeInTheDocument();

  openDeleteDialog(TARGET.bot.name);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.bot.name} 삭제` }));

  expect(kpi('낸 과제')).toContain('1건');
  // 「봇 목록에 없는 봇」 묶음으로 되살아나서도 안 된다
  expect(screen.queryByTestId(`dispatched-group-${TARGET.bot.id}`)).toBeNull();
  expect(screen.queryByText('as_del_1 과제')).toBeNull();
  expect(screen.getByTestId(`dispatched-group-${REST[0].bot.id}`)).toBeInTheDocument();
});

it('봇을 전부 지우면 헤더 CTA 가 사라지고 빈 상태의 「봇 만들기」만 남는다', () => {
  render(<TeacherClassbotPage />);
  for (const row of ROWS) {
    openDeleteDialog(row.bot.name);
    fireEvent.click(screen.getByRole('button', { name: `${row.bot.name} 삭제` }));
  }

  expect(screen.queryByRole('link', { name: '새 클래스봇' })).toBeNull();
  const list = screen.getByTestId('bot-ops-list');
  expect(within(list).getByText('아직 만든 봇이 없어요')).toBeInTheDocument();
  expect(within(list).getByRole('link', { name: '봇 만들기' })).toBeInTheDocument();
  expect(kpi('운영 중')).toContain('0/0개');
  expect(kpi('등록 학생')).toContain('0명');
});
