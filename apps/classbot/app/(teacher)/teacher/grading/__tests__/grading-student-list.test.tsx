import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import {
  GradingStudentList, studentViewHref, toStudentFilter, toStudentSort,
} from '../grading-student-list';
import { monitoredRoster } from '@/lib/mock/classbot-monitoring';
import { allGradingItems, buildGradingRoster } from '@/lib/mock/classbot-grading-roster';
import { useGradingStore } from '@/lib/store/grading';

/**
 * 채점 허브의 기본 화면이 지켜야 할 것 (spec 11 § 3.3.0).
 *   ① 등록된 학생이 **전부** 보인다 — 채점 대기가 0건이어도 줄이 남는다
 *   ② 요약은 배지가 말한다 — 도달 · 최근 접속 · 채점 대기
 *   ③ 학생을 누르면 그 학생 상세로 간다
 */

/** 학생 명단 = 마지막 list (앞의 list 는 거르개·정렬 알약 줄이 아니라 버튼이라 실제로는 이것뿐) */
function roster() {
  return screen.getAllByRole('list').at(-1)!;
}

function rows() {
  return within(roster()).getAllByRole('listitem');
}

function renderList() {
  return render(<GradingStudentList students={monitoredRoster} items={allGradingItems} />);
}

beforeEach(() => {
  useGradingStore.setState({ decisions: {} });
  localStorage.clear();
});

describe('등록된 학생 전체가 보인다', () => {
  it('학생 20명이 모두 한 줄씩 있다', () => {
    renderList();
    expect(rows()).toHaveLength(monitoredRoster.length);
  });

  it('채점 대기가 없는 학생도 목록에 남는다', () => {
    renderList();

    const withoutGrading = buildGradingRoster().filter(r => r.items.length === 0);
    expect(withoutGrading.length).toBeGreaterThan(0);

    for (const row of withoutGrading) {
      const cell = screen.getByText(row.student.name).closest('a');
      expect(cell).not.toBeNull();
      expect(within(cell!).getByLabelText('검수할 채점 없음')).toBeTruthy();
    }
  });
});

describe('배지가 요약을 말한다', () => {
  it('줄마다 도달 · 최근 접속 · 채점 대기 배지가 함께 있다', () => {
    renderList();
    // 최근 접속 배지는 읽어주기 문장을 갖는다 — 줄 수만큼 있어야 한다.
    expect(within(roster()).getAllByLabelText(/마지막 접속 /)).toHaveLength(monitoredRoster.length);
    // 채점 대기 배지도 줄마다 하나 — 0건이면 「검수할 채점 없음」.
    const pendingBadges = within(roster()).getAllByLabelText(/검수 대기 |검수할 채점 없음/);
    expect(pendingBadges).toHaveLength(monitoredRoster.length);
  });

  it('채점 대기 배지가 그 학생의 대기 건수를 말한다', () => {
    renderList();
    for (const row of buildGradingRoster().filter(r => r.pending > 0)) {
      const cell = screen.getByText(row.student.name).closest('a');
      expect(within(cell!).getByLabelText(`검수 대기 ${row.pending}건`)).toBeTruthy();
    }
  });

  it('교사가 확정하면 그 학생의 대기 배지가 줄어든다', () => {
    const target = allGradingItems.find(i => i.status === 'queue')!;
    const student = monitoredRoster.find(s => s.id === target.studentId)!;
    const before = buildGradingRoster().find(r => r.student.id === target.studentId)!;

    const { rerender } = renderList();
    expect(
      within(screen.getByText(student.name).closest('a')!).getByLabelText(`검수 대기 ${before.pending}건`),
    ).toBeTruthy();

    act(() => {
      useGradingStore.getState().approve({
        itemId: target.id,
        finalScore: target.draftScore,
        maxScore: target.maxScore,
        comment: target.draftComment,
        rubric: target.rubric,
      });
    });
    rerender(<GradingStudentList students={monitoredRoster} items={allGradingItems} />);

    const cell = screen.getByText(student.name).closest('a')!;
    const label = before.pending === 1 ? '검수할 채점 없음' : `검수 대기 ${before.pending - 1}건`;
    expect(within(cell).getByLabelText(label)).toBeTruthy();
  });
});

