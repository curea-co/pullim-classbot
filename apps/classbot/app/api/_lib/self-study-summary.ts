/**
 * 자기주도 요약의 파생 — 날짜 배열에서 연속일수와 이번 주 날 수를 계산한다
 * (학부모×자기주도 계약 §2).
 *
 * ## 왜 서버가 계산해서 내려보내나
 * 학생 화면은 자기 날짜를 전부 받아(`GET /api/me/study-days`) 브라우저에서 `deriveStreak`
 * 으로 센다. 학부모 화면에는 그렇게 할 수 없다 — 「어느 날 공부했는지」의 목록은 계약이
 * 준 **요약보다 촘촘한 정보**라서, 날짜 배열을 응답에 실으면 계약이 안 준 것을 준 셈이
 * 된다. 그래서 세는 일을 서버가 하고 **수만** 내보낸다.
 *
 * ## `deriveStreak`(`lib/store/self-learning.ts`)과 **같은 뜻**을 지킨다
 * 마지막으로 공부한 날부터 거꾸로 하루씩 이어지는 구간의 길이다. 오늘을 기준으로 삼지
 * 않으므로 어제까지 5일 연속이면 오늘 아직 안 해도 5다. 두 자리가 다른 수를 말하면
 * 학생과 부모가 **같은 화면을 두고 서로 다른 사실을 믿는다** — 그 함수는 클라이언트
 * 스토어에 있어 서버가 부를 수 없으므로, 규칙을 여기 다시 적고 테스트로 묶는다.
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 Next.js App Router 의 라우트 세그먼트에서 제외된다
 * (private folder). 여기 파일은 URL 을 만들지 않는다.
 */

import { kstToday } from './study-date';
import type { ParentSelfStudyStreak } from './contract-types';

/** 하루(ms). */
const DAY_MS = 86_400_000;

/**
 * 날짜 배열에서 연속일수 · 마지막 학습일 · 이번 주 날 수를 낸다.
 *
 * 정렬·중복을 스스로 방어한다(부르는 쪽이 이미 정렬해 두지만, 이 함수의 답이 입력 순서에
 * 기대면 조회에 `ORDER BY` 하나 빠졌을 때 조용히 틀린 수가 나간다).
 * @param days - `'YYYY-MM-DD'` 배열(정렬 여부 무관)
 * @param today - KST 오늘(테스트가 시간을 고정할 수 있게 주입)
 * @returns 학부모 화면이 그대로 쓰는 요약
 */
export function deriveStreakFromDays(
  days: string[],
  today: string = kstToday(),
): ParentSelfStudyStreak {
  const sorted = [...new Set(days)].sort();
  const thisWeekDays = countThisWeek(sorted, today);

  if (sorted.length === 0) {
    return { count: 0, lastStudyDate: null, thisWeekDays };
  }

  const lastStudyDate = sorted[sorted.length - 1];
  let count = 1;
  let expected = shiftDay(lastStudyDate, -1);
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i] !== expected) break;
    count += 1;
    expected = shiftDay(sorted[i], -1);
  }

  return { count, lastStudyDate, thisWeekDays };
}

/**
 * 이번 주에 공부한 날 수 — **월요일 시작**, 오늘이 속한 주.
 *
 * 월요일을 시작으로 두는 것은 이 서비스가 이미 그렇게 세고 있기 때문이다
 * (`lib/mock/persona.ts` 의 `weeklyActivity` 가 「월→일」 일곱 칸이다). 일요일 시작으로
 * 바꾸면 같은 주를 두 화면이 다르게 자른다.
 *
 * 아직 오지 않은 날은 셀 수 없으므로 상한은 **오늘**이다(미래 날짜는 애초에 저장되지
 * 않지만, 세는 쪽이 그 방어에 기대지 않는다).
 * @param sorted - 오름차순·중복 없는 `'YYYY-MM-DD'` 배열
 * @param today - KST 오늘
 * @returns 0~7
 */
function countThisWeek(sorted: string[], today: string): number {
  const monday = weekStart(today);
  return sorted.filter((d) => d >= monday && d <= today).length;
}

/**
 * 그 날짜가 속한 주의 월요일.
 *
 * `Date.UTC` 로만 다룬다 — 여기서 로컬 `Date` 를 쓰면 서버 TZ 가 주의 경계를 정하게 되어,
 * 배포지(Vercel=UTC)와 로컬에서 같은 날이 다른 주에 들어간다.
 * @param day - `'YYYY-MM-DD'`
 * @returns 그 주 월요일의 `'YYYY-MM-DD'`
 */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay(): 일=0 … 토=6. 월요일까지 되돌릴 일수 — 일요일은 6일 전이 월요일이다.
  const back = (at.getUTCDay() + 6) % 7;
  return toDayKey(new Date(at.getTime() - back * DAY_MS));
}

/** `'YYYY-MM-DD'` 에 며칠을 더한다(UTC 산술 — 위와 같은 이유). */
function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return toDayKey(new Date(Date.UTC(y, m - 1, d) + delta * DAY_MS));
}

/** `Date` 를 UTC 기준 `'YYYY-MM-DD'` 로. */
function toDayKey(at: Date): string {
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${mm}-${dd}`;
}
