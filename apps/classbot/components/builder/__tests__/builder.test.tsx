/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 이 화면이 지켜야 할 것:
 *  - 꼭 골라야 하는 것은 이름 옆에서 알 수 있다 — 필수는 빨간 `*`, 나머지는 `(선택)`
 *  - 「채워진 것」은 아홉 줄을 **항목 이름 : 값** 으로만 보여준다 (배지 · 「고치기」 · 세는 숫자 없음)
 *  - 과목을 **바꾸면** 지난 과목의 자료가 비워지고, **같은 과목을 다시 누르면** 그대로 남는다
 *  - 「만들기」는 어느 마당에서나 헤더 한 자리에 같은 이름으로 있다
 *  - 필수를 안 채우면 「만들기」도 「다음」도 위쪽 「단계」도 막힌다 — 셋이 같은 판정을 읽는다
 *  - 뒤로 가는 길(「이전」 · 「단계」로 되돌아가기)은 막지 않는다 — 고치러 돌아갈 수 있어야 한다
 *  - 과목 카드가 부르는 이름은 과목 이름 하나다 — 오른쪽 위 무늬는 낭독기에서 빠지고,
 *    시그니처 색 점도 「과학봇」 밑줄도 없다
 *  - 만든 뒤 화면은 배정 두 축(`?created=` · `?rooms=`)을 함께 넘긴다
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import BotBuilderPage from '@/app/(teacher)/teacher/builder/page';
import {
  BOT_NAME_MAX, BOT_NAME_MIN, FIELD_GROUP,
  FIELD_KEYS, REQUIRED_FIELDS, alwaysOnSafety, botName, classAssignments, classroomChoices,
  emptyDraft, faultAnchorId, faultBefore, firstFault, isBuildYard, isNameValid, isRequired,
  subjectIds, subjectMeta, summaryRows,
} from '../builder-types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { teacherBotOps } from '@/lib/mock/classbot-teacher-ops';
import { teacherClassrooms } from '@/lib/mock/classbot-classrooms';

/**
 * `botSignature` 는 **불렀는지**를 보려고 감싼다 — 값은 진짜를 그대로 돌려준다.
 *
 * 시그니처 색 점이 카드에서 사라졌는지는 DOM 으로 볼 수 없다. 색이 `oklch()` 라
 * jsdom 이 인라인 style 을 통째로 버려서, 점이 있든 없든 마크업이 똑같아 보인다.
 * 그래서 「그 색을 가져다 쓰는가」로 본다 — 클래스 이름을 잠그는 것보다 뜻에 가깝고,
 * 장식이 바뀌어도 거짓으로 깨지지 않는다.
 */
jest.mock('@/lib/tokens/bot-signature', () => {
  const actual = jest.requireActual('@/lib/tokens/bot-signature');
  return { ...actual, botSignature: jest.fn(actual.botSignature) };
});

/* ─── 순수 모델 ─── */

