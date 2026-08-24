import { getTeacherBotRows, teacherBotOps } from '@/lib/mock/classbot-teacher-ops';
import { scopeMeta, type ScopeLevel } from '@/lib/mock';

/**
 * 봇 빌더 — 한 길 · 세 마당 모델.
 *
 * 8단계 위저드를 걷어내고 마당 셋(봇 소개 · 보고 답할 것 · 가르치는 법)으로 합쳤다.
 * 길이 하나라 「어디로 갈지」를 먼저 고르게 하지 않는다. 대신 안내를 두 층으로 둔다 —
 *  ① 페이지 제목 아래 한 줄이 「과목만 고르면 나머지는 기본값」이라는 방침을 말하고,
 *  ② 항목 이름 옆 표시가 그 항목이 꼭 골라야 하는 것인지 기본값인지 말한다.
 *
 * 이 파일이 지키는 불변식:
 *  - 「채워진 것」이 세는 항목은 정확히 아홉 가지(`FIELD_KEYS`)다. 안전 세 가지는 세지 않는다.
 *  - 항목 옆 표시와 「채워진 것」의 배지는 **같은 `own` 하나**를 읽는다. 상태를 두 벌 두지 않는다.
 *  - 과목은 기본값이 없다. 미리 골라 두면 없는 기본값을 있는 척하는 것이 된다.
 */

export type SubjectId = 'science' | 'math' | 'english' | 'korean' | 'social';
export type ToneId = 'polite' | 'friendly' | 'firm';
export type StyleId = 'tell' | 'ask' | 'solve' | 'mix';
export type WrongId = 'hint' | 'tell' | 'mix';

/** 마당 1~3 은 만들면서 지나는 자리, 4 는 만든 뒤에 하는 일이라 마당이 아니다. */
export type YardNo = 1 | 2 | 3;
export type GroupNo = YardNo | 4;

/** 만드는 화면 / 만든 뒤 화면 */
export type BuilderView = 'build' | 'done';

export type UploadedFile = {
  name: string;
  size: string;          // "4.2MB"
};

/** 「채워진 것」이 세는 아홉 가지 — 항목 옆 표시와 1:1 로 맞물린다. */
export const FIELD_KEYS = [
  'subject', 'grade', 'name', 'tone', 'files', 'scope', 'style', 'wrong', 'classes',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

/** 교사가 직접 정한 항목. 두 표시가 어긋나지 않도록 이 하나만 읽는다. */
export type OwnMap = Record<FieldKey, boolean>;

export type BotDraft = {
  subject: SubjectId | null;
  grade: string;
  name: string;
  tone: ToneId;
  files: UploadedFile[];
  scope: ScopeLevel;
  style: StyleId;
  wrong: WrongId;
  /** 학급 id (`classroomChoices` 의 `id`) — 라벨이 아니다. 운영 화면·참여 코드와 같은 키를 쓴다. */
  classes: string[];
  own: OwnMap;
};

export const noOwn: OwnMap = {
  subject: false, grade: false, name: false, tone: false,
  files: false, scope: false, style: false, wrong: false, classes: false,
};

/** 첫 진입 상태 — 과목만 비어 있고 나머지는 기본값이 들어가 있다. */
export const emptyDraft: BotDraft = {
  subject: null,
  grade: '중1',
  name: '',
  tone: 'friendly',
  files: [],
  scope: 3,
  style: 'mix',
  wrong: 'hint',
  classes: [],
  own: noOwn,
};

/* ─── 고를 수 있는 것들 ─── */

export const subjectMeta: Record<SubjectId, { label: string; initial: string; botName: string }> = {
  science: { label: '과학', initial: '과', botName: '과학봇' },
  math:    { label: '수학', initial: '수', botName: '수학봇' },
  english: { label: '영어', initial: '영', botName: '영어봇' },
  korean:  { label: '국어', initial: '국', botName: '국어봇' },
  social:  { label: '사회', initial: '사', botName: '사회봇' },
};

export const subjectIds = Object.keys(subjectMeta) as SubjectId[];

export const grades = ['초5', '초6', '중1', '중2', '중3', '고1'] as const;

export const toneMeta: Record<ToneId, { label: string; description: string }> = {
  polite:   { label: '또박또박', description: '존댓말로 차근차근' },
  friendly: { label: '친근하게', description: '반말 섞어 친구처럼' },
  firm:     { label: '단단하게', description: '군더더기 없이 짧게' },
};

export const styleMeta: Record<StyleId, { label: string; description: string }> = {
  tell:  { label: '설명 위주',   description: '개념을 먼저 풀어서 설명해요' },
  ask:   { label: '되물어보기', description: '답 대신 물어서 스스로 찾게 해요' },
  solve: { label: '같이 풀기',   description: '문제를 한 줄씩 같이 풀어요' },
  mix:   { label: '섞어서',     description: '단원과 시간에 따라 알아서 바꿔요' },
};

export const wrongMeta: Record<WrongId, { label: string; description: string }> = {
  hint: { label: '힌트만',       description: '답은 안 주고 다섯 번에 나눠 힌트' },
  tell: { label: '바로 알려주기', description: '정답과 풀이를 곧장 보여줘요' },
  mix:  { label: '섞어서',       description: '어려우면 힌트, 쉬우면 바로' },
};

export const scopeLevels: ScopeLevel[] = [1, 2, 3, 4, 5];

/** 답 범위 이름은 `lib/mock` 의 `scopeMeta` 하나만 쓴다 — 봇 설정 화면과 어긋나면 안 된다. */
export { scopeMeta };
export type { ScopeLevel };

/** 봇을 만든 뒤에 고를 수 있는 반. */
/**
 * 반 선택지 — 기존 학급 권위(`lib/mock/classbot-teacher-ops.ts`)에서 파생한다.
 * 라벨을 여기서 새로 지어내면 참여 코드(`class-codes.ts` 의 `classroomId`·`classroomLabel`)나
 * 운영 화면의 반 카드와 이어 붙일 수 없다 — 같은 반을 두 이름으로 부르게 된다.
 */
export type ClassroomChoice = { id: string; label: string };

export const classroomChoices: ClassroomChoice[] = teacherBotOps
  .flatMap((ops) => ops.classrooms)
  .map(({ id, label }) => ({ id, label }))
  // 한 반이 여러 봇에 붙어 있어도 목록에는 한 번만 나온다
  .filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);

