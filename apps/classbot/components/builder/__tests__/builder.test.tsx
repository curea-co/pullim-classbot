/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 이 화면의 불변식은 하나다. **항목 옆 표시와 「채워진 것」은 같은 `own` 을 읽는다** —
 * 두 자리가 어긋나면 교사는 「내가 뭘 정했는지」를 화면에서 알 수 없게 된다.
 * 미리보기가 없는 화면이라 이 목록이 유일한 길잡이다.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import BotBuilderPage from '@/app/(teacher)/teacher/builder/page';
import {
  BOT_NAME_MAX, BOT_NAME_MIN,
  FIELD_KEYS, alwaysOnSafety, applyClone, botName, classAssignments, classroomChoices, cloneSources,
  emptyDraft, isNameValid, ownCount, pick, summaryRows,
} from '../builder-types';
import { teacherBotOps } from '@/lib/mock/classbot-teacher-ops';

/* ─── 순수 모델 ─── */

describe('채워진 것 모델', () => {
  it('세는 항목은 아홉 가지 — 안전 세 가지는 이 목록 밖이다', () => {
    expect(FIELD_KEYS).toHaveLength(9);
    expect(alwaysOnSafety).toHaveLength(3);
    expect(summaryRows(emptyDraft, 'build')).toHaveLength(9);
    // 안전 항목 이름이 세는 목록에 섞여 들어오면 카운터가 거짓이 된다
    for (const safety of alwaysOnSafety) {
      expect(summaryRows(emptyDraft, 'build').map((r) => r.label)).not.toContain(safety);
    }
  });

  it('첫 진입은 0가지 — 과목만 「꼭 골라요」고 나머지 여덟은 기본값이다', () => {
    expect(ownCount(emptyDraft)).toBe(0);
    const required = summaryRows(emptyDraft, 'build').filter((r) => r.required);
    expect(required.map((r) => r.field)).toEqual(['subject']);
  });

  it('아홉 가지를 다 정해도 카운터는 9를 넘지 않는다', () => {
    const all = FIELD_KEYS.reduce((d, k) => pick(d, k, {}), emptyDraft);
    expect(ownCount(all)).toBe(9);
  });

  it('고르기 한 번은 값과 own 을 한 번에 옮긴다 — 한쪽만 바뀌는 길이 없다', () => {
    const next = pick(emptyDraft, 'grade', { grade: '고1' });
    expect(next.grade).toBe('고1');
    expect(next.own.grade).toBe(true);
    // 건드리지 않은 항목은 그대로
    expect(next.own.tone).toBe(false);
    expect(emptyDraft.own.grade).toBe(false);
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

  it('지난 봇에서 가져온 값은 전부 「내가 정함」이 된다', () => {
    const source = cloneSources()[0];
    const cloned = applyClone(source);
    expect(cloned.subject).toBe(source.subject);
    expect(cloned.grade).toBe(source.grade);
    expect(cloned.tone).toBe(source.tone);
    expect(cloned.scope).toBe(source.scope);
    expect(ownCount(cloned)).toBe(4);
    // 이름은 따라오지 않는다 — 새 봇은 새 이름을 갖거나 과목 기본 이름을 쓴다
    expect(cloned.own.name).toBe(false);
  });
});

/* ─── 화면 ─── */

/** 항목 옆 표시와 「채워진 것」 줄이 같은 말을 하는지 한 번에 본다. */
function marks(field: string) {
  return {
    beside: screen.getByTestId(`field-mark-${field}`).textContent ?? '',
    summary: screen.getByTestId(`summary-row-${field}`).textContent ?? '',
  };
}

function count() {
  return screen.getByTestId('own-count').textContent;
}

describe('과목은 기본값이 없다', () => {
  it('과목을 안 고르면 「이대로 만들기」가 막히고 왜 막혔는지 말한다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));

    expect(screen.getByRole('alert')).toHaveTextContent('과목을 골라야 봇을 만들 수 있어요');
    // 만든 뒤 화면으로 넘어가지 않았다
    expect(screen.queryByText('만들어졌어요')).toBeNull();
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
  });

  it('과목만 고르면 마당 1 에서 끝낼 수 있다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));

    expect(screen.getByText('만들어졌어요')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '과학봇' })).toBeInTheDocument();
    // 남은 여덟 가지는 기본값 그대로 들어갔다
    expect(count()).toBe('1');
  });
});

