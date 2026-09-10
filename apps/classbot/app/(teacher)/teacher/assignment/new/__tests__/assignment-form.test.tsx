/**
 * 출제 폼 — 배점 합계 100점 규칙이 발사를 막는지, 문항 편집이 과제에 실리는지.
 *
 * 폼은 이제 **DB 를 본다** — 발사 봇은 내 수업방(`useTeacherClassrooms`)이고, 대상 학생은
 * 그 방의 참여자(`useClassroomStudents`)이며, 발사는 `useDispatchAssignment` 로 나간다.
 * 여기서 확인하려는 것은 그 세 훅의 동작이 아니라 **폼의 규칙**이라, 훅은 mock 으로 세우고
 * 서버가 성공을 준 뒤의 자리(문항이 로컬 사본에 실리는지)를 본다.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { AssignmentForm } from '../assignment-form';
import { useAssignmentStore, getQuestionsForAssignment } from '@/lib/store/assignments';
import { ApiClientError } from '@/lib/api/client-fetch';

/** 서버가 만들어 준 과제 id — 로컬 사본은 이 id 로 맞춰져야 학생 링크와 문항이 어긋나지 않는다. */
const SERVER_ASSIGNMENT_ID = 'as_server_1';

const mockRoom = {
  classroomId: 'cr_test',
  label: '고2 미적분 A반',
  organization: '풀림',
  botId: 'cb_001',
  botName: '수학이 형',
  subject: '수학Ⅱ',
  grade: '고2',
  studentCount: 2,
  joinCode: 'ABC123',
};
const mockStudents = [
  { id: 'student_001', name: '서연', joinedAt: '2026-03-04T08:20:00.000Z' },
  { id: 's2', name: '민준', joinedAt: '2026-03-05T08:20:00.000Z' },
];

const mutateAsync = jest.fn();

/** 두 조회의 상태 — 테스트마다 갈아 끼운다(명단 실패·비로그인 데모를 세우려면 필요하다). */
type QueryState<T> = { data: T | undefined; isPending: boolean; isError: boolean; error: unknown };
const queries: {
  classrooms: QueryState<{ classrooms: (typeof mockRoom)[] }>;
  students: QueryState<{ students: typeof mockStudents }>;
} = {
  classrooms: { data: { classrooms: [mockRoom] }, isPending: false, isError: false, error: null },
  students: { data: { students: mockStudents }, isPending: false, isError: false, error: null },
};

jest.mock('@/hooks/api/classroom', () => ({
  useTeacherClassrooms: () => queries.classrooms,
  useClassroomStudents: () => queries.students,
}));

/** 발사 성공 토스트 — 대상 표기가 사실과 맞는지 여기서 읽는다. */
const toastSuccess = jest.fn();
jest.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args), error: jest.fn() },
}));

jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useDispatchAssignment: () => ({
    mutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

beforeEach(() => {
  useAssignmentStore.setState({ dispatched: [], drafts: [], submissions: [], lastDispatched: null });
  mutateAsync.mockReset();
  toastSuccess.mockReset();
  mutateAsync.mockResolvedValue({ assignment: { id: SERVER_ASSIGNMENT_ID } });
  queries.classrooms = { data: { classrooms: [mockRoom] }, isPending: false, isError: false, error: null };
  queries.students = { data: { students: mockStudents }, isPending: false, isError: false, error: null };
});

/** 발사 — 서버 응답을 기다린 뒤에야 로컬 사본이 쓰인다(낙관적 선반영을 하지 않는다). */
async function clickDispatch() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('dispatch-btn'));
  });
}

function fillTitle() {
  fireEvent.change(screen.getByTestId('title-input'), { target: { value: '배점 규칙 확인 과제' } });
}

it('기본 문항 배점 합은 100점이라 제목만 채우면 발사할 수 있다', () => {
  render(<AssignmentForm />);
  fillTitle();
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

it('배점 합계가 100이 아니면 발사를 막고 이유를 보여 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '10' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('90/100점');
});

it('문항 더하기·배점 고르게 나누기로 다시 100점을 맞출 수 있다', () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('question-add')); // 6문항 · 100점 → 배점 0 인 문항 추가
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();

  fireEvent.click(screen.getByTestId('question-even-split'));
  expect(screen.getByTestId('points-tally').textContent).toContain('100 / 100점');
});

