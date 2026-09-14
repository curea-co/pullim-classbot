/**
 * 학부모가 자기주도 학습에서 **무엇을 볼 수 있고 무엇을 알 수 없어야 하는지** — 규칙 한 곳.
 *
 * 이 파일이 따로 있는 이유는 재사용이 아니라 **한 문장을 두 번 쓰기 위해서**다.
 * 아래 `NOTHING_SHARED` 의 글자는 서로 다른 두 상황에서 그려지는데, 그 둘이
 * **한 글자라도 달라지면 그 차이가 곧 정보가 된다.** 상수 하나로 묶어 두면 다음 사람이
 * 한쪽만 고칠 수 없다.
 *
 * ## 서버가 주는 모양 — **빈 내용 마스킹**(05 § 11.4 규칙 2)
 *
 * `GET /api/parent/children/self-study` 는 **연결된 자녀를 전원** 싣는다. 동의는 봇·공부한
 * 날 조회의 `where` 안에만 있어서, 미동의 자녀는 그 조회가 0행으로 돌아와 **내용만 빈다.**
 *
 * | 아이 상태 | 서버가 주는 값 |
 * |---|---|
 * | 동의 안 함 | `bots: []` · `streak` 전부 0 |
 * | 동의했고 활동 없음 | `bots: []` · `streak` 전부 0 ← **같은 값** |
 * | 동의했고 활동 있음 | 값이 있다 |
 *
 * **첫 줄과 둘째 줄은 값이 같다.** 이름·관계 말고 구별할 칸이 응답에 없다 — 범위 라벨도
 * 만료도 오지 않는다(`sharedByChildSentence` 머리주석). 그러니 **규칙 2 는 이미 데이터
 * 모양으로 지켜져 있고**, 이 파일의 함수들은 그것을 지키려고 애쓰는 것이 아니라
 * **애초에 둘을 가를 방법이 없다.** 같은 입력이 들어오므로 같은 답이 나간다.
 *
 * ## 그럼 `hasSomethingToShow` 는 무엇을 하나 — **표시 결정**이다
 *
 * 규칙 2 를 여기서 지키는 것이 아니다. 내용이 빈 자녀를 이름 붙은 **빈 카드**로 N 장
 * 늘어놓는 대신, 한 자리(`NOTHING_SHARED`)로 접는다. 어느 쪽을 골라도 규칙 2 는 깨지지
 * 않는다 — 위 표의 첫 줄과 둘째 줄이 **같은 값**이라 어떻게 그리든 같이 그려지기 때문이다.
 * 접기로 한 것은 빈 카드가 늘어서면 부모가 「왜 비었나」를 카드마다 묻게 되고, 그 물음의
 * 답이 화면에 없어서다.
 *
 * **그래서 이 함수의 진짜 계약은 하나다** — 미동의 자녀와 「동의했지만 활동 0」 자녀에게
 * **반드시 같은 답**을 내야 한다. 지금은 입력이 같아 저절로 그렇고, 그 성질을 테스트가
 * 붙잡고 있다(`self-study-visibility.test.ts`).
 *
 * ## ⛔ 되돌리고 싶어질 자리 둘
 *
 * 1. **서버에서 미동의 자녀를 결과 집합에서 빼는 것** — 한 번 그렇게 썼고 되돌렸다.
 *    학부모는 `GET /api/parent/children` 에서 연결 자녀 전원을 이미 받으므로, 두 응답을
 *    **대조하면 빠진 자녀가 곧 미동의 자녀**다(대조 오라클). 05 § 11.4 규칙 2 가 막는 것이
 *    바로 그 구별이고, 그 판을 되살리면 이 파일의 전제도 함께 무너진다.
 * 2. **응답에 범위 라벨·만료를 다시 싣는 것** — 미동의 자녀에게 그 둘이 `null` 이 되어
 *    위 표의 첫 줄과 둘째 줄이 **값으로 갈린다**(`null` 오라클). 그 순간 이 파일의 함수가
 *    둘에게 다른 답을 낼 수 있게 된다.
 *
 * 둘 중 하나라도 되살리려면 **05 § 11.4 규칙 2 를 먼저 고쳐야 한다.**
 */
