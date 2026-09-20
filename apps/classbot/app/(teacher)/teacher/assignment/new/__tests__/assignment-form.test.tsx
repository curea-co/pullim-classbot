/**
 * 출제 폼 — 정본 한 요청으로 내는지(FE PR 6).
 *
 * 폼은 **정본을 본다** — 고르는 반은 `useOperatorClasses`(`hooks/api/classroom.ts` · `GET /classbot/bots?role=teacher`)이고,
 * 내기는 `useDispatchAssignment`(`POST /classbot/classes/:id/assignments`)에 문항까지 실어 나간다. 여기서 확인하려는 것은
 * 그 두 훅의 동작이 아니라 **폼의 규칙과 본문 모양**이라, 훅은 mock 으로 세우고 `mutateAsync` 가 받은 인자를 본다.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { AssignmentForm, toLocalDatetimeInput } from '../assignment-form';
import type { BotCardDto, ClassDto, DispatchAssignmentBody } from '@/lib/api/classbot-dto';

/**
 * 정본 반 카드(pullim-api #679 이후) — 봇이 붙은 반과 안 붙은 반.
 *
 * **`name`(봇 이름)과 `className`(반 이름)에 다른 글자를 넣는다.** 둘에 같은 글자를 넣으면 반 고르기
 * 드롭다운이 어느 칸을 읽든 통과해서, 이 파일이 잠그려는 「교사가 어느 반에 내는지 알 수 있다」가
 * 하중을 하나도 안 받는다. 봇이 안 붙은 반(`botId: null` · `profile: null`)은 서버가 `name` 도 반 이름으로
 * 떨어뜨리므로 둘이 같은 것이 정상이다.
 */
const CLASS_A: BotCardDto = {
  id: 'cls_a', botId: 'bot_math', name: '수학 도우미', className: '고2 미적분 A반',
  description: null, isActive: true, role: 'teacher',
  profile: {
    subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '🤖',
    quickPrompts: [], enrolledCount: 12, isLive: false, currentLesson: null,
  },
};
const CLASS_B: BotCardDto = {
  id: 'cls_b', botId: null, name: '중3 국어 B반', className: '중3 국어 B반',
  description: null, isActive: true, role: 'teacher', profile: null,
};

/**
 * 반 상세(`GET /classbot/classes/:classId` · `useClassDetail`) — **반이 스스로 든 과목·학년**이 여기 있다(ADR-092).
 * 카드의 `profile` 은 붙은 봇에서 오므로 봇이 없으면 비고, 그때 과제 내기가 이 문을 읽어 메운다.
 * @param over - 이 테스트가 정할 칸(대개 `subject`·`grade`)
 */
function classDto(over: Partial<ClassDto> = {}): ClassDto {
  return {
    id: 'cls_b', operatorId: 'teacher_1', orgId: null, name: '중3 국어 B반', description: null,
    subject: null, grade: null, isActive: true, bot: null, joinCode: null,
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

const mutateAsync = jest.fn();
const push = jest.fn();

type QueryState<T> = { data: T | undefined; isPending: boolean; isSuccess: boolean; isError: boolean; error: unknown };
/** `useClassDetail` 이 돌려주는 모양 — 자동 채움이 오는 중인지(`isLoading`) 폼이 본다. */
type DetailState = QueryState<ClassDto> & { isLoading: boolean };

const IDLE_DETAIL: DetailState = {
  data: undefined, isPending: true, isLoading: false, isSuccess: false, isError: false, error: null,
};

const queries: { classes: QueryState<BotCardDto[]>; classDetail: DetailState } = {
  classes: { data: [CLASS_A, CLASS_B], isPending: false, isSuccess: true, isError: false, error: null },
  classDetail: IDLE_DETAIL,
};

jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => queries.classes,
  useClassDetail: () => queries.classDetail,
}));

jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useDispatchAssignment: () => ({ mutateAsync, isPending: false, isError: false, error: null }),
}));

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({ push, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: (...args: unknown[]) => toastError(...args) },
}));

