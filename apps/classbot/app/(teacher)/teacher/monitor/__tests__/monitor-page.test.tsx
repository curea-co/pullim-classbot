import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  monitoredRoster, monitoringSummary, reteachConcepts,
} from '@/lib/mock/classbot-monitoring';
import TeacherMonitorPage from '../page';

/**
 * 관제소 화면 순서 — 요약 카드(거르개) → 학생 명단(거른 결과) → 다시 가르칠 개념(학급 처방).
 *
 * 카드가 아래 명단을 거르는 손잡이라 둘은 붙어 있어야 한다.
 * 사이에 다른 블록이 끼면 카드를 눌러도 무엇이 바뀌었는지 화면에서 읽히지 않는다.
 * 그래서 순서를 여기서 못박는다 — 블록을 하나 더 넣더라도 이 사이는 비워 둘 것.
 */

const ROSTER = '학생 한 줄 보기';
const RETEACH = '다시 가르칠 개념 3개';

function sectionOf(heading: string): HTMLElement {
  return screen.getByRole('heading', { name: heading }).closest('section')!;
}

/**
 * 요약 카드 묶음 — 카드 여섯 장과 안내 한 줄을 감싼 자리.
 * 순서를 재는 테스트라 「몇 번째 블록인가」로 찾지 않는다. 안내 문구로 집는다.
 */
function cardBlock(): HTMLElement {
  return screen.getByText('카드를 누르면 아래 명단에 그 학생만 남아요.').parentElement!;
}

function rosterRows() {
  return within(sectionOf(ROSTER)).getAllByRole('listitem');
}

describe('학급 관제소 화면 순서', () => {
  it('학생 명단이 「다시 가르칠 개념」보다 먼저 온다', () => {
    render(<TeacherMonitorPage />);
    const position = sectionOf(ROSTER).compareDocumentPosition(sectionOf(RETEACH));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('「다시 가르칠 개념」은 화면 맨 아래 블록이다', () => {
    const { container } = render(<TeacherMonitorPage />);
    const blocks = [...container.querySelectorAll('section')];
    expect(blocks.at(-1)).toBe(sectionOf(RETEACH));
  });

  it('카드와 명단 사이에는 아무 블록도 끼지 않는다', () => {
    render(<TeacherMonitorPage />);
    expect(cardBlock().nextElementSibling).toBe(sectionOf(ROSTER));
  });
});

describe('학급 관제소 거르개 — 자리를 옮겨도 카드가 명단을 거른다', () => {
  it('카드를 누르면 명단이 그 학생만 남는다', () => {
    render(<TeacherMonitorPage />);
    expect(rosterRows()).toHaveLength(monitoredRoster.length);

    fireEvent.click(within(cardBlock()).getByRole('button', { name: /^미도달 / }));
    expect(rosterRows()).toHaveLength(monitoringSummary.notReached);
  });

  it('「다시 가르칠 개념」은 거르개를 따라가지 않는다 — 학급 단위 그대로', () => {
    render(<TeacherMonitorPage />);
    const concepts = () => within(sectionOf(RETEACH)).getAllByRole('listitem');
    expect(concepts()).toHaveLength(reteachConcepts.length);

    fireEvent.click(within(cardBlock()).getByRole('button', { name: /^오늘 안 들어옴 / }));
    expect(rosterRows()).toHaveLength(monitoringSummary.offlineToday);
    expect(concepts()).toHaveLength(reteachConcepts.length);
  });
});
