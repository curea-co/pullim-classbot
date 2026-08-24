/**
 * 봇 빌더 — 한 길 · 세 마당.
 *
 * 이 화면의 불변식은 하나다. **꼭 골라야 하는 것은 이름 옆에서 알 수 있다** —
 * 필수는 빨간 `*`, 나머지는 `(선택)`. 배지 세 벌과 줄별 「고치기」는 없앴고,
 * 오갈 자리는 위쪽 「단계」 하나다. 미리보기가 없는 화면이라 「채워진 것」이 유일한 길잡이다.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import BotBuilderPage from '@/app/(teacher)/teacher/builder/page';
import {
  BOT_NAME_MAX, BOT_NAME_MIN,
  FIELD_KEYS, REQUIRED_FIELDS, alwaysOnSafety, botName, classAssignments, classroomChoices,
  emptyDraft, isNameValid, isRequired, ownCount, pick, summaryRows,
} from '../builder-types';
import { teacherBotOps } from '@/lib/mock/classbot-teacher-ops';
import { teacherClassrooms } from '@/lib/mock/classbot-classrooms';

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

  it('첫 진입은 0가지 — 꼭 골라야 하는 것은 과목 하나뿐이다', () => {
    expect(ownCount(emptyDraft)).toBe(0);
    expect(REQUIRED_FIELDS).toEqual(['subject']);
    expect(FIELD_KEYS.filter(isRequired)).toEqual(['subject']);
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
});

/* ─── 화면 ─── */

/** 항목 이름 옆 표시와 「채워진 것」 줄을 한 번에 본다. */
function marks(field: string) {
  return {
    beside: screen.getByTestId(`field-mark-${field}`).textContent ?? '',
    summary: screen.getByTestId(`summary-row-${field}`).textContent ?? '',
  };
}

function count() {
  return screen.getByTestId('own-count').textContent;
}

/** 마당을 오가는 자리는 위쪽 「단계」 하나뿐이다. */
function step(title: string) {
  return screen.getByRole('button', { name: title });
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
    expect(count()).toBe('1');
  });

  it('배지 세 벌은 어디에도 남아 있지 않다', () => {
    render(<BotBuilderPage />);
    for (const gone of ['꼭 골라요', '기본값으로 골라 뒀어요', '내가 정함']) {
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

  it('이름 줄은 고른 과목을 따라간다', () => {
    render(<BotBuilderPage />);
    expect(marks('name').summary).toContain('과목을 고르면 정해져요');

    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(marks('name').summary).toContain('과학봇');

    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '별별봇' } });
    expect(marks('name').summary).toContain('별별봇');
    expect(count()).toBe('2');

    // 다시 비우면 기본값으로 돌아간다 — 셈도 함께 돌아간다
    fireEvent.change(screen.getByLabelText(/봇 이름/), { target: { value: '' } });
    expect(marks('name').summary).toContain('과학봇');
    expect(count()).toBe('1');
  });

  it('「반」은 만들기 전에는 만든 뒤에 고른다고 말한다', () => {
    render(<BotBuilderPage />);
    expect(screen.getByTestId('summary-row-classes')).toHaveTextContent('만든 뒤에 골라요');
  });

  it('안전 세 가지는 세는 칸 밖 고정 줄이다', () => {
    render(<BotBuilderPage />);
    for (const safety of alwaysOnSafety) {
      expect(screen.getByText(new RegExp(safety))).toBeInTheDocument();
    }
    expect(count()).toBe('0');
  });
});

describe('마당 오가기', () => {
  it('「단계」는 화면 폭과 무관하게 한 자리뿐이다', () => {
    render(<BotBuilderPage />);
    expect(screen.getAllByRole('navigation', { name: '봇 빌더 단계' })).toHaveLength(1);
  });

  it('「이대로 만들기」는 어느 마당에서나 헤더 한 자리에 하나뿐이다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));

    for (const yard of [1, 2, 3]) {
      if (yard > 1) fireEvent.click(screen.getByRole('button', { name: '다음' }));
      expect(screen.getAllByRole('button', { name: '이대로 만들기' })).toHaveLength(1);
    }
    // 마당 3 은 더 갈 곳이 없다 — 「다음」을 두지 않는다
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
  });

  it('「단계」를 눌러 마당을 건너뛴다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(step('가르치는 법'));
    expect(screen.getByRole('heading', { name: '가르치는 법' })).toBeInTheDocument();

    fireEvent.click(step('봇 소개'));
    expect(screen.getByRole('heading', { name: '봇 소개' })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '자료 골라 올리기' }));
    fireEvent.click(screen.getByRole('radio', { name: /완전 개방/ }));
    expect(count()).toBe('6');

    // 마당 3
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('radio', { name: /되물어보기/ }));
    fireEvent.click(screen.getByRole('radio', { name: /바로 알려주기/ }));
    expect(count()).toBe('8');

    // 만든 뒤 — 반
    fireEvent.click(screen.getByRole('button', { name: '이대로 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[0].label }));
    expect(marks('classes').beside).toContain('(선택)');
    expect(marks('classes').summary).toContain(classroomChoices[0].label);
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
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

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
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

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

  it('과목을 바꾸면 올린 자료도 세는 칸에서 빠진다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '자료 골라 올리기' }));
    expect(marks('files').summary).toContain('1개 올림');
    const withFiles = count();

    // 지난 과목의 자료는 새 과목에서 뜻이 없다 — 비우고 셈도 함께 되돌려야 한다
    fireEvent.click(step('봇 소개'));
    fireEvent.click(screen.getByRole('radio', { name: /수학/ }));

    // 마당 1 에 있어 「수업 자료」 항목은 화면에 없다 — 「채워진 것」 줄로 본다
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('없음');
    expect(count()).toBe(String(Number(withFiles) - 1));
  });

  it('고른 과목을 다시 눌러도 올린 자료가 지워지지 않는다', () => {
    render(<BotBuilderPage />);
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '자료 골라 올리기' }));
    const withFiles = count();

    // 같은 과목을 다시 누르는 것은 바꾸는 게 아니다 — 까닭 없이 자료가 사라지면 안 된다
    fireEvent.click(step('봇 소개'));
    fireEvent.click(screen.getByRole('radio', { name: /과학/ }));
    expect(screen.getByTestId('summary-row-files')).toHaveTextContent('1개 올림');
    expect(count()).toBe(withFiles);
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
    fireEvent.click(screen.getByRole('button', { name: classroomChoices[1].label }));
    const href = link().getAttribute('href') ?? '';
    const q = new URLSearchParams(href.split('?')[1]);

    // 두 축이 다 실려야 배정 (봇, 반) 짝이 복원된다 — 반 id 만 있으면 어느 봇 배정인지 알 수 없다
    expect(q.get('created')).toBe('과학봇');
    expect(q.get('rooms')?.split(',')).toEqual([classroomChoices[0].id, classroomChoices[1].id]);
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
    expect(marks('subject').beside).toContain('*');
    expect(screen.getByTestId('summary-row-subject')).toHaveTextContent('아직 안 고름');
  });
});