it('발문을 전부 채워 발사하면 그 문항이 학생 풀이에 그대로 쓰인다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  // 기본 5문항 중 1문항만 남기고 발문을 채운다
  for (let i = 4; i >= 1; i--) {
    fireEvent.click(screen.getByRole('button', { name: `${i + 1}번 문항 지우기` }));
  }
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '100' } });
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });
  fireEvent.change(screen.getByTestId('question-option-0-0'), { target: { value: '그대로' } });
  fireEvent.change(screen.getByTestId('question-option-0-1'), { target: { value: '오른다' } });
  await clickDispatch();

  // 서버가 소유권·대상을 검사한 뒤에야 로컬 사본이 생긴다 — id 도 서버가 준 것이다
  expect(mutateAsync).toHaveBeenCalledWith(
    expect.objectContaining({ botId: 'cb_001', questionCount: 1, difficulty: '중', mode: 'practice' }),
  );
  const [dispatched] = useAssignmentStore.getState().dispatched;
  expect(dispatched.id).toBe(SERVER_ASSIGNMENT_ID);
  expect(dispatched.questions).toHaveLength(1);
  expect(getQuestionsForAssignment(dispatched)[0]).toMatchObject({
    prompt: '얼음이 녹는 동안 온도는?',
    points: 100,
    type: 'mc',
    answerIndex: 0,
  });
});

/*
  문항 **본문**은 아직 서버에 저장되는 자리가 없어서(M2 경계 — `solve/__tests__/page.test.tsx`
  의 `[M2 한계]`), 직접 쓴 발문은 낸 브라우저에만 남는다. 발사를 막는 것으로는 학생 쪽이
  달라지지 않으므로(같은 테스트가 못박는다) 남는 수단은 **말해 주는 것**이다.
*/
it('직접 쓴 발문이 있으면 「이 브라우저에만 저장된다」고 알려 준다 — 고칠 수 없으면 말은 해야 한다', () => {
  render(<AssignmentForm />);
  expect(screen.queryByText(/이 브라우저에만 저장돼요/)).not.toBeInTheDocument();

  fireEvent.change(screen.getByTestId('question-prompt-0'), {
    target: { value: '얼음이 녹는 동안 온도는?' },
  });

  expect(screen.getByText(/이 브라우저에만 저장돼요/)).toBeInTheDocument();
  // 다른 기기 학생이 무엇을 받는지까지 말한다 — 「저장 안 된다」만으로는 결과를 모른다.
  expect(screen.getByText(/자동 추출된 문항/)).toBeInTheDocument();
});