describe('채워진 것 모델', () => {
  it('보여주는 항목은 아홉 가지 — 안전 세 가지는 이 목록 밖이다', () => {
    expect(FIELD_KEYS).toHaveLength(9);
    expect(alwaysOnSafety).toHaveLength(3);
    expect(summaryRows(emptyDraft, 'build')).toHaveLength(9);
    // 안전 항목 이름이 목록에 섞여 들어오면 교사가 정할 수 있는 것처럼 읽힌다
    for (const safety of alwaysOnSafety) {
      expect(summaryRows(emptyDraft, 'build').map((r) => r.label)).not.toContain(safety);
    }
  });

  it('꼭 골라야 하는 것은 과목 하나뿐이다', () => {
    expect(REQUIRED_FIELDS).toEqual(['subject']);
    expect(FIELD_KEYS.filter(isRequired)).toEqual(['subject']);
  });

  it('줄은 이름과 값만 들고 있다 — 세는 데 쓰던 상태가 남아 있지 않다', () => {
    for (const row of summaryRows(emptyDraft, 'build')) {
      expect(Object.keys(row).sort()).toEqual(['field', 'group', 'label', 'placeholder', 'value']);
    }
  });

  it('이름을 비우면 고른 과목의 기본 이름이 봇 이름이 된다', () => {
    expect(botName({ ...emptyDraft, subject: 'science' })).toBe('과학봇');
    expect(botName({ ...emptyDraft, subject: 'social' })).toBe('사회봇');
    expect(botName({ ...emptyDraft, subject: 'science', name: '  별별봇 ' })).toBe('별별봇');
    // 과목도 이름도 없으면 부를 이름이 아직 없다
    expect(botName(emptyDraft)).toBe('');
  });

  it('이름은 비워도 되지만 적을 거면 두 글자에서 서른 글자 사이', () => {
    expect(isNameValid(emptyDraft)).toBe(true);
    expect(isNameValid({ ...emptyDraft, name: '  ' })).toBe(true);
    expect(isNameValid({ ...emptyDraft, name: '봇' })).toBe(false);
    expect(isNameValid({ ...emptyDraft, name: '과학봇' })).toBe(true);
    // 상한 — 입력칸 maxLength 로도 막지만 붙여넣기·프로그램 입력까지 여기서 본다
    expect(isNameValid({ ...emptyDraft, name: '봇'.repeat(BOT_NAME_MAX) })).toBe(true);
    expect(isNameValid({ ...emptyDraft, name: '봇'.repeat(BOT_NAME_MAX + 1) })).toBe(false);
    // 앞뒤 공백은 세지 않는다 — 서른 글자 + 공백은 통과해야 한다
    expect(isNameValid({ ...emptyDraft, name: ` ${'봇'.repeat(BOT_NAME_MAX)} ` })).toBe(true);
    expect(BOT_NAME_MIN).toBe(2);
  });

  it('이름 입력칸이 서른 글자에서 막힌다', () => {
    render(<BotBuilderPage />);
    const input = screen.getByPlaceholderText('과목을 고르면 이름이 정해져요');
    expect(input).toHaveAttribute('maxlength', String(BOT_NAME_MAX));
  });
});

describe('관문 판정 (firstFault)', () => {
  it('마당은 「채워진 것」과 같은 표에서 나온다 — 두 벌로 두지 않는다', () => {
    for (const row of summaryRows(emptyDraft, 'build')) {
      expect(row.group).toBe(FIELD_GROUP[row.field]);
    }
  });

  it('필수는 저마다 사는 마당에서 걸린다 — 마당을 하드코딩하지 않는다', () => {
    expect(REQUIRED_FIELDS.length).toBeGreaterThan(0);
    for (const field of REQUIRED_FIELDS) {
      const group = FIELD_GROUP[field];
      // 만든 뒤(4)에 고르는 것은 돌려보낼 마당이 없어 필수가 될 수 없다
      expect(isBuildYard(group)).toBe(true);
      if (!isBuildYard(group)) continue;
      expect(firstFault(emptyDraft, group)).not.toBeNull();
    }
  });

  it('막을 때는 어느 항목이 어느 마당에서 왜 막혔는지 함께 들고 온다', () => {
    expect(firstFault(emptyDraft, 1)).toEqual({
      field: 'subject',
      yard: 1,
      message: expect.stringContaining('과목을 골라야'),
    });
  });

  it('마당 2·3 에는 아직 필수가 없어 그냥 넘어간다', () => {
    expect(firstFault(emptyDraft, 2)).toBeNull();
    expect(firstFault(emptyDraft, 3)).toBeNull();
  });

  it('「다음」과 「만들기」가 같은 판정을 읽는다', () => {
    // 마당 하나만 보든 아홉 가지를 다 보든, 걸리는 항목도 문구도 같아야 두 길이 어긋나지 않는다
    expect(firstFault(emptyDraft, 1)).toEqual(firstFault(emptyDraft));
  });

  it('이름은 필수가 아니지만 규칙을 어기면 걸린다', () => {
    const picked = { ...emptyDraft, subject: 'science' as const };
    expect(firstFault(picked, 1)).toBeNull();
    expect(firstFault({ ...picked, name: '봇' }, 1)?.field).toBe('name');
    expect(firstFault({ ...picked, name: '봇'.repeat(BOT_NAME_MAX + 1) }, 1)?.field).toBe('name');
    // 비워 두는 것은 규칙 위반이 아니다 — 과목 기본 이름이 들어간다
    expect(firstFault({ ...picked, name: '   ' }, 1)).toBeNull();
  });

  it('과목이 비면 이름 규칙보다 먼저 걸린다 — 앞 항목부터 본다', () => {
    expect(firstFault({ ...emptyDraft, name: '봇' }, 1)?.field).toBe('subject');
  });
});