describe('항목 옆 표시와 「채워진 것」', () => {
  it('첫 진입 — 과목만 「꼭 골라요」, 나머지는 「기본값」', () => {
    render(<BotBuilderPage />);
    expect(marks('subject').beside).toContain('꼭 골라요');
    expect(marks('subject').summary).toContain('꼭 골라요');
    expect(marks('grade').beside).toContain('기본값');
    expect(marks('grade').summary).toContain('기본값');
    expect(count()).toBe('0');
  });

  it('항목을 직접 고치면 두 자리가 같은 프레임에 「내가 정함」이 되고 카운터가 오른다', () => {
    render(<BotBuilderPage />);
    expect(count()).toBe('0');

    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    expect(marks('grade').beside).toContain('내가 정함');
    expect(marks('grade').summary).toContain('내가 정함');
    expect(marks('grade').summary).toContain('중3');
    expect(count()).toBe('1');

    fireEvent.click(screen.getByRole('radio', { name: /또박또박/ }));
    expect(marks('tone').beside).toContain('내가 정함');
    expect(marks('tone').summary).toContain('내가 정함');
    expect(count()).toBe('2');

    // 안 건드린 항목은 그대로 기본값
    expect(marks('name').beside).toContain('기본값');
    expect(marks('name').summary).toContain('기본값');
  });

  it('왜 비워도 되는지는 항목마다 다르게 말하고, 이름은 고른 과목을 따라간다', () => {
    render(<BotBuilderPage />);
    expect(marks('name').beside).toContain('과목을 고르면 이름이 따라 정해져요');
    expect(marks('grade').beside).toContain('가장 많이 쓰는 학년으로 골라 뒀어요');

    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(marks('name').beside).toContain('비워 두면 과학봇으로 정해져요');
    expect(marks('name').summary).toContain('과학봇');

    fireEvent.click(screen.getByRole('radio', { name: /국어/ }));
    expect(marks('name').beside).toContain('비워 두면 국어봇으로 정해져요');

    // 직접 적으면 그 한 마디는 할 일이 끝나 사라진다
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    expect(marks('name').beside).toContain('내가 정함');
    expect(marks('name').beside).not.toContain('비워 두면');
    expect(marks('name').summary).toContain('별별봇');

    // 다시 비우면 기본값으로 돌아간다 — 셈도 함께 돌아간다
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '' } });
    expect(marks('name').beside).toContain('기본값');
    expect(marks('name').summary).toContain('국어봇');
  });

  it('「반」은 봇이 있어야 고를 수 있어 만들기 전에는 고치기가 없다', () => {
    render(<BotBuilderPage />);
    const row = screen.getByTestId('summary-row-classes');
    expect(row).toHaveTextContent('만든 뒤에 골라요');
    expect(within(row).queryByRole('button', { name: '반 고치기' })).toBeNull();
  });

  it('안전 세 가지는 세는 칸 밖 고정 줄이다', () => {
    render(<BotBuilderPage />);
    for (const safety of alwaysOnSafety) {
      expect(screen.getByText(new RegExp(safety))).toBeInTheDocument();
    }
    expect(count()).toBe('0');
  });
});

describe('지난 봇에서 가져오기', () => {
  it('따라온 값은 전부 「내가 정함」으로 표시된다', () => {
    const source = cloneSources()[0];
    render(<BotBuilderPage />);

    fireEvent.click(screen.getByTestId(`clone-${source.botId}`));

    // 「채워진 것」은 아홉 줄을 늘 그리므로 마당 2·3 항목도 여기서 함께 읽힌다
    for (const field of ['subject', 'grade', 'tone', 'scope']) {
      expect(screen.getByTestId(`summary-row-${field}`)).toHaveTextContent('내가 정함');
    }
    // 마당 1 에 나와 있는 항목은 옆 표시도 같은 말을 한다
    expect(marks('subject').beside).toContain('내가 정함');
    expect(marks('grade').beside).toContain('내가 정함');
    expect(marks('tone').beside).toContain('내가 정함');
    expect(count()).toBe('4');

    // 따라오지 않은 항목은 기본값 그대로다 — 가져왔다고 다 정해진 척하지 않는다
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('기본값');
    expect(screen.getByTestId('summary-row-style')).toHaveTextContent('기본값');
    expect(marks('name').beside).toContain('기본값');
  });
});

describe('아홉 가지를 다 정하기', () => {
  it('마당 셋을 지나 반까지 고르면 9가지, 그 위로는 오르지 않는다', () => {
    render(<BotBuilderPage />);

    // 마당 1
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    fireEvent.click(screen.getByRole('radio', { name: /단단하게/ }));
    expect(count()).toBe('4');

    // 마당 2
    fireEvent.click(screen.getByRole('button', { name: /다음 — 보고 답할 것/ }));
    fireEvent.click(screen.getByRole('button', { name: '자료 골라 올리기' }));
    fireEvent.click(screen.getByRole('radio', { name: /완전 개방/ }));
    expect(count()).toBe('6');

    // 마당 3
    fireEvent.click(screen.getByRole('button', { name: /다음 — 가르치는 법/ }));
    fireEvent.click(screen.getByRole('radio', { name: /되물어보기/ }));
    fireEvent.click(screen.getByRole('radio', { name: /바로 알려주기/ }));
    expect(count()).toBe('8');

    // 만든 뒤 — 반
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    expect(marks('classes').beside).toContain('내가 정함');
    expect(marks('classes').summary).toContain('내가 정함');
    expect(count()).toBe('9');
    expect(screen.getByTestId('done-own-count')).toHaveTextContent('9가지');

    // 반을 하나 더 골라도 「반」은 한 가지다 — 아홉을 넘지 않는다
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[1].label }));
    expect(count()).toBe('9');
  });
});

