import { getAssignmentVisual, type AssignmentVisualInput } from '../assignment-state';
import { palette } from '../palette';

/** 이 함수가 읽는 칸은 넷뿐이다(`AssignmentVisualInput`) — 나머지를 세워 두면 무엇이 판정에 쓰이는지 흐려진다. */
const base = (over: Partial<AssignmentVisualInput>): AssignmentVisualInput => ({
  mode: 'practice',
  state: 'in-progress',
  dDay: 'D-5',
  submitted: false,
  ...over,
});

it('liner colors come from palette (no magic hex)', () => {
  expect(getAssignmentVisual(base({ mode: 'exam' })).linerHex).toBe(palette.gray[950]);
  expect(getAssignmentVisual(base({ mode: 'wrong-conquest' })).linerHex).toBe(palette.lemon.base);
  expect(getAssignmentVisual(base({ state: 'overdue' })).linerHex).toBe(palette.danger[600]);
  expect(getAssignmentVisual(base({ dDay: '오늘' })).linerHex).toBe(palette.primary[800]);
  expect(getAssignmentVisual(base({})).linerHex).toBe(palette.primary[50]);
  expect(getAssignmentVisual(base({})).linerHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
});

/** 색 규약 잠금 ① — [08 § 1.3] success/warn 은 deprecated. 어느 상태에도 쓰지 않는다. */
it('과제 카드 시각 토큰에 success·warn 이 없다', () => {
  const all = [
    base({ mode: 'exam' }),
    base({ mode: 'wrong-conquest' }),
    base({ submitted: true }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(getAssignmentVisual);

  for (const v of all) {
    expect(`${v.progressClass} ${v.dDayChipClass}`).not.toMatch(/pullim-(success|warn)/);
  }
});

/**
 * 색 규약 잠금 ② — 레몬은 **오답정복 한 모드에만**.
 * [08 § 15.6] 이 「오답정복 = accent.lime · lime chip」을 못 박고 있어 그 자리는 남긴다.
 * 대신 나머지 다섯 상태로 새어 나가면 [§ 1.6] 「화면당 1~2곳」이 바로 깨지므로 여기서 막는다.
 * 진척 막대는 데이터라 오답정복에서도 블루다 — 카드가 여러 장 깔릴 때의 안전판.
 */
it('레몬은 오답정복 칩·라이너에만 쓰인다', () => {
  const wrong = getAssignmentVisual(base({ mode: 'wrong-conquest' }));
  expect(wrong.dDayChipClass).toMatch(/pullim-lemon/);
  expect(wrong.linerHex).toBe(palette.lemon.base);
  expect(wrong.progressClass).not.toMatch(/pullim-lemon/);

  const others = [
    base({ mode: 'exam' }),
    base({ submitted: true }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(getAssignmentVisual);

  for (const v of others) {
    expect(`${v.progressClass} ${v.dDayChipClass}`).not.toMatch(/pullim-lemon/);
    expect(v.linerHex).not.toBe(palette.lemon.base);
  }
});

/** 색을 못 읽어도 상태를 알 수 있어야 한다 — 모든 상태에 글자 라벨이 붙는다. */
it('모든 상태가 글자 라벨을 가진다', () => {
  const labels = [
    base({ mode: 'exam' }),
    base({ mode: 'wrong-conquest' }),
    base({ submitted: true }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(a => getAssignmentVisual(a).semanticLabel);

  expect(new Set(labels).size).toBe(6);
  for (const l of labels) expect(l.length).toBeGreaterThan(0);
});

/**
 * 완료 판정의 원천 — **`submitted` 한 칸**이다(pullim-api #681).
 *
 * 종전 판정 `state === 'submitted' || completedCount >= questionCount` 는 둘 다 못 쓴다:
 * `state` 는 과제당 하나뿐인 자유 문자열이라 **학생을 가르지 못하고**(이 앱의 배포 폼은 늘 `'todo'` 를 넣는다),
 * `completedCount` 는 그 `submitted` 의 투영이라 같은 말을 두 번 하는 것이다.
 * 그리고 **모르는 것(칸 없음·`null`)을 완료로도 「안 냄」으로도 단정하지 않는다** — 그 자리는 마감일이 말한다.
 */
describe('완료는 submitted 가 정한다', () => {
  it('true 면 완료다', () => {
    expect(getAssignmentVisual(base({ submitted: true })).semanticLabel).toBe('완료');
  });

  it('false(서버가 「안 냈다」고 말했다)면 완료가 아니다', () => {
    expect(getAssignmentVisual(base({ submitted: false })).semanticLabel).toBe('진행 중');
  });

  it('null(운영자 관점)은 완료가 아니고, 마감일이 그리던 그림 그대로다', () => {
    expect(getAssignmentVisual(base({ submitted: null })).semanticLabel).toBe('진행 중');
    expect(getAssignmentVisual(base({ submitted: null, dDay: '오늘' })).semanticLabel).toBe('마감 임박');
  });

  it('칸 자체가 없으면(옛 서버) 완료가 아니다 — 「모른다」이고, 그때 카드는 #681 이전과 같은 그림이다', () => {
    const old = { mode: 'practice', state: 'todo', dDay: 'D-5' } as const;
    expect(getAssignmentVisual(old).semanticLabel).toBe('진행 중');
    expect(getAssignmentVisual({ ...old, dDay: '지난 2일' }).semanticLabel).toBe('지연');
  });

  it('state 가 submitted 여도 그것만으로는 완료가 아니다 — 그 칸은 과제당 하나라 학생을 못 가른다', () => {
    expect(getAssignmentVisual(base({ state: 'submitted', submitted: false })).semanticLabel).toBe('진행 중');
    expect(getAssignmentVisual(base({ state: 'submitted', submitted: null })).semanticLabel).toBe('진행 중');
  });

  it('완료는 지연·마감 임박보다 앞선다 — 이미 낸 과제를 다시 재촉하지 않는다', () => {
    expect(getAssignmentVisual(base({ submitted: true, state: 'overdue', dDay: '지난 3일' })).semanticLabel).toBe('완료');
    expect(getAssignmentVisual(base({ submitted: true, dDay: '오늘' })).semanticLabel).toBe('완료');
  });
});