describe('앞으로 가는 길의 판정 (faultBefore)', () => {
  it('뒤로 가는 길은 막지 않는다 — 제자리도 마찬가지다', () => {
    // 아무것도 안 채운 드래프트라도 되돌아가는 길에는 관문이 없다
    expect(faultBefore(emptyDraft, 3, 1)).toBeNull();
    expect(faultBefore(emptyDraft, 2, 1)).toBeNull();
    expect(faultBefore(emptyDraft, 1, 1)).toBeNull();
  });

  it('앞으로 갈 때는 「다음」과 같은 것에 걸린다', () => {
    expect(faultBefore(emptyDraft, 1, 2)).toEqual(firstFault(emptyDraft, 1));
    expect(faultBefore(emptyDraft, 1, 2)?.field).toBe('subject');
  });

  it('건너뛰어도 지나치는 마당을 다 본다 — 1 → 3 은 마당 2 도 지나는 것이다', () => {
    const picked = { ...emptyDraft, subject: 'science' as const };
    expect(faultBefore(emptyDraft, 1, 3)?.field).toBe('subject');
    // 마당 2 에 아직 필수가 없어 지금은 통과한다. 필수가 생기면 이 건너뛰기도 걸린다
    expect(faultBefore(picked, 1, 3)).toBeNull();
    expect(faultBefore(picked, 2, 3)).toBeNull();
  });
});

/* ─── 화면 ─── */

/** 항목 이름 옆 표시와 「채워진 것」 줄을 한 번에 본다. */
function marks(field: string) {
  return {
    beside: screen.getByTestId(`field-mark-${field}`).textContent ?? '',
    summary: screen.getByTestId(`summary-row-${field}`).textContent ?? '',
  };
}

/** 마당을 오가는 자리는 위쪽 「단계」 하나뿐이다. */
function step(title: string) {
  return screen.getByRole('button', { name: title });
}

describe('과목은 기본값이 없다', () => {
  it('과목을 안 고르면 「만들기」가 막히고 왜 막혔는지 말한다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));

    expect(screen.getByRole('alert')).toHaveTextContent('과목을 골라야 봇을 만들 수 있어요');
    // 만든 뒤 화면으로 넘어가지 않았다
    expect(screen.queryByText('만들어졌어요')).toBeNull();
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
  });

  it('이름이 한 글자면 막히고 왜 막혔는지 말한다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '봇' } });
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));

    expect(screen.getByRole('alert')).toHaveTextContent('이름은 두 글자에서 서른 글자 사이로');
    expect(screen.queryByText('만들어졌어요')).toBeNull();
  });

  it('과목만 고르면 마당 1 에서 끝낼 수 있다 — 남은 여덟은 기본값으로 들어간다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));

    expect(screen.getByText('만들어졌어요')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '과학봇' })).toBeInTheDocument();
    // 손대지 않은 항목은 기본값이 값으로 실려 있다
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('중1');
    expect(screen.getByTestId('summary-row-scope')).toHaveTextContent('L3 교과 범위');
  });
});