beforeEach(() => {
  mutateAsync.mockReset();
  push.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  mutateAsync.mockImplementation(async ({ body }: { body: DispatchAssignmentBody }) => ({
    id: 'asg_1', classId: 'cls_a', title: body.title, dueLabel: body.dueLabel,
  }));
  queries.classes = { data: [CLASS_A, CLASS_B], isPending: false, isSuccess: true, isError: false, error: null };
  queries.classDetail = IDLE_DETAIL;
});

/** 내기 — 서버 응답을 기다린 뒤에야 이동한다. */
async function clickDispatch() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('dispatch-btn'));
  });
}

function fillTitle() {
  fireEvent.change(screen.getByTestId('title-input'), { target: { value: '배점 규칙 확인 과제' } });
}

/** 기본 5문항(mc·mc·short·numeric·essay)의 발문·정답·기준을 전부 채운다 — 정본이 요구하는 최소치. */
function authorAllDefaults() {
  for (let i = 0; i < 5; i++) {
    fireEvent.change(screen.getByTestId(`question-prompt-${i}`), { target: { value: `${i + 1}번 발문` } });
  }
  fireEvent.change(screen.getByTestId('question-option-0-0'), { target: { value: '그대로' } });
  fireEvent.change(screen.getByTestId('question-option-0-1'), { target: { value: '오른다' } });
  fireEvent.change(screen.getByTestId('question-option-1-0'), { target: { value: '참' } });
  fireEvent.change(screen.getByTestId('question-option-1-1'), { target: { value: '거짓' } });
  fireEvent.change(screen.getByTestId('question-answer-2'), { target: { value: '증발' } });
  fireEvent.change(screen.getByTestId('question-answer-3'), { target: { value: '42' } });
  fireEvent.change(screen.getByTestId('question-criterion-4-0'), { target: { value: '근거를 썼어요' } });
  fireEvent.change(screen.getByTestId('question-criterion-4-1'), { target: { value: '결론이 있어요' } });
}

/** 마지막 `mutateAsync` 호출의 본문. */
function sentBody(): DispatchAssignmentBody {
  return (mutateAsync.mock.calls[0][0] as { body: DispatchAssignmentBody }).body;
}

/* ── 정본이 요구하는 것 — 발문 전부·정답 ─────────────────────────────────── */

it('발문이 비어 있으면 낼 수 없다 — 정본은 문항마다 발문을 요구하고 자동 추출 폴백은 없다', () => {
  render(<AssignmentForm />);
  fillTitle();
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('모든 문항의 발문을 써야');
});

it('배점 합계가 100이 아니면 내기를 막고 이유를 보여 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '10' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('90/100점');
});

it('문항 더하기·점수 자동 분배로 다시 100점을 맞출 수 있다', () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('question-add')); // 6문항 · 100점 → 배점 0 인 문항 추가
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();

  fireEvent.click(screen.getByTestId('question-even-split'));
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
});

it('발문을 다 썼는데 자동 채점 문항 정답이 비면 내기를 막고 문항 번호를 알려 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  for (let i = 4; i >= 0; i--) {
    if (i === 2) continue; // 3번(단답)만 남긴다
    fireEvent.click(screen.getByRole('button', { name: `${i + 1}번 문항 지우기` }));
  }
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '100' } });
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('1번 문항 정답');

  fireEvent.change(screen.getByTestId('question-answer-0'), { target: { value: '그대로' } });
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