/** 세는 칸 밖 고정 줄 — 모든 봇에 늘 켜져 있어 교사가 정할 것이 없다. */
/** 학급 id → 교사·학생이 같이 보는 반 이름. 모르는 id 는 그대로 보여준다(감추지 않는다). */
export function classroomLabel(id: string): string {
  return classroomChoices.find((c) => c.id === id)?.label ?? id;
}

export const alwaysOnSafety = ['개인정보 가리기', '위험한 말 막기', '위기 신호 알림'] as const;

/* ─── 지난 봇에서 가져오기 ─── */

export type CloneSource = {
  botId: string;
  name: string;
  subject: SubjectId;
  grade: string;
  tone: ToneId;
  scope: ScopeLevel;
  /** 카드에 적는 한 줄 — 어느 반에서 쓰던 봇인지 */
  meta: string;
};

/** 봇 카탈로그의 말투 표기를 빌더 말투로 옮긴다. */
const toneFromCatalog: Record<string, ToneId> = {
  정중: 'polite', 차분: 'polite', 친근: 'friendly', 열정: 'friendly', 스파르타: 'firm',
};

const subjectFromCatalog: Record<string, SubjectId> = {
  수학: 'math', 공통수학: 'math', 영어: 'english',
  과학: 'science', 통합과학: 'science',
  국어: 'korean', 문학: 'korean',
  사회: 'social', 한국사: 'social',
};

/**
 * 가져올 수 있는 지난 봇 — 새로 지어내지 않고 봇 카탈로그(`lib/mock/classbot.ts`)에서 읽는다.
 * 그래서 따라오는 값도 카탈로그가 아는 넷(과목 · 학년 · 말투 · 답 범위)뿐이다.
 * 수업 자료와 가르치는 법은 카탈로그에 없으니 따라오지 않는다 — 없는 값을 지어내면 거짓이 된다.
 */
export function cloneSources(limit = 3): CloneSource[] {
  return getTeacherBotRows()
    .map((row): CloneSource | null => {
      const subject = subjectFromCatalog[row.bot.subject];
      if (!subject) return null;
      const room = row.ops.classrooms[0]?.label ?? '아직 반에 안 넣음';
      return {
        botId: row.bot.id,
        name: row.bot.name,
        subject,
        grade: row.bot.grade,
        tone: toneFromCatalog[row.bot.tone] ?? 'friendly',
        scope: row.bot.scope,
        meta: `${room} · ${row.bot.grade} · 답 범위 L${row.bot.scope}`,
      };
    })
    .filter((c): c is CloneSource => c !== null)
    .slice(0, limit);
}

