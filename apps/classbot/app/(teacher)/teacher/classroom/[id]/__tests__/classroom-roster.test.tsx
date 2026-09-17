/**
 * 반 상세 「명단」 탭 — 정본 명단(`GET /classes/:classId/members`)을 표로 그린다(계획 PR 5b).
 *
 * 못박는 것: 머리글 다섯(이름 · 들어온 날 · 마지막 활동 · 활성 · 보내기 — 다섯째는 계획 PR 5c 의 개입 버튼 자리로,
 * 그 판의 동작은 `./intervention-dialog.test.tsx` 가 본다) · 이름이 비면 지어내지 않는 것 · 마지막 활동을 분·시간·일로
 * 끊고 그보다 오래면 들어온 날과 같은 시간대(Asia/Seoul)의 날짜인 것 · 비었을 때/남의 반(403)/없는 반(404)/장애 를
 * 갈라 말하는 것.
 */

import { render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { ClassMemberDto } from '@/lib/api/classbot-dto';
import { ClassroomRoster, formatEnrolledAt, lastActiveLabel } from '../classroom-roster';

let members: ClassMemberDto[] = [];
let error: ApiError | null = null;
let pending = false;
const refetch = jest.fn();
jest.mock('@/hooks/api/classroom', () => ({
  useClassMembers: () => ({
    data: error || pending ? undefined : members,
    isPending: pending,
    isSuccess: !pending && error === null,
    isError: error !== null,
    error,
    refetch,
  }),
}));

function member(over: Partial<ClassMemberDto> & { memberId: string }): ClassMemberDto {
  return {
    membershipId: `mem_${over.memberId}`, displayName: '김학생', enrolledAt: '2026-09-10T03:00:00.000Z', isActive: true,
    lastActiveAt: null, ...over,
  };
}

beforeEach(() => {
  members = [];
  error = null;
  pending = false;
  refetch.mockClear();
});

describe('lastActiveLabel', () => {
  const now = new Date('2026-09-17T12:00:00.000Z').getTime();
  it.each([
    [null, '아직 없음'],
    ['not-a-date', '—'],
    ['2026-09-17T11:59:40.000Z', '방금'],
    ['2026-09-17T11:35:00.000Z', '25분 전'],
    ['2026-09-17T08:00:00.000Z', '4시간 전'],
    ['2026-09-14T12:00:00.000Z', '3일 전'],
  ])('%s → %s', (iso, label) => {
    expect(lastActiveLabel(iso, now)).toBe(label);
  });

  it('일주일이 넘으면 한국 날짜로 — UTC 저녁은 서울에서 다음 날이다', () => {
    expect(lastActiveLabel('2026-09-01T12:00:00.000Z', now)).toBe('9/1');
    expect(lastActiveLabel('2026-08-31T20:00:00.000Z', now)).toBe('9/1');
  });
});

describe('formatEnrolledAt', () => {
  it('한국 날짜로 — 못 읽으면 —', () => {
    expect(formatEnrolledAt('2026-09-10T03:00:00.000Z')).toBe('9월 10일');
    expect(formatEnrolledAt('x')).toBe('—');
  });
});

describe('ClassroomRoster', () => {
  it('머리글 다섯을 가진 표에 줄마다 이름 · 들어온 날 · 마지막 활동 · 활성 · 보내기를 그린다', () => {
    members = [
      member({ memberId: 'stu_1', displayName: '김학생', lastActiveAt: new Date(Date.now() - 5 * 60_000).toISOString() }),
      member({ memberId: 'stu_2', displayName: '이학생', isActive: false }),
    ];
    render(<ClassroomRoster classId="cls_1" classroomName="고2 미적분 A반" />);

    expect(screen.getByRole('table', { name: '고2 미적분 A반 명단 2명' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      '이름', '들어온 날', '마지막 활동', '활성', '보내기',
    ]);
    expect(screen.getByRole('heading', { level: 2, name: '명단 2명' })).toBeInTheDocument();

    const a = screen.getByTestId('classroom-member-stu_1');
    expect(a).toHaveTextContent('김학생');
    expect(a).toHaveTextContent('9월 10일');
    expect(screen.getByTestId('classroom-member-active-stu_1')).toHaveTextContent('5분 전');
    expect(a).toHaveTextContent('활성');

    const b = screen.getByTestId('classroom-member-stu_2');
    expect(screen.getByTestId('classroom-member-active-stu_2')).toHaveTextContent('아직 없음');
    expect(b).toHaveTextContent('비활성');
  });

  it('표시명이 비면(탈퇴·부재) 지어내지 않는다 — 「이름 없음」과 sub 앞 여덟 자', () => {
    members = [member({ memberId: 'a1b2c3d4e5f6', displayName: null })];
    render(<ClassroomRoster classId="cls_1" classroomName="반" />);

    const row = screen.getByTestId('classroom-member-a1b2c3d4e5f6');
    expect(row).toHaveTextContent('이름 없음');
    expect(row).toHaveTextContent('a1b2c3d4');
    expect(row).not.toHaveTextContent('a1b2c3d4e5f6');
  });

  it('아무도 없으면 빈 상태 — 코드를 알려 주라고 한다', () => {
    render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(screen.getByText('아직 들어온 학생이 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('읽는 중이면 뼈대만', () => {
    pending = true;
    const { container } = render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('남의 반(403)과 없는 반(404)을 갈라 말한다 · 장애(5xx)는 다시 시도', () => {
    error = new ApiError('forbidden', 403);
    const { unmount } = render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(screen.getByText('이 반의 명단은 볼 수 없어요')).toBeInTheDocument();
    unmount();

    error = new ApiError('not found', 404);
    const second = render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(screen.getByText('없는 반이에요')).toBeInTheDocument();
    second.unmount();

    error = new ApiError('boom', 500);
    render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    screen.getByRole('button', { name: '다시 시도' }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('401 은 머리가 이미 말했다 — 제목만 두고 조용하다', () => {
    error = new ApiError('unauthorized', 401);
    render(<ClassroomRoster classId="cls_1" classroomName="반" />);
    expect(screen.getByRole('heading', { level: 2, name: '명단' })).toBeInTheDocument();
    expect(screen.queryByText(/볼 수 없어요|없는 반|불러오지/)).toBeNull();
  });
});