it('수치 문항 정답이 숫자가 아니면 막는다 — 서버가 number 로 받는다', () => {
  render(<AssignmentForm />);
  fillTitle();
  authorAllDefaults();
  fireEvent.change(screen.getByTestId('question-answer-3'), { target: { value: '마흔둘' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('4번 수치 문항 정답은 숫자');
});

/* ── 본문 모양 — 정본 DTO 그대로 ─────────────────────────────────────────── */

it('문항까지 한 요청으로 낸다 — 반 id 를 경로에, 문항은 서버 DTO 모양으로', async () => {
  render(<AssignmentForm />);
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  expect(mutateAsync).toHaveBeenCalledTimes(1);
  const { classId } = mutateAsync.mock.calls[0][0] as { classId: string };
  expect(classId).toBe('cls_a');

  const body = sentBody();
  expect(body).toMatchObject({
    title: '배점 규칙 확인 과제',
    subject: '수학Ⅱ',
    grade: '고2',
    mode: 'practice',
    difficulty: '중',
    questionCount: 5,
    state: 'todo',
    // 반 전체 — 학생을 골라 내는 길은 정본 명단이 붙으면 열린다.
    targetStudentIds: [],
    examTimeLimitMin: null,
  });
  expect(body.questions).toHaveLength(5);
  expect(body.questions.map((q) => q.order)).toEqual([0, 1, 2, 3, 4]);
  expect(body.questions[0]).toEqual({ order: 0, type: 'mc', prompt: '1번 발문', options: ['그대로', '오른다'], answerKey: 0 });
  expect(body.questions[2]).toEqual({ order: 2, type: 'short', prompt: '3번 발문', answerKey: '증발' });
  expect(body.questions[3]).toEqual({ order: 3, type: 'numeric', prompt: '4번 발문', answerKey: 42 });
  expect(body.questions[4]).toEqual({ order: 4, type: 'essay', prompt: '5번 발문' });
  // 정본에 칸이 없는 것은 보내지 않는다 — 배점·루브릭·봇 한 마디·마감 시각.
  expect(body).not.toHaveProperty('reasonHint');
  expect(body).not.toHaveProperty('dueAt');
  expect(body.questions.some((q) => 'points' in q || 'rubric' in q)).toBe(false);
});

it('dDay 는 정수로, dueLabel 은 표시 문자열로 함께 간다 — 서버는 둘 다 그대로 저장한다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  const body = sentBody();
  expect(Number.isInteger(body.dDay)).toBe(true);
  expect(body.dDay).toBe(1); // 기본 마감이 내일 22:00 이다
  expect(typeof body.dueLabel).toBe('string');
  expect(body.dueLabel).not.toBe('');
});

it('시험 과제는 제한 시간이 실리고(10~180), 연습은 null 이다', async () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('mode-exam'));
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  const body = sentBody();
  expect(body.mode).toBe('exam');
  const limit = body.examTimeLimitMin as number;
  expect(Number.isInteger(limit)).toBe(true);
  expect(limit).toBeGreaterThanOrEqual(10);
  expect(limit).toBeLessThanOrEqual(180);
});

it('낸 뒤에는 낸 과제 목록으로 가고, 반 이름으로 성공을 말한다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  expect(push).toHaveBeenCalledWith('/teacher/assignment');
  expect(toastSuccess.mock.calls[0][0]).toContain('고2 미적분 A반');
  expect(toastSuccess.mock.calls[0][0]).toContain('반 전체');
});

it('서버가 거절하면 이동하지 않고 그 문구를 보여 준다', async () => {
  mutateAsync.mockRejectedValueOnce(new Error('questions 는 최소 1개 이상이어야 합니다.'));
  render(<AssignmentForm />);
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  expect(push).not.toHaveBeenCalled();
  expect(toastError).toHaveBeenCalledWith('questions 는 최소 1개 이상이어야 합니다.');
});

/* ── 반 고르기 ───────────────────────────────────────────────────────────── */

/** 드롭다운 선택지의 글자 — 반 이름 + 과목·학년 + 인원이 한 줄에 붙는다. */
const optionTexts = () =>
  Array.from((screen.getByTestId('class-select') as HTMLSelectElement).options).map(
    (o) => o.textContent ?? '',
  );

/*
  드롭다운은 **어느 반에 과제를 내는지 고르는 자리**다. 여기서 두 반을 구분 못 하면 그건 표시 회귀가
  아니라 **오배포**다 — 아래 두 검사가 그것을 잠근다.
*/
it('선택지는 반 이름으로 선다 — 봇 이름이 그 자리를 덮지 않는다', () => {
  render(<AssignmentForm />);

  expect(optionTexts()[0]).toContain('고2 미적분 A반');
  // 봇 이름(`card.name`)은 선택지에 한 글자도 오지 않는다.
  expect(optionTexts().join('|')).not.toContain('수학 도우미');
});