import type { ParentSelfStudyChild } from '@/hooks/api/types';

/**
 * 이 자녀에게 지금 보여줄 것이 있는가.
 *
 * 봇을 하나라도 담았거나, 공부한 날이 하루라도 있으면 참이다. 셋을 OR 로 묶는 이유는
 * 세 값이 서로 다른 시점에 생기기 때문이다 — 봇만 담고 아직 안 푼 아이도 「골랐다」는
 * 보여줄 것이 있고, 연속일수는 끊겨도(`count` 0) 이번 주에 공부한 날은 남을 수 있다.
 *
 * @param child - 응답에 실려 온 자녀. **연결 자녀 전원이 온다** — 미동의 자녀도 오고,
 *   그 아이는 `bots: []` · `streak` 0 이라 「동의했지만 활동 0」 자녀와 **값이 같다**
 * @returns 보여줄 내용이 있으면 true. false 인 자녀는 전부 `NOTHING_SHARED` 한 자리로
 *   접힌다 — 그 안에서 동의 여부는 갈리지 않는다(갈릴 값이 응답에 없다)
 */
export function hasSomethingToShow(child: ParentSelfStudyChild): boolean {
  return (
    child.bots.length > 0 || child.streak.count > 0 || child.streak.thisWeekDays > 0
  );
}

/**
 * 보여줄 것이 있는 자녀만 남긴다. 페이지와 학부모 홈이 **같은 함수**를 부른다 —
 * 두 화면이 서로 다른 기준으로 거르면 한쪽에만 뜨는 아이가 생기고, 그 **차이**가 곧
 * 「이 화면은 왜 저 아이를 안 보여주나」라는 물음이 된다. 기준은 한 곳에만 둔다.
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
 * 카드 머리에 앉는 **출처 문장** — 「서연이가 보여주기로 한 기록이에요 · 언제든 멈출 수 있어요」.
 *
 * 이 카드는 부모가 읽어도 되는 근거가 **아이의 동의 하나뿐**이라, 그 근거를 카드보다 위에
 * 둔다. 주어를 아이 이름으로 두는 것이 요점이다 — 「공유 중」 같은 상태 표기로 적으면 누가
 * 정한 일인지가 사라진다. 뒤 절은 **카드가 사라질 수 있다는 것을 미리 말해 두는 자리**다.
 * 그 말이 없으면 다음 주에 카드가 없어졌을 때 부모가 그것을 아이 탓으로 읽는다.
 *
 * ## ⛔ 여기에 범위·기한을 다시 붙이지 마라
 *
 * 종전 판은 「서연이가 **이번 주만** 공유하기로 했어요 · **3월 8일까지**」였다. 그 두 값
 * (`scope_label` · `expires_at`)은 **학부모 응답에서 걷혔다** — 미동의 자녀에게 그것이
 * `null` 이 되어 **`null` 오라클**이 생기기 때문이다(05 § 11.4 규칙 2 · 서버 라우트
 * 머리주석 ①). 값을 되살리려면 명세를 먼저 고쳐야 한다.
 *
 * 그래서 이 문장은 **상수**다 — 이름 말고는 어느 자녀의 카드에도 같은 모양으로 붙으므로
 * 값에서 아무것도 읽어 낼 수 없다. 「언제까지 공유 중인가」는 **학생 자기 화면**
 * (`/classbot/me/share`)이 지는 정보다. 끄는 것도 거기서 한다.
 *
 * @param name - 자녀 이름(조사만 이름에 맞춘다)
 * @returns 카드 머리에 그대로 쓰는 한 문장
 */
export function sharedByChildSentence(name: string): string {
  return `${nameWithSubjectParticle(name)} 보여주기로 한 기록이에요`;
}

/** 위 문장 뒤에 옅게 붙는 꼬리 — **상수**다(기한이 아니다). */
export const SHARE_CAN_STOP = '언제든 멈출 수 있어요';