it('발문을 다 썼는데 자동 채점 문항 정답이 비면 발사를 막고 문항 번호를 알려 준다', () => {
  render(<AssignmentForm />);
  fillTitle();
  // 기본 5문항 중 단답 1문항만 남긴다 — 정답키를 비워 둔 상태
  for (let i = 4; i >= 0; i--) {
    if (i === 2) continue; // 3번(단답)만 남긴다
    fireEvent.click(screen.getByRole('button', { name: `${i + 1}번 문항 지우기` }));
  }
  fireEvent.change(screen.getByTestId('question-points-0'), { target: { value: '100' } });
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '얼음이 녹는 동안 온도는?' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('1번 문항 정답');

  // 정답을 채우면 발사가 열린다
  fireEvent.change(screen.getByTestId('question-answer-0'), { target: { value: '그대로' } });
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

it('발문을 비워 두면 문항을 싣지 않고 단원 자동 추출로 남긴다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  const [dispatched] = useAssignmentStore.getState().dispatched;
  expect(dispatched.questions).toBeUndefined();
  // 폴백이 살아 있어 학생 풀이 화면이 비지 않는다
  expect(getQuestionsForAssignment(dispatched).length).toBeGreaterThan(0);
});

/**
 * 문항 수 상한 — 종전 `문항 수` 슬라이더가 걸던 `min 1 / max 연습 50 · 시험 60` 이
 * 문항 목록 편집기로 바뀌면서 사라져 51·61문항이 그대로 발사되던 결함에 대한 회귀.
 */
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

it('시험에서 51문항을 만든 뒤 연습으로 되돌리면 상한 초과라 발사를 막는다', () => {
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

it('발문을 일부만 쓰면 발사를 막는다 — 쓴 발문이 조용히 버려지지 않게', () => {
  render(<AssignmentForm />);
  fillTitle();
  // 5문항 중 1번만 발문을 채운다 → toAssignmentQuestions 가 null 을 돌려 전부 버려지던 자리
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '기울기를 구하는 식은?' } });

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
  expect(screen.getByTestId('dispatch-blocked').textContent).toContain('발문은 전부 쓰거나 전부 비워야 해요');

  // 다시 비우면(=전부 비움) 단원 자동 추출 경로라 발사가 열린다
  fireEvent.change(screen.getByTestId('question-prompt-0'), { target: { value: '' } });
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

/* ── 명단·데모 분기 ─────────────────────────────────────────────────────── */

it('명단을 못 읽으면 발사를 막는다 — 조회 실패가 「전원 발사」로 바뀌지 않게', () => {
  // 빈 배열은 「학생 0명인 반」과 모양이 같고, 그때 나가는 targetStudentIds=[] 는
  // 서버에서 **반 전체**로 읽힌다. 즉 막지 않으면 명단을 못 본 채 전원에게 나간다.
  queries.students = {
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error('명단을 불러오지 못했어요.'),
  };
  render(<AssignmentForm />);
  fillTitle();

  expect(screen.getByTestId('students-error')).toBeInTheDocument();
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
});

it('명단이 아직 안 왔을 때도 발사를 막는다 — 빈 명단과 구별되지 않는다', () => {
  queries.students = { data: undefined, isPending: true, isError: false, error: null };
  render(<AssignmentForm />);
  fillTitle();

  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
});

/*
  막힌 이유가 둘인데 문구가 하나면 교사가 자기 잘못으로 읽는다. 명단을 못 읽어서 막힌 것은
  ③ 섹션이 이미 「불러오는 중」·API 오류로 말하고 있고 교사가 할 수 있는 일도 없다 —
  거기에 「최소 1명을 선택해주세요」까지 겹치면 안 골라서 막힌 것처럼 보인다.
*/
it('명단을 못 읽어 막힌 것을 「최소 1명」 탓으로 그리지 않는다', () => {
  queries.students = {
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error('명단을 불러오지 못했어요.'),
  };
  render(<AssignmentForm />);

  expect(screen.getByTestId('students-error')).toBeInTheDocument();
  expect(screen.queryByTestId('target-empty-error')).not.toBeInTheDocument();
});

it('명단이 아직 안 왔을 때도 「최소 1명」을 띄우지 않는다', () => {
  queries.students = { data: undefined, isPending: true, isError: false, error: null };
  render(<AssignmentForm />);

  expect(screen.getByTestId('students-loading')).toBeInTheDocument();
  expect(screen.queryByTestId('target-empty-error')).not.toBeInTheDocument();
});

it('고를 수 있는데 전부 껐을 때만 「최소 1명」을 띄운다', () => {
  render(<AssignmentForm />);
  // 기본은 전원 선택 — 하나씩 끄면 0명이 된다.
  expect(screen.queryByTestId('target-empty-error')).not.toBeInTheDocument();
  mockStudents.forEach(s => fireEvent.click(screen.getByTestId(`student-${s.id}`)));

  expect(screen.getByTestId('target-empty-error')).toBeInTheDocument();
  expect(screen.getByTestId('dispatch-btn')).toBeDisabled();
});

it('비로그인 데모(401)에서는 오류 카드를 띄우지 않는다 — 고장이 아니라 데모 상태다', () => {
  queries.classrooms = {
    data: undefined,
    isPending: false,
    isError: true,
    // 401 판정은 `instanceof ApiClientError` + status 다 — 진짜 타입으로 세운다.
    error: new ApiClientError('로그인이 필요합니다.', 401, 'AUTH_REQUIRED'),
  };
  render(<AssignmentForm />);

  expect(screen.queryByTestId('rooms-error')).not.toBeInTheDocument();
});

/*
  데모의 방은 mock(`demo_*`)이라 서버에 없다 — 명단 조회도 401 로 돌아온다. 그 401 까지
  숨겨야 「비로그인 데모는 고장이 아니다」가 화면 전체에서 성립한다. 수업방 카드만 고치고
  ③ 대상 섹션을 두면 데모 진입마다 빨간 「로그인이 필요합니다.」가 남는다.
*/
it('비로그인 데모(401)에서는 대상 명단도 오류로 그리지 않는다 — 빈 방 안내로 내려간다', () => {
  const unauthorized = new ApiClientError('로그인이 필요합니다.', 401, 'AUTH_REQUIRED');
  queries.classrooms = { data: undefined, isPending: false, isError: true, error: unauthorized };
  queries.students = { data: undefined, isPending: true, isError: false, error: null };
  render(<AssignmentForm />);

  expect(screen.queryByTestId('students-error')).not.toBeInTheDocument();
  expect(screen.queryByTestId('students-loading')).not.toBeInTheDocument();
  // 명단을 못 읽은 게 아니라 「아직 아무도 안 들어온 방」이므로 발사도 막지 않는다.
  fillTitle();
  expect(screen.getByTestId('dispatch-btn')).not.toBeDisabled();
});

/*
  빈 배열은 「0명」이 아니라 「반 전체」다(spec 14 §5.1). 인원수로 적으면 빈 방 발사가
  「0명에게 보냈어요」가 되는데, 실제로는 뒤에 참여 코드로 들어온 학생이 그대로 받는다 —
  낸 사람에게 사실과 정반대로 읽힌다.
*/
it('빈 방에 내면 「0명」이 아니라 「반 전체」라고 말한다', async () => {
  queries.students = { data: { students: [] }, isPending: false, isError: false, error: null };
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  const message = toastSuccess.mock.calls[0][0] as string;
  expect(message).toContain('반 전체');
  expect(message).not.toContain('0명');
});

it('명단을 아는 전원 발사는 인원수로 말한다 — 「반 전체」보다 많이 말한다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  expect(toastSuccess.mock.calls[0][0]).toContain(`${mockStudents.length}명 전체`);
});

it('발사 payload 에 교사가 고른 단원이 실린다 — 서버에서 읽는 화면이 단원을 잃지 않게', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  expect(mutateAsync).toHaveBeenCalledTimes(1);
  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  expect(typeof payload.scope).toBe('string');
  expect(payload.scope).not.toBe('');
  expect(payload.chapterFrom).toBe(payload.scope);
  expect(payload.chapterTo).toBe(payload.scope);
});

