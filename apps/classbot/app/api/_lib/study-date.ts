/**
 * 공부한 날의 날짜 판정 — **서버가 「오늘」을 정하는 단 한 곳** (자기주도 계약 §1·§2).
 *
 * ## 왜 UTC 도 서버 로컬시간도 아닌 KST 인가
 *
 * 날짜를 만드는 쪽은 **학생의 브라우저**다(`lib/store/today-key.ts` 의 `todayKey()` —
 * 로컬 자정 기준 `'YYYY-MM-DD'`). 서버는 그 훅을 부를 수 없으니 자기 몫의 「오늘」이
 * 따로 필요한데, **두 개의 하루가 같은 자리에서 시작해야** 한다.
 *
 * 서버가 UTC 로 오늘을 정하면 어긋난다. KST 는 UTC+9 라 **매일 09:00 KST 이전**
 * (= 전날 UTC)이 통째로 어긋나는 게 아니라, 정확히는 **00:00~08:59 KST** 구간에서
 * 서버의 UTC 날짜가 아직 전날이다. 그 사이 학생이 보낸 오늘 날짜는 서버 눈에 **내일**이 되어
 * 「미래 날짜」로 버려진다. 반대로 KST 로 정하면 한국의 학생에게는 두 자정이 같은 순간이라
 * 23:50 에 공부해도, 00:10 에 공부해도 서버와 브라우저가 같은 하루를 가리킨다.
 *
 * 남는 어긋남은 **한국 밖 브라우저**뿐이다(예: UTC+11 에서 자정 직후면 브라우저는 이미
 * 다음 날, 서버는 아직 오늘 → 그 하루는 미래로 걸러진다). 계약이 하루를 「KST 기준」으로
 * 못박았고 이 서비스의 사용자가 한국 학생이라, 그 경계는 **알고 받아들인 값**이다.
 *
 * ## 여기 있는 판정이 곧 「클라이언트가 주장할 수 있는 범위」다
 * 날짜는 학생 기기에서 온다 — 서버가 목격한 사실이 아니다. 그래서 형식·미래·너무 먼 과거
 * 셋으로 **테두리만** 친다(계약 §2). 이 파일은 라우트가 아니라서 URL 을 만들지 않는다.
 */

/** 날짜 키 형식 — `'YYYY-MM-DD'` 넉 자리 연도. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 백필이 받아 주는 가장 먼 과거 — **오늘로부터 2년**.
 * 학생이 임의의 과거를 만들어 내는 것을 막는 테두리다(계약 §2).
 */
const BACKFILL_YEARS = 2;

/** KST 날짜 부품을 뽑는 포매터 — 로케일 표기에 기대지 않으려 `formatToParts` 로 조립한다. */
const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 지금의 **KST 날짜**.
 *
 * 서버 프로세스의 TZ 가 무엇이든(Vercel 은 UTC) 같은 값을 준다 — 타임존을 환경에
 * 맡기면 배포 환경이 하루의 경계를 정하게 된다.
 * @returns `'YYYY-MM-DD'`
 */
export function kstToday(now: Date = new Date()): string {
  const parts = KST_PARTS.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * 저장 가능한 날짜 키인가 — 형식 **과** 실재하는 날짜인가까지.
 *
 * 정규식만으로는 `2026-02-30`·`2026-13-01` 이 통과한다. 부품을 다시 조립해 되돌아오는지
 * 보는 것(round-trip)이 달력에 없는 날을 거르는 가장 짧은 방법이다.
 * @param value - 검사할 값(문자열이 아닐 수도 있다)
 * @returns 형식과 달력이 모두 맞으면 true
 */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_KEY.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return (
    at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d
  );
}

/**
 * 백필 하한 — `today` 에서 2년 전 같은 날.
 *
 * 2월 29일처럼 2년 전에 없는 날은 `Date.UTC` 가 다음 날로 정규화한다(2028-02-29 → 2026-03-01).
 * 하한이 하루 당겨지는 것뿐이라 판정이 흔들리지 않는다.
 * @param today - `'YYYY-MM-DD'`(KST 오늘)
 * @returns 받아 주는 가장 이른 날 `'YYYY-MM-DD'`
 */
export function backfillFloor(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const at = new Date(Date.UTC(y - BACKFILL_YEARS, m - 1, d));
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * 이 날짜를 저장해도 되는가 — 형식 · 미래 · 너무 먼 과거 셋을 한 번에 본다.
 *
 * `'YYYY-MM-DD'` 는 **사전순 비교가 곧 날짜순 비교**라 문자열끼리 그대로 견준다
 * (Date 로 바꿔 비교하면 그 순간 다시 타임존이 끼어든다).
 * @param value - 학생 기기가 준 값
 * @param today - KST 오늘(`kstToday()`)
 * @returns 받아도 되면 true
 */
export function isRecordableDay(value: unknown, today: string): value is string {
  if (!isDayKey(value)) return false;
  if (value > today) return false; // 미래
  return value >= backfillFloor(today); // 2년 이전
}

/** 한 번의 백필이 받는 날짜 개수 상한 — 넘으면 400 `INVALID_INPUT`(계약 §2). */
export const MAX_BACKFILL_DAYS = 400;
