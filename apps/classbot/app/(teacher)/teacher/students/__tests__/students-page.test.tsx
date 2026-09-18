/**
 * 학생 목록·학생 상세 — **이 화면들이 지어낸 값을 말하지 않는가.**
 *
 * 2026-09-18 에 이 폴더의 테스트 둘(`monitor-roster` · `student-detail-panels`)을 걷고 이 파일 하나로
 * 갈았다. 둘이 지키던 것과 지금 그것을 누가 지키는가:
 *
 *  - `monitor-roster.test.tsx` — ⑴ 줄 전체가 링크 하나 · 머리글이 눈에 보인다 · 이름/학년 다른 칸
 *    (**표 껍데기 `components/classbot/roster-table.tsx` 의 계약**) ⑵ 줄 배지 수 = 요약 숫자
 *    ⑶ 최근 접속 배지 모양. **⑴ 은 같은 껍데기를 쓰는
 *    `components/classbot/__tests__/class-reach-roster.test.tsx` 가 항목까지 그대로 지킨다**
 *    (머리글 순서 · `sr-only` 금지 · 이름/학년 다른 칸 · 줄에 링크 하나). ⑵⑶ 은 렌더를 안 보는
 *    순수 데이터 불변식이라 **원래 자리** `lib/mock/__tests__/classbot-monitoring.test.ts` 가 같은
 *    셈(`reachBadge` 3값 = `monitoringSummary` 의 같은 칸 · `relativeSeenLabel` 모양)을 그대로 센다.
 *  - `student-detail-panels.test.tsx` — ⑴ 막힌 지점의 말이 대화 기록의 그 턴과 같은 말인가
 *    ⑵ 채점 패널이 그 학생의 항목을 검수 화면으로 잇는가 ⑶ `entry-source` 의 되돌아갈 곳 여섯.
 *    ⑴ 은 **`lib/mock/__tests__/classbot-student-report.test.ts` 가 모듈 쪽에서 그대로 지킨다**
 *    (`buildStuckPoints` ↔ `buildTranscript` 의 같은 턴). ⑵ 는 **대상이 사라졌다** — 그 패널도,
 *    그 패널이 링크하던 `/teacher/grading/[id]` 도 이 PR 이 걷었다. ⑶ 도 대상이 사라졌다 —
 *    `?from=` 을 붙이는 자리가 트리 전체에서 0 이 돼 `entry-source.ts` 를 파일째 걷었고,
 *    그중 `grading`·`grading-queue` 두 항목은 **#370 이 발신자를 걷은 날부터 이미 도달 불가**였다.
 *
 * 그 자리에 새로 지키는 것이 아래다. 걷어낸 목이 다시 기어들면 빨개진다.
 */
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TeacherStudentsPage from '../page';
import TeacherStudentReportPage from '../[id]/page';

/**
 * 두 화면이 말하던 목 문구. 하나라도 돌아오면 이 목록이 잡는다.
 *
 * 원천은 `lib/mock/classbot-monitoring`(20명 스냅샷 · 반 이름 · 거르개 여섯 · 정렬 넷)과
 * `lib/mock/classbot-student-report`(이탈 · 주제 분포 · 과정 평가), `lib/mock/classbot-grading-roster`
 * (학생별 채점 항목 — 이 PR 이 모듈째 지웠다) 셋이었다.
 */
const MOCK_COPY = [
  // 없는 반·없는 봇·없는 단원 (monitoredClass)
  '중1-3반 과학', '과학봇', '물질의 상태 변화', '오후 4:26 기준', '박지훈',
  // 없는 학생 (monitoredRoster 에서 골라 둔 넷)
  '김서연', '박하람', '최도현', '신윤서',
  // 거르개 알약 여섯 · 정렬 넷
  '목표 수준 미달', '오늘 안 들어옴', '미도달', '이름순', '지름길 많은 순', '이탈 많은 순', '활동 오래된 순',
  // 명단 열 머리글과 그 아래 합계 줄
  '목표 · 닿음', '지름길', '최근 접속', '학급 전체 지름길', '이탈 대응 강도',
  // 학생 상세가 세우던 것
  '도달 상태', '요구 수준', '닿은 수준', '지름길 시도', '범위 이탈', '마지막 활동',
  '대화 주제 분포', '이탈 이력', '막힌 지점', '대화 기록', '이 학생의 채점', '과정 평가',
  '같은 스냅샷', '이전 학생', '다음 학생',
];

/**
 * 모르는 것을 0 으로 말하지 않는다 — 세는 말을 한 번도 쓰지 않는다.
 *
 * **`queryByText` 가 아니라 `container.textContent` 를 본다.** `queryByText` 는 한 엘리먼트의 직계
 * 텍스트만 맞춰 보므로 숫자를 자식으로 쪼갠 모양 — 이 리포에 실재하던
 * `학급 전체 지름길 <b>{n}회</b>` 꼴 — 을 통째로 놓친다. 그 구멍이 곧 「지어낸 값이 다시 기어드는」
 * 모양이라 화면에 그려진 글자 전체를 한 줄로 이어 붙여 본다.
 */
