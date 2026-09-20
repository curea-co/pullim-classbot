/**
 * `useCurrentUser().name` — 사람을 무엇으로 부르는가.
 *
 * 못박는 것은 **순서** 하나다: **OS 가 준 사람 이름 → 그게 비었을 때만 email 로컬파트.**
 *
 * 여기서 「사람 이름」은 `AuthUser.name` 이고, 그 칸에 무엇이 실리는지는 **provider 가 정한다** —
 * `/me` 의 `name`(KCB 실명) → 비면 `displayName`(`lib/auth/os-sso-provider.ts`, 그쪽 테스트가
 * 그 순서를 따로 고정한다). 이 파일은 그 뒤, **그 값을 화면이 어떻게 부르는지**만 본다.
 *
 * 왜 이 테스트가 있나 — 화면이 「박성호」 대신 email 앞부분 「psh」로 사람을 부른 자리가 둘이었다:
 * ⑴ `useCurrentUser()` 가 `user.name` 을 **읽지 않고** email 로 이름을 만들고 있었고,
 * ⑵ provider 가 그 칸에 실어 보낸 값이 `/me` 의 `displayName` 이었는데 **그것 자체가 email
 * local-part 에서 파생된 값**이다(pullim-api `deriveDisplayName`). 이 파일이 지키는 것은 ⑴ 이다.
 *
 * 그렇다고 폴백을 지우면 안 된다 — `AuthUser.name` 은 optional 이고 provider 가 고른 값도
 * 비어 올 수 있어서, 폴백이 없으면 그런 사람은 **빈칸으로 선다.** 아래 여섯 경우(이름 있음 ·
 * 이름 없음 · 빈 문자열 · 공백뿐 · 앞뒤 공백 · email 까지 빈 세션)가 그 둘을 한꺼번에 고정한다:
 * 순서를 뒤집어도, 폴백을 지워도 빨개진다.
 *
 * ⛔ 이 파일의 `name` 목값은 **본인-조회 한정 PII 자리**다(권위: pullim-api
 * `me-response.dto.ts`). 실계정 이름을 픽스처로 넣지 마라.
 */
import { render, screen } from '@testing-library/react';

import { useCurrentUser, useStudentMe } from '@/lib/current-user';
import { DEV_IDENTITY_COOKIE } from '@/lib/dev-identity';

// useAuth 만 가변 오버라이드 — 나머지 auth-context 는 이 테스트와 무관하다.
// `name` 은 optional 이다(`packages/auth` 의 `AuthUser`) — 그 점이 이 테스트의 절반이다.
let mockAuthUser: { id: string; email: string; role: 'student' | 'teacher'; name?: string } | null =
  null;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: mockAuthUser, isReady: true }),
}));

/** jsdom 의 document.cookie 를 비운다(테스트 간 누수 방지). */
function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(() => {
  clearAllCookies();
  mockAuthUser = null;
});

function NameProbe() {
  const user = useCurrentUser();
  const me = useStudentMe();
  return (
    <>
      {/* 빈 문자열도 그대로 읽히도록 구분자를 넣는다 */}
      <output data-testid="current">{`[${user.name}]`}</output>
      <output data-testid="student">{`[${me.name}]`}</output>
    </>
  );
}

const currentName = () => screen.getByTestId('current').textContent;
const studentName = () => screen.getByTestId('student').textContent;

describe('useCurrentUser().name — 이름 → 없으면 email 로컬파트', () => {
  it('이름이 있으면 그 이름으로 부른다 — email 앞부분이 아니다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '박성호' };
    render(<NameProbe />);
    expect(currentName()).toBe('[박성호]');
  });

  it('이름이 없으면 email 로컬파트로 떨어진다 — 빈칸으로 두지 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('이름이 빈 문자열이어도 폴백이 받는다 — 화면에서 빈 문자열과 없음은 같은 빈칸이다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('공백뿐인 이름도 「없음」으로 본다 — 반 명단의 memberLabel 과 같은 판정이다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '   ' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
  });

  it('이름 앞뒤 공백은 잘라서 쓴다 — 이름이 있는데 폴백으로 넘기지는 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'teacher', name: '  김수학  ' };
    render(<NameProbe />);
    expect(currentName()).toBe('[김수학]');
  });

  // 폴백까지 빈 유일한 경우 — `displayNameOf` 의 @returns 가 「빈 문자열이 되는 경우는 email 까지
  // 빈 세션뿐」이라고 단정하므로, 그 한 경우도 여기서 본다. 이 값이 그대로 화면에 간다:
  // `components/shell/app-header.tsx` 의 아바타가 `profile.name[0]` 을 찍는데, 학생 역할이면
  // `''[0]` 이 `undefined` 라 글자 없는 동그라미가 선다. 지금은 그것이 의도다 — 남의 이름으로
  // 부르지 않는다. 바꾸려면 이 단정부터 바꿔라.
  it('이름도 email 도 빈 세션은 빈 이름이다 — 폴백이 메울 것이 없다', () => {
    mockAuthUser = { id: 'uuid-1', email: '', role: 'student', name: '' };
    render(<NameProbe />);
    expect(currentName()).toBe('[]');
    expect(studentName()).toBe('[]');
  });
});

describe('이름은 화면이 읽는 끝까지 같다', () => {
  it('useStudentMe() 도 같은 이름을 싣는다 — 한 화면에 두 사람이 서지 않는다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student', name: '박성호' };
    render(<NameProbe />);
    expect(currentName()).toBe('[박성호]');
    expect(studentName()).toBe('[박성호]');
  });

  it('이름이 없을 때도 둘이 같다 — 폴백은 한 곳(useCurrentUser)에만 있다', () => {
    mockAuthUser = { id: 'uuid-1', email: 'psh@curea.co', role: 'student' };
    render(<NameProbe />);
    expect(currentName()).toBe('[psh]');
    expect(studentName()).toBe('[psh]');
  });
});

describe('세션이 없는 두 갈래는 종전 그대로다', () => {
  it('개발용 신원 쿠키는 그 신원의 이름을 쓴다 — email 을 타지 않는다', () => {
    document.cookie = `${DEV_IDENTITY_COOKIE}=student_001; path=/`;
    render(<NameProbe />);
    expect(currentName()).toBe('[서연]');
  });

  it('세션도 쿠키도 없으면 데모 폴백(서연)이다 — 이 PR 이 바꾸지 않은 갈래다', () => {
    render(<NameProbe />);
    expect(currentName()).toBe('[서연]');
    // 다만 「나」는 신원이 아니므로 빈 값이다(useStudentMe 계약).
    expect(studentName()).toBe('[]');
  });
});
