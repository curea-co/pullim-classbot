/**
 * 채점 허브 — **이 화면이 지어낸 값을 말하지 않는가.**
 *
 * 2026-09-18 에 이 폴더의 테스트 셋(`grading-filters` · `grading-student-list` · `grading-detail`)을
 * 걷고 이 파일 하나로 갈았다. 셋이 지키던 것과 지금 그것을 누가 지키는가:
 *
 *  - `grading-filters.test.ts` — ⑴ 「규칙 모듈이 `'use client'` 가 아니다(서버 페이지가 직접 부른다)」
 *    ⑵ URL 값 읽기·왕복 ⑶ 거르개 판정. ⑵⑶ 은 거르개가 사라지며 함께 사라진다 —
 *    지금 이 화면에는 URL 로 고르는 것이 하나도 없다. **⑴ 이 잡던 500 회귀는 이제 `next build` 가
 *    먼저 잡는다** — 이 PR 로 `/teacher/grading` 이 dynamic(`ƒ`)에서 **prerender(`○`)** 로 바뀌어
 *    빌드가 이 페이지를 실제로 실행해 보기 때문이다(아래 「서버 컴포넌트로 선다」).
 *  - `grading-student-list.test.tsx` — 명단 표의 껍데기(머리글 보임 · 이름/학년 다른 칸 ·
 *    줄 전체가 링크 하나)를 단언했다. 그 껍데기는 `components/classbot/roster-table.tsx` 한 벌이다.
 *    **넘긴 곳이 2026-09-18 에 한 번 더 옮겨졌다** — 받기로 했던
 *    `students/__tests__/monitor-roster.test.tsx` 는 그 명단 화면과 함께 걷혔고(결함 03-③), 지금
 *    같은 껍데기를 같은 항목으로 못박는 곳은 **`components/classbot/__tests__/class-reach-roster.test.tsx`**
 *    다(머리글 순서·`sr-only` 금지 · 이름/학년 다른 칸 · 줄에 링크 하나).
 *  - `grading-detail.test.tsx` — 확정이 화면 상태가 아니라 store 에 남는지, 총합이 같아도 배분만
 *    바꾸면 「수정 후 승인」이 열리는지. **store 쪽 계약은 `lib/store/__tests__/grading.test.ts` 가
 *    그대로 지킨다**(approve · approveWithEdit · merge · persist). 배분 판정(`rubricChangedFrom`)은
 *    그 화면 안에만 있던 함수라 화면과 함께 사라졌다 — 지킬 대상 자체가 없다.
 *
 * 그 자리에 새로 지키는 것이 아래다. 걷어낸 목이 다시 기어들면 빨개진다.
 */
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import TeacherGradingPage from '../page';

/** 이 화면이 말하던 목 문구·목 숫자. 하나라도 돌아오면 이 목록이 잡는다. */
const MOCK_COPY = [
  // 목 학생(채점 시드 gr_001 · overridden 시연)
  '신윤서', '최도현',
  // 탭과 거르개
  '학생 전체', '채점 대기 큐', '검토중', '오버라이드', '서술형', '단답', '수치',
  // KPI 넉 장
  '오늘 승인', '평균 변경률',
  // 명단 열 머리글
  '막힌 곳', 'AI 초안 코멘트', '검수 대기',
  // 화면이 스스로 하던 약속
  '학생들이 새로 제출하면 여기에 쌓여요', '재학습 제안',
];

