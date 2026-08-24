import { render, screen, within, cleanup } from '@testing-library/react';
import { StuckPointsPanel } from '../[id]/stuck-points-panel';
import { StudentGradingPanel } from '../[id]/student-grading-panel';
import { entryTarget, isEntrySource, resolveEntrySource } from '../[id]/entry-source';
import { monitoredClass, monitoredRoster } from '@/lib/mock/classbot-monitoring';
import { buildStuckPoints, buildTranscript } from '@/lib/mock/classbot-student-report';
import { gradingItemsOfStudent } from '@/lib/mock/classbot-grading-roster';
import { useGradingStore } from '@/lib/store/grading';

/**
 * 채점 허브에서 학생을 눌러 들어온 화면이 답해야 하는 것 (spec 11 § 3.3.3).
 *   어떤 봇과 · 어떤 대화를 했고 · **어디서 막혔나**.
 *
 * 막힌 지점의 말은 새로 지어내지 않는다 — 대화 기록의 그 턴을 그대로 옮긴 것이라
 * 여기 뜬 문장이 대화 기록에도 같은 시각으로 있어야 한다.
 */

const stuck = monitoredRoster.find(s => s.stuckConcepts.length > 0)!;   // m03 박하람
const clean = monitoredRoster.find(s => s.stuckConcepts.length === 0)!; // m01 김서연

beforeEach(() => {
  useGradingStore.setState({ decisions: {} });
  localStorage.clear();
});

describe('막힌 지점 — 어디서 걸렸나', () => {
  function renderStuck(student = stuck) {
    return render(
      <StuckPointsPanel
        stuckPoints={buildStuckPoints(student)}
        studentName={student.name}
        botName={monitoredClass.botName}
      />,
    );
  }

  it('막힌 개념이 개수와 함께 모두 보인다', () => {
    renderStuck();
    const points = buildStuckPoints(stuck);
    expect(points.length).toBe(stuck.stuckConcepts.length);
    expect(screen.getByText(`막힌 지점 ${points.length}개`)).toBeTruthy();
    for (const point of points) {
      expect(screen.getByText(point.label)).toBeTruthy();
    }
  });

  it('어떤 봇과 나눈 대화인지 적혀 있다', () => {
    renderStuck();
    // 설명 한 줄과 되묻기 말풍선 양쪽에 봇 이름이 있다.
    expect(screen.getAllByText(new RegExp(monitoredClass.botName)).length).toBeGreaterThan(0);
  });

  it('학생 질문과 봇 되묻기가 대화 기록의 그 턴과 같은 말이다', () => {
    renderStuck();
    const turns = buildTranscript(stuck);
    for (const point of buildStuckPoints(stuck)) {
      const askTurn = turns.find(t => t.conceptId === point.conceptId && t.speaker === 'student')!;
      const probeTurn = turns.find(t => t.conceptId === point.conceptId && t.speaker === 'bot')!;
      expect(point.ask).toBe(askTurn.text);
      expect(point.probe).toBe(probeTurn.text);
      expect(screen.getByText(new RegExp(askTurn.text.slice(0, 12)))).toBeTruthy();
      expect(screen.getByText(new RegExp(probeTurn.text.slice(0, 12)))).toBeTruthy();
    }
  });

  it('막힌 개념이 없으면 빈 자리를 다른 지표로 메우지 않는다', () => {
    cleanup();
    renderStuck(clean);
    expect(screen.getByText('막힌 지점 0개')).toBeTruthy();
    expect(screen.getByText('이 학생이 막힌 개념은 기록에 없어요')).toBeTruthy();
  });
});

describe('이 학생의 채점 — 채점 허브로 돌아가는 길', () => {
  const withGrading = monitoredRoster.find(s => gradingItemsOfStudent(s.id).length > 0)!;

  it('그 학생의 채점 항목이 검수 화면으로 이어진다', () => {
    const items = gradingItemsOfStudent(withGrading.id);
    render(<StudentGradingPanel items={items} studentName={withGrading.name} />);

    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(items.length);
    for (const item of items) {
      const link = within(list).getByText(item.assignmentTitle).closest('a');
      expect(link?.getAttribute('href')).toBe(`/teacher/grading/${item.id}`);
    }
  });

  it('AI 초안이라는 것을 숨기지 않는다', () => {
    const items = gradingItemsOfStudent(withGrading.id);
    render(<StudentGradingPanel items={items} studentName={withGrading.name} />);
    expect(screen.getAllByText(/AI 초안/).length).toBeGreaterThan(0);
  });

  it('채점 항목이 없는 학생은 그렇게 적는다', () => {
    render(<StudentGradingPanel items={[]} studentName={clean.name} />);
    expect(screen.getByText('아직 채점할 제출이 없어요')).toBeTruthy();
  });
});

describe('들어온 곳 — 되돌아갈 곳', () => {
  it('채점 허브에서 들어오면 채점 허브로 돌아간다', () => {
    expect(resolveEntrySource('grading')).toBe('grading');
    expect(entryTarget('grading')).toEqual({ href: '/teacher/grading', label: '채점 허브' });
  });

  it('from 이 없으면 지금까지처럼 관제소에서 온 것으로 본다', () => {
    // 기존 링크(`/teacher/students/m04`)가 그대로 동작해야 한다.
    expect(resolveEntrySource(undefined)).toBe('monitor');
    expect(entryTarget(undefined)).toEqual({ href: '/teacher/monitor', label: '학급 관제소' });
  });

  it('교사 홈에서 들어오면 교사 홈으로 돌아간다', () => {
    // 홈 「먼저 볼 학생」 줄도 학생 상세로 직링크한다 — 관제소·채점 허브 두 갈래가 아니다.
    expect(resolveEntrySource('home')).toBe('home');
    expect(entryTarget('home')).toEqual({ href: '/teacher', label: '교사 홈' });
  });

  it('검수하다 건너오면 학생 전체 탭이 아니라 큐로 돌아간다', () => {
    // 「채점 허브」 하나로 뭉뚱그리면 검수하던 자리를 잃는다.
    expect(entryTarget('grading-queue')).toEqual({
      href: '/teacher/grading?view=queue', label: '채점 대기 큐',
    });
  });

  it('모르는 값은 관제소로 떨어진다 — 없는 화면으로 보내지 않는다', () => {
    expect(resolveEntrySource('bogus')).toBe('monitor');
    expect(isEntrySource('bogus')).toBe(false);
  });
});
