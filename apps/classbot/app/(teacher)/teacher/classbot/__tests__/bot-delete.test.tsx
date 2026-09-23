/**
 * 교사 운영 메인(SCR-C-17) — 봇 카드 「더보기 → 봇 보관」과 되묻는 판.
 *
 * 여기서 재는 것은 **화면 안 상태로 도는 삭제**다. 봇 목록은 이제 정본
 * (`GET /classbot/me/bots`)이지만 **봇을 지우는 문은 정본에 없다** — 그래서 「지웠다」는
 * 여전히 「이 화면에서 걸러졌다」이고, 캐시에도 서버에도 쓰지 않는다.
 * 핵심은 **그 봇을 세던 자리가 전부 함께 줄어드는지**다 — 카드만 사라지고 상단 통계가
 * 그대로면 교사는 지워지지 않았다고 읽는다.
 *
 * **「낸 과제」는 이 거르기를 지나지 않는다 — 2026-09-18 에 뒤집힌 줄이다.** 종전에는
 * bot == class 라 지운 봇의 과제 묶음도 함께 내렸는데, 봇이 반에서 독립한 뒤로는 봇을
 * 지워도 그 반과 그 반의 과제가 그대로 있다. 지금 함께 내리면 **멀쩡히 살아 있는 반의
 * 과제를 없는 것처럼** 말하게 되고, 도착지 `/teacher/assignment` 의 「전체」와도 어긋난다.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TeacherClassbotPage from '../page';
import type { AssignmentSummaryDto, BotCardDto, BotDto } from '@/lib/api/classbot-dto';

/** 반이 둘이라 「붙은 학급」이 그 수만큼 줄어드는 걸 한 봇으로 볼 수 있다 */
const TARGET: BotDto = {
  id: 'bot_1', operatorId: 't1', name: '국어봇', subject: '국어', grade: '중3', tone: '친근',
  greeting: null, scope: 3, avatarEmoji: '📚', quickPrompts: [],
  isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: ['cls_1', 'cls_2'], createdAt: '', updatedAt: '',
};
const KEEP: BotDto = {
  id: 'bot_2', operatorId: 't1', name: '수학 도우미', subject: '수학', grade: '중2', tone: '차분',
  greeting: null, scope: 3, avatarEmoji: '🧮', quickPrompts: [],
  isPublished: false, publishedAt: null, state: 'active', archivedAt: null, classIds: ['cls_3'], createdAt: '', updatedAt: '',
};

const klass = (id: string, name: string, enrolledCount: number): BotCardDto => ({
  id, name, description: null, isActive: true, role: 'teacher',
  profile: {
    subject: '국어', grade: '중3', tone: '친근', greeting: '', scope: 3, avatarEmoji: '📚',
    quickPrompts: [], enrolledCount, isLive: false, currentLesson: null,
  },
});

/** 사용자가 정한 고정 문구 — 누가 말을 다듬으면 여기서 빨개진다 */
const WARNING =
  '반에서 사용 중인 봇은 먼저 모든 반에서 떼어야 해요. 보관하면 새 반에 붙이거나 설정을 고칠 수 없지만 기존 과제·대화 기록은 남고, 봇 관리의 보관함에서 다시 복구할 수 있어요.';

/* ── 훅 바꿔 끼우기 ─────────────────────────────────────────── */

let bots: BotDto[] = [];
const archiveMutate = jest.fn();
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBots: () => ({
    data: bots, isPending: false, isError: false, error: null, refetch: jest.fn(),
  }),
  useArchiveBot: () => ({ mutateAsync: archiveMutate, isPending: false }),
}));

/** 낸 과제는 정본(`GET /classbot/assignments?audience=teacher`)에서 온다 — 테스트마다 갈아 끼운다. */
let teacherAssignments: AssignmentSummaryDto[] = [];
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: teacherAssignments, isPending: false, isError: false, error: null }),
}));

let opsClasses: BotCardDto[] = [];
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({ data: opsClasses, isPending: false, isError: false, error: null }),
}));

const dispatchedFor = (classId: string, id: string): AssignmentSummaryDto => ({
  id, classId, title: `${id} 과제`, mode: 'practice', questionCount: 2,
  subject: '국어', grade: '중3', scope: '문법', chapterFrom: null, chapterTo: null,
  achievementCodes: null, difficulty: '중', dueLabel: '오늘 23:59', dDay: 0,
  dispatchStatus: 'sent', dispatchedAt: '2026-09-16T08:00:00.000Z', examTimeLimitMin: null, state: 'todo',
});

beforeEach(() => {
  bots = [TARGET, KEEP];
  teacherAssignments = [];
  opsClasses = [
    klass('cls_1', '중3 국어 A반', 9),
    klass('cls_2', '중3 국어 B반', 7),
    klass('cls_3', '중2 수학 A반', 18),
  ];
  archiveMutate.mockReset();
  archiveMutate.mockImplementation(async (botId: string) => {
    bots = bots.filter((bot) => bot.id !== botId);
  });
});