it('같은 봇을 건 두 반도 서로 다른 선택지다 — 과목·학년까지 같아 이름 말고는 갈릴 것이 없다', () => {
  // ADR-092 로 한 봇이 여러 반을 섬긴다. 그 두 반은 `name`·`profile` 이 **같은 `bots` 행**에서 온다.
  const shared = CLASS_A.profile;
  queries.classes = {
    data: [
      { ...CLASS_A, id: 'cls_1', className: '중2 수학 A반', profile: shared },
      { ...CLASS_A, id: 'cls_2', className: '중2 수학 B반', profile: shared },
    ],
    isPending: false, isSuccess: true, isError: false, error: null,
  };
  render(<AssignmentForm />);

  const [first, second] = optionTexts();
  expect(first).toContain('중2 수학 A반');
  expect(second).toContain('중2 수학 B반');
  // 붙는 과목·학년·인원이 똑같으므로, 이름이 갈리지 않으면 두 줄이 **완전히 같은 글자**가 된다.
  expect(first).not.toBe(second);
});

it('`className` 이 없는 옛 응답(#679 배포 전)은 `name` 으로 떨어진다 — 지금과 같게 동작한다', () => {
  // 폴백이 있어서 이 FE 를 BE 보다 먼저 머지해도 된다(`classNameOf` 머리주석).
  queries.classes = {
    data: [{ id: 'cls_a', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher', profile: null }],
    isPending: false, isSuccess: true, isError: false, error: null,
  };
  render(<AssignmentForm />);

  expect(optionTexts()[0]).toContain('고2 미적분 A반');
});

it('?classId 로 들어오면 그 반이 골라져 있다 — 반 상세에서 진입한 그 반', () => {
  render(<AssignmentForm initialClassId="cls_b" />);
  expect((screen.getByTestId('class-select') as HTMLSelectElement).value).toBe('cls_b');
});

it('모르는 classId 면 첫 반으로 연다 — 없는 반을 고른 척하지 않는다', () => {
  render(<AssignmentForm initialClassId="cls_nope" />);
  expect((screen.getByTestId('class-select') as HTMLSelectElement).value).toBe('cls_a');
});

/* ── 과목·학년 — 봇 → 반 → 교사 ─────────────────────────────────────────── */

/*
  2026-09-18 dev 에 `subject:"과목 미정"` · `grade:"학년 미정"` 이 그대로 저장돼 있었다. 그 두 글자는 어디에도
  없던 값이고, 화면에 칸이 없어 교사가 고칠 수도 없었다. 아래 다섯이 그 자리를 잠근다 —
  **지어낸 값을 보내지 않는다 · 반이 든 값을 읽는다 · 그래도 비면 교사에게 묻는다.**
*/

it('봇이 안 붙은 반은 반이 든 과목·학년으로 채운다 — 「미정」을 지어내지 않는다', async () => {
  // 카드의 `profile` 은 null(봇 없음)이고, 반 자체는 `classes.subject`·`grade` 를 든다(ADR-092).
  queries.classDetail = { ...IDLE_DETAIL, data: classDto({ subject: '국어', grade: '중3' }), isPending: false, isSuccess: true };
  render(<AssignmentForm initialClassId="cls_b" />);
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  const body = sentBody();
  expect(body.subject).toBe('국어');
  expect(body.grade).toBe('중3');
});

it('봇에 적힌 과목·학년이 먼저다 — 반이 다른 값을 들고 있어도 지금 나가던 값이 안 바뀐다', async () => {
  queries.classDetail = {
    ...IDLE_DETAIL,
    data: classDto({ id: 'cls_a', subject: '반이 든 과목', grade: '반이 든 학년' }),
    isPending: false, isSuccess: true,
  };
  render(<AssignmentForm initialClassId="cls_a" />); // CLASS_A.profile = 수학Ⅱ · 고2
  fillTitle();
  authorAllDefaults();
  await clickDispatch();

  const body = sentBody();
  expect(body.subject).toBe('수학Ⅱ');
  expect(body.grade).toBe('고2');
});

it('반에도 봇에도 안 적혀 있으면 내기를 막는다 — 빈 칸을 지어낸 글자로 메우지 않는다', () => {
  queries.classDetail = { ...IDLE_DETAIL, data: classDto(), isPending: false, isSuccess: true }; // subject·grade 둘 다 null
  render(<AssignmentForm initialClassId="cls_b" />);
  fillTitle();
  authorAllDefaults();

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('subject-err')).toBeInTheDocument();
  expect(screen.getByTestId('grade-err')).toBeInTheDocument();
  expect((screen.getByTestId('subject-input') as HTMLInputElement).value).toBe('');
});

it('교사가 적으면 그 글자가 그대로 나간다 — 비어 있던 칸을 교사가 채울 수 있다', async () => {
  queries.classDetail = { ...IDLE_DETAIL, data: classDto(), isPending: false, isSuccess: true };
  render(<AssignmentForm initialClassId="cls_b" />);
  fillTitle();
  authorAllDefaults();
  fireEvent.change(screen.getByTestId('subject-input'), { target: { value: '국어' } });
  fireEvent.change(screen.getByTestId('grade-input'), { target: { value: '중3' } });

  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
  await clickDispatch();

  const body = sentBody();
  expect(body.subject).toBe('국어');
  expect(body.grade).toBe('중3');
});

it('반을 바꾸면 앞 반에 맞춰 적은 과목이 따라가지 않는다', () => {
  queries.classDetail = { ...IDLE_DETAIL, data: classDto(), isPending: false, isSuccess: true };
  render(<AssignmentForm initialClassId="cls_b" />);
  fireEvent.change(screen.getByTestId('subject-input'), { target: { value: '손으로 적은 과목' } });
  expect((screen.getByTestId('subject-input') as HTMLInputElement).value).toBe('손으로 적은 과목');

  fireEvent.change(screen.getByTestId('class-select'), { target: { value: 'cls_a' } });
  // cls_a 는 봇이 과목을 든 반 — 자동 채움으로 되돌아간다.
  expect((screen.getByTestId('subject-input') as HTMLInputElement).value).toBe('수학Ⅱ');
});

it('반 상세를 아직 읽는 중이면 빈 칸을 잘못이라고 말하지 않는다 — 다만 낼 수도 없다', () => {
  queries.classDetail = { ...IDLE_DETAIL, isLoading: true };
  render(<AssignmentForm initialClassId="cls_b" />);
  fillTitle();
  authorAllDefaults();

  expect(screen.queryByTestId('subject-err')).toBeNull();
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
});

it('반 목록이 아직 안 왔으면 과목 칸을 잘못이라고 말하지 않는다 — 고를 반이 없어 빈 것뿐이다', () => {
  queries.classes = { data: undefined, isPending: true, isSuccess: false, isError: false, error: null };
  render(<AssignmentForm />);

  expect(screen.queryByTestId('subject-err')).toBeNull();
  expect(screen.queryByTestId('grade-err')).toBeNull();
});

it('운영하는 반이 하나도 없어도 과목 칸이 빨개지지 않는다 — 빈 상태 카드가 이미 이유를 말한다', () => {
  queries.classes = { data: [], isPending: false, isSuccess: true, isError: false, error: null };
  render(<AssignmentForm />);

  expect(screen.getByTestId('rooms-empty')).toBeInTheDocument();
  expect(screen.queryByTestId('subject-err')).toBeNull();
});

it('운영하는 반이 없으면 낼 곳이 없다고 말하고 내 수업방으로 보낸다', () => {
  queries.classes = { data: [], isPending: false, isSuccess: true, isError: false, error: null };
  render(<AssignmentForm />);
  expect(screen.getByTestId('rooms-empty')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /내 수업방으로/ })).toHaveAttribute('href', '/teacher/classroom');
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
});

