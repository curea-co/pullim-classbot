import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClassReachRoster } from '../class-reach-roster';
import { monitoredRoster, monitoringSummary, shortcutTries } from '@/lib/mock/classbot-monitoring';

/** 학생 명단 = 표 하나. 이름으로 집어 거르개·정렬 알약 줄과 헷갈리지 않게 한다. */
function roster() {
  return screen.getByRole('table', { name: '학생 한 줄 보기' });
}

/** 학생 줄만 — 줄묶음 둘 중 두 번째(`tbody`)다. 첫 번째는 머리글 줄. */
function body() {
  return within(roster()).getAllByRole('rowgroup')[1];
}

function rows() {
  return within(body()).getAllByRole('row');
}

describe('ClassReachRoster', () => {
  it('학생 한 명당 한 줄', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    expect(rows()).toHaveLength(monitoredRoster.length);
  });

  it('한 줄에 도달 상태 · 목표 대비 깊이 · 지름길 시도 · 마지막 활동이 있다', () => {
    render(<ClassReachRoster students={[monitoredRoster[3]]} />);
    const row = rows()[0];
    expect(within(row).getByText('최도현')).toBeInTheDocument();
    expect(within(row).getByText('미도달')).toBeInTheDocument();
    // 「목표 · 닿음」 머리글이 낱말을 맡고 칸에는 숫자만 남는다 — 읽어주기 문장으로 집는다
    expect(within(row).getByLabelText(/요구한 수준 3단계 .*닿은 수준 1단계/)).toBeInTheDocument();
    expect(within(row).getByText('6회')).toBeInTheDocument();   // 지름길 = 정답 요구 4 + 붙여넣기 2
    expect(within(row).getByText('12분 전')).toBeInTheDocument();
  });

  it('줄 전체가 대화 기록으로 가는 링크 하나다', () => {
    render(<ClassReachRoster students={[monitoredRoster[3]]} />);
    /*
      예전에는 줄 끝에 「대화 기록 →」 링크가 따로 달려 있었다. 스무 줄이 같은 곳으로 가는
      같은 문구라 읽어주기로 구분이 안 돼 `sr-only` 로 이름을 덧대던 자리다.
      이제 이름 자체가 그 링크라 줄에 누를 것은 하나뿐이다.
    */
    const links = within(rows()[0]).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('최도현');
    expect(links[0].getAttribute('href')).toBe('/teacher/replay');
  });

  it('머리글이 화면 순서대로 있고 눈에서 감춰져 있지 않다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    const headers = within(roster()).getAllByRole('columnheader');

    expect(headers.map(h => h.textContent)).toEqual(
      // 마지막은 꺾쇠 자리 — 값이 아니라 「갈 수 있다」는 표시라 부를 이름이 없다
      ['이름', '학년', '도달', '목표 · 닿음', '지름길', '마지막 활동', ''],
    );
    // 머리글을 `sr-only` 로 감추면 표가 아니라 그냥 줄 스무 개가 된다
    for (const h of headers) expect(h.className).not.toContain('sr-only');
  });

  it('이름과 학년은 서로 다른 칸에 있다 — 한 칸에 겹쳐 있던 것을 뗐다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);

    for (const row of rows()) {
      const nameCell = within(row).getByRole('rowheader');
      const s = monitoredRoster.find(x => nameCell.textContent!.includes(x.name))!;
      expect(nameCell.textContent).not.toContain(s.grade);
      // 학년은 이름 다음 칸 — `th`(이름)는 cell 에 들어오지 않으므로 첫 칸이 학년이다
      expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(s.grade);
    }
  });

  it('총량 사용 지표(오늘 대화 수)는 노출하지 않는다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    expect(screen.queryByText(/오늘 대화/)).not.toBeInTheDocument();
  });

  it('도달 상태로 거를 수 있다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: /미도달/ }));
    expect(rows()).toHaveLength(monitoringSummary.notReached);
  });

  it('미접속만 거를 수 있다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: /미접속/ }));
    expect(rows()).toHaveLength(monitoringSummary.offlineToday);
  });

  it('지름길 많은 순으로 정렬한다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '지름길 많은 순' }));
    const top = [...monitoredRoster].sort((a, b) => shortcutTries(b) - shortcutTries(a))[0];
    expect(within(rows()[0]).getByText(top.name)).toBeInTheDocument();
  });

  it('지름길 시도를 처벌이 아니라 설계 신호로 설명한다', () => {
    render(<ClassReachRoster students={monitoredRoster} />);
    expect(screen.getByText(/과제 문항과 봇 프롬프트를 손볼 자리/)).toBeInTheDocument();
  });
});
