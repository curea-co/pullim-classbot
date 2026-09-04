/**
 * 학부모가 자기주도 학습에서 **무엇을 볼 수 있고 무엇을 알 수 없어야 하는지** — 규칙 한 곳.
 *
 * 이 파일이 따로 있는 이유는 재사용이 아니라 **한 문장을 두 번 쓰기 위해서**다.
 * 아래 `NOTHING_SHARED` 의 글자는 서로 다른 두 상황에서 그려지는데, 그 둘이
 * **한 글자라도 달라지면 그 차이가 곧 정보가 된다.** 상수 하나로 묶어 두면 다음 사람이
 * 한쪽만 고칠 수 없다.
 *
 * ## 왜 그렇게까지 하나 (계약 §3)
 *
 * 서버는 동의하지 않은 자녀를 **응답에서 통째로 뺀다**(계약 §2 의 INNER JOIN). 그래서
 * 「동의 안 함」은 화면에 도달조차 하지 않는다 — 여기까지는 서버가 지켜 준다.
 *
 * 화면이 마저 지켜야 할 것이 하나 남는다. **동의했지만 아직 아무것도 안 한 자녀**다.
 * 그 아이를 이름 붙은 카드로 그리면, 부모 화면에는 이렇게 나타난다:
 *
 * | 아이 상태 | 카드가 그려지나 |
 * |---|---|
 * | 동의 안 함 | 안 그려진다 (응답에 없다) |
 * | 동의했고 활동 있음 | 그려진다 |
 * | 동의했고 활동 없음 | **그려진다 ← 여기가 샌다** |
 *
 * 셋째 줄이 그려지는 순간 부모는 첫 줄과 둘째·셋째 줄을 **구별할 수 있게 된다.**
 * 「카드가 없다 = 동의를 안 했다」가 성립해 버리는 것이다. 아이가 동의를 안 준 사실은
 * 아이가 부모에게 말할 일이지 화면이 알려 줄 일이 아니다.
 *
 * 그래서 `hasSomethingToShow` 가 셋째 줄을 첫째 줄과 **같은 자리로 접는다.** 접고 나면
 * 부모가 알 수 있는 것은 「지금 볼 것이 있다 / 없다」 하나뿐이고, 없는 쪽 안에서
 * 동의 여부는 갈리지 않는다.
 *
 * ⛔ **되살리고 싶어질 것이다.** 「동의는 했으니 이름만이라도 보여주자」는 제안은
 * 위 표의 셋째 줄을 되돌리는 것과 같다. 되살리려면 계약 §3 을 먼저 고쳐야 한다.
 */

import type { ParentSelfStudyChild } from '@/hooks/api/types';

/**
 * 이 자녀에게 지금 보여줄 것이 있는가.
 *
 * 봇을 하나라도 담았거나, 공부한 날이 하루라도 있으면 참이다. 셋을 OR 로 묶는 이유는
 * 세 값이 서로 다른 시점에 생기기 때문이다 — 봇만 담고 아직 안 푼 아이도 「골랐다」는
 * 보여줄 것이 있고, 연속일수는 끊겨도(`count` 0) 이번 주에 공부한 날은 남을 수 있다.
 *
 * @param child - 응답에 실려 온 자녀(= 이미 동의한 자녀)
 * @returns 카드를 그려도 되면 true. false 면 **미동의 자녀와 같은 자리**로 접는다
 */
export function hasSomethingToShow(child: ParentSelfStudyChild): boolean {
  return (
    child.bots.length > 0 || child.streak.count > 0 || child.streak.thisWeekDays > 0
  );
}

/**
 * 보여줄 것이 있는 자녀만 남긴다. 페이지와 학부모 홈이 **같은 함수**를 부른다 —
 * 두 화면이 서로 다른 기준으로 거르면 홈에만 뜨는 아이가 생겨 위 표가 다시 샌다.
 */
export function visibleChildren(
  children: ParentSelfStudyChild[],
): ParentSelfStudyChild[] {
  return children.filter(hasSomethingToShow);
}

/**
 * 볼 것이 없을 때의 글자 — **미동의와 무활동이 함께 쓰는 하나뿐인 문구.**
 *
 * 두 조건(「보여주기로 했나」와 「공부한 날이 쌓였나」)을 **둘 다 적되 어느 쪽이 비었는지는
 * 말하지 않는다.** 그래야 같은 글자가 두 상황에서 다 참이 된다.
 *
 * 청사진이 처음 적어 둔 「아직 공유하지 않았어요」를 쓰지 않은 이유가 여기 있다.
 * 동의는 했고 아직 공부를 안 한 아이에게 그 문장은 **사실이 아니고**, 하지도 않은 일을
 * 안 했다고 부모에게 말하는 꼴이 된다. 불러오는 중에 잠깐 스치기만 해도 마찬가지라
 * 화면은 이 글자를 로딩 자리에 절대 쓰지 않는다(페이지의 분기 순서가 그것을 지킨다).
 */
export const NOTHING_SHARED = {
  title: '여기 보여드릴 것이 아직 없어요',
  description:
    '아이가 보여주기로 하고 공부한 날이 쌓이면, 스스로 고른 봇과 공부한 날이 여기 나와요. 무엇을 얼마 동안 보여줄지는 아이가 정해요.',
} as const;

