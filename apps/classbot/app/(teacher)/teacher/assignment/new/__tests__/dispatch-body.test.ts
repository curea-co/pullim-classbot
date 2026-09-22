/**
 * 출제 화면 문항 → 정본 본문(`DispatchAssignmentQuestionDto`) 변환 — 서버 검증(`assertAnswerKeyValid`)이 정한 모양을
 * 그대로 내는지. mc 는 정수 인덱스, numeric 은 number, short 는 문자열, essay 는 정답키 없음.
 */
import { makeQuestion, type DraftQuestion } from '../question-editor';
import { invalidNumericAnswerNumbers, parseNumericAnswer, toDispatchQuestions } from '../dispatch-body';

describe('toDispatchQuestions — 정본 문항 모양', () => {
  it('order 는 0부터, prompt 는 공백을 떼고, 유형별 정답키 타입이 서버 검증과 맞는다', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('mc', 40), prompt: ' 객관식 ', options: ['가', '', '나', '다'], answerIndex: 2 },
      { ...makeQuestion('numeric', 30), prompt: '수치', answerKey: ' 33,400 ' },
      { ...makeQuestion('short', 20), prompt: '단답', answerKey: ' 증발 ' },
      {
        ...makeQuestion('essay', 10),
        prompt: '서술',
        rubric: [{ criterion: '근거를 썼어요', weight: 5 }, { criterion: '', weight: 5 }],
      },
    ];
    const body = toDispatchQuestions(drafts);

    expect(body.map((q) => q.order)).toEqual([0, 1, 2, 3]);
    expect(body[0]).toEqual({ order: 0, type: 'mc', prompt: '객관식', options: ['가', '나', '다'], answerKey: 1 });
    // 빈 보기는 버리고 정답은 글자를 따라간다('나' = 새 인덱스 1) — 인덱스가 밀려 오답이 되지 않게.
    expect(typeof body[0].answerKey).toBe('number');
    // numeric 은 number — 문자열로 보내면 서버가 400 이다.
    expect(body[1]).toEqual({ order: 1, type: 'numeric', prompt: '수치', answerKey: 33400 });
    expect(body[2]).toEqual({ order: 2, type: 'short', prompt: '단답', answerKey: '증발' });
    // essay 는 정답키가 없다 — 배점·루브릭도 정본에 칸이 없어 실리지 않는다.
    expect(body[3]).toEqual({ order: 3, type: 'essay', prompt: '서술' });
    expect(body[3]).not.toHaveProperty('answerKey');
    expect(body.some((q) => 'points' in q || 'rubric' in q)).toBe(false);
  });

  it('고른 정답 보기가 비어 있으면 정답을 싣지 않는다 — 0번으로 되돌리지 않는다', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('mc', 100), prompt: '객관식', options: ['가', '나', '', ''], answerIndex: 2 },
    ];
    const [q] = toDispatchQuestions(drafts);
    expect(q.options).toEqual(['가', '나']);
    expect(q).not.toHaveProperty('answerKey');
  });

  it('숫자로 읽히지 않는 수치 정답은 싣지 않는다 — 서버가 400 으로 거절할 값을 만들지 않는다', () => {
    const [q] = toDispatchQuestions([{ ...makeQuestion('numeric', 100), prompt: '수치', answerKey: '둘' }]);
    expect(q).not.toHaveProperty('answerKey');
  });
});

describe('parseNumericAnswer · invalidNumericAnswerNumbers', () => {
  it('쉼표·공백·소수 표기를 숫자로 읽고, 글자는 null', () => {
    expect(parseNumericAnswer('33,400')).toBe(33400);
    expect(parseNumericAnswer(' 2.5 ')).toBe(2.5);
    expect(parseNumericAnswer('-3')).toBe(-3);
    expect(parseNumericAnswer('둘')).toBeNull();
    expect(parseNumericAnswer('')).toBeNull();
  });

  it('적혀 있는데 숫자가 아닌 수치 문항 번호만 센다 — 빈 것은 정답 검사가 따로 말한다', () => {
    const drafts: DraftQuestion[] = [
      { ...makeQuestion('numeric', 25), prompt: 'a', answerKey: '둘' },
      { ...makeQuestion('numeric', 25), prompt: 'b', answerKey: '' },
      { ...makeQuestion('numeric', 25), prompt: 'c', answerKey: '42' },
      { ...makeQuestion('short', 25), prompt: 'd', answerKey: '글자여도 된다' },
    ];
    expect(invalidNumericAnswerNumbers(drafts)).toEqual([1]);
  });
});