it('반 목록을 못 읽으면 오류 카드를 띄운다 — 401 은 이미 로그인으로 갔다', () => {
  queries.classes = { data: undefined, isPending: false, isSuccess: false, isError: true, error: new Error('서버가 응답하지 않아요.') };
  render(<AssignmentForm />);
  expect(screen.getByTestId('rooms-error')).toHaveTextContent('서버가 응답하지 않아요.');
});

/* ── 문항 수 상한 (spec 14 §5.1) ─────────────────────────────────────────── */

function addQuestions(times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByTestId('question-add'));
}

it('연습 과제는 50문항이 상한 — 상한에 닿으면 「문항 더하기」가 잠긴다', () => {
  render(<AssignmentForm />);
  addQuestions(45); // 기본 5문항 + 45 = 50
  expect(screen.getByTestId('question-count').textContent).toContain('50/50문항');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

it('시험 과제는 60문항이 상한 — 모드마다 상한이 다르다', () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('mode-exam'));
  expect(screen.getByTestId('question-count').textContent).toContain('5/60문항');

  addQuestions(55); // 5 + 55 = 60
  expect(screen.getByTestId('question-count').textContent).toContain('60/60문항');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

it('시험에서 51문항을 만든 뒤 연습으로 되돌리면 상한 초과라 내기를 막는다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.click(screen.getByTestId('mode-exam'));
  addQuestions(46); // 5 + 46 = 51 — 시험 상한(60) 안이라 여기까지는 열려 있다
  expect(screen.getByTestId('question-add')).not.toBeDisabled();

  fireEvent.click(screen.getByTestId('mode-practice')); // 상한이 50 으로 내려간다
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('연습 과제는 50문항까지예요');
  expect(screen.getByTestId('question-add')).toBeDisabled();
});

/* ── 마감 기본값 ─────────────────────────────────────────────────────────── */

/*
  `toISOString()` 은 **UTC 로 바꾼 뒤** 문자열을 주는데 `datetime-local` 은 받은 문자열을 **로컬로 읽는다.**
  KST 에서 로컬 22:00 을 그렇게 넣으면 화면에 `13:00` 이 떴다. 이 회귀는 호스트 시간대가 UTC 면 드러나지 않으므로
  아래 첫 테스트는 로컬 게터와 `toISOString()` 이 다른 값을 내는 Date 를 만들어 구현을 가른다.
*/
it('toLocalDatetimeInput 은 로컬 게터만 읽는다 — UTC 로 새면 여기서 갈린다', () => {
  const localIs22ButUtcIs13 = {
    getFullYear: () => 2026,
    getMonth: () => 8,
    getDate: () => 15,
    getHours: () => 22,
    getMinutes: () => 0,
    toISOString: () => '2026-09-15T13:00:00.000Z',
  } as unknown as Date;

  expect(toLocalDatetimeInput(localIs22ButUtcIs13)).toBe('2026-09-15T22:00');
});

it('마감 기본값이 내일 22:00 으로 뜬다 — 교사가 안 건드려도 맞는 값이다', () => {
  render(<AssignmentForm />);
  const due = (screen.getByTestId('due-input') as HTMLInputElement).value;

  const expected = new Date();
  expected.setDate(expected.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  expect(due).toBe(
    `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}T22:00`,
  );
  expect(new Date(due).getHours()).toBe(22);
});

/* ── 걷어낸 자리 ─────────────────────────────────────────────────────────── */

it('진행도 숫자를 더 보여 주지 않는다 — 빈 폼이 이미 「4/5」라고 말하던 자리다', () => {
  render(<AssignmentForm />);
  expect(screen.queryByText(/진행도/)).toBeNull();
});

it('③ 대상은 고르는 칸이 아니라 「반 전체」 한 줄이다 — 정본 명단이 없어 학생을 고를 수 없다', () => {
  render(<AssignmentForm />);
  expect(screen.queryByRole('group', { name: '대상 학생' })).toBeNull();
  expect(screen.queryByTestId('target-expand')).toBeNull();
  expect(screen.getByText(/반 전체/)).toBeInTheDocument();
});

it('봇 한 마디 칸은 없다 — 정본 본문에 실을 자리가 없다', () => {
  render(<AssignmentForm />);
  expect(screen.queryByLabelText(/봇 한 마디/)).toBeNull();
});

it('「이 브라우저에만 저장돼요」 안내는 사라졌다 — 문항이 서버에 저장된다', () => {
  render(<AssignmentForm />);
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });
  expect(screen.queryByText(/이 브라우저에만 저장돼요/)).not.toBeInTheDocument();
});
