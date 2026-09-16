/**
 * 교사 운영 메인(SCR-C-17) — 봇 카드 「더보기 → 봇 삭제」와 되묻는 판.
 *
 * 여기서 재는 것은 **화면 안 상태로 도는 삭제**다. 이 화면의 봇 목록은 mock
 * (`lib/mock/classbot-teacher-ops`)이고, 이 PR 은 DB·API 를 건드리지 않는다.
 * 그래서 「지웠다」는 곧 「이 화면에서 걸러졌다」이며, **그 봇을 세던 자리가 전부 함께
 * 줄어드는지**가 이 파일의 핵심이다 — 카드만 사라지고 상단 통계가 그대로면,
 * 교사는 지워지지 않았다고 읽는다.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeacherClassbotPage from '../page';
import type { AssignmentSummaryDto } from '@/lib/api/classbot-dto';
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

/**
 * 낸 과제는 정본(`GET /classbot/assignments?audience=teacher`)에서 온다(FE PR 6) — 테스트마다 갈아 끼운다.
 * bot == class 라 `classId` 에 봇 id 를 넣으면 그 봇의 과제다.
 */
let teacherAssignments: AssignmentSummaryDto[] = [];
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: teacherAssignments, isPending: false, isError: false, error: null }),
}));
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({ data: [], isPending: false, isError: false, error: null }),
}));

const dispatchedFor = (classId: string, id: string): AssignmentSummaryDto => ({
  id, classId, title: `${id} 과제`, mode: 'practice', questionCount: 2,
  subject: '국어', grade: '중3', scope: '문법', chapterFrom: null, chapterTo: null,
  achievementCodes: null, difficulty: '중', dueLabel: '오늘 23:59', dDay: 0,
  dispatchStatus: 'sent', dispatchedAt: '2026-09-16T08:00:00.000Z', examTimeLimitMin: null, state: 'todo',
});

beforeEach(() => {
  teacherAssignments = [];
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

/**
 * 상단 통계 한 칸을 **경계까지** 잰다.
 * 부분 문자열로 재면 헛돈다 — `toContain('0명')` 은 `10명`·`20명` 에도, `toContain('2건')` 은
 * `12건`·`22건` 에도 통과한다. 「지운 몫만큼, 정확히」를 재겠다는 이 파일에서 그건 뜻이 없다.
 * 앞에 숫자가 더 붙어 있으면 다른 값이라는 것만 못박으면 된다(뒤는 단위 글자가 막는다).
 */
function expectKpi(label: string, value: string) {
  expect(kpi(label)).toMatch(new RegExp(`(?<!\\d)${value}`));
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
/*
  위험한 쪽에 포커스가 먼저 가면 엔터 한 번에 지워진다.
  이 단정이 지키는 것은 **결과**(그만두기에 선다)이지 `initialFocus` prop 이 아니다 —
  base-ui 기본값이 「첫 tabbable」이고 DOM 순서상 그게 마침 「그만두기」라, prop 을 빼도
  초록이다(돌연변이로 확인했다). 두 버튼의 DOM 순서를 뒤집으면 prop 이 있는 쪽만 살아남는다.
  같은 이유로 `finalFocus` 도 prop 자체는 잴 수 없다(그쪽은 아래 「그만두기」 테스트가
  결과를 잰다). 두 prop 의 존재 이유는 컴포넌트 머리주석에 적어 뒀다.
*/
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
  expectKpi('운영 중', `${before.runningCount}/${before.botCount}개`);
  expectKpi('붙은 학급', `${before.classroomCount}개`);
  expectKpi('등록 학생', `${before.studentCount}명`);

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

  expectKpi('운영 중', `${after.runningCount}/${after.botCount}개`);
  expectKpi('붙은 학급', `${after.classroomCount}개`);
  expectKpi('등록 학생', `${after.studentCount}명`);
});

it('「낸 과제」도 함께 줄어든다 — 지운 봇의 과제 묶음이 남지 않는다', () => {
  teacherAssignments = [
    dispatchedFor(TARGET.bot.id, 'as_del_1'),
    dispatchedFor(REST[0].bot.id, 'as_keep_1'),
  ];
  render(<TeacherClassbotPage />);
  expectKpi('낸 과제', '2건');
  expect(screen.getByTestId(`dispatched-group-${TARGET.bot.id}`)).toBeInTheDocument();

  openDeleteDialog(TARGET.bot.name);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.bot.name} 삭제` }));

  expectKpi('낸 과제', '1건');
  // 「반 목록에 없는 반」 묶음으로 되살아나서도 안 된다
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
  expectKpi('운영 중', '0/0개');
  expectKpi('등록 학생', '0명');
});

/*
  ─── 여기부터: 되묻는 판이 지키기로 한 접근성 약속들 ──────────────────────────
  아래 넷은 「동작은 하는데 재는 곳이 없던」 자리다. prop 하나를 지워도 파일이 초록으로
  남으면, 다음 사람이 그 prop 을 군더더기로 읽고 걷어낸다. 각 단정 옆에 어느 prop 을
  지키는지 적어 둔다. (넷 다 돌연변이로 빨개지는 것을 확인했다.)
*/

it('바깥을 눌러도 안 닫힌다 — 되돌릴 수 없는 일을 묻는 판이라 잘못 눌러 닫히면 안 된다', () => {
  // `<Dialog disablePointerDismissal>` 을 지키는 단정 (base-ui `AlertDialog` 가 세우는 값과 같다)
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  const backdrop = document.querySelector('[data-slot="dialog-overlay"]')!;
  fireEvent.pointerDown(backdrop);
  fireEvent.mouseDown(backdrop);
  fireEvent.mouseUp(backdrop);
  fireEvent.click(backdrop);

  expect(screen.getByTestId('bot-delete-dialog')).toBeInTheDocument();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.bot.id}`)).toBeInTheDocument();
});