describe('필수를 안 채우면 다음 마당으로 못 간다', () => {
  /** 지금 어느 마당에 있는지는 그 마당의 제목으로 본다. */
  function yardHeading(name: string) {
    return screen.queryByRole('heading', { name });
  }

  it('과목을 안 고르고 「다음」을 누르면 마당 1 에 머물고 왜 막혔는지 말한다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('alert')).toHaveTextContent('과목을 골라야 봇을 만들 수 있어요');
    expect(yardHeading('봇 소개')).toBeInTheDocument();
    expect(yardHeading('봇이 보고 답할 것')).toBeNull();
  });

  it('막히면 막힌 항목으로 초점이 옮겨간다 — 오류만 띄우고 어디인지 안 알려주면 소용없다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(document.getElementById(faultAnchorId('subject'))).toHaveFocus();
    // 초점이 온 자리는 과목 라디오 묶음이다 — 초점이 오면 낭독기가 묶음 이름을 읽는다
    expect(screen.getByRole('radiogroup', { name: '과목' })).toHaveFocus();
  });

  it('이름을 한 글자만 적고 「다음」을 누르면 막힌다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '봇' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('alert')).toHaveTextContent('이름은 두 글자에서 서른 글자 사이로');
    expect(yardHeading('봇이 보고 답할 것')).toBeNull();
    // 「만들기」가 쓰던 표시를 그대로 쓴다 — 새 방식을 만들지 않는다
    expect(screen.getByLabelText(/봇 이름/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/봇 이름/)).toHaveFocus();
  });

  it('필수를 채우면 넘어간다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(yardHeading('봇이 보고 답할 것')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('막힌 뒤 그 항목을 채우면 오류가 사라지고 넘어간다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(yardHeading('봇이 보고 답할 것')).toBeInTheDocument();
  });

  it('필수가 없는 마당은 「다음」이 그냥 넘어간다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(yardHeading('가르치는 법')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('되짚어 가는 「이전」은 막지 않는다', () => {
    render(<BotBuilderPage />);
    // 「단계」로 건너뛴 자리에서 되돌아온다 — 뒤로 가는 길에는 관문이 없다
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('보고 답할 것'));
    fireEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(yardHeading('봇 소개')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('위쪽 「단계」에도 같은 관문이 걸린다', () => {
  /** 지금 어느 마당에 있는지는 그 마당의 제목으로 본다. */
  function yardHeading(name: string) {
    return screen.queryByRole('heading', { name });
  }

  it('과목을 안 고르고 「단계」 2 를 눌러도 마당 1 에 머물고 왜 막혔는지 말한다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(step('보고 답할 것'));

    expect(screen.getByRole('alert')).toHaveTextContent('과목을 골라야 봇을 만들 수 있어요');
    expect(yardHeading('봇 소개')).toBeInTheDocument();
    expect(yardHeading('봇이 보고 답할 것')).toBeNull();
  });

  it('앞으로 가는 단계 창구를 전수로 막는다 — 하나만 막으면 다른 하나로 새어 나간다', () => {
    for (const title of ['보고 답할 것', '가르치는 법']) {
      const { unmount } = render(<BotBuilderPage />);
      fireEvent.click(step(title));

      expect(screen.getByRole('alert')).toHaveTextContent('과목을 골라야 봇을 만들 수 있어요');
      expect(yardHeading('봇 소개')).toBeInTheDocument();
      unmount();
    }
  });

  it('막을 때 「다음」과 같은 자리에 같은 말을 놓고 초점을 옮긴다 — 새 방식을 만들지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(step('가르치는 법'));

    expect(document.getElementById(faultAnchorId('subject'))).toHaveFocus();
    expect(screen.getByRole('radiogroup', { name: '과목' })).toHaveFocus();
  });

  it('이름 규칙을 어겨도 단계 클릭이 막힌다 — 필수만 보는 관문이 아니다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '봇' } });
    fireEvent.click(step('보고 답할 것'));

    expect(screen.getByRole('alert')).toHaveTextContent('이름은 두 글자에서 서른 글자 사이로');
    expect(yardHeading('봇이 보고 답할 것')).toBeNull();
    expect(screen.getByLabelText(/봇 이름/)).toHaveFocus();
  });

  it('필수를 채우면 단계 클릭으로 넘어간다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('보고 답할 것'));

    expect(yardHeading('봇이 보고 답할 것')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('뒤로 가는 단계 클릭은 막지 않는다 — 고치러 돌아가는 길이다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('가르치는 법'));
    expect(yardHeading('가르치는 법')).toBeInTheDocument();

    // 3 → 2 → 1 로 되짚는다
    fireEvent.click(step('보고 답할 것'));
    expect(yardHeading('봇이 보고 답할 것')).toBeInTheDocument();
    fireEvent.click(step('봇 소개'));
    expect(yardHeading('봇 소개')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('막힌 뒤 그 항목을 채우면 단계 클릭이 열린다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(step('보고 답할 것'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('보고 답할 것'));

    expect(yardHeading('봇이 보고 답할 것')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('과목 카드', () => {
  /** 과목 카드가 사는 자리 — 다른 라디오 묶음(학년·말투)과 섞이지 않게 여기서만 본다. */
  function subjectGroup() {
    return screen.getByRole('radiogroup', { name: '과목' });
  }

  it('카드가 부르는 이름은 과목 이름이다 — 「과학봇」 밑줄이 딸려 읽히지 않는다', () => {
    render(<BotBuilderPage />);
    const group = subjectGroup();
    expect(within(group).getAllByRole('radio')).toHaveLength(subjectIds.length);

    for (const id of subjectIds) {
      const { label, botName: bot } = subjectMeta[id];
      // 낭독기가 읽는 이름이 과목 이름과 **꼭 같다** — 밑줄이 붙어 있으면 이름에 딸려 온다
      expect(within(group).getByRole('radio', { name: label })).toBeInTheDocument();
      expect(within(group).queryByText(bot)).toBeNull();
    }
  });

  it('카드에 봇 시그니처 색을 가져다 쓰지 않는다 — 색 점이 사라졌다', () => {
    jest.mocked(botSignature).mockClear();
    render(<BotBuilderPage />);

    // 마당 1 을 그리는 동안 시그니처를 한 번도 묻지 않는다. 물으면 칠할 자리가 있다는 뜻이다
    expect(botSignature).not.toHaveBeenCalled();
    expect(subjectGroup()).toBeInTheDocument();
  });

  it('봇 이름 칸은 그대로 과목 기본 이름을 안내한다 — 카드 표시에서만 뺐다', () => {
    render(<BotBuilderPage />);
    expect(screen.getByPlaceholderText('과목을 고르면 이름이 정해져요')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    expect(screen.getByPlaceholderText('과학봇')).toBeInTheDocument();
  });
});

describe('필수는 `*`, 선택은 `(선택)`', () => {
  it('과목만 `*` 를 달고 나머지는 `(선택)` 이다', () => {
    render(<BotBuilderPage />);
    expect(marks('subject').beside).toContain('*');
    expect(marks('subject').beside).not.toContain('(선택)');
    // `*` 는 눈으로만 읽히는 기호라 낭독기에 말로도 붙는다
    expect(marks('subject').beside).toContain('꼭 골라야 해요');

    for (const field of ['grade', 'name', 'tone']) {
      expect(marks(field).beside).toContain('(선택)');
      expect(marks(field).beside).not.toContain('*');
    }
  });

  it('값을 직접 고쳐도 표시는 그대로다 — `(선택)` 은 처지가 아니라 항목의 성질이다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));

    expect(marks('grade').beside).toContain('(선택)');
    expect(marks('grade').summary).toContain('중3');
  });

  it('배지 세 벌은 어디에도 남아 있지 않다', () => {
    render(<BotBuilderPage />);
    for (const gone of ['꼭 골라요', '내가 정함']) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });
});

describe('「채워진 것」', () => {
  it('줄에는 항목 이름과 값만 있다 — 배지도 「고치기」도 없다', () => {
    render(<BotBuilderPage />);
    const row = screen.getByTestId('summary-row-grade');
    expect(row).toHaveTextContent('학년');
    expect(row).toHaveTextContent('중1');
    expect(within(row).queryByRole('button')).toBeNull();
    expect(screen.queryByText('고치기')).toBeNull();
  });

  it('몇 가지를 직접 정했는지 세는 숫자는 없다', () => {
    render(<BotBuilderPage />);
    expect(screen.queryByTestId('own-count')).toBeNull();
    expect(screen.queryByText(/가지 직접 정함/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    expect(screen.queryByText(/가지 직접 정함/)).toBeNull();
  });

  it('이름 줄은 고른 과목을 따라간다', () => {
    render(<BotBuilderPage />);
    expect(marks('name').summary).toContain('과목을 고르면 정해져요');

    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(marks('name').summary).toContain('과학봇');

    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    expect(marks('name').summary).toContain('별별봇');

    // 다시 비우면 과목 기본 이름으로 돌아간다
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '' } });
    expect(marks('name').summary).toContain('과학봇');
  });

  it('「반」은 만들기 전에는 만든 뒤에 고른다고 말한다', () => {
    render(<BotBuilderPage />);
    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('만든 뒤에 골라요');
  });

  it('안전 세 가지는 아홉 줄 밖 고정 줄이다', () => {
    render(<BotBuilderPage />);
    for (const safety of alwaysOnSafety) {
      expect(screen.getByText(new RegExp(safety))).toBeInTheDocument();
    }
    // 아홉 줄 안으로 섞여 들어오지 않는다
    for (const field of FIELD_KEYS) {
      expect(screen.getByTestId(`summary-row-${field}`)).toBeInTheDocument();
    }
  });
});

describe('마당 오가기', () => {
  it('「단계」는 화면 폭과 무관하게 한 자리뿐이다', () => {
    render(<BotBuilderPage />);
    expect(screen.getAllByRole('navigation', { name: '봇 빌더 단계' })).toHaveLength(1);
  });

  it('「만들기」는 어느 마당에서나 헤더 한 자리에 같은 이름으로 하나뿐이다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));

    for (const yard of [1, 2, 3]) {
      if (yard > 1) fireEvent.click(screen.getByRole('button', { name: '다음' }));
      expect(screen.getAllByRole('button', { name: '채운 그대로 봇 만들기' })).toHaveLength(1);
      // 마당마다 이름이 달라지지 않는다
      expect(screen.queryByRole('button', { name: '만들기' })).toBeNull();
    }
    // 마당 3 은 더 갈 곳이 없다 — 「다음」을 두지 않는다
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
  });

  it('「단계」를 눌러 마당을 건너뛴다', () => {
    render(<BotBuilderPage />);
    // 필수를 채운 뒤라야 앞으로 건너뛴다 — 못 채웠을 때는 아래 「단계에도 같은 관문」 참고
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('가르치는 법'));
    expect(screen.getByRole('heading', { name: '가르치는 법' })).toBeInTheDocument();

    fireEvent.click(step('봇 소개'));
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
  });

  it('마당 셋을 지나며 고른 값이 「채워진 것」에 그대로 실린다', () => {
    render(<BotBuilderPage />);

    // 마당 1
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    fireEvent.click(screen.getByRole('radio', { name: /단단하게/ }));

    // 마당 2
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 자료 골라 올리기' }));
    fireEvent.click(screen.getByRole('radio', { name: /완전 개방/ }));

    // 마당 3
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('radio', { name: /되물어보기/ }));
    fireEvent.click(screen.getByRole('radio', { name: /바로 알려주기/ }));

    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('과학');
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('중3');
    expect(screen.getByTestId('summary-row-name')).toHaveTextContent('별별봇');
    expect(screen.getByTestId('summary-row-tone')).toHaveTextContent('단단하게');
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('1개 올림');
    expect(screen.getByTestId('summary-row-scope')).toHaveTextContent('L5');
    expect(screen.getByTestId('summary-row-style')).toHaveTextContent('되물어보기');
    expect(screen.getByTestId('summary-row-wrong')).toHaveTextContent('바로 알려주기');
  });
});

describe('마당 2 — 시간대를 짜러 나가는 길', () => {
  // 빌더는 아직 봇을 만들기 전이라 봇 id 가 없다 — 봇 관리 목록으로 보내고 탭만 실어 나른다.
  it('「봇 관리 › 안전 등급」은 봇 관리 목록의 안전 등급 탭으로 간다', () => {
    render(<BotBuilderPage />);
    // 마당 2 는 앞으로 가는 길이라 관문을 지난다 — 과목을 채워야 건너뛴다 (#245)
    fireEvent.click(screen.getByRole('radio', { name: '과학' }));
    fireEvent.click(step('보고 답할 것'));

    const link = screen.getByRole('link', { name: /봇 관리 › 안전 등급/ });
    expect(link).toHaveAttribute('href', '/teacher/bots?tab=safety');
  });
});

describe('수업 자료 올리기 (데모)', () => {
  it('가운데 자료를 뺀 뒤 다시 올려도 같은 자료가 두 번 들어오지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    const add = screen.getByRole('button', { name: '수업 자료 골라 올리기' });
    const files = () => within(screen.getByTestId('file-list')).getAllByRole('listitem');
    fireEvent.click(add);
    fireEvent.click(add);
    const first = files()[0].textContent ?? '';
    expect(files()).toHaveLength(2);

    // 첫 자료를 빼고 다시 올린다 — 자리(index)로 고르면 두 번째 자료가 겹쳐 들어온다
    fireEvent.click(within(files()[0]).getByRole('button', { name: /빼기$/ }));
    fireEvent.click(add);
    const names = files().map((li) => li.textContent ?? '');
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(names).toContain(first);
  });

  it('데모에 준비된 자료를 다 올리면 더 올리지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    const add = screen.getByRole('button', { name: '수업 자료 골라 올리기' });
    for (let i = 0; i < 6; i += 1) fireEvent.click(add);
    expect(within(screen.getByTestId('file-list')).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('3개 올림');
  });
});

describe('과목을 바꿀 때 자료', () => {
  it('과목을 바꾸면 지난 과목의 자료가 비워진다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 자료 골라 올리기' }));
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('1개 올림');

    // 지난 과목의 수업 자료는 새 과목에서 뜻이 없다
    fireEvent.click(step('봇 소개'));
    fireEvent.click(screen.getByRole('radio', { name: /수학/ }));
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('없음');

    // 마당 2 의 목록도 함께 비었다
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.queryByTestId('file-list')).toBeNull();
  });

  it('고른 과목을 다시 눌러도 올린 자료가 지워지지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 자료 골라 올리기' }));

    // 같은 과목을 다시 누르는 것은 바꾸는 게 아니다 — 까닭 없이 자료가 사라지면 안 된다
    fireEvent.click(step('봇 소개'));
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('1개 올림');
  });
});

