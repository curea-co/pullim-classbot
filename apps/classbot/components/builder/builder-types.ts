import { teacherClassrooms } from '@/lib/mock/classbot-classrooms';
import { scopeMeta, type ScopeLevel } from '@/lib/mock';

/**
 * 봇 빌더 — 한 길 · 세 마당 모델.
 *
 * 8단계 위저드를 걷어내고 마당 셋(봇 소개 · 보고 답할 것 · 가르치는 법)으로 합쳤다.
 * 길이 하나라 「어디로 갈지」를 먼저 고르게 하지 않는다. 대신 항목 이름 옆에서 필수와 선택을
 * 가른다 — 꼭 골라야 하는 것은 빨간 `*`, 나머지는 `(선택)` 이다.
 *
 * 이 파일이 지키는 불변식:
 *  - 「채워진 것」이 보여주는 항목은 정확히 아홉 가지(`FIELD_KEYS`)다. 안전 세 가지는 그 밖이다.
 *  - 꼭 골라야 하는 항목은 `REQUIRED_FIELDS` 하나가 정한다. 화면마다 따로 적지 않는다.
 *  - 넘어가도 되는지는 `firstFault` 하나가 판정한다. 「다음」도 「이대로 만들기」도 이것을 읽는다.
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

/** 「채워진 것」이 보여주는 아홉 가지 — 항목 옆 표시와 1:1 로 맞물린다. */
export const FIELD_KEYS = [
  'subject', 'grade', 'name', 'tone', 'files', 'scope', 'style', 'wrong', 'classes',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type BotDraft = {
  subject: SubjectId | null;
  grade: string;
  name: string;
  tone: ToneId;
  files: UploadedFile[];
  scope: ScopeLevel;
  style: StyleId;
  wrong: WrongId;
  /**
   * 이 봇을 넣을 학급 id 목록 (`classroomChoices` 의 `id`) — 라벨이 아니다.
   * 배정의 단위는 **(봇, 반) 짝**이고(참여 코드가 `botId`·`classroomId` 를 함께 가리킨다),
   * 여기서 봇 축은 「이 드래프트가 만드는 봇」으로 암묵적이다 — 드래프트 하나가 봇 하나다.
   * 밖으로 넘길 때는 `classAssignments()` 로 봇 축을 붙여 짝으로 만든다.
   */
  classes: string[];
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

/** 답 범위 이름은 `lib/mock` 의 `scopeMeta` 하나만 쓴다 — 봇 관리 화면과 어긋나면 안 된다. */
export { scopeMeta };
export type { ScopeLevel };

/** 봇을 만든 뒤에 고를 수 있는 반. */
/**
 * 반 선택지 — 교사의 **학급 목록**(`lib/mock/classbot-classrooms.ts`)에서 파생한다.
 *
 * 봇에 붙은 학급(`BotOps.classrooms`)에서 뽑으면 **아직 어느 봇에도 안 붙은 학급을 고를 수 없다** —
 * 교사가 첫 봇을 만들 때 고를 반이 하나도 없게 된다. 학급은 `lib/db/schema.ts` 의 `classrooms`
 * 테이블이 잡은 대로 봇과 독립된 자원이므로, 그 목록에서 파생하는 것이 맞다.
 *
 * 라벨을 여기서 새로 지어내지 않는다 — 참여 코드(`class-codes.ts`)·운영 화면과 같은
 * id·label 을 써야 같은 반을 두 이름으로 부르지 않는다.
 */
export type ClassroomChoice = { id: string; label: string };

export const classroomChoices: ClassroomChoice[] = teacherClassrooms.map(({ id, label }) => ({ id, label }));

/** 고정 줄 — 모든 봇에 늘 켜져 있어 교사가 정할 것이 없다. */
/**
 * 배정 한 건 — 참여 코드가 가리키는 단위와 같다 (`join_codes` 의 `bot_id`·`classroom_id`).
 * 한 반에 여러 봇이 붙는 것이 정상이므로 반 id 만으로는 배정을 표현할 수 없다.
 */
export type ClassAssignment = { botId: string; classroomId: string };

/**
 * 드래프트의 반 목록에 봇 축을 붙여 배정 짝으로 만든다.
 * 봇 id 는 봇이 실제로 만들어질 때 정해지므로 밖에서 받는다 — 지금은 데모라 저장하지 않지만,
 * 운영 화면·참여 코드에 이어 붙일 때 이 함수가 경계가 된다.
 */
export function classAssignments(draft: BotDraft, botId: string): ClassAssignment[] {
  return draft.classes.map((classroomId) => ({ botId, classroomId }));
}

/** 학급 id → 교사·학생이 같이 보는 반 이름. 모르는 id 는 그대로 보여준다(감추지 않는다). */
export function classroomLabel(id: string): string {
  return classroomChoices.find((c) => c.id === id)?.label ?? id;
}

export const alwaysOnSafety = ['개인정보 가리기', '위험한 말 막기', '위기 신호 알림'] as const;

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

/* ─── 항목이 사는 자리 ─── */

/**
 * 항목이 어느 마당에 사는가. 「채워진 것」의 줄과 관문 판정이 **같은 표**를 읽는다 —
 * 두 벌로 두면 마당 2·3 에 필수가 생겼을 때 한쪽만 고쳐져 어긋난다.
 */
export const FIELD_GROUP: Record<FieldKey, GroupNo> = {
  subject: 1,
  grade: 1,
  name: 1,
  tone: 1,
  files: 2,
  scope: 2,
  style: 3,
  wrong: 3,
  classes: 4,
};

/** 만들면서 지나는 마당(1~3)인가. 4 는 만든 뒤라 지나는 자리가 아니다. */
export function isBuildYard(group: GroupNo): group is YardNo {
  return group !== 4;
}

/* ─── 항목 이름 옆 표시 ─── */

/**
 * 꼭 골라야 하는 항목과, 비었을 때 하는 말.
 * 기본값이 없어 비워 두면 봇을 만들 수 없는 것 — 지금은 과목 하나뿐이다.
 * 나머지 여덟은 기본값이 있어 `(선택)` 이 붙는다.
 *
 * **필수 목록이 이 표에서 나온다.** 목록과 문구를 따로 두면 필수를 늘리면서 문구를 빠뜨려
 * 「왜 막혔는지 말하지 않는 관문」이 생긴다.
 */
const REQUIRED_MESSAGE: Partial<Record<FieldKey, string>> = {
  subject: '과목을 골라야 봇을 만들 수 있어요.',
};

export const REQUIRED_FIELDS: readonly FieldKey[] = FIELD_KEYS.filter((f) => f in REQUIRED_MESSAGE);

export function isRequired(field: FieldKey): boolean {
  return REQUIRED_FIELDS.includes(field);
}

/* ─── 넘어가도 되는가 ─── */

/**
 * 앞을 막는 항목과 왜 막혔는지.
 * 「다음」과 「이대로 만들기」가 **같은 판정**을 읽는다 — 두 벌로 두면 한쪽만 막게 된다.
 */
export type Fault = {
  field: FieldKey;
  /** 그 항목이 사는 마당 — 막을 때 여기로 돌려보낸다 */
  yard: YardNo;
  message: string;
};

/**
 * 비워도 되지만 **적을 거면** 지켜야 할 규칙. 필수와 다른 갈래다 —
 * 비워 두는 것과 아무렇게나 적는 것은 다르다.
 */
const FIELD_RULE: Partial<Record<FieldKey, { ok: (draft: BotDraft) => boolean; message: string }>> = {
  name: { ok: isNameValid, message: '이름은 두 글자에서 서른 글자 사이로 적어 주세요.' },
};

/**
 * 값이 차 있는가 — 필수 판정의 잣대.
 * 기본값이 있는 항목(학년·말투·답 범위·평소에·틀렸을 때)은 늘 차 있어 여기서 걸리지 않는다.
 */
function isFilled(draft: BotDraft, field: FieldKey): boolean {
  switch (field) {
    case 'subject': return draft.subject !== null;
    case 'name': return draft.name.trim().length > 0;
    case 'files': return draft.files.length > 0;
    case 'classes': return draft.classes.length > 0;
    default: return true;
  }
}

/** 이 항목이 지금 앞을 막는 까닭. 막지 않으면 null. */
function faultOf(draft: BotDraft, field: FieldKey): Fault | null {
  const group = FIELD_GROUP[field];
  // 만든 뒤(4)에 고르는 「반」은 관문이 아니다 — 돌려보낼 마당이 없다
  if (!isBuildYard(group)) return null;

  const empty = REQUIRED_MESSAGE[field];
  if (empty && !isFilled(draft, field)) return { field, yard: group, message: empty };

  const rule = FIELD_RULE[field];
  if (rule && !rule.ok(draft)) return { field, yard: group, message: rule.message };

  return null;
}

/**
 * 앞을 막는 첫 항목. 다 찼으면 null.
 *
 * `yard` 를 주면 그 마당만 본다(「다음」), 주지 않으면 아홉 가지를 다 본다(「이대로 만들기」).
 * 마당을 하드코딩하지 않고 `FIELD_GROUP` 을 읽으므로 마당 2·3 에 필수가 생겨도 그대로 잡힌다.
 */
export function firstFault(draft: BotDraft, yard?: YardNo): Fault | null {
  for (const field of FIELD_KEYS) {
    if (yard !== undefined && FIELD_GROUP[field] !== yard) continue;
    const fault = faultOf(draft, field);
    if (fault) return fault;
  }
  return null;
}

/**
 * 마당 `from` 에서 `to` 로 **앞으로** 갈 때 앞을 막는 첫 항목. 막지 않으면 null.
 *
 * **앞으로 가는 길은 전부 이 함수를 지난다** — 「다음」도, 위쪽 「단계」를 눌러 건너뛰는 길도.
 * 판정을 두 벌로 두면 한쪽만 막는 창구가 생긴다.
 *
 * 지나치는 마당(`from` … `to - 1`)을 차례로 본다 — 마당 1 에서 3 으로 건너뛰는 것도
 * 마당 2 를 **지나는** 것이라, 마당 2 에 필수가 생기면 그 건너뛰기도 걸려야 한다.
 *
 * 뒤로 가는 길(`to <= from`)은 막지 않는다. 이미 지나온 마당은 필수가 차 있고,
 * 고치러 돌아가는 길을 막으면 교사가 갇힌다.
 */
export function faultBefore(draft: BotDraft, from: YardNo, to: YardNo): Fault | null {
  if (to <= from) return null;
  for (let yard = from; yard < to; yard += 1) {
    const fault = firstFault(draft, yard as YardNo);
    if (fault) return fault;
  }
  return null;
}

/**
 * 막힌 항목으로 초점을 옮길 자리.
 * 화면은 이 id 를 그 항목의 **첫 조작 자리**에 붙인다 — 필수를 늘리면 그 항목에도 붙여야 한다.
 */
export function faultAnchorId(field: FieldKey): string {
  return `bld-${field}`;
}

/* ─── 「채워진 것」 ─── */

export const yardGroups = [
  { group: 1, badge: '1', title: '봇 소개' },
  { group: 2, badge: '2', title: '보고 답할 것' },
  { group: 3, badge: '3', title: '가르치는 법' },
  { group: 4, badge: '·', title: '만든 뒤' },
] as const satisfies readonly { group: GroupNo; badge: string; title: string }[];

/** 마당 셋 — 콘텐츠 위쪽 「단계」가 읽는다. */
export const buildYards = [yardGroups[0], yardGroups[1], yardGroups[2]];

export type SummaryRow = {
  field: FieldKey;
  group: GroupNo;
  label: string;
  value: string;
  /** 아직 값이 없어 안내 문구를 대신 보여주는 줄 — 흐리게 그린다 */
  placeholder: boolean;
};

/** 아홉 줄. 세는 항목과 1:1 로 맞물리도록 「과목」과 「학년」도 따로 센다. */
export function summaryRows(draft: BotDraft, view: BuilderView): SummaryRow[] {
  const subject = draft.subject ? subjectMeta[draft.subject] : null;
  const name = botName(draft);

  // 마당은 `FIELD_GROUP` 하나가 정한다 — 줄마다 적으면 관문 판정과 어긋난다
  const row = (
    field: FieldKey,
    label: string,
    value: string,
    placeholder = false,
  ): SummaryRow => ({ field, group: FIELD_GROUP[field], label, value, placeholder });

  return [
    row('subject', '과목', subject ? subject.label : '아직 안 고름', !subject),
    row('grade', '학년', draft.grade),
    row('name', '이름', name || '과목을 고르면 정해져요', !name),
    row('tone', '말투', toneMeta[draft.tone].label),
    row(
      'files', '수업 자료',
      draft.files.length ? `${draft.files.length}개 올림` : '없음 — 교과서 밖 지식으로 답해요',
      draft.files.length === 0,
    ),
    row('scope', '답 범위', `L${draft.scope} ${scopeMeta[draft.scope].label}`),
    row('style', '평소에', styleMeta[draft.style].label),
    row('wrong', '틀렸을 때', wrongMeta[draft.wrong].label),
    row(
      'classes', '반',
      draft.classes.length
        ? draft.classes.map(classroomLabel).join(' · ')
        : view === 'done' ? '아직 안 넣음' : '만든 뒤에 골라요',
      draft.classes.length === 0,
    ),
  ];
}