/*
  단원과 같은 이유로 나머지 셋도 payload 에 실려야 한다 — 로컬 사본에만 남으면 그건 이
  브라우저뿐이고, 학생·학부모·리포트는 서버 행을 읽는다. 풀이 화면마저 접근 판정을 서버로
  옮겼기 때문에 「로컬에 있으니 괜찮다」가 더는 성립하지 않는다.
*/
it('발사 payload 에 성취기준이 실린다 — 한 번 빈 배열로 저장되면 되살릴 수 없다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  expect(Array.isArray(payload.achievementCodes)).toBe(true);
  expect(payload.achievementCodes).not.toHaveLength(0);
  // 로컬 사본과 같은 값이어야 한다 — 갈라지면 교사가 낸 것과 학생이 받는 것이 달라진다.
  expect(payload.achievementCodes).toEqual(
    useAssignmentStore.getState().dispatched[0].achievementCodes,
  );
});

it('발사 payload 에 봇 한 마디가 실린다 — 학생 개요가 읽는 값이다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.change(screen.getByLabelText(/봇 한 마디/), {
    target: { value: '  어제 부호 변화에서 막혔던 사람들 다시 짚자  ' },
  });
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  // 앞뒤 공백은 떼고 보낸다 — 서버도 `readTrimmed` 로 같은 판단을 한다.
  expect(payload.reasonHint).toBe('어제 부호 변화에서 막혔던 사람들 다시 짚자');
});

it('봇 한 마디를 안 적으면 보내지 않는다 — 공백만 남기지 않는다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  fireEvent.change(screen.getByLabelText(/봇 한 마디/), { target: { value: '   ' } });
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.reasonHint).toBeUndefined();
});

it('시험 과제는 제한 시간이 실린다 — 서버 범위(10~180) 안이다', async () => {
  render(<AssignmentForm />);
  fireEvent.click(screen.getByTestId('mode-exam'));
  fillTitle();
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  const limit = payload.examTimeLimitMin as number;
  expect(Number.isInteger(limit)).toBe(true);
  expect(limit).toBeGreaterThanOrEqual(10);
  expect(limit).toBeLessThanOrEqual(180);
});

it('시험이 아니면 제한 시간을 보내지 않는다 — 서버도 그때는 null 로 떨어뜨린다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  expect(payload.examTimeLimitMin).toBeUndefined();
});

/*
  마감 시각은 표시용 라벨과 **따로** 실린다. 라벨(「10월 2일 (목) 18:00」)만 보내면 서버가
  「마감은 미래」(14 §5.1)를 검증할 방법이 없다 — 서버 `readDueAt` 주석이 「보내는 쪽(#269)이
  실으면 필수로 좁힌다」고 적어 둔 자리를 여기서 채운다. 라벨도 계속 보낸다(서버 행의 표시
  칸이라 지금은 둘 다 필요하다).
*/
it('발사 payload 에 진짜 마감 시각이 ISO 로 실린다 — 라벨만으로는 서버가 미래인지 못 본다', async () => {
  render(<AssignmentForm />);
  fillTitle();
  await clickDispatch();

  const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
  const dueAt = payload.dueAt as string;
  expect(typeof dueAt).toBe('string');
  // 파싱되는 ISO 8601 이어야 한다 — 서버가 `new Date()` 로 읽고 NaN 이면 400 이다.
  const parsed = new Date(dueAt);
  expect(Number.isNaN(parsed.getTime())).toBe(false);
  // 반드시 미래 — 폼이 이미 잠그는 조건이고, 서버도 과거면 거절한다.
  expect(parsed.getTime()).toBeGreaterThan(Date.now());
  // 표시용 라벨은 그대로 함께 간다 — 하나가 다른 하나를 대신하지 않는다.
  expect(typeof payload.dueLabel).toBe('string');
  expect(payload.dueLabel).not.toBe('');
});
