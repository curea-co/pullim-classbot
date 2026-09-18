/**
 * 수업 리플레이 목록·상세 — **이 화면들이 세지 않은 것을 0 으로 말하지 않는가.**
 *
 * 이 트리는 테스트가 없던 자리다(걷어낸 검사가 없다). 새로 못박는 것은 두 가지다:
 *
 *  ⑴ **세는 말을 한 번도 쓰지 않는다.** 종전 목록 머리는 「N개 수업 · 검수 대기 N건」이었고 상태
 *     알약 넷이 저마다 수를 달고 섰다. 씨앗(`lib/mock/classbot.ts` 의 `studentReplays`)이 이미 빈
 *     배열이라 그 수는 전부 `0` 이었는데, **서버에 리플레이를 세는 문이 없으므로 그 0 은 「없다」가
 *     아니라 「센 적이 없다」**다 — #369·#370 이 교사 홈·채점 허브에서 걷어낸 것과 같은 거짓이다.
 *  ⑵ **상세가 「못 찾았다」로 말하지 않는다.** 종전에는 어떤 id 로 들어와도 씨앗에 없어
 *     「리플레이를 찾을 수 없어요. 라이브 종료 직후라면 잠시 후 다시 시도해주세요」로 떨어졌다.
 *     「없다」도 「잠시 후 되겠다」도 참이 아니다.
 *
 * 그리고 이 트리에는 localStorage 확정(`lib/store/replay.ts`)이 붙어 있었다 — 검수·발송이 이
 * 브라우저 밖으로 나가지 않았다. 버튼이 하나도 없다는 단언이 그 회귀를 잡는다.
 */
import { render, screen } from '@testing-library/react';
import TeacherReplayListPage from '../page';
import TeacherReplayDetailPage from '../[id]/page';

/** 두 화면이 말하던 목 문구. 하나라도 돌아오면 이 목록이 잡는다. */
const MOCK_COPY = [
  // 목록 — 상태 알약 넷과 그 설명
  '검수 대기', '처리 중', '발송 완료', '전체',
  '이 상태의 리플레이가 없어요',
  // 상세 — 상태 띠 안내와 본문
  'AI 처리 중', '이 수업 핵심 3개', '세그먼트', 'AI 추출',
  '학생 리플레이 탭에 노출돼요', '핵심 메시지를 검토하고 승인하면',
  // 「없다」로 말하던 자리
  '리플레이를 찾을 수 없어요', '잠시 후 다시 시도',
];

/** 모르는 것을 0 으로 말하지 않는다 — 세는 말 전부. 자식 엘리먼트로 쪼갠 모양까지 보려고 `textContent` 를 본다. */
const COUNTING_WORDS = [/\d+\s*개/, /\d+\s*건/, /\d+\s*명/, /\d+\s*분/, /\d+\s*%/];

describe('수업 리플레이 목록 — 자리와 이름은 남되 세지 않는다', () => {
  it('무엇을 하는 화면인지 머리가 말한다', () => {
    render(<TeacherReplayListPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('지난 수업 다시 보기');
    expect(screen.getByRole('heading', { name: '지난 수업', level: 2 })).toBeInTheDocument();
  });

  it('지어낸 상태·건수가 없고 세는 말을 한 번도 쓰지 않는다', () => {
    const { container } = render(<TeacherReplayListPage />);
    const text = container.textContent ?? '';

    for (const gone of MOCK_COPY) expect(text).not.toContain(gone);
    for (const counting of COUNTING_WORDS) expect(text).not.toMatch(counting);
  });

  it('누르면 localStorage 에만 남던 거르개·확정 버튼이 없다', () => {
    render(<TeacherReplayListPage />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('나가는 길은 교사 홈 하나다 — 대신 받아 줄 정본 화면이 없어 출구를 새로 내지 않았다', () => {
    render(<TeacherReplayListPage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    expect(new Set(hrefs)).toEqual(new Set(['/teacher']));
  });
});

describe('수업 리플레이 한 건 — 「없다」가 아니라 「읽어 올 수 없다」', () => {
  it('어떤 id 로 들어와도 같은 사실을 말한다 — 「못 찾았다」로 말하지 않는다', () => {
    const { container } = render(<TeacherReplayDetailPage />);

    expect(screen.getByText('이 수업 리플레이를 읽어 올 수 없어요')).toBeInTheDocument();
    for (const gone of MOCK_COPY) expect(container.textContent ?? '').not.toContain(gone);
  });

  it('핵심 메시지 편집·발송 버튼이 없다 — 확정이 이 브라우저에만 남던 자리다', () => {
    const { container } = render(<TeacherReplayDetailPage />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
    for (const counting of COUNTING_WORDS) expect(container.textContent ?? '').not.toMatch(counting);
  });

  it('돌아갈 곳은 리플레이 목록 하나다', () => {
    render(<TeacherReplayDetailPage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    expect(new Set(hrefs)).toEqual(new Set(['/teacher/replay']));
  });
});
