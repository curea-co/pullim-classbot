/**
 * 개입 순수 함수 — 정본 DTO 를 화면 모양으로 옮기는 자리(계획 PR 5c · `lib/interventions.ts`).
 *
 * 못박는 것: 유형별 딥링크(과제 있음 / comment / 과제 없는 crisis) · 모르는 유형이 이름을 지어내지 않는 것 ·
 * 낙관 갱신 둘이 원본을 건드리지 않는 것 · 「미제출 = 명단 − 제출자」에서 비활성 멤버가 빠지는 것 ·
 * 일괄 요약이 부분 성공·전부 실패·401 중단을 갈라 말하는 것.
 */
import type { ClassMemberDto, InterventionDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';
import {
  bulkRemindSummary,
  interventionHref,
  interventionMeta,
  latestCommentFor,
  markAllReadInInbox,
  markReadInInbox,
  memberLabel,
  remindDefaultMessage,
  sortedInbox,
  unreadCount,
  unsubmittedMembers,
} from '@/lib/interventions';

function item(over: Partial<InterventionDto> & { id: string }): InterventionDto {
  return {
    type: 'remind', botId: 'cls_1', studentId: 'sub-1', assignmentId: 'asg_1', message: '메시지',
    createdAt: '2026-09-17T01:00:00.000Z', readAt: null, ...over,
  };
}
function member(over: Partial<ClassMemberDto> & { memberId: string }): ClassMemberDto {
  return {
    membershipId: `mem_${over.memberId}`, displayName: '김학생', enrolledAt: '2026-09-10T00:00:00.000Z',
    isActive: true, lastActiveAt: null, ...over,
  };
}
function submission(studentId: string): SubmissionsViewDto {
  return {
    submissionId: `sub_${studentId}`, studentId, scorePercent: null, gradedAt: null,
    submittedAt: '2026-09-16T09:00:00.000Z', answers: {},
  };
}

describe('interventionHref', () => {
  it('과제가 있으면 그 과제로 — comment 만 결과 화면이다', () => {
    expect(interventionHref(item({ id: 'i1', type: 'remind' }))).toBe('/classbot/assignment/asg_1');
    expect(interventionHref(item({ id: 'i2', type: 'requiz' }))).toBe('/classbot/assignment/asg_1');
    expect(interventionHref(item({ id: 'i3', type: 'comment' }))).toBe('/classbot/assignment/asg_1/result');
  });

  it('과제가 없으면 그 반 대화로 — botId 는 반 id 라 `?classId=` 가 정본 파라미터다', () => {
    expect(interventionHref(item({ id: 'i4', type: 'crisis', assignmentId: null }))).toBe(
      '/classbot/chat?classId=cls_1',
    );
  });

  it('id 는 주소에 안전하게 실린다', () => {
    expect(interventionHref(item({ id: 'i5', assignmentId: 'a b/c' }))).toBe('/classbot/assignment/a%20b%2Fc');
  });
});

describe('interventionMeta', () => {
  it('학생이 읽는 글자는 진단하지 않는다 — crisis 는 「선생님 응원」이다', () => {
    expect(interventionMeta('crisis').label).toBe('선생님 응원');
    expect(interventionMeta('remind').label).toBe('과제 리마인드');
    expect(interventionMeta('comment').label).toBe('선생님 한마디');
  });

  it('모르는 유형은 이름을 지어내지 않고 「알림」으로 떨어진다', () => {
    expect(interventionMeta('nudge').label).toBe('알림');
  });
});

describe('인박스 — 정렬 · 미읽음 · 낙관 갱신', () => {
  const items = [
    item({ id: 'old', createdAt: '2026-09-16T01:00:00.000Z', readAt: '2026-09-16T02:00:00.000Z' }),
    item({ id: 'new', createdAt: '2026-09-17T05:00:00.000Z' }),
  ];

  it('최신이 위다', () => {
    expect(sortedInbox(items).map((i) => i.id)).toEqual(['new', 'old']);
  });

  it('미읽음만 센다', () => {
    expect(unreadCount(items)).toBe(1);
    expect(unreadCount([])).toBe(0);
  });

  it('한 건 읽음 — 원본은 그대로, 이미 읽은 건은 시각이 안 바뀐다', () => {
    const next = markReadInInbox(items, 'new', '2026-09-17T09:00:00.000Z');
    expect(next.find((i) => i.id === 'new')?.readAt).toBe('2026-09-17T09:00:00.000Z');
    expect(items.find((i) => i.id === 'new')?.readAt).toBeNull();

    const again = markReadInInbox(next, 'old', '2026-09-17T09:00:00.000Z');
    expect(again.find((i) => i.id === 'old')?.readAt).toBe('2026-09-16T02:00:00.000Z');
  });

  it('모두 읽음 — 미읽음만 채운다', () => {
    const next = markAllReadInInbox(items, '2026-09-17T09:00:00.000Z');
    expect(next.every((i) => i.readAt !== null)).toBe(true);
    expect(next.find((i) => i.id === 'old')?.readAt).toBe('2026-09-16T02:00:00.000Z');
  });
});

describe('latestCommentFor', () => {
  it('그 과제의 최신 comment 하나 — 없으면 null', () => {
    const items = [
      item({ id: 'c1', type: 'comment', message: '옛 말', createdAt: '2026-09-16T01:00:00.000Z' }),
      item({ id: 'c2', type: 'comment', message: '새 말', createdAt: '2026-09-17T01:00:00.000Z' }),
      item({ id: 'r1', type: 'remind', message: '리마인드' }),
      item({ id: 'c3', type: 'comment', assignmentId: 'asg_2', message: '다른 과제' }),
    ];
    expect(latestCommentFor(items, 'asg_1')?.message).toBe('새 말');
    expect(latestCommentFor(items, 'asg_9')).toBeNull();
    expect(latestCommentFor([], 'asg_1')).toBeNull();
  });
});

describe('unsubmittedMembers · memberLabel', () => {
  it('명단 − 제출자, 비활성은 빼고, 명단 차례 그대로', () => {
    const members = [
      member({ memberId: 's1' }),
      member({ memberId: 's2' }),
      member({ memberId: 's3', isActive: false }),
    ];
    expect(unsubmittedMembers(members, [submission('s2')]).map((m) => m.memberId)).toEqual(['s1']);
    expect(unsubmittedMembers(members, []).map((m) => m.memberId)).toEqual(['s1', 's2']);
  });

  it('이름이 비면 지어내지 않는다 — sub 앞 여덟 자로 구분만 한다', () => {
    expect(memberLabel(member({ memberId: 's1', displayName: '김학생' }))).toBe('김학생');
    expect(memberLabel(member({ memberId: 'abcdefghijkl', displayName: null }))).toBe('이름 없음 abcdefgh');
    expect(memberLabel(member({ memberId: 'abcdefghijkl', displayName: '  ' }))).toBe('이름 없음 abcdefgh');
  });
});

describe('remindDefaultMessage · bulkRemindSummary', () => {
  it('기본 문구에 과제 제목이 들어간다', () => {
    expect(remindDefaultMessage('3단원 연습문제')).toContain('3단원 연습문제');
  });

  it('부분 성공을 「보냈어요」로 뭉개지 않는다', () => {
    expect(bulkRemindSummary({ sent: 3, failed: 0, aborted: 0 })).toBe('3명에게 리마인드를 보냈어요.');
    expect(bulkRemindSummary({ sent: 2, failed: 1, aborted: 0 })).toBe('2명에게 보냈고, 1명은 보내지 못했어요.');
    expect(bulkRemindSummary({ sent: 0, failed: 2, aborted: 0 })).toBe('2명 모두 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
  });

  it('401 로 멈추면 남은 수를 말하고, 그 전에 일어난 일도 삼키지 않는다', () => {
    expect(bulkRemindSummary({ sent: 0, failed: 0, aborted: 3 })).toBe(
      '로그인이 풀려서 남은 3명에게는 못 보냈어요. 다시 로그인한 뒤 보내 주세요.',
    );
    expect(bulkRemindSummary({ sent: 1, failed: 0, aborted: 2 })).toBe(
      '1명에게 보냈어요. 로그인이 풀려서 남은 2명에게는 못 보냈어요. 다시 로그인한 뒤 보내 주세요.',
    );
    // 401 앞에서 다른 까닭으로 실패한 사람이 있으면 그것도 말한다 — 안 그러면 교사가 두 번 보낸다.
    expect(bulkRemindSummary({ sent: 1, failed: 3, aborted: 2 })).toBe(
      '1명에게 보냈어요, 3명은 보내지 못했어요. 로그인이 풀려서 남은 2명에게는 못 보냈어요. 다시 로그인한 뒤 보내 주세요.',
    );
    expect(bulkRemindSummary({ sent: 0, failed: 2, aborted: 1 })).toMatch(/2명은 보내지 못했어요/);
  });
});