/** 지난 봇의 값을 옮겨 담는다. 따라온 값은 전부 「내가 정함」이 된다. */
export function applyClone(source: CloneSource): BotDraft {
  return {
    ...emptyDraft,
    subject: source.subject,
    grade: source.grade,
    name: '',                       // 이름은 새 봇에서 다시 정한다 — 비우면 과목 기본 이름이 붙는다
    tone: source.tone,
    scope: source.scope,
    own: { ...noOwn, subject: true, grade: true, tone: true, scope: true },
  };
}

/* ─── 데모용 수업 자료 ─── */

export const sampleFiles: Record<SubjectId, UploadedFile[]> = {
  science: [
    { name: '2단원_상태변화_수업자료.pdf', size: '4.2MB' },
    { name: '증발과_끓음_판서필기.jpg', size: '1.1MB' },
    { name: '상태변화_연습문제.pdf', size: '0.8MB' },
  ],
  math: [
    { name: '3단원_일차함수_수업자료.pdf', size: '3.6MB' },
    { name: '기울기_구하기_판서필기.jpg', size: '1.4MB' },
    { name: '일차함수_연습문제.pdf', size: '0.9MB' },
  ],
  english: [
    { name: '현재완료_수업자료.pdf', size: '2.8MB' },
    { name: '본문해석_판서필기.jpg', size: '1.0MB' },
    { name: '현재완료_연습문제.pdf', size: '0.6MB' },
  ],
  korean: [
    { name: '설명하는글_수업자료.pdf', size: '3.1MB' },
    { name: '지문분석_판서필기.jpg', size: '1.2MB' },
    { name: '설명글_연습문제.pdf', size: '0.7MB' },
  ],
  social: [
    { name: '우리나라_기후_수업자료.pdf', size: '5.0MB' },
    { name: '기후도_판서필기.jpg', size: '1.6MB' },
    { name: '기후_연습문제.pdf', size: '0.8MB' },
  ],
};

/* ─── 값 읽기 ─── */

/** 비워 두면 고른 과목의 기본 이름이 봇 이름이 된다. */
export function botName(draft: BotDraft): string {
  const typed = draft.name.trim();
  if (typed) return typed;
  return draft.subject ? subjectMeta[draft.subject].botName : '';
}

/** 봇 이름 길이 — 비워도 되지만, 적을 거면 이 범위 안. */
export const BOT_NAME_MIN = 2;
export const BOT_NAME_MAX = 30;

/**
 * 이름은 비워도 된다(비우면 과목 기본 이름). 적을 거면 두 글자 이상 서른 글자 이하.
 * 상한은 입력칸의 `maxLength` 로도 막지만, 붙여넣기·프로그램 입력까지 막으려면 여기서도 본다.
 */
export function isNameValid(draft: BotDraft): boolean {
  const typed = draft.name.trim();
  if (typed.length === 0) return true;
  return typed.length >= BOT_NAME_MIN && typed.length <= BOT_NAME_MAX;
}

/* ─── 안내 ② 항목별 표시 ─── */

/**
 * 왜 비워도 되는지는 항목마다 다르게 적는다 — 같은 문장을 아홉 번 반복하면 아무도 안 읽는다.
 * `required` 인 항목(과목)은 기본값이 없어 「왜 비워도 되는지」가 아예 없다.
 */
export const fieldMarks: Record<FieldKey, { required?: true; why?: (draft: BotDraft) => string }> = {
  subject: { required: true },
  grade:   { why: () => '가장 많이 쓰는 학년으로 골라 뒀어요' },
  name:    {
    why: (draft) =>
      draft.subject
        ? `비워 두면 ${subjectMeta[draft.subject].botName}으로 정해져요`
        : '과목을 고르면 이름이 따라 정해져요',
  },
  tone:    { why: () => '대부분의 반이 이대로 써요' },
  files:   { why: () => '안 올려도 만들 수 있어요' },
  scope:   { why: () => '보통 수업은 L3 교과 범위로 둬요' },
  style:   { why: () => '단원에 따라 알아서 바꿔요' },
  wrong:   { why: () => '답을 바로 주지 않는 쪽이 기본이에요' },
  classes: { why: () => '나중에 운영 화면에서 넣어도 돼요' },
};