/**
 * 학부모 홈에 얹는 **한 줄** — 「혼자 고른 봇 2개 · 이번 주 3일 공부했어요」.
 *
 * 홈에는 이 한 줄만 얹고 본체는 `/parent/self-study` 로 보낸다(계약 §3). 홈이
 * 「수업방 n개 · 남은 과제 n개」라는 문법이라 자기주도 숫자를 그 눈금에 섞으면
 * 마감이 있는 것처럼 읽히기 때문이다.
 *
 * ⛔ **줄이 없는 경우를 만들지 마라 — 이미 있다.** 이 함수는 `hasSomethingToShow` 를
 * 통과한 자녀에게만 불린다. 통과 못 한 자녀에게는 홈이 **아무 줄도 안 그린다.**
 * 여기에 「아직 공유 전이에요」 같은 자리를 만들면, 그 자리가 있고 없고로
 * 동의 여부가 드러난다 — 자기주도 화면에서 접어 둔 것이 홈에서 도로 새는 것이다.
 *
 * @param child - `hasSomethingToShow` 를 통과한 자녀
 */
export function homeTeaserLine(child: ParentSelfStudyChild): string {
  const bots = child.bots.length;
  const week = child.streak.thisWeekDays;
  if (bots > 0 && week > 0) return `혼자 고른 봇 ${bots}개 · 이번 주 ${week}일 공부했어요`;
  if (bots > 0) return `혼자 고른 봇 ${bots}개를 담아 뒀어요`;
  if (week > 0) return `이번 주 ${week}일 공부했어요`;
  // 봇도 이번 주도 비었는데 연속일수만 남은 자리 — 지난주까지 이어 오던 아이다.
  return `이어서 ${child.streak.count}일 공부했어요`;
}

/**
 * 이름 뒤에 붙는 주격 조사 — 받침이 있으면 「이가」, 없으면 「가」.
 * (「서연이가」 / 「지수가」. 한글이 아닌 이름은 조사를 붙이지 않는다.)
 */
function nameWithSubjectParticle(name: string): string {
  const last = name.at(-1);
  if (!last) return name;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return name;
  const hasFinalConsonant = (code - 0xac00) % 28 !== 0;
  return `${name}${hasFinalConsonant ? '이가' : '가'}`;
}

/**
 * 만료일 표기 — 「3월 8일」.
 *
 * 마켓·담은 봇이 쓰는 `formatAddedAt`(「2026년 9월 3일」)과 일부러 눈금이 다르다.
 * 저쪽은 **지나간 일이 언제였나**라 해가 필요하고, 이쪽은 서버가 최장 30일로 끊는
 * **곧 닥칠 기한**이라 해가 늘 올해다(계약 §2 부여 규칙). 다만 연말에 걸치면 해가 넘어가므로
 * 그때만 해를 앞에 붙인다.
 *
 * @param value - ISO 문자열. null(「계속」)이거나 못 읽으면 null
 */
export function formatExpiry(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  const day = `${at.getMonth() + 1}월 ${at.getDate()}일`;
  return at.getFullYear() === new Date().getFullYear()
    ? day
    : `${at.getFullYear()}년 ${day}`;
}

/**
 * 공부한 날 표기 — 「9월 2일」.
 *
 * 들어오는 값이 `'YYYY-MM-DD'`(시각 없는 날짜)라 `new Date()` 에 통째로 넘기지 않는다.
 * 그러면 UTC 자정으로 읽혀 표준시가 음수인 곳에서 **하루 앞 날짜**가 찍힌다. 날짜 문자열은
 * 이미 서버가 KST 로 정한 「그 날」이므로 해석하지 말고 **글자 그대로 쪼갠다.**
 *
 * @param value - `'YYYY-MM-DD'`. 없거나 형식이 어긋나면 null
 */
export function formatStudyDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  const label = `${Number(month)}월 ${Number(day)}일`;
  return Number(year) === new Date().getFullYear() ? label : `${year}년 ${label}`;
}

/**
 * 카드 머리에 앉는 범위 문장 — 「서연이가 이번 주만 공유하기로 했어요 · 3월 8일까지」.
 *
 * **범위를 숨기지 않는다**(계약 §3). 세 가지를 한 문장이 동시에 한다:
 *  - 다음 주에 이 카드가 사라져도 부모가 그걸 **아이 탓으로 읽지 않게** 미리 말해 둔다
 *  - 이 자료가 **아이가 준 것**임을 계속 보이게 둔다 — 부모가 이걸 읽어도 되는 근거가 그것뿐이다
 *  - `scope_label` 이 원래 이 자리를 위해 선언된 칸이다(「사람이 읽을 수 있는 범위 라벨」)
 *
 * 주어를 아이 이름으로 두는 것이 요점이다. 「공유 중」 같은 상태 표기로 적으면 누가 정한
 * 일인지가 사라진다.
 *
 * @returns 문장과 꼬리표를 나눠 준다 — 화면이 꼬리표만 옅게 그릴 수 있게
 */
export function scopeSentence(child: ParentSelfStudyChild): {
  lead: string;
  until: string | null;
} {
  const until = formatExpiry(child.expiresAt);
  return {
    lead: `${nameWithSubjectParticle(child.name)} ${child.scopeLabel} 공유하기로 했어요`,
    until: until ? `${until}까지` : null,
  };
}
