import { render, screen, within } from '@testing-library/react';
import {
  monitoringSummary, reachBadge, reachBadgeLabels,
} from '@/lib/mock/classbot-monitoring';
import { pickAttentionStudents } from '@/lib/mock/classbot-teacher-home';
import TeacherHomePage from '../page';

/**
 * 교사 홈 — 상단 카드 넉 장과 「먼저 볼 학생」 줄이 **같은 판정**을 읽는지 본다.
 * 홈은 몇 명만 보여주므로 전체 집계가 카드와 맞는지는 관제소 명단 쪽(monitor-roster.test)에서 못박는다.
 */

/** 요약 카드 = 첫 번째 list (「먼저 볼 학생」은 이제 목록이 아니라 표다) */
function cardBar() {
  return screen.getAllByRole('list')[0];
}

/** 먼저 볼 학생 = 표 하나. 이름으로 집어 요약 카드 줄과 헷갈리지 않게 한다. */
function attentionTable() {
  return screen.getByRole('table', { name: '먼저 볼 학생' });
}

/** 학생 줄만 — 줄묶음 둘 중 두 번째(`tbody`)다. 첫 번째는 머리글 줄. */
function attentionBody() {
  return within(attentionTable()).getAllByRole('rowgroup')[1];
}

function attentionRows() {
  return within(attentionBody()).getAllByRole('row');
}

describe('교사 홈 상단 카드', () => {
  it('카드 넉 장 — 도달 · 미도달 · 목표 수준 미달 · 오늘 안 들어옴', () => {
    render(<TeacherHomePage />);
    const cards = within(cardBar()).getAllByRole('listitem');
    expect(cards).toHaveLength(4);

    const { reached, total, notReached, depthShort, offlineToday } = monitoringSummary;
    expect(within(cardBar()).getByText(`${reached}/${total}명`)).toBeInTheDocument();
    expect(within(cardBar()).getByText(`${notReached}명`)).toBeInTheDocument();
    expect(within(cardBar()).getByText(`${depthShort}명`)).toBeInTheDocument();
    expect(within(cardBar()).getByText(`${offlineToday}명`)).toBeInTheDocument();
  });

  it('앞 세 장을 더하면 학급 전체 — 셋은 서로 배타다', () => {
    const { reached, notReached, depthShort, total } = monitoringSummary;
    expect(reached + notReached + depthShort).toBe(total);
  });
});

describe('먼저 볼 학생 한 줄', () => {
  it('줄마다 링크 하나뿐이고 그 학생의 기록으로 간다', () => {
    render(<TeacherHomePage />);
    for (const row of attentionRows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      // 되돌아갈 곳(from=home)이 붙는다 — 없으면 학생 상세의 뒤로 가기가 관제소로 튄다.
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/students\/m\d+\?from=home$/);
      expect(within(row).queryAllByRole('button')).toHaveLength(0);
    }
  });

  it('줄 배지는 카드와 같은 판정(reachBadge)을 쓴다', () => {
    render(<TeacherHomePage />);
    const rows = attentionRows();
    const picked = pickAttentionStudents();
    expect(rows).toHaveLength(picked.length);

    picked.forEach(({ student }, i) => {
      const row = rows[i];
      expect(within(row).getByText(student.name)).toBeInTheDocument();
      expect(within(row).getByText(reachBadgeLabels[reachBadge(student)])).toBeInTheDocument();
      expect(within(row).getByLabelText(/마지막 접속 /)).toBeInTheDocument();
    });
  });

  it('오늘 안 들어온 학생은 최근 접속 배지가 말한다 — 설명문을 겹쳐 쓰지 않는다', () => {
    render(<TeacherHomePage />);
    const offlineBadges = screen.getAllByLabelText(/^오늘 안 들어옴 · /);
    expect(offlineBadges.length).toBeGreaterThan(0);

    for (const gone of [
      '오늘 안 들어왔어요',
      '과제에서 성취기준까지 못 갔어요',
      '풀긴 했는데 목표한 사고 수준엔 못 닿았어요',
      '접속부터 확인',
      '어디서 막혔는지 대화 기록 열기',
    ]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });
});

describe('먼저 볼 학생 표 — 관제소·리포트 센터와 같은 껍데기', () => {
  it('머리글이 화면 순서대로 있고 눈에서 감춰져 있지 않다', () => {
    render(<TeacherHomePage />);
    const headers = within(attentionTable()).getAllByRole('columnheader');

    expect(headers.map(h => h.textContent)).toEqual(
      // 마지막은 꺾쇠 자리 — 값이 아니라 「갈 수 있다」는 표시라 부를 이름이 없다
      ['이름', '학년', '막힌 곳', '도달', '최근 접속', ''],
    );
    // 머리글을 `sr-only` 로 감추면 표가 아니라 그냥 줄 몇 개가 된다
    for (const h of headers) expect(h.className).not.toContain('sr-only');
  });

  it('이름과 학년은 서로 다른 칸에 있다 — 한 칸에 겹쳐 있던 것을 뗐다', () => {
    render(<TeacherHomePage />);

    pickAttentionStudents().forEach(({ student }, i) => {
      const row = attentionRows()[i];
      const nameCell = within(row).getByRole('rowheader');
      expect(nameCell).toHaveTextContent(student.name);
      expect(nameCell.textContent).not.toContain(student.grade);
      // 학년은 이름 다음 칸 — `th`(이름)는 cell 에 들어오지 않으므로 첫 칸이 학년이다
      expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(student.grade);
    });
  });

  it('「막힌 곳」 이름표는 머리글이 맡는다 — 줄마다 되풀이하지 않는다', () => {
    render(<TeacherHomePage />);
    // 머리글에 한 번. 줄에는 개념 이름만 남는다.
    expect(within(attentionBody()).queryByText(/^막힌 곳/)).not.toBeInTheDocument();
    expect(screen.queryByText('아직 막힌 곳이 안 보여요')).not.toBeInTheDocument();
  });
});