/**
 * 상단 통계 묶음 — 「붙은 학급」은 이 묶음에만 있다(카드 쪽은 「붙어 있는 학급」).
 * 「내 봇」·「낸 과제」는 아래 섹션 제목이기도 해서 화면 전체에서 찾으면 여럿이 걸린다.
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
 * 부분 문자열로 재면 헛돈다 — `toContain('0개')` 는 `10개`·`20개` 에도, `toContain('2건')` 은
 * `12건`·`22건` 에도 통과한다. 「지운 몫만큼, 정확히」를 재겠다는 이 파일에서 그건 뜻이 없다.
 * 앞에 숫자가 더 붙어 있으면 다른 값이라는 것만 못박으면 된다(뒤는 단위 글자가 막는다).
 */
function expectKpi(label: string, value: string) {
  expect(kpi(label)).toMatch(new RegExp(`(?<!\\d)${value}`));
}

/** 「더보기 → 봇 보관」으로 되묻는 판을 연다 */
function openDeleteDialog(botName: string) {
  const trigger = screen.getByRole('button', { name: `${botName} 더보기` });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('menuitem', { name: '봇 보관' }));
  return trigger;
}

it('카드의 나가는 길은 여전히 「더보기」 하나뿐이고, 그 안에 「봇 보관」이 있다', () => {
  render(<TeacherClassbotPage />);
  const card = screen.getByTestId(`bot-ops-card-${TARGET.id}`);
  // 카드 위에 삭제 버튼을 따로 깔지 않았다
  expect(within(card).queryByRole('button', { name: /삭제/ })).toBeNull();

  fireEvent.click(within(card).getByRole('button', { name: `${TARGET.name} 더보기` }));
  const menu = screen.getByRole('menu');
  expect(within(menu).getByRole('menuitem', { name: '봇 보관' })).toBeInTheDocument();
  // 종전 둘도 그대로다
  expect(within(menu).getByRole('menuitem', { name: '수정하기' })).toBeInTheDocument();
  expect(within(menu).getByRole('menuitem', { name: '과제 내기' })).toBeInTheDocument();
});

it('판이 열리면 정해진 문구가 그대로 뜬다 — 제목·본문·버튼 둘', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);

  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).getByText(WARNING)).toBeInTheDocument();
  expect(dialog).toHaveTextContent(`「${TARGET.name}」을 보관할까요?`);
  expect(within(dialog).getByRole('button', { name: '취소' })).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: '보관하기' })).toBeInTheDocument();
});

it('되묻는 판은 alertdialog 이고 제목·본문이 연결돼 있다', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);

  const dialog = screen.getByRole('alertdialog');
  expect(dialog).toHaveAttribute('role', 'alertdialog');

  const labelledBy = dialog.getAttribute('aria-labelledby');
  const describedBy = dialog.getAttribute('aria-describedby');
  expect(labelledBy).toBeTruthy();
  expect(describedBy).toBeTruthy();
  expect(document.getElementById(labelledBy!)).toHaveTextContent('보관할까요?');
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
it('열리면 포커스는 「취소」에 있다', async () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);

  const cancel = within(screen.getByRole('alertdialog'))
    .getByRole('button', { name: '취소' });
  await waitFor(() => expect(document.activeElement).toBe(cancel));
});

it('「취소」를 누르면 아무것도 보관되지 않고 포커스가 「더보기」로 돌아온다', async () => {
  render(<TeacherClassbotPage />);
  const before = kpi('내 봇');
  const trigger = openDeleteDialog(TARGET.name);

  fireEvent.click(screen.getByRole('button', { name: '취소' }));

  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.id}`)).toBeInTheDocument();
  expect(kpi('내 봇')).toBe(before);
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('Escape 로 닫아도 지워지지 않는다', () => {
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);

  fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.id}`)).toBeInTheDocument();
});

