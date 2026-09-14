/**
 * 내 수업방 — 갓 만든 반 배너가 **지금 살아 있는 코드**를 보여 주는지.
 *
 * 참여 코드 다시 내기는 되돌릴 수 없다 — 새 코드가 나오는 순간 옛 코드는 못 쓴다. 그런데
 * 배너가 만들던 순간의 스냅샷을 들고 있으면, 배너 안에서 코드를 다시 내도 큰 글자는 죽은
 * 코드로 남는다. 교사가 그 값을 학생에게 건네면 아무도 못 들어온다.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ClassroomWorkspace } from '../classroom-workspace';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { TeacherClassroomItem } from '@/hooks/api/types';

const CLASSROOM_ID = 'cr_1';
/** 만들던 순간 받은 코드 — 그 뒤 다시 내면 죽는다. */
const SNAPSHOT_CODE = 'OLD111';
/** 목록이 들고 있는 지금 코드. */
const LIVE_CODE = 'NEW999';

function room(joinCode: string | null): TeacherClassroomItem {
  return {
    classroomId: CLASSROOM_ID,
    label: '고2 미적분 A반',
    organization: '풀림',
    botId: 'cb_001',
    botName: '수학이 형',
    subject: '수학Ⅱ',
    grade: '고2',
    studentCount: 0,
    joinCode,
    isPublished: false,
    publishedAt: null,
    publishBlurb: null,
  };
}

let classrooms: TeacherClassroomItem[] = [];
/** 목록 조회 상태 — 데모(401)·장애(5xx)를 세우려면 갈아 끼울 수 있어야 한다. */
let queryError: unknown = null;
jest.mock('@/hooks/api/classroom', () => ({
  useTeacherClassrooms: () => ({
    data: { classrooms },
    isPending: false,
    isError: queryError !== null,
    error: queryError,
  }),
}));

/* 배너가 **어떤 code 를 넘기는지**가 이 테스트의 관심사라, 코드 상자는 값만 비춘다. */
jest.mock('../join-code-block', () => ({
  JoinCodeBlock: ({ code, size }: { code: string | null; size?: 'md' | 'lg' }) => (
    <span data-testid={size === 'lg' ? 'banner-code' : 'card-code'}>{code ?? '없음'}</span>
  ),
}));

/* 「만들었다」를 눌러 배너를 띄우는 자리만 있으면 된다. */
jest.mock('../create-classroom-form', () => ({
  CreateClassroomForm: ({
    onCreated,
  }: {
    onCreated: (c: { classroomId: string; label: string; joinCode: string }) => void;
  }) => (
    <button
      type="button"
      data-testid="fake-create"
      onClick={() =>
        onCreated({ classroomId: CLASSROOM_ID, label: '고2 미적분 A반', joinCode: SNAPSHOT_CODE })
      }
    >
      만들기
    </button>
  ),
}));

jest.mock('../classroom-roster', () => ({ ClassroomRoster: () => null }));
jest.mock('../publish-bot-block', () => ({ PublishBotBlock: () => null }));

beforeEach(() => {
  classrooms = [];
  queryError = null;
});

/** 반을 만든 직후 상태로 만든다 — 배너가 떠 있다. */
function createRoom() {
  render(<ClassroomWorkspace />);
  fireEvent.click(screen.getByTestId('fake-create'));
}

/*
  prod 는 공개 화면이라 방문자에게 세션이 없고 prod-verify 도 쿠키 없이 이 화면을 친다.
  401 을 빨간 카드로 그리면 데모로 들어온 사람에게 이 화면은 언제나 깨져 있다.
*/
describe('비로그인(401)', () => {
  it('고장이 아니라 로그인 안내로 그린다', () => {
    queryError = new ApiClientError('로그인이 필요합니다.', 401, 'AUTH_REQUIRED');
    render(<ClassroomWorkspace />);

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.queryByTestId('classroom-error')).not.toBeInTheDocument();
  });

  it('진짜 장애(5xx)는 그대로 오류로 그린다 — 401 과 한 덩어리로 묶지 않는다', () => {
    queryError = new ApiClientError('서버 오류', 500, 'INTERNAL');
    render(<ClassroomWorkspace />);

    expect(screen.getByTestId('classroom-error')).toBeInTheDocument();
    expect(screen.queryByText('로그인이 필요해요')).not.toBeInTheDocument();
  });
});

describe('갓 만든 수업방 배너', () => {
  it('코드를 다시 내면 배너도 새 코드를 보여 준다 — 스냅샷에 머무르지 않는다', () => {
    createRoom();
    // 코드 다시 내기 성공 → 목록 쿼리가 갱신돼 새 코드가 온 상태.
    classrooms = [room(LIVE_CODE)];
    // 목록 갱신을 화면에 반영시킨다(같은 컴포넌트가 다시 그려지는 것과 같은 자리).
    fireEvent.click(screen.getByTestId('fake-create'));

    expect(screen.getByTestId('banner-code')).toHaveTextContent(LIVE_CODE);
    expect(screen.getByTestId('banner-code')).not.toHaveTextContent(SNAPSHOT_CODE);
  });

  it('목록이 아직 그 방을 모르면 만들 때 받은 코드로 버틴다 — 빈칸을 보이지 않는다', () => {
    createRoom();

    expect(screen.getByTestId('banner-code')).toHaveTextContent(SNAPSHOT_CODE);
  });

  it('배너와 목록 카드가 같은 코드를 말한다', () => {
    createRoom();
    classrooms = [room(LIVE_CODE)];
    fireEvent.click(screen.getByTestId('fake-create'));

    expect(screen.getByTestId('banner-code')).toHaveTextContent(LIVE_CODE);
    expect(screen.getByTestId('card-code')).toHaveTextContent(LIVE_CODE);
  });
});
