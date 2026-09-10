/**
 * 봇 수정 — 운영 화면 봇 카드의 「더보기 → 수정하기」가 오는 자리.
 *
 * 이 화면이 지켜야 할 것:
 *  - 빈 빌더가 아니라 **그 봇의 지금 값**으로 열린다 — 이름·과목·학년·말투·답 범위·붙은 반
 *  - 카탈로그가 안 들고 있는 것(수업 자료·평소에·틀렸을 때)은 기본값으로 두고 지어내지 않는다
 *  - 학교 교과 이름(「통합과학」)도 빌더의 다섯 과목 중 하나로 읽힌다
 *  - 막는 판정은 빌더와 같은 것을 읽는다 — 「저장」도 「다음」도 위쪽 「단계」도 같이 막힌다
 *  - 반은 여기서 고치지 않는다 — 「채워진 것」이 읽어주기만 한다
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { botDraft } from '../bot-draft';
import { BotEditWorkspace } from '../edit-workspace';
import { emptyDraft } from '@/components/builder/builder-types';
import { getTeacherBotRows } from '@/lib/mock/classbot-teacher-ops';

const rows = getTeacherBotRows();

/** 카탈로그 한 줄 집어 오기 — 없는 봇으로 테스트가 조용히 통과하지 않게 여기서 막는다. */
function row(botId: string) {
  const found = rows.find(r => r.bot.id === botId);
  if (!found) throw new Error(`mock 카탈로그에 ${botId} 가 없다`);
  return found;
}

/* ─── 첫 값 만들기 ─── */

describe('이미 있는 봇 → 빌더 드래프트', () => {
  it('카탈로그가 들고 있는 것은 그대로 실린다', () => {
    const draft = botDraft(row('cb_001'));

    expect(draft.subject).toBe('math');
    expect(draft.grade).toBe('중2');
    expect(draft.name).toBe('수학봇');
    expect(draft.tone).toBe('friendly');
    expect(draft.scope).toBe(3);
    // 반은 카탈로그가 아니라 운영 기록(`BotOps.classrooms`)이 갖는다
    expect(draft.classes).toEqual(['cr_math_a']);
  });

  it('학교 교과 이름도 빌더의 다섯 중 하나로 읽는다 — 「통합과학」은 과학이다', () => {
    expect(botDraft(row('cb_003')).subject).toBe('science');
  });

  it('카탈로그의 말투 다섯이 빌더의 셋으로 접힌다', () => {
    expect(botDraft(row('cb_002')).tone).toBe('polite');   // 정중
    expect(botDraft(row('cb_003')).tone).toBe('firm');     // 스파르타
    expect(botDraft(row('cb_004')).tone).toBe('polite');   // 차분
    expect(botDraft(row('cb_005')).tone).toBe('friendly'); // 열정
  });

  it('카탈로그가 안 들고 있는 셋은 기본값 그대로 — 없는 값을 지어내지 않는다', () => {
    for (const r of rows) {
      const draft = botDraft(r);
      expect(draft.files).toEqual([]);
      expect(draft.style).toBe(emptyDraft.style);
      expect(draft.wrong).toBe(emptyDraft.wrong);
    }
  });

  it('모든 봇이 과목을 갖는다 — 하나라도 못 읽으면 그 봇의 수정 화면이 열리자마자 막힌다', () => {
    for (const r of rows) {
      expect(botDraft(r).subject).not.toBeNull();
    }
  });

  it('반 두 개가 붙은 봇은 둘 다 실린다', () => {
    expect(botDraft(row('cb_004')).classes).toEqual(['cr_kor_a', 'cr_kor_b']);
  });
});

/* ─── 화면 ─── */

function renderEdit(botId: string) {
  const r = row(botId);
  return render(<BotEditWorkspace botName={r.bot.name} initialDraft={botDraft(r)} />);
}

describe('봇 수정 화면', () => {
  it('빈 빌더가 아니라 그 봇의 지금 값으로 열린다', () => {
    renderEdit('cb_004');

    expect(screen.getByRole('heading', { level: 1, name: '국어봇 수정하기' })).toBeInTheDocument();
    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('국어');
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('중3');
    expect(screen.getByTestId('summary-row-name')).toHaveTextContent('국어봇');
    expect(screen.getByTestId('summary-row-scope')).toHaveTextContent('L4');
    // 이미 고른 값이 눌린 채로 보인다 — 「채워진 것」에만 있고 마당에는 안 눌려 있으면 안 된다
    expect(screen.getByRole('radio', { name: /국어/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '중3' })).toBeChecked();
    expect(screen.getByLabelText(/봇 이름/)).toHaveValue('국어봇');
  });

  it('붙어 있는 반을 읽어준다 — 여기서 고치지는 않는다', () => {
    renderEdit('cb_004');

    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('중3 국어 A반 · 중3 국어 B반');
    // 반을 고르는 자리는 만드는 화면에만 있다
    expect(screen.queryByRole('group', { name: '어느 반에 넣을까요' })).toBeNull();
  });

  it('만드는 화면이 아니다 — 「생성」도 만든 뒤 화면도 없다', () => {
    renderEdit('cb_001');

    expect(screen.queryByRole('button', { name: '채운 그대로 봇 생성하기' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })).toHaveLength(1);
    expect(screen.queryByText('만들어졌어요')).toBeNull();
  });

  it('마당 셋을 그대로 오간다 — 마당 3 에서는 아래 자리도 「저장」이 이어받는다', () => {
    renderEdit('cb_001');

    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: '봇이 보고 답할 것' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('heading', { name: '가르치는 법' })).toBeInTheDocument();

    // 헤더 한 자리 + 「다음」이 쓰던 아래 자리 — 자리가 둘이어도 부르는 것은 하나다
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })).toHaveLength(2);
  });

  it('되짚어 가는 「이전」은 막지 않는다', () => {
    renderEdit('cb_001');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
  });

  it('규칙을 어기면 「저장」이 막히고 왜 막혔는지 말한다 — 빌더와 같은 판정이다', () => {
    renderEdit('cb_001');

    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '봇' } });
    fireEvent.click(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })[0]);

    expect(screen.getByRole('alert')).toHaveTextContent('이름은 두 글자에서 서른 글자 사이로');
  });

  it('막힌 것을 고치면 오류가 사라진다', () => {
    renderEdit('cb_001');

    const nameInput = screen.getByLabelText(/봇 이름/);
    fireEvent.change(nameInput, { target: { value: '봇' } });
    fireEvent.click(screen.getAllByRole('button', { name: '고친 그대로 저장하기' })[0]);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: '수학봇2' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('summary-row-name')).toHaveTextContent('수학봇2');
  });

  it('고친 값이 「채워진 것」에 바로 실린다', () => {
    renderEdit('cb_001');

    fireEvent.click(screen.getByRole('radio', { name: '고1' }));
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('고1');
  });
});
