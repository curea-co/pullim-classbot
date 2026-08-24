import { render, screen, within } from '@testing-library/react';
import { monitoredRoster, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { MonitorRoster } from '../monitor-roster';

/**
 * 명단 한 줄이 지켜야 할 것 두 가지.
 *   ① 줄 전체가 그 학생의 기록으로 가는 **링크 하나**다 — 줄 안에 또 다른 누를 것을 두지 않는다
 *   ② 줄 배지 수 = 상단 카드 숫자 — 하나라도 어긋나면 여기서 실패한다
 */

/** 학생 명단 = 마지막 list (앞의 list 는 거르개·정렬 알약 줄) */
function roster() {
  return screen.getAllByRole('list').at(-1)!;
}

function rows() {
  return within(roster()).getAllByRole('listitem');
}

describe('MonitorRoster 한 줄 — 줄 전체가 이동이다', () => {
  it('줄마다 링크 하나뿐이고 그 학생의 기록으로 간다', () => {
    render(<MonitorRoster students={monitoredRoster} />);

    const listRows = rows();
    expect(listRows).toHaveLength(monitoredRoster.length);

    for (const row of listRows) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      // 되돌아갈 곳(from=monitor)이 붙는다 — 기본값이 우연히 맞는 것에 기대지 않는다.
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/students\/m\d+\?from=monitor$/);
      // 줄 안에 중첩된 누를 것이 없어야 키보드 이동이 줄 하나에 한 번 멈춘다
      expect(within(row).queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('줄 끝에 달려 있던 작은 글씨 이동 문구는 없다', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    for (const gone of [
      '오늘 안 들어왔어요 — 접속부터 확인',
      '어디서 막혔는지 대화 기록 열기',
      '문항이 답을 바로 부르는지 보기',
      '이유를 설명했는지 대화에서 확인',
      '기록 훑어보기',
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });
});

describe('MonitorRoster 배지 — 상단 카드 숫자와 같아야 한다', () => {
  it('도달 배지 3값 수 = 카드 숫자 · 셋을 더하면 학급 전체', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    const list = roster();

    expect(within(list).getAllByText('도달')).toHaveLength(monitoringSummary.reached);
    expect(within(list).getAllByText('미달')).toHaveLength(monitoringSummary.depthShort);
    expect(within(list).getAllByText('미도달')).toHaveLength(monitoringSummary.notReached);

    expect(
      monitoringSummary.reached + monitoringSummary.depthShort + monitoringSummary.notReached,
    ).toBe(monitoringSummary.total);
  });

  it('줄마다 최근 접속 배지가 하나씩 · 오늘 안 들어온 학생 수도 카드와 같다', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    const list = roster();

    expect(within(list).getAllByLabelText(/마지막 접속 /)).toHaveLength(monitoredRoster.length);
    expect(within(list).getAllByLabelText(/^오늘 안 들어옴 · /))
      .toHaveLength(monitoringSummary.offlineToday);
  });

  it('최근 접속은 줄마다 같은 모양이다 — 분·시간·일, 30일 넘으면 오래됨', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    for (const badge of within(roster()).getAllByLabelText(/마지막 접속 /)) {
      expect(badge.textContent).toMatch(/^(방금|오래됨|\d+(분|시간|일) 전)$/);
    }
  });
});