/* ─── 「채워진 것」 ─── */

export const yardGroups = [
  { group: 1, badge: '1', title: '봇 소개',      sub: '과목 · 학년 · 이름 · 말투' },
  { group: 2, badge: '2', title: '보고 답할 것', sub: '수업 자료 · 답 범위' },
  { group: 3, badge: '3', title: '가르치는 법',  sub: '평소에 · 틀렸을 때' },
  { group: 4, badge: '·', title: '만든 뒤',      sub: '어느 반에 넣을지' },
] as const satisfies readonly { group: GroupNo; badge: string; title: string; sub: string }[];

/** 마당 셋 — 오른쪽 「단계」와 좁은 화면 가로 띠가 함께 읽는다. */
export const buildYards = [yardGroups[0], yardGroups[1], yardGroups[2]];

export type SummaryRow = {
  field: FieldKey;
  group: GroupNo;
  label: string;
  value: string;
  /** 아직 값이 없어 안내 문구를 대신 보여주는 줄 — 흐리게 그린다 */
  placeholder: boolean;
  own: boolean;
  required: boolean;
};

/** 아홉 줄. 항목 옆 표시와 1:1 로 맞물리도록 「과목」과 「학년」도 따로 센다. */
export function summaryRows(draft: BotDraft, view: BuilderView): SummaryRow[] {
  const subject = draft.subject ? subjectMeta[draft.subject] : null;
  const name = botName(draft);

  const row = (
    field: FieldKey,
    group: GroupNo,
    label: string,
    value: string,
    placeholder = false,
  ): SummaryRow => ({
    field, group, label, value, placeholder,
    own: draft.own[field],
    required: fieldMarks[field].required === true,
  });

  return [
    row('subject', 1, '과목', subject ? subject.label : '아직 안 고름', !subject),
    row('grade', 1, '학년', draft.grade),
    row('name', 1, '이름', name || '과목을 고르면 정해져요', !name),
    row('tone', 1, '말투', toneMeta[draft.tone].label),
    row(
      'files', 2, '수업 자료',
      draft.files.length ? `${draft.files.length}개 올림` : '없음 — 교과서 밖 지식으로 답해요',
      draft.files.length === 0,
    ),
    row('scope', 2, '답 범위', `L${draft.scope} ${scopeMeta[draft.scope].label}`),
    row('style', 3, '평소에', styleMeta[draft.style].label),
    row('wrong', 3, '틀렸을 때', wrongMeta[draft.wrong].label),
    row(
      'classes', 4, '반',
      draft.classes.length
        ? draft.classes.map(classroomLabel).join(' · ')
        : view === 'done' ? '아직 안 넣음' : '만든 뒤에 골라요',
      draft.classes.length === 0,
    ),
  ];
}

/**
 * 값 하나를 고르는 단 하나의 길.
 *
 * 값과 `own` 을 한 번에 옮기므로 「고쳤는데 배지가 안 따라온」 상태가 만들어질 수 없다.
 * 이름·자료·반처럼 비우면 다시 기본값이 되는 항목은 `own` 을 직접 넘긴다.
 */
/**
 * 한 항목을 바꾸면 함께 무효가 되는 항목.
 * 과목을 바꾸면 지난 과목의 수업 자료는 뜻이 없어 비운다 — 값만 비우고 표시를 두면
 * 교사가 고른 적 없는 자료가 계속 「내가 정함」으로 남아 두 자리가 어긋난다.
 */
const invalidatedBy: Partial<Record<FieldKey, readonly FieldKey[]>> = {
  subject: ['files'],
};

export function pick(
  draft: BotDraft,
  field: FieldKey,
  patch: Partial<BotDraft>,
  own = true,
): BotDraft {
  const nextOwn: Record<FieldKey, boolean> = { ...draft.own, [field]: own };
  for (const stale of invalidatedBy[field] ?? []) nextOwn[stale] = false;
  return { ...draft, ...patch, own: nextOwn };
}

/** 카운터의 진실원 — 아홉 가지 밖은 세지 않는다(안전 세 가지 포함). */
export function ownCount(draft: BotDraft): number {
  return FIELD_KEYS.filter((k) => draft.own[k]).length;
}
