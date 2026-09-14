/** @jest-environment node */
/**
 * 학부모에게 나가도 되는 칸을 못박는 덫(tripwire).
 *
 * 지금 `GET /api/parent/children` 은 동의 게이트(#271) 전이라 **내용을 아예 내보내지 않는다.**
 * 그래서 이 매퍼는 아직 라우트에서 호출되지 않는다. 그런데도 테스트를 두는 이유:
 *
 * #271 이 동의 조회를 얹는 순간 「어떤 칸이 나가도 되는가」를 다시 정해야 하고, 그때 가장
 * 쉬운 길은 `{ ...row }` 전개다. 그 전개가 바로 이 PR 이 막은 구멍이다 — 행에는 정답률과
 * 풀이 딥링크와 오답 문항 키가 들어 있고, 반 단위 발사 행에는 **다른 아이들의 user id** 까지
 * 실려 있다. 05 § 11.4 는 이 축이 내보낼 것을 「받은 과제 현황 **(답안·점수 제외)**」으로
 * 못박았다.
 *
 * 이 파일이 빨개지는 경우는 둘뿐이다 — 누가 매퍼에 칸을 더했거나, 스키마에 컬럼이 늘었는데
 * 그것이 나가도 되는지 아무도 안 정했거나. 둘 다 **사람이 판단할 자리**다.
 */

import { toParentAssignment } from '@/app/api/_lib/parent-views';
import type { assignments } from '@/lib/db/schema';

/** 나가면 안 되는 것을 전부 채워 넣은 행 — 새는지 보려면 실제로 담겨 있어야 한다. */
const ROW: typeof assignments.$inferSelect = {
  id: 'as_1',
  botId: 'cb_001',
  studentId: null,
  title: '미적분 1단원',
  scope: '수학Ⅱ > 미분',
  subject: '수학Ⅱ',
  grade: '고2',
  chapterFrom: '수학Ⅱ > 미분',
  chapterTo: '수학Ⅱ > 미분',
  achievementCodes: ['수-미분-1'],
  questionCount: 5,
  difficulty: '중',
  mode: 'practice',
  scopeOverride: null,
  source: 'teacher-assigned',
  assignedBy: '수학이 형',
  assignedAtLabel: '방금 발사',
  dueLabel: '내일 22:00',
  dDay: 'D-1',
  completedCount: 2,
  recentAccuracy: 87,
  state: 'in-progress',
  reasonHint: '부호 변화에서 막혔어요',
  solveHref: '/classbot/assignment/as_1/solve?step=1',
  targetStudentIds: ['child_1', 'child_2'],
  dispatchStatus: 'sent',
  createdBy: 'teacher_001',
  dispatchedAt: new Date('2026-09-01T00:00:00Z'),
  examTimeLimitMin: null,
  requizQuestionIds: ['q7'],
};

describe('toParentAssignment — 학부모 응답의 칸 경계', () => {
  it('현황 칸은 그대로 옮긴다', () => {
    expect(toParentAssignment(ROW)).toMatchObject({
      id: 'as_1',
      title: '미적분 1단원',
      subject: '수학Ⅱ',
      state: 'in-progress',
      // 「몇 개를 풀었나」는 점수가 아니라 현황 그 자체다 — 표가 내보내라고 한 것이 이것이다.
      completedCount: 2,
      dDay: 'D-1',
      dispatchedAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it.each([
    ['recentAccuracy', '정답률 — 표가 「점수 제외」로 명시한 바로 그것'],
    ['solveHref', '풀이 워크스페이스 딥링크 — 현황이 아니라 답안으로 가는 문'],
    ['requizQuestionIds', '오답 문항 키 — 틀린 문제를 그대로 가리킨다'],
    ['targetStudentIds', '다른 아이들의 user id'],
    ['reasonHint', '자녀의 약한 지점을 적은 문장'],
    ['studentId', '내부 식별자'],
    ['createdBy', '운영 필드'],
    ['source', '운영 필드'],
    ['dispatchStatus', '운영 필드'],
    ['achievementCodes', '학부모 화면이 쓰지 않는다'],
    ['scopeOverride', '운영 필드'],
    ['examTimeLimitMin', '운영 필드'],
  ])('`%s` 는 나가지 않는다 (%s)', (field) => {
    expect(toParentAssignment(ROW)).not.toHaveProperty(field);
  });

  it('직렬화해도 남의 아이 id 가 없다 — 이름을 바꿔 실어도 잡는다', () => {
    expect(JSON.stringify(toParentAssignment(ROW))).not.toContain('child_2');
  });

  it('칸 수를 못박는다 — 늘리려면 이 숫자를 손으로 고치게 한다', () => {
    // 무심코 한 칸 더해도 조용히 지나가지 않게, 개수 자체를 계약으로 둔다.
    expect(Object.keys(toParentAssignment(ROW))).toHaveLength(16);
  });
});
