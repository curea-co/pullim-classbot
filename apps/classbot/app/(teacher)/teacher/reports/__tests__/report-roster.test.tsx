import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  isDepthShort, isOfflineToday, monitoredRoster, monitoringSummary, shortcutTries,
} from '@/lib/mock/classbot-monitoring';
import { attentionReason, countAttentionStudents } from '@/lib/mock/classbot-teacher-home';
import { scopeExits } from '@/lib/mock/classbot-student-report';
import { reports } from '@/lib/mock';
import { ReportRoster } from '../report-roster';

/**
 * 리포트 센터 명단 — 보는 것은 셋이다.
 *   ① 리포트가 없는 학생도 명단에 있는가 (이 화면이 리포트 6건짜리로 좁아지지 않는가)
 *   ② 거르개가 관제소·교사 홈과 **같은 숫자**를 내는가 (규칙이 두 벌이 되지 않았는가)
 *   ③ 정렬이 실제로 순서를 바꾸고, 줄을 누르면 그 학생 기록으로 가는가
 *   ④ 열마다 머리글이 **눈에 보이고**, 이름과 학년은 서로 다른 칸에 있다 (관제소 명단과 같은 표)
 */

/** 학생 명단 = 표 하나. 이름으로 집어 거르개·정렬 알약 줄과 헷갈리지 않게 한다. */
function roster() {
  return screen.getByRole('table', { name: `등록된 학생 ${monitoredRoster.length}명` });
}

/** 학생 줄만 — 줄묶음 둘 중 두 번째(`tbody`)다. 첫 번째는 머리글 줄. */
function body() {
  return within(roster()).getAllByRole('rowgroup')[1];
}

function rosterRows() {
  return within(body()).getAllByRole('row');
}

/** 줄이 가리키는 학생 이름 — 이제 이름 칸의 링크 글자가 곧 그 이름이다. */
function names() {
  return rosterRows().map(tr => within(tr).getByRole('link').textContent ?? '');
}

/** 그 학생의 줄 — 배지·숫자는 링크 밖 다른 칸에 있으므로 줄로 집어야 한다. */
function rowOf(name: string) {
  return within(body()).getByText(name).closest('tr')!;
}

function pill(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('등록 학생 명단 — 리포트가 없어도 보인다', () => {
  it('등록된 학생 전원이 줄로 있다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    expect(rosterRows()).toHaveLength(monitoredRoster.length);
  });

  it('리포트 mock 이 한 번도 이름을 부르지 않은 학생도 명단에 있다', () => {
    render(<ReportRoster students={monitoredRoster} />);

    // 리포트 6건의 제목·대상 어디에도 이름(성 제외)이 없는 학생 = 「리포트가 없는 학생」
    const reportText = reports.map(r => `${r.title} ${r.subject}`).join(' ');
    const unnamed = monitoredRoster.filter(s => !reportText.includes(s.name.slice(1)));
    expect(unnamed.length).toBeGreaterThan(0);

    const shown = names().join(' ');
    for (const s of unnamed) expect(shown).toContain(s.name);
  });

  it('머릿말이 전원 수를 말한다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    expect(screen.getByText(`등록된 학생 ${monitoredRoster.length}명`)).toBeInTheDocument();
  });
});

describe('거르개 — 관제소·교사 홈과 같은 규칙을 읽는다', () => {
  it('「먼저 볼 학생」은 이슈가 있는 학생만 남긴다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(pill(/^먼저 볼 학생 /));

    const attention = countAttentionStudents(monitoredRoster);
    expect(attention).toBeGreaterThan(0);
    expect(attention).toBeLessThan(monitoredRoster.length);
    expect(rosterRows()).toHaveLength(attention);

    // 남은 줄은 전부 교사 홈이 「먼저 볼 학생」으로 고르는 학생이다
    const shown = names().join(' ');
    for (const s of monitoredRoster) {
      if (attentionReason(s) === null) expect(shown).not.toContain(s.name);
      else expect(shown).toContain(s.name);
    }
  });

  it('거르개 숫자가 관제소 요약과 같다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    for (const [name, expected] of [
      [/^미도달 /, monitoringSummary.notReached],
      [/^목표 수준 미달 /, monitoringSummary.depthShort],
      [/^오늘 안 들어옴 /, monitoringSummary.offlineToday],
    ] as const) {
      fireEvent.click(pill(name));
      expect(rosterRows()).toHaveLength(expected);
    }
  });

  it('걸러 놓고도 전체로 돌아올 수 있다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(pill(/^오늘 안 들어옴 /));
    expect(rosterRows()).toHaveLength(monitoringSummary.offlineToday);

    fireEvent.click(pill(/^전체 /));
    expect(rosterRows()).toHaveLength(monitoredRoster.length);
  });

  it('거르개가 무슨 뜻인지 화면이 말한다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    // 처음부터 「먼저 볼 학생」의 뜻이 보인다
    expect(screen.getByText(/오늘 안 들어옴 · 미도달 · 목표 수준 미달/)).toBeInTheDocument();

    fireEvent.click(pill(/^목표 수준 미달 /));
    expect(screen.getByText(/요구한 사고 수준\(1~4단계\)에 못 미친/)).toBeInTheDocument();
  });
});

