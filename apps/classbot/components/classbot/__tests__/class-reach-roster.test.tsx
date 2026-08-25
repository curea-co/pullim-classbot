import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClassReachRoster } from '../class-reach-roster';
import { monitoredRoster, monitoringSummary, shortcutTries } from '@/lib/mock/classbot-monitoring';

function rows() {
  return within(screen.getByRole('list')).getAllByRole('listitem');
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
    expect(within(row).getByText('목표 3')).toBeInTheDocument();
    expect(within(row).getByText('도달 1')).toBeInTheDocument();
    expect(within(row).getByText('6회')).toBeInTheDocument();   // 지름길 = 정답 요구 4 + 붙여넣기 2
    expect(within(row).getByText('12분 전')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /대화 기록/ })).toBeInTheDocument();
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