it('프리미티브 기본 X 버튼은 뜨지 않는다 — 판의 나가는 길은 「그만두기」 하나다', () => {
  // `showCloseButton={false}` 를 지키는 단정. 프리미티브의 sr 텍스트가 영어 `Close` 라
  // 되살아나면 이 판에서만 한국어 사이에 영어 이름이 하나 낀다.
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.bot.name);

  const dialog = screen.getByTestId('bot-delete-dialog');
  expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
  // 판 안의 버튼은 딱 둘 — 그만두기 · 삭제
  expect(within(dialog).getAllByRole('button')).toHaveLength(2);
});

it('메뉴의 「봇 삭제」는 「판을 여는 항목」이라고 낭독기에 말한다', () => {
  // 옆 두 항목은 링크라 저절로 갈리지만 이 항목만 겉보기가 같고 하는 일이 다르다.
  render(<TeacherClassbotPage />);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.bot.name} 더보기` }));

  expect(screen.getByRole('menuitem', { name: '봇 삭제' }))
    .toHaveAttribute('aria-haspopup', 'dialog');
});

it('삭제하면 포커스가 「내 봇」 목록으로 옮겨가고, 지운 사실이 낭독기에 뜬다', async () => {
  // 포커스 이동(rAF)·`role="status"` 알림 둘 다 이 PR 이 새로 지은 동작이라 재는 곳이
  // 여기뿐이다. 순서도 함께 잰다 — 알림은 포커스가 자리를 잡은 **뒤**에 실린다.
  render(<TeacherClassbotPage />);
  const list = screen.getByTestId('bot-ops-list');
  // 이름 없는 곳으로 포커스를 던지면 도착해도 낭독기가 부를 말이 없다
  expect(list).toHaveAttribute('aria-label', '내 봇');
  expect(screen.getByRole('status')).toHaveTextContent('');

  openDeleteDialog(TARGET.bot.name);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.bot.name} 삭제` }));

  /*
    아직은 비어 있어야 한다 — 알림이 카드가 사라지는 그 커밋에 함께 실리면, polite 발화와
    포커스 이동이 한 프레임 안에서 겹쳐 「…을 삭제했어요」가 잘린다. 이 줄이 그 순서를
    못박는다(먼저 포커스, 그 다음 알림).
  */
  expect(screen.getByRole('status')).toHaveTextContent('');

  await waitFor(() => expect(document.activeElement).toBe(list));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(`${TARGET.bot.name}을 삭제했어요.`),
  );
});

// 「낸 과제」의 초안 필터 테스트는 걷었다 — 정본 목록에는 초안이 없고(내는 순간 `sent`), 이 화면은 초안 스토어를 더 읽지 않는다(FE PR 6).