describe('정렬 — 순서가 실제로 바뀐다', () => {
  it('기본은 「먼저 볼 순서」 — 짚을 이유가 있는 학생이 위로 온다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    const shown = names();

    // 아무 데도 안 걸린 학생은 걸린 학생보다 아래에 있다
    const flagged = shown.map(
      row => monitoredRoster.some(s => row.includes(s.name) && attentionReason(s) !== null),
    );
    expect(flagged.lastIndexOf(true)).toBeLessThan(flagged.indexOf(false));

    // 첫 줄은 오늘 안 들어온 학생 중 활동이 가장 오래된 학생
    const stalest = [...monitoredRoster]
      .filter(isOfflineToday)
      .sort((a, b) => b.lastSeenMin - a.lastSeenMin)[0];
    expect(shown[0]).toContain(stalest.name);
  });

  it('「지름길 많은 순」은 지름길이 가장 많은 학생을 맨 위로 올린다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '지름길 많은 순' }));

    const top = [...monitoredRoster].sort((a, b) => shortcutTries(b) - shortcutTries(a))[0];
    expect(names()[0]).toContain(top.name);
  });

  it('「이탈 많은 순」은 범위 이탈이 가장 많은 학생을 맨 위로 올린다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '이탈 많은 순' }));

    const most = Math.max(...monitoredRoster.map(scopeExits));
    const top = monitoredRoster.filter(s => scopeExits(s) === most);
    expect(top.some(s => names()[0].includes(s.name))).toBe(true);
  });

  it('정렬 기준도 화면이 말한다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '이름순' }));
    expect(screen.getByText('이름 가나다순이에요.')).toBeInTheDocument();
  });
});

describe('줄 진입 — 학생 기록으로 간다', () => {
  it('줄 전체가 그 학생의 기록으로 가는 링크 하나다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    const rows = rosterRows();
    for (const li of rows) {
      const links = within(li).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/teacher\/students\/m\d\d$/));
    }
  });

  it('링크가 그 줄에 적힌 학생을 가리킨다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '이름순' }));

    const first = [...monitoredRoster].sort((a, b) => a.name.localeCompare(b.name, 'ko'))[0];
    const link = within(rosterRows()[0]).getByRole('link');
    expect(link).toHaveTextContent(first.name);
    expect(link).toHaveAttribute('href', `/teacher/students/${first.id}`);
  });
});

describe('줄에 담는 것 — 거르개·정렬이 쓰는 값만', () => {
  it('도달 상태·지름길·이탈·최근 접속이 줄에 있다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    fireEvent.click(screen.getByRole('button', { name: '이름순' }));

    const first = [...monitoredRoster].sort((a, b) => a.name.localeCompare(b.name, 'ko'))[0];
    /*
      「지름길 3회」처럼 칸마다 달고 다니던 이름표는 머리글로 올라갔다. 그래서 줄 글자만 보면
      「3회」가 지름길인지 이탈인지 못 가른다 — 값이 같을 수도 있다. 자리로 집는다.
      칸 차례: 학년 · 도달 · 지름길 · 이탈 · 최근 접속 · 꺾쇠 (이름은 `th` 라 cell 에 안 들어온다)
    */
    const cells = within(rosterRows()[0]).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent(`${shortcutTries(first)}회`);
    expect(cells[3]).toHaveTextContent(`${scopeExits(first)}회`);
    // 글자를 통째로 견준다 — 「도달」은 「미도달」의 일부라 부분 일치로는 둘이 안 갈린다
    expect(cells[1].textContent).toBe(
      first.reach === 'not-reached' ? '미도달' : isDepthShort(first) ? '미달' : '도달',
    );
  });

  it('머리글이 화면 순서대로 있고 눈에서 감춰져 있지 않다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    const headers = within(roster()).getAllByRole('columnheader');

    expect(headers.map(h => h.textContent)).toEqual(
      // 마지막은 꺾쇠 자리 — 값이 아니라 「갈 수 있다」는 표시라 부를 이름이 없다
      ['이름', '학년', '도달', '지름길', '이탈', '최근 접속', ''],
    );
    // 머리글을 `sr-only` 로 감추면 표가 아니라 그냥 줄 스무 개가 된다
    for (const h of headers) expect(h.className).not.toContain('sr-only');
  });

  it('이름과 학년은 서로 다른 칸에 있다 — 한 칸에 겹쳐 있던 것을 뗐다', () => {
    render(<ReportRoster students={monitoredRoster} />);

    for (const s of monitoredRoster) {
      const nameCell = within(rowOf(s.name)).getByRole('rowheader');
      expect(nameCell).toHaveTextContent(s.name);
      expect(nameCell.textContent).not.toContain(s.grade);
      // 학년은 이름 다음 칸 — `th`(이름)는 cell 에 들어오지 않으므로 첫 칸이 학년이다
      expect(within(rowOf(s.name)).getAllByRole('cell')[0]).toHaveTextContent(s.grade);
    }
  });

  it('감정·웰빙 지수는 명단에 담지 않는다 — 20줄을 훑는 화면이고 열람 범위가 좁은 값이다', () => {
    render(<ReportRoster students={monitoredRoster} />);
    for (const gone of ['웰빙', '감정', '체크인']) {
      expect(screen.queryByText(new RegExp(gone))).not.toBeInTheDocument();
    }
  });
});
