import { render, screen, fireEvent, within, act, cleanup } from '@testing-library/react';
import { GradingStudentList } from '../grading-student-list';
import { monitoredRoster } from '@/lib/mock/classbot-monitoring';
import {
  allGradingItems, buildGradingRoster, rosterIdOfGradingStudent, unlinkedGradingItems,
} from '@/lib/mock/classbot-grading-roster';
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
    const studentId = rosterIdOfGradingStudent(target.studentId)!;
    const student = monitoredRoster.find(s => s.id === studentId)!;
    const before = buildGradingRoster().find(r => r.student.id === studentId)!;

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
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/students\/m\d{2}$/);
    }
  });

  it('링크가 그 학생의 id 를 가리킨다', () => {
    renderList();
    const s = monitoredRoster[3]; // m04 최도현
    const link = screen.getByText(s.name).closest('a');
    expect(link?.getAttribute('href')).toBe(`/teacher/students/${s.id}`);
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

describe('명단에 이어지지 않은 채점', () => {
  it('감추지 않고 건수를 적어 큐로 가는 길을 준다', () => {
    renderList();
    const unlinked = unlinkedGradingItems(allGradingItems).filter(i => i.status === 'queue').length;
    expect(unlinked).toBeGreaterThan(0);

    // 줄 배지 합계와 상단 KPI 「대기」가 말없이 어긋나지 않게 이 문장이 그 차이를 말한다.
    expect(screen.getByText(`${unlinked}건`)).toBeTruthy();
    const link = screen.getByRole('link', { name: '채점 대기 큐에서 보기' });
    expect(link.getAttribute('href')).toBe('/teacher/grading?view=queue');
  });

  it('이어지지 않은 학생은 어느 줄에도 붙지 않는다', () => {
    renderList();
    for (const item of unlinkedGradingItems(allGradingItems)) {
      // 시드 이름(민준·하윤)은 명단에 없는 이름이라 줄에 뜨면 안 된다.
      expect(within(roster()).queryByText(item.studentName)).toBeNull();
    }
  });
});
