/**
 * 리포트 센터 — **이 화면이 지어낸 값을 말하지 않는가.**
 *
 * 2026-09-18 에 `report-roster.test.tsx`(케이스 14)를 걷고 이 파일로 갈았다.
 * 그것이 지키던 것과 지금 그것을 누가 지키는가:
 *
 *  - 「거르개가 관제소·교사 홈과 **같은 숫자**를 낸다」 — 규칙을 두 벌로 만들지 말라는 검사였고,
 *    리포트 센터는 애초에 판정을 하나도 갖지 않고 관제소(`../students/roster-filters`)와 교사 홈
 *    (`lib/mock/classbot-teacher-home`)을 읽기만 했다. **읽던 쪽이 사라졌으니 어긋날 두 벌이 없다.**
 *    원본 판정은 `students/__tests__/monitor-roster.test.tsx` 와
 *    `lib/mock/__tests__/classbot-monitoring.test.ts` 가 그대로 지킨다.
 *  - 「머리글이 눈에 보이고 이름과 학년이 다른 칸에 있다」 — 표 껍데기
 *    (`components/classbot/roster-table.tsx`) 한 벌의 계약이라 **관제소 명단 테스트가 같은 것을 지킨다.**
 *  - 「리포트가 없는 학생도 명단에 있다」·「정렬이 실제로 순서를 바꾼다」·「줄을 누르면 그 학생
 *    기록으로 간다」 — 전부 사라진 명단의 계약이다. 명단이 필요해지는 날 서는 자리는 여기가 아니라
 *    **내 수업방의 반 명단**이고(정본 `GET /classbot/classes/:id/members`), 그쪽은 제 테스트를 갖는다.
 *  - 「감정·웰빙 지수는 명단에 담지 않는다」 — 열람 범위가 좁은 값을 20줄 훑는 화면에 얹지 말라는
 *    규칙이었다. 명단이 사라져 대상이 없어졌지만, 아래 「목이 하나도 남지 않았다」가 그 낱말들을
 *    이 화면 전체에 대해 다시 막는다.
 */
import { render, screen, within } from '@testing-library/react';
import TeacherReportsPage from '../page';

/** 이 화면이 말하던 목 문구·목 숫자. 하나라도 돌아오면 이 목록이 잡는다. */
const MOCK_COPY = [
  // KPI 넉 장
  '발송 대기', '위기 알림', '먼저 볼 학생',
  // 리포트 6종 거르개와 목록
  '수업 종료', '학부모 주간 리포트', '학생 개인 리포트',
  // 명단
  '등록된 학생', '지름길', '이탈', '미도달', '목표 수준 미달', '오늘 안 들어옴',
  // 열람 범위가 좁은 값 — 종전 명단 규칙을 화면 전체로 넓혀 막는다
  '웰빙', '감정', '체크인',
  // 화면이 스스로 하던 약속 — 만드는 문도, 승인하는 문도, 보내는 문도 없다
  '매일 19:50 자동 생성', '카카오톡',
];

describe('리포트 센터 — 자리와 이름은 남는다', () => {
  it('무엇을 하는 화면인지 머리가 말한다', () => {
    render(<TeacherReportsPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('학생·학부모 리포트');
    expect(screen.getByRole('heading', { name: '리포트', level: 2 })).toBeInTheDocument();
  });
});

describe('리포트 센터 — 목이 하나도 남지 않았다', () => {
  it('지어낸 리포트·학생·건수가 없다', () => {
    render(<TeacherReportsPage />);

    for (const gone of MOCK_COPY) {
      expect(screen.queryByText(new RegExp(gone))).not.toBeInTheDocument();
    }
  });

  it('모르는 것을 0 으로 말하지 않는다 — 건·명을 한 번도 세지 않는다', () => {
    const { container } = render(<TeacherReportsPage />);

    /*
      「발송 대기 0건」·「등록된 학생 0명」도 지어낸 값이다 — 세어 본 적이 없다.

      **`queryByText` 가 아니라 `container.textContent` 를 본다** — 까닭은 채점 허브 쪽과 같다
      (`../../grading/__tests__/grading-page.test.tsx`): 숫자를 자식 엘리먼트로 쪼갠 모양을
      `queryByText` 가 통째로 놓친다.
    */
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+\s*건/);
    expect(text).not.toMatch(/\d+\s*명/);
  });

  it('없는 학생을 줄 세우던 표가 없다', () => {
    render(<TeacherReportsPage />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('누르면 아무 일도 없는 거르개·정렬 알약이 없다', () => {
    render(<TeacherReportsPage />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('리포트 센터 — 나가는 길은 정본을 읽는 화면으로만 난다', () => {
  it('빈 상태의 출구는 하나이고 내 수업방으로 간다', () => {
    render(<TeacherReportsPage />);

    const empty = screen.getByTestId('empty-state');
    const exits = within(empty).getAllByRole('link');
    expect(exits).toHaveLength(1);
    expect(exits[0]).toHaveAttribute('href', '/teacher/classroom');
  });

  it('아직 목인 화면(학생 상세·관제소·채점)과 지워진 리포트 상세로 가는 길이 없다', () => {
    render(<TeacherReportsPage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    for (const gone of ['/teacher/students', '/teacher/monitor', '/teacher/grading', '/teacher/reports/']) {
      expect(hrefs.some(h => h.startsWith(gone))).toBe(false);
    }
  });
});
