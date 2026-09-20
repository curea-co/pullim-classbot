/**
 * 라이브 store — **질문 큐에 사람 이름이 담기지 않는다.**
 *
 * 이 store 는 통째로 localStorage(`pullim-live-sessions`)에 적히고 **로그아웃해도 남는다.**
 * 세션 이름은 본인-조회 한정 PII 라(pullim-api `me-response.dto.ts` — 「KCB 실명 … 본인-조회
 * 한정 · 로그/토큰 금지」) 디스크에 닿으면 안 된다. 그래서 질문은 `studentId` 로 담고 이름은
 * 화면이 그릴 때만 쓴다. 이 파일이 그 경계를 고정한다 — 되돌리면 빨개진다.
 */
import { useLiveStore, type PendingQuestion } from '../live';

beforeEach(() => {
  useLiveStore.setState({ active: {} });
});

describe('useLiveStore.submitQuestion — id 로 담는다', () => {
  it('질문 줄에 이름 칸이 없다 — 담기는 것은 신원 id 다', () => {
    const { start, submitQuestion } = useLiveStore.getState();
    start('bot_1');
    const qid = submitQuestion('bot_1', '46638489-5c2f-4d6a-9b21-000000000001', '이 부분 왜 그래요?');

    const q = useLiveStore.getState().active.bot_1?.pendingQuestions[0] as PendingQuestion;
    expect(q.id).toBe(qid);
    expect(q.studentId).toBe('46638489-5c2f-4d6a-9b21-000000000001');
    expect(q.text).toBe('이 부분 왜 그래요?');
    // 저장되는 모양 자체에 이름 칸이 없다 — 「이름을 안 넣었다」가 아니라 「넣을 자리가 없다」.
    expect(Object.keys(q).sort()).toEqual(['id', 'status', 'studentId', 'submittedAt', 'text']);
  });

  it('디스크로 나가는 직렬화에도 이름이 없다', () => {
    const { start, submitQuestion } = useLiveStore.getState();
    start('bot_1');
    submitQuestion('bot_1', 'student-uuid', '질문이요');

    // persist 가 적는 것과 같은 모양(JSON) — 여기에 사람 이름이 섞이면 공용 PC 에 남는다.
    const serialized = JSON.stringify(useLiveStore.getState().active);
    expect(serialized).not.toContain('studentName');
    expect(serialized).toContain('student-uuid');
  });

  it('모더레이션은 id 를 그대로 둔 채 status 만 바꾼다', () => {
    const { start, submitQuestion, moderateQuestion } = useLiveStore.getState();
    start('bot_1');
    const qid = submitQuestion('bot_1', 'student-uuid', '질문이요');
    moderateQuestion('bot_1', qid, 'shared');

    const q = useLiveStore.getState().active.bot_1?.pendingQuestions[0] as PendingQuestion;
    expect(q.status).toBe('shared');
    expect(q.studentId).toBe('student-uuid');
  });
});
