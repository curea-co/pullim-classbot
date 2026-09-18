/**
 * 봇 운영 메인의 「방금 만든 봇」 배너 — `?created=<이름>&rooms=<반 id,…>`.
 *
 * **이 배너의 말은 계획 PR 5d 에서 뒤집혔다.** 빌더가 화면 안 데모였을 때 이 배너는 두 분기 모두
 * 「데모라 이 봇은 저장되지 않아요」로 끝났고, 그때는 그게 사실이었다. 지금은 빌더가
 * `POST /classbot/bots` 로 진짜 만들고 고른 반마다 `PUT /classbot/classes/:classId/bot` 으로 붙인 뒤에야
 * 여기로 온다 — 그 문장을 그대로 두면 **없어졌다고 말하는 봇이 실제로는 서버에 있다.** 교사는 봇이
 * 날아간 줄 알고 같은 봇을 또 만들고, 지우는 문이 없어 그 중복이 남는다.
 *
 * 그래서 이 파일이 재는 것은 둘이다:
 *  - 「저장되지 않는다」는 말이 **어느 분기에도 다시 나타나지 않는 것**(회귀 자물쇠).
 *  - 반 이름을 **정본 목록에서** 찾고, 못 찾으면 **개수로 물러나는 것** — 옛 `classroomLabel` 은 목 학급
 *    표라 모르는 id 를 그대로 돌려줬고, 그러면 교사가 uuid 를 읽는다.
 */
import { render, screen } from '@testing-library/react';
import TeacherClassbotPage from '../page';

/** 주소창 — 테스트마다 갈아 끼운다(공통 stub 은 늘 빈 `URLSearchParams` 라 배너가 안 뜬다). */
let search = '';
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/teacher/classbot',
  useSearchParams: () => new URLSearchParams(search),
}));

/** 내가 운영하는 반 — 배너가 `rooms=` 의 id 를 이름으로 옮길 때 읽는다. */
let operatorClasses: { id: string; name: string }[] = [];
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({ data: operatorClasses, isPending: false, isError: false, error: null }),
}));
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: [], isPending: false, isError: false, error: null }),
}));
/*
  같은 화면의 봇 목록도 정본이다(`GET /classbot/me/bots`). 이 파일은 배너만 보므로 빈 목록으로
  세우되, 훅을 세워 두기는 해야 한다 — 진짜 훅은 `useAuth()` 를 부르고 이 render 에는
  `<AuthProvider>` 가 없다.
*/
jest.mock('@/hooks/api/bot', () => ({
  ...jest.requireActual('@/hooks/api/bot'),
  useMyBots: () => ({ data: [], isPending: false, isError: false, error: null, refetch: jest.fn() }),
}));

beforeEach(() => {
  search = '';
  operatorClasses = [
    { id: 'cls_1', name: '고2 국어 A반' },
    { id: 'cls_2', name: '고2 국어 B반' },
  ];
});

const note = () => screen.queryByTestId('created-banner-note');

describe('방금 만든 봇 배너', () => {
  it('`created` 가 없으면 배너 자체가 없다', () => {
    render(<TeacherClassbotPage />);
    expect(note()).toBeNull();
    expect(screen.queryByText(/방금 만든 봇/)).toBeNull();
  });

  it('반을 골랐으면 그 반 이름으로 「넣었어요」 — 봇이 남아 있다고 말한다', () => {
    search = 'created=%EB%AC%B8%ED%95%99%20%EB%8F%84%EC%9A%B0%EB%AF%B8&rooms=cls_1,cls_2';
    render(<TeacherClassbotPage />);
    expect(screen.getByText('방금 만든 봇: 문학 도우미')).toBeInTheDocument();
    expect(note()).toHaveTextContent('봇을 만들어 고2 국어 A반 · 고2 국어 B반에 넣었어요.');
  });

  it('반을 안 골랐으면 「아직 반에는 안 넣었어요」 — 다음에 할 일을 가리킨다', () => {
    search = 'created=%EB%AC%B8%ED%95%99%20%EB%8F%84%EC%9A%B0%EB%AF%B8&rooms=';
    render(<TeacherClassbotPage />);
    expect(note()).toHaveTextContent('아직 반에는 안 넣었어요');
    expect(note()).toHaveTextContent('「봇」 탭');
  });

  it('이름을 일부만 풀면 개수로 물러선다 — 못 찾은 반이 말없이 사라지지 않는다', () => {
    // 한 반만 이으면 두 반에 넣은 봇이 한 반에만 넣은 것처럼 보인다.
    // 빌더 만든 뒤 화면·반 상세 고르개와 같은 규칙이다 — 네 자리가 한 규칙이다.
    operatorClasses = [{ id: 'cls_1', name: '고2 국어 A반' }];
    search = 'created=%EB%B4%87&rooms=cls_1,cls_2';
    render(<TeacherClassbotPage />);

    expect(note()).toHaveTextContent('봇을 만들어 2개 반에 넣었어요.');
    expect(note()).not.toHaveTextContent('고2 국어 A반');
    expect(note()).not.toHaveTextContent('cls_2');
  });

  it('반 이름을 못 찾으면 개수로 물러난다 — 반 id 를 그대로 보여주지 않는다', () => {
    // 목록을 아직 못 읽었거나, 방금 만든 반이라 목록이 낡았을 때.
    operatorClasses = [];
    search = 'created=%EB%B4%87&rooms=9f1c2d3e-0000-4000-8000-000000000001';
    render(<TeacherClassbotPage />);
    expect(note()).toHaveTextContent('봇을 만들어 1개 반에 넣었어요.');
    expect(note()).not.toHaveTextContent('9f1c2d3e');
  });

  it('어느 분기에도 「저장되지 않아요」라고 말하지 않는다 — 봇은 정본에 남는다', () => {
    for (const rooms of ['', 'cls_1', 'cls_1,cls_2']) {
      search = `created=%EB%B4%87&rooms=${rooms}`;
      const { unmount } = render(<TeacherClassbotPage />);
      expect(note()).not.toHaveTextContent('저장되지');
      expect(note()).not.toHaveTextContent('데모');
      unmount();
    }
  });
});