describe('채점 허브 — 자리와 이름은 남는다', () => {
  it('무엇을 하는 화면인지 머리가 말한다', () => {
    render(<TeacherGradingPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI 초안 검수');
    expect(screen.getByRole('heading', { name: '검수할 채점', level: 2 })).toBeInTheDocument();
  });

  it('서버 컴포넌트로 선다 — 이 폴더의 형제 모듈을 부르지 않는다', () => {
    /*
      예전에 `page.tsx`(서버)가 `'use client'` 모듈의 함수를 **직접 불러** `/teacher/grading` 이
      500 으로 죽었다. 그때는 이 라우트가 dynamic(`ƒ`)이라 빌드가 실행해 보지 않아 아무도 못 잡았다.
      **지금은 빌드가 먼저 잡는다** — 거르개가 사라지며 `searchParams` 를 안 읽게 되어 이 라우트가
      prerender(`○`)로 바뀌었고, 경계를 깨면 export 단계에서
      `Attempted to call X() from the server but X is on the client` 로 죽는다.

      그래서 이 검사는 **무해한 이중 방어**다. 남겨 두는 값어치는 회귀의 이름을 제자리에 적어
      두는 것과, 빌드보다 먼저·싸게 빨개지는 것이다.

      **이 검사가 못박는 범위는 딱 아래 두 줄이다** — 이 파일에 `'use client'` 가 없다는 것과
      **이 폴더의 형제 모듈을 부르지 않는다**는 것. 별칭 경로(`@/lib/…`)는 통과하고, 실제로
      `TeacherPageShell` 은 `'use client'` 인 `back-link.tsx` 를 타고 들어간다 —
      그건 **렌더링**이라 안전하다. 500 을 내던 것은 서버가 클라이언트 모듈의 **함수를 호출**한 것이다.
    */
    const src = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/^\s*['"]use client['"]/m);
    expect(src).not.toMatch(/from '\.\//);
  });
});

describe('채점 허브 — 목이 하나도 남지 않았다', () => {
  it('지어낸 학생·건수·지표가 없다', () => {
    render(<TeacherGradingPage />);

    for (const gone of MOCK_COPY) {
      expect(screen.queryByText(new RegExp(gone))).not.toBeInTheDocument();
    }
  });

  it('모르는 것을 0 으로 말하지 않는다 — 건·명·% 를 한 번도 세지 않는다', () => {
    const { container } = render(<TeacherGradingPage />);

    /*
      「검수할 채점 0건」은 「읽어 올 수 없다」와 다른 말이다. 센 적이 없으면 세지 않는다.

      **`queryByText` 가 아니라 `container.textContent` 를 본다.** `queryByText` 는 한 엘리먼트의
      직계 텍스트만 맞춰 보므로 숫자를 자식으로 쪼갠 모양 — 이 리포에 실재하는
      `이번 주 <b>{7}</b>건` 꼴 — 을 통째로 놓친다. 그 구멍이 곧 「지어낸 값이 다시 기어드는」 모양이라
      화면에 그려진 글자 전체를 한 줄로 이어 붙여 본다.
    */
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+\s*건/);
    expect(text).not.toMatch(/\d+\s*명/);
    expect(text).not.toMatch(/\d+\s*%/);
  });

  it('없는 학생을 줄 세우던 표가 없다', () => {
    render(<TeacherGradingPage />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('누르면 아무 일도 없는 확정 버튼이 없다', () => {
    render(<TeacherGradingPage />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('채점 허브 — 나가는 길은 정본을 읽는 화면으로만 난다', () => {
  it('빈 상태의 출구는 하나이고 낸 과제로 간다', () => {
    render(<TeacherGradingPage />);

    const empty = screen.getByTestId('empty-state');
    const exits = within(empty).getAllByRole('link');
    expect(exits).toHaveLength(1);
    expect(exits[0]).toHaveAttribute('href', '/teacher/assignment');
  });

  it('아직 목인 화면(학생 상세·관제소·리포트·리플레이)으로 가는 길이 없다', () => {
    render(<TeacherGradingPage />);

    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '');
    for (const mockTree of ['/teacher/students', '/teacher/monitor', '/teacher/reports', '/teacher/replay']) {
      expect(hrefs.some(h => h.startsWith(mockTree))).toBe(false);
    }
  });
});

/*
 * 종전에 여기 있던 「채점 한 건」 describe 셋(`../[id]/page.tsx` 를 렌더해 「읽어 올 수 없다」·루브릭
 * 없음·출구 하나를 단언)은 2026-09-18 에 **그 라우트와 함께 걷혔다.**
 *
 * #370 이 그 라우트를 살려 둔 **유일한 까닭**은 학생 상세의 채점 패널
 * (`../../students/[id]/student-grading-panel.tsx`)이 목 항목마다 이리로 링크를 그리고 있어서였다.
 * 결함 03-③ 이 그 패널을 걷으면서 `/teacher/grading/[id]` 로 오는 길이 트리 전체에서 0 이 됐고,
 * 남겨 두면 그때부터는 아무도 닿을 수 없는 화면이다. 그래서 라우트를 지웠다 —
 * 지킬 화면이 없으니 그 화면을 지키던 검사도 함께 간다.
 */