describe('학생을 누르면 상세로 간다', () => {
  it('줄 전체가 그 학생의 상세로 가는 링크 하나다', () => {
    renderList();
    for (const row of rows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      // 되돌아갈 곳(from)이 붙어 있어야 학생 상세의 뒤로 가기가 채점 허브로 돌아온다.
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/students\/m\d{2}\?from=grading$/);
    }
  });

  it('링크가 그 학생의 id 를 가리킨다', () => {
    renderList();
    const s = monitoredRoster[3]; // m04 최도현
    const link = screen.getByText(s.name).closest('a');
    expect(link?.getAttribute('href')).toBe(`/teacher/students/${s.id}?from=grading`);
  });
});

describe('거르개 — 큐만 보고 싶을 때', () => {
  it('「채점 대기 있음」을 고르면 대기가 있는 학생만 남는다', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /채점 대기 있음/ }));

    const expected = buildGradingRoster().filter(r => r.pending > 0);
    expect(rows()).toHaveLength(expected.length);
    expect(expected.length).toBeLessThan(monitoredRoster.length);
  });

  it('전체로 되돌리면 다시 전원이 보인다', () => {
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /채점 대기 있음/ }));
    fireEvent.click(screen.getByRole('button', { name: /전체/ }));
    expect(rows()).toHaveLength(monitoredRoster.length);
  });

  it('아무도 걸리지 않는 조건이면 빈 상태를 보여주고 전체로 돌아갈 길을 준다', () => {
    cleanup();
    // 도달한 학생만 넘기면 「미도달」 거르개에 아무도 안 걸린다.
    const reached = monitoredRoster.filter(s => s.reach === 'reached');
    render(<GradingStudentList students={reached} items={allGradingItems} />);
    fireEvent.click(screen.getByRole('button', { name: /미도달/ }));

    expect(screen.getByText('이 조건에 해당하는 학생이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '전체 보기' }));
    expect(rows()).toHaveLength(reached.length);
  });
});

describe('채점 항목은 그 학생 줄에 붙는다', () => {
  it('채점이 있는 학생 수만큼만 대기 배지가 붙는다 — 어느 항목도 새지 않는다', () => {
    renderList();
    const withGrading = buildGradingRoster().filter(r => r.items.length > 0);
    // 시드 7건이 7명에게 나뉘어 붙는다. 한 명도 빠지거나 겹치지 않는다.
    expect(withGrading).toHaveLength(allGradingItems.length);

    for (const row of withGrading) {
      const cell = screen.getByText(row.student.name).closest('a');
      expect(cell).not.toBeNull();
    }
  });
});

describe('거르개·정렬은 URL 이 1차 (spec 11 § 10)', () => {
  it('URL 에서 읽은 조건으로 목록이 선다 — 새로고침·링크 공유에서 유지된다', () => {
    render(
      <GradingStudentList
        students={monitoredRoster}
        items={allGradingItems}
        filter="pending"
        sort="name"
      />,
    );
    const expected = buildGradingRoster().filter(r => r.pending > 0);
    expect(rows()).toHaveLength(expected.length);

    // 이름순으로 섰는지 — 첫 줄이 이름순 첫 학생이다.
    const byName = [...expected].sort((a, b) => a.student.name.localeCompare(b.student.name, 'ko'));
    expect(within(rows()[0]).getByText(byName[0].student.name)).toBeTruthy();
  });

  it('기본값은 URL 에 적지 않는다 — 주소가 길어지기만 한다', () => {
    expect(studentViewHref('all', 'pending')).toBe('/teacher/grading');
    expect(studentViewHref('pending', 'pending')).toBe('/teacher/grading?filter=pending');
    expect(studentViewHref('all', 'name')).toBe('/teacher/grading?sort=name');
    expect(studentViewHref('offline', 'stale')).toBe('/teacher/grading?filter=offline&sort=stale');
  });

  it('모르는 값은 기본값으로 떨어진다 — 빈 화면을 만들지 않는다', () => {
    expect(toStudentFilter('bogus')).toBe('all');
    expect(toStudentFilter(undefined)).toBe('all');
    expect(toStudentSort('bogus')).toBe('pending');
    expect(toStudentSort(undefined)).toBe('pending');
  });
});
