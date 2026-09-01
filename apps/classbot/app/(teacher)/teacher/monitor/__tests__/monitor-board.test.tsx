import { fireEvent, render, screen, within } from '@testing-library/react';
import { monitoredRoster, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { MonitorBoard } from '../monitor-board';

/** 요약 카드 6개가 들어 있는 목록 = 첫 번째 list */
function cardBar() {
  return screen.getAllByRole('list')[0];
}

/** 학생 명단 줄 — 명단은 표다. 머리글 줄을 뺀 두 번째 줄묶음(`tbody`)이 학생 줄이다. */
function rosterRows() {
  const roster = screen.getByRole('table', { name: '학생 한 줄 보기' });
  return within(within(roster).getAllByRole('rowgroup')[1]).getAllByRole('row');
}

function card(name: RegExp) {
  return within(cardBar()).getByRole('button', { name });
}

describe('MonitorBoard 요약 카드 — 카드가 곧 거르개다', () => {
  it('카드마다 달려 있던 작은 글씨 이동 링크는 없다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    expect(within(cardBar()).queryAllByRole('link')).toHaveLength(0);
    for (const gone of ['명단 보기', '누구인지 보기', '먼저 볼 학생', '이탈 대응 강도']) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });

  it('카드는 전부 누를 수 있고 눌림 상태를 갖는다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    const buttons = within(cardBar()).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(buttons.every(b => b.getAttribute('aria-pressed') !== null)).toBe(true);
    expect(card(/^전체 /)).toHaveAttribute('aria-pressed', 'true');
  });

  it('카드에는 학생 수(명)만 담는다 — 지름길·이탈 같은 횟수(회)는 명단 아래로', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    for (const b of within(cardBar()).getAllByRole('button')) {
      expect(b.textContent).toMatch(/\d+명/);
      expect(b.textContent).not.toMatch(/\d+회/);
    }
  });

  it('카드를 누르면 명단이 그 학생만 남는다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    expect(rosterRows()).toHaveLength(monitoredRoster.length);

    fireEvent.click(card(/^미도달 /));
    expect(rosterRows()).toHaveLength(monitoringSummary.notReached);
    expect(card(/^미도달 /)).toHaveAttribute('aria-pressed', 'true');
  });

  it('카드 숫자와 걸러진 줄 수가 같다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    for (const [name, expected] of [
      [/^도달 /, monitoringSummary.reached],
      [/^부분 /, monitoringSummary.partial],
      [/^목표 수준 미달 /, monitoringSummary.depthShort],
      [/^오늘 안 들어옴 /, monitoringSummary.offlineToday],
    ] as const) {
      fireEvent.click(card(name));
      expect(rosterRows()).toHaveLength(expected);
    }
  });

  it('같은 카드를 다시 누르면 전체로 돌아온다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    fireEvent.click(card(/^오늘 안 들어옴 /));
    expect(rosterRows()).toHaveLength(monitoringSummary.offlineToday);

    fireEvent.click(card(/^오늘 안 들어옴 /));
    expect(rosterRows()).toHaveLength(monitoredRoster.length);
    expect(card(/^전체 /)).toHaveAttribute('aria-pressed', 'true');
  });

  it('걸러 놓은 상태에서 「전체 보기」로 풀 수 있다', () => {
    render(<MonitorBoard students={monitoredRoster} />);
    fireEvent.click(card(/^미도달 /));
    fireEvent.click(screen.getByRole('button', { name: '전체 보기' }));
    expect(rosterRows()).toHaveLength(monitoredRoster.length);
  });
});