describe('수업 자료 올리기 (데모)', () => {
  it('가운데 자료를 뺀 뒤 다시 올려도 같은 자료가 두 번 들어오지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: /다음 — 보고 답할 것/ }));

    const add = screen.getByRole('button', { name: '자료 골라 올리기' });
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
    fireEvent.click(screen.getByRole('button', { name: /다음 — 보고 답할 것/ }));

    const add = screen.getByRole('button', { name: '자료 골라 올리기' });
    for (let i = 0; i < 6; i += 1) fireEvent.click(add);
    expect(within(screen.getByTestId('file-list')).getAllByRole('listitem')).toHaveLength(3);
    // 자료를 여러 개 올려도 「수업 자료」는 한 가지다
    expect(count()).toBe('2');
  });
});

describe('만든 뒤 화면', () => {
  it('「이어서 고치기」로 돌아가도 정한 값이 그대로 남는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));

    expect(screen.getByRole('heading', { name: '별별봇' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이어서 고치기' }));

    expect(screen.getByRole('radio', { name: '중3' })).toHaveAttribute('aria-checked', 'true');
    expect((screen.getByLabelText(/봇 이름/) as HTMLInputElement).value).toBe('별별봇');
    expect(count()).toBe('3');
  });

  it('반 선택지는 기존 학급 권위에서 나온다 — 라벨을 새로 지어내지 않는다', () => {
    // 여기서 라벨을 지어내면 참여 코드·운영 화면의 반 카드와 같은 반을 두 이름으로 부르게 된다
    const known = new Map(teacherBotOps.flatMap(o => o.classrooms).map(c => [c.id, c.label]));
    expect(classroomChoices.length).toBeGreaterThan(0);
    for (const c of classroomChoices) expect(known.get(c.id)).toBe(c.label);
    // 한 반이 여러 봇에 붙어 있어도 목록에는 한 번만
    expect(new Set(classroomChoices.map(c => c.id)).size).toBe(classroomChoices.length);
  });

  it('과목을 바꾸면 올린 자료도 「기본값」으로 돌아간다 — 두 자리가 어긋나지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: /다음 — 보고 답할 것/ }));
    fireEvent.click(screen.getByRole('button', { name: '자료 골라 올리기' }));
    expect(marks('files').beside).toContain('내가 정함');
    expect(marks('files').summary).toContain('내가 정함');
    const withFiles = count();

    // 지난 과목의 자료는 새 과목에서 뜻이 없다 — 비우고 표시도 함께 되돌려야 한다
    fireEvent.click(screen.getByRole('button', { name: '과목 고치기' }));
    fireEvent.click(screen.getByRole('radio', { name: /수학/ }));

    // 마당 1 에 있어 「수업 자료」 항목 표시는 화면에 없다 — 「채워진 것」 줄로 본다
    const filesRow = () => screen.getByTestId('summary-row-files').textContent ?? '';
    expect(filesRow()).toContain('기본값');
    expect(filesRow()).not.toContain('내가 정함');
    expect(count()).toBe(String(Number(withFiles) - 1));

    // 마당 2 로 가면 항목 옆 표시도 같은 말을 한다
    fireEvent.click(screen.getByRole('button', { name: /다음 — 보고 답할 것/ }));
    expect(marks('files').beside).toContain('기본값');
    expect(marks('files').beside).not.toContain('내가 정함');
  });

  it('「봇 운영 화면으로」는 ?created= 와 ?rooms= 를 달고 보낸다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));
    const link = () => screen.getByRole('link', { name: '봇 운영 화면으로' });

    // 반을 안 골랐으면 rooms 가 비어서 간다 — 그 자체가 뜻이다.
    // 안 넘기면 다음 화면이 「고른 반의 학생 홈에 나타나요」라고 잘못 안내한다.
    expect(link()).toHaveAttribute('href', `/teacher/classbot?created=${encodeURIComponent('과학봇')}&rooms=`);

    // 반을 고르면 학급 id 가 실려 간다 — 라벨이 아니라 id 라야 다음 화면이 이어 붙일 수 있다
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    expect(link()).toHaveAttribute(
      'href',
      `/teacher/classbot?created=${encodeURIComponent('과학봇')}&rooms=${encodeURIComponent(classroomChoices[0].id)}`,
    );
  });

  it('배정의 단위는 (봇, 반) 짝이다 — 반 id 만으로는 표현되지 않는다', () => {
    const picked = pick(emptyDraft, 'classes', { classes: ['cr_a', 'cr_b'] });
    // 한 반에 여러 봇이 붙는 것이 정상이라, 밖으로 넘길 때는 봇 축을 붙여야 한다
    expect(classAssignments(picked, 'cb_new')).toEqual([
      { botId: 'cb_new', classroomId: 'cr_a' },
      { botId: 'cb_new', classroomId: 'cr_b' },
    ]);
    expect(classAssignments(emptyDraft, 'cb_new')).toEqual([]);
  });

  it('「봇 하나 더 만들기」는 앞 봇의 값을 데려오지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('radio', { name: '중3' }));
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '봇 하나 더 만들기' }));

    expect(count()).toBe('0');
    expect(marks('subject').beside).toContain('꼭 골라요');
    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('아직 안 고름');
  });
});
