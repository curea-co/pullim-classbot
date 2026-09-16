/**
 * 교사 마켓 — 공유 진입점이 **이 화면에** 있는지(#351 리뷰 S1).
 *
 * 내 수업방 카드가 정본을 읽게 되면서 공유 칸이 거기서 빠졌다. 그 칸이 여기로 왔고, 이 화면이 더는 교사를
 * 「내 수업방에서 올리기」로 보내지 않는 것을 못박는다. 공유 축은 같은 오리진(`useTeacherClassrooms` ·
 * `usePublishBot`) 그대로다 — 정본 반 id 는 여기 오지 않는다.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { TeacherClassroomItem } from '@/hooks/api/types';
import { MarketplaceWorkspace } from '../marketplace-workspace';

function room(botId: string | null, isPublished = false): TeacherClassroomItem {
  return {
    classroomId: `cr_${botId ?? 'empty'}`,
    label: '고2 미적분 A반',
    organization: '풀림',
    botId,
    botName: botId ? '수학이 형' : null,
    subject: '수학Ⅱ',
    grade: '고2',
    studentCount: 0,
    joinCode: null,
    joinCodeExpiresAt: null,
    isPublished,
    publishedAt: isPublished ? '2026-09-01T00:00:00.000Z' : null,
    publishBlurb: isPublished ? '차근차근 짚어 주는 봇' : null,
  };
}

let classrooms: TeacherClassroomItem[] = [];
let classroomsError: ApiClientError | null = null;
let classroomsPending = false;
jest.mock('@/hooks/api/classroom', () => ({
  useTeacherClassrooms: () => ({
    data: classroomsError || classroomsPending ? undefined : { classrooms },
    isPending: classroomsPending,
    isError: classroomsError !== null,
    error: classroomsError,
  }),
}));

const publishMutate = jest.fn();
const unpublishMutate = jest.fn();
jest.mock('@/hooks/api/marketplace', () => ({
  useMarketplaceBots: () => ({ data: { bots: [] }, error: null, isError: false, isPending: false, refetch: jest.fn() }),
  usePublishBot: () => ({ mutate: publishMutate, isPending: false, isError: false, error: null }),
  useUnpublishBot: () => ({ mutate: unpublishMutate, isPending: false }),
}));

beforeEach(() => {
  classrooms = [];
  classroomsError = null;
  classroomsPending = false;
  publishMutate.mockClear();
  unpublishMutate.mockClear();
});

describe('내 봇 공유 절', () => {
  it('봇이 있는 반마다 공유 칸이 서고, 봇 없는 빈 반은 세우지 않는다', () => {
    classrooms = [room('cb_001'), room(null), room('cb_002', true)];
    render(<MarketplaceWorkspace />);

    expect(screen.getByTestId('my-bot-sharing')).toBeInTheDocument();
    expect(screen.getByTestId('publish-block-cb_001')).toBeInTheDocument();
    expect(screen.getByTestId('publish-block-cb_002')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^publish-block-/)).toHaveLength(2);
    expect(screen.getByTestId('publish-state-cb_001')).toHaveTextContent('공유 안 함');
    expect(screen.getByTestId('publish-state-cb_002')).toHaveTextContent('공유 중');
  });

  it('「공유하기」가 폼을 열고, 보내면 그 봇 id 와 소개로 같은 오리진 공유 훅을 부른다', () => {
    classrooms = [room('cb_001')];
    render(<MarketplaceWorkspace />);

    fireEvent.click(screen.getByTestId('publish-open-cb_001'));
    fireEvent.change(screen.getByTestId('publish-blurb-input-cb_001'), { target: { value: '개념부터 차근차근' } });
    fireEvent.submit(screen.getByTestId('publish-submit-cb_001').closest('form') as HTMLFormElement);

    expect(publishMutate).toHaveBeenCalledTimes(1);
    expect(publishMutate.mock.calls[0][0]).toEqual({ botId: 'cb_001', blurb: '개념부터 차근차근' });
  });

  it('더는 교사를 내 수업방으로 보내지 않는다 — 공유 버튼이 없는 화면이라서', () => {
    classrooms = [room('cb_001')];
    render(<MarketplaceWorkspace />);

    expect(screen.queryByRole('link', { name: /내 수업방/ })).toBeNull();
    expect(screen.queryByText(/내 수업방 카드에서/)).toBeNull();
    expect(screen.getByText(/위 「내 봇 공유」에서 봇을 올리면/)).toBeInTheDocument();
  });

  it('봇이 있는 반이 없으면 빈 상태 — 공개 목록은 그대로 그린다', () => {
    classrooms = [room(null)];
    render(<MarketplaceWorkspace />);

    expect(screen.getByText('공유할 봇이 아직 없어요')).toBeInTheDocument();
    expect(screen.queryByTestId(/^publish-block-/)).toBeNull();
  });

  it('401·403 이면 절을 조용히 비운다 — 마켓 목록은 그대로', () => {
    classroomsError = new ApiClientError('로그인이 필요합니다.', 401, 'AUTH_REQUIRED');
    render(<MarketplaceWorkspace />);

    expect(screen.queryByTestId('my-bot-sharing')).toBeNull();
    expect(screen.queryByTestId('my-bot-sharing-error')).toBeNull();
  });

  it('진짜 장애(5xx)는 절 안에서 말한다', () => {
    classroomsError = new ApiClientError('서버 오류', 500, 'INTERNAL');
    render(<MarketplaceWorkspace />);

    expect(screen.getByTestId('my-bot-sharing-error')).toHaveTextContent('서버 오류');
  });
});
