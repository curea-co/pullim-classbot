import { render, screen, within } from '@testing-library/react';
import { monitoredRoster, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { MonitorRoster } from '../monitor-roster';

/**
 * 명단 한 줄이 지켜야 할 것 세 가지.
 *   ① 줄 전체가 그 학생의 기록으로 가는 **링크 하나**다 — 줄 안에 또 다른 누를 것을 두지 않는다
 *   ② 줄 배지 수 = 상단 카드 숫자 — 하나라도 어긋나면 여기서 실패한다
 *   ③ 열마다 머리글이 **눈에 보이고**, 이름과 학년은 서로 다른 칸에 있다
 */

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
    // 머리글에도 「도달」이 있다 — 줄 배지만 세도록 학생 줄로 좁힌다
    const list = body();

    expect(within(list).getAllByText('도달')).toHaveLength(monitoringSummary.reached);
    expect(within(list).getAllByText('미달')).toHaveLength(monitoringSummary.depthShort);
    expect(within(list).getAllByText('미도달')).toHaveLength(monitoringSummary.notReached);

    expect(
      monitoringSummary.reached + monitoringSummary.depthShort + monitoringSummary.notReached,
    ).toBe(monitoringSummary.total);
  });

  it('줄마다 최근 접속 배지가 하나씩 · 오늘 안 들어온 학생 수도 카드와 같다', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    const list = body();

    expect(within(list).getAllByLabelText(/마지막 접속 /)).toHaveLength(monitoredRoster.length);
    expect(within(list).getAllByLabelText(/^오늘 안 들어옴 · /))
      .toHaveLength(monitoringSummary.offlineToday);
  });

  it('최근 접속은 줄마다 같은 모양이다 — 분·시간·일, 30일 넘으면 오래됨', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    for (const badge of within(body()).getAllByLabelText(/마지막 접속 /)) {
      expect(badge.textContent).toMatch(/^(방금|오래됨|\d+(분|시간|일) 전)$/);
    }
  });
});

describe('MonitorRoster 표 — 열마다 머리글이 보인다', () => {
  it('머리글이 화면 순서대로 있고 눈에서 감춰져 있지 않다', () => {
    render(<MonitorRoster students={monitoredRoster} />);
    const headers = within(roster()).getAllByRole('columnheader');

    expect(headers.map(h => h.textContent)).toEqual(
      // 마지막은 꺾쇠 자리 — 값이 아니라 「갈 수 있다」는 표시라 부를 이름이 없다
      ['이름', '학년', '도달', '목표 · 닿음', '지름길', '이탈', '최근 접속', ''],
    );
    // 머리글을 `sr-only` 로 감추면 표가 아니라 그냥 줄 스무 개가 된다
    for (const h of headers) expect(h.className).not.toContain('sr-only');
  });

  it('이름과 학년은 서로 다른 칸에 있다 — 한 칸에 겹쳐 있던 것을 뗐다', () => {
    render(<MonitorRoster students={monitoredRoster} />);

    for (const row of rows()) {
      // 줄이 어느 학생인지는 그 줄 링크가 말한다 (`/teacher/students/<id>?from=monitor`)
      const id = within(row).getByRole('link').getAttribute('href')!.split(/[/?]/)[3];
      const s = monitoredRoster.find(x => x.id === id)!;

      const nameCell = within(row).getByRole('rowheader');
      expect(nameCell).toHaveTextContent(s.name);
      expect(nameCell.textContent).not.toContain(s.grade);
      // 학년은 이름 다음 칸 — `th`(이름)는 cell 에 들어오지 않으므로 첫 칸이 학년이다
      expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(s.grade);
    }
  });
});