describe('만든 뒤 화면', () => {
  it('「고치기」로 돌아가도 정한 값이 그대로 남는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));

    expect(screen.getByRole('heading', { name: '별별봇' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이 봇을 이어서 고치기' }));

    expect(screen.getByRole('radio', { name: '중3' })).toHaveAttribute('aria-checked', 'true');
    expect((screen.getByLabelText(/봇 이름/) as HTMLInputElement).value).toBe('별별봇');
  });

  it('반 선택지는 학급 목록에서 나온다 — 라벨을 새로 지어내지 않는다', () => {
    const master = new Map(teacherClassrooms.map(c => [c.id, c.label]));
    expect(classroomChoices.length).toBeGreaterThan(0);
    for (const c of classroomChoices) expect(master.get(c.id)).toBe(c.label);
    expect(new Set(classroomChoices.map(c => c.id)).size).toBe(classroomChoices.length);
  });

  it('아직 어느 봇에도 안 붙은 학급도 고를 수 있다', () => {
    // 봇에 붙은 학급에서 뽑으면 교사가 첫 봇을 만들 때 고를 반이 하나도 없다
    const attached = new Set(teacherBotOps.flatMap(o => o.classrooms).map(c => c.id));
    const unattached = classroomChoices.filter(c => !attached.has(c.id));
    expect(unattached.length).toBeGreaterThan(0);
  });

  it('봇에 붙은 학급은 전부 학급 목록에 있다 — 같은 반을 두 이름으로 부르지 않는다', () => {
    const master = new Map(teacherClassrooms.map(c => [c.id, c.label]));
    for (const c of teacherBotOps.flatMap(o => o.classrooms)) {
      expect(master.get(c.id)).toBe(c.label);
    }
  });

  it('고른 반이 「채워진 것」의 반 줄에 실린다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));
    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('아직 안 넣음');

    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent(classroomChoices[0].label);
    expect(marks('classes').beside).toContain('(선택)');

    // 다시 누르면 빠진다
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('아직 안 넣음');
  });

  it('「봇 운영」은 ?created= 와 ?rooms= 를 달고 보낸다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));
    const link = () => screen.getByRole('link', { name: '봇 운영 화면으로 가기' });

    // 반을 안 골랐으면 rooms 가 비어서 간다 — 그 자체가 뜻이다.
    // 안 넘기면 다음 화면이 「고른 반의 학생 홈에 나타나요」라고 잘못 안내한다.
    expect(link()).toHaveAttribute('href', `/teacher/classbot?created=${encodeURIComponent('과학봇')}&rooms=`);

    // 반을 고르면 학급 id 가 실려 간다 — 라벨이 아니라 id 라야 다음 화면이 이어 붙일 수 있다
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[1].label }));
    const href = link().getAttribute('href') ?? '';
    const q = new URLSearchParams(href.split('?')[1]);

    // 두 축이 다 실려야 배정 (봇, 반) 짝이 복원된다 — 반 id 만 있으면 어느 봇 배정인지 알 수 없다
    expect(q.get('created')).toBe('과학봇');
    expect(q.get('rooms')?.split(',')).toEqual([classroomChoices[0].id, classroomChoices[1].id]);
  });

  it('배정의 단위는 (봇, 반) 짝이다 — 반 id 만으로는 표현되지 않는다', () => {
    const picked = { ...emptyDraft, classes: ['cr_a', 'cr_b'] };
    // 한 반에 여러 봇이 붙는 것이 정상이라, 밖으로 넘길 때는 봇 축을 붙여야 한다
    expect(classAssignments(picked, 'cb_new')).toEqual([
      { botId: 'cb_new', classroomId: 'cr_a' },
      { botId: 'cb_new', classroomId: 'cr_b' },
    ]);
    expect(classAssignments(emptyDraft, 'cb_new')).toEqual([]);
  });

  it('「새 봇」은 앞 봇의 값을 데려오지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.click(screen.getByRole('button', { name: '채운 그대로 봇 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '봇 하나 더 만들기' }));

    expect(marks('subject').beside).toContain('*');
    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('아직 안 고름');
    expect(screen.getByTestId('summary-row-grade')).toHaveTextContent('중1');
  });
});