const COUNTING_WORDS = [/\d+\s*명/, /\d+\s*건/, /\d+\s*회/, /\d+\s*%/, /\d+\s*턴/, /\d+\s*단계/];

describe('학생 목록 — 자리와 이름은 남는다', () => {
  it('무엇을 하는 화면인지 머리가 말한다', () => {
    render(<TeacherStudentsPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('학생 기록');
    expect(screen.getByRole('heading', { name: '학생 명단', level: 2 })).toBeInTheDocument();
  });

  it('서버 컴포넌트로 선다 — 이 폴더의 형제 모듈을 부르지 않는다', () => {
    /*
      이 화면은 종전에 `'use client'` 인 명단(`./monitor-roster.tsx`)과 그 거르개 규칙
      (`./roster-filters.ts`)을 형제로 두고 있었다. 둘 다 이 PR 이 걷었고, 남은 page 는 서버에서 선다.
      **검사가 못박는 범위는 딱 두 줄이다** — 이 파일에 `'use client'` 가 없다는 것과, 이 폴더의
      형제 모듈을 부르지 않는다는 것. 별칭 경로(`@/components/…`)는 통과한다. 서버가 클라이언트
      모듈을 **렌더링**하는 것은 안전하고(그래서 `TeacherPageShell` 은 통과해야 한다),
      500 을 내던 것은 서버가 클라이언트 모듈의 **함수를 호출**한 것이다.
    */
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/^\s*['"]use client['"]/m);
    expect(src).not.toMatch(/from '\.\//);
  });
});

describe('학생 목록 — 목이 하나도 남지 않았다', () => {
  it('지어낸 반·학생·거르개가 없다', () => {
    const { container } = render(<TeacherStudentsPage />);
    const text = container.textContent ?? '';

    for (const gone of MOCK_COPY) expect(text).not.toContain(gone);
  });

  it('모르는 것을 0 으로 말하지 않는다 — 명·건·회·%·턴·단계를 한 번도 세지 않는다', () => {
    const { container } = render(<TeacherStudentsPage />);
    const text = container.textContent ?? '';

    for (const counting of COUNTING_WORDS) expect(text).not.toMatch(counting);
  });

  it('없는 학생을 줄 세우던 표와 거르개 버튼이 없다', () => {
    render(<TeacherStudentsPage />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('학생 목록 — 나가는 길은 정본을 읽는 화면으로만 난다', () => {
  it('빈 상태의 출구는 하나이고 학급 관제소로 간다', () => {
    render(<TeacherStudentsPage />);

    const exits = within(screen.getByTestId('empty-state')).getAllByRole('link');
    expect(exits).toHaveLength(1);
    // 관제소는 정본을 읽는다 — 명단 `GET /classes/:id/members` · 신호 `.../signals`.
    expect(exits[0]).toHaveAttribute('href', '/teacher/monitor');
  });

  it('빈 상태로 세워 둔 화면이나 지워진 화면으로 보내지 않는다', () => {
    render(<TeacherStudentsPage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    for (const gone of ['/teacher/grading', '/teacher/reports', '/teacher/replay', '/teacher/students/']) {
      expect(hrefs.some(h => h.startsWith(gone))).toBe(false);
    }
  });
});

describe('학생 상세 — 「없다」가 아니라 「읽어 올 수 없다」', () => {
  it('어떤 id 로 들어와도 같은 사실을 말한다 — 404 로 떨어뜨리지 않는다', () => {
    render(<TeacherStudentReportPage />);

    const empty = screen.getByTestId('empty-state');
    expect(within(empty).getByText('이 주소로는 학생 기록을 읽어 올 수 없어요')).toBeInTheDocument();
    // 「그 학생이 없다」가 아니다 — 교사가 학생을 의심하게 만들면 안 된다.
    expect(screen.queryByText(/찾지 못했어요|찾을 수 없어요/)).not.toBeInTheDocument();
  });

  it('지어낸 KPI·패널·기간 알약이 없다', () => {
    const { container } = render(<TeacherStudentReportPage />);
    const text = container.textContent ?? '';

    for (const gone of MOCK_COPY) expect(text).not.toContain(gone);
    for (const counting of COUNTING_WORDS) expect(text).not.toMatch(counting);
    // 저장이 서버로 가지 않던 과정 평가 루브릭과 학생 이동 화살표가 함께 사라졌다.
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(0);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('나가는 길이 전부 학급 관제소 하나를 가리킨다', () => {
    render(<TeacherStudentReportPage />);

    /*
      돌아갈 곳(머리의 뒤로 가기)과 빈 상태의 출구가 같은 곳이다 — 일부러 그렇다.
      이 학생의 기록을 정본에서 읽는 화면이 하나뿐이라 고를 것이 없다.
      종전의 `?from=` 해석기(`entry-source.ts`)는 발신자가 0 이 돼 파일째 걷었다.
    */
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs)).toEqual(new Set(['/teacher/monitor']));
  });
});
