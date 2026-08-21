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

/** 요약 카드 = 첫 번째 list, 먼저 볼 학생 = 두 번째 list */
function cardBar() {
  return screen.getAllByRole('list')[0];
}

function attentionRows() {
  return within(screen.getAllByRole('list')[1]).getAllByRole('listitem');
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
      expect(links[0].getAttribute('href')).toMatch(/^\/teacher\/students\/m\d+$/);
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