it('보관 요청이 진행 중이면 Escape로 확인판을 닫을 수 없다', async () => {
  archiveMutate.mockImplementationOnce(() => new Promise<void>(() => undefined));
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);
  fireEvent.click(screen.getByRole('button', { name: '보관하기' }));

  expect(await screen.findByRole('button', { name: '보관하는 중…' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});

it('「보관하기」를 누르면 카드와 상단 통계 두 칸이 함께 줄어든다', async () => {
  render(<TeacherClassbotPage />);

  expectKpi('내 봇', '2개');
  expectKpi('붙은 학급', '3개');

  openDeleteDialog(TARGET.name);
  fireEvent.click(screen.getByRole('button', { name: '보관하기' }));

  // 카드가 사라진다
  await waitFor(() => expect(screen.queryByTestId(`bot-ops-card-${TARGET.id}`)).toBeNull());
  expect(screen.getByTestId(`bot-ops-card-${KEEP.id}`)).toBeInTheDocument();

  // 그 봇을 세던 자리가 전부 함께 줄어든다 — 지운 봇 몫만큼, 정확히
  expectKpi('내 봇', '1개');
  expectKpi('붙은 학급', `${KEEP.classIds.length}개`);
});

it('「낸 과제」는 함께 줄지 않는다 — 봇을 보관해도 그 반과 그 반의 과제는 그대로다', async () => {
  teacherAssignments = [
    dispatchedFor('cls_1', 'as_kor_1'),
    dispatchedFor('cls_3', 'as_math_1'),
  ];
  render(<TeacherClassbotPage />);
  expectKpi('낸 과제', '2건');
  expect(screen.getByTestId('dispatched-group-cls_1')).toBeInTheDocument();

  openDeleteDialog(TARGET.name);
  fireEvent.click(screen.getByRole('button', { name: '보관하기' }));

  // 카드는 사라졌지만 그 반의 과제 묶음은 제 이름으로 그대로 선다
  await waitFor(() => expect(screen.queryByTestId(`bot-ops-card-${TARGET.id}`)).toBeNull());
  expectKpi('낸 과제', '2건');
  const group = screen.getByTestId('dispatched-group-cls_1');
  expect(within(group).getByRole('heading', { name: '중3 국어 A반' })).toBeInTheDocument();
  expect(within(group).getByText('as_kor_1 과제')).toBeInTheDocument();
});

it('봇을 전부 보관하면 헤더 CTA 가 사라지고 빈 상태의 「봇 만들기」만 남는다', async () => {
  render(<TeacherClassbotPage />);
  for (const bot of [TARGET, KEEP]) {
    openDeleteDialog(bot.name);
    fireEvent.click(screen.getByRole('button', { name: '보관하기' }));
    await waitFor(() => expect(screen.queryByTestId(`bot-ops-card-${bot.id}`)).toBeNull());
  }

  expect(screen.queryByRole('link', { name: '새 클래스봇' })).toBeNull();
  const list = screen.getByTestId('bot-ops-list');
  expect(within(list).getByText('아직 만든 봇이 없어요')).toBeInTheDocument();
  expect(within(list).getByRole('link', { name: '봇 만들기' })).toBeInTheDocument();
  expectKpi('내 봇', '0개');
  expectKpi('붙은 학급', '0개');
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
  openDeleteDialog(TARGET.name);

  const backdrop = document.querySelector('[data-slot="dialog-overlay"]')!;
  fireEvent.pointerDown(backdrop);
  fireEvent.mouseDown(backdrop);
  fireEvent.mouseUp(backdrop);
  fireEvent.click(backdrop);

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByTestId(`bot-ops-card-${TARGET.id}`)).toBeInTheDocument();
});

it('프리미티브 기본 X 버튼은 뜨지 않는다 — 판의 나가는 길은 「취소」 하나다', () => {
  // `showCloseButton={false}` 를 지키는 단정. 프리미티브의 sr 텍스트가 영어 `Close` 라
  // 되살아나면 이 판에서만 한국어 사이에 영어 이름이 하나 낀다.
  render(<TeacherClassbotPage />);
  openDeleteDialog(TARGET.name);

  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull();
  // 판 안의 버튼은 딱 둘 — 그만두기 · 삭제
  expect(within(dialog).getAllByRole('button')).toHaveLength(2);
});

it('메뉴의 「봇 보관」은 「판을 여는 항목」이라고 낭독기에 말한다', () => {
  // 옆 두 항목은 링크라 저절로 갈리지만 이 항목만 겉보기가 같고 하는 일이 다르다.
  render(<TeacherClassbotPage />);
  fireEvent.click(screen.getByRole('button', { name: `${TARGET.name} 더보기` }));

  expect(screen.getByRole('menuitem', { name: '봇 보관' }))
    .toHaveAttribute('aria-haspopup', 'dialog');
});

it('보관하면 포커스가 「내 봇」 목록으로 옮겨가고, 보관 사실이 낭독기에 뜬다', async () => {
  // 포커스 이동(rAF)·`role="status"` 알림 둘 다 이 PR 이 새로 지은 동작이라 재는 곳이
  // 여기뿐이다. 순서도 함께 잰다 — 알림은 포커스가 자리를 잡은 **뒤**에 실린다.
  render(<TeacherClassbotPage />);
  const list = screen.getByTestId('bot-ops-list');
  // 이름 없는 곳으로 포커스를 던지면 도착해도 낭독기가 부를 말이 없다
  expect(list).toHaveAttribute('aria-label', '내 봇');
  expect(screen.getByRole('status')).toHaveTextContent('');

  openDeleteDialog(TARGET.name);
  fireEvent.click(screen.getByRole('button', { name: '보관하기' }));

  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  await waitFor(() => expect(document.activeElement).toBe(list));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(`${TARGET.name}을 보관했어요.`),
  );
});
