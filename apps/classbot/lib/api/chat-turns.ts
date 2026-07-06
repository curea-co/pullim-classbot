/**
 * chat-turns — 플래그 ON 실챗의 트랜스크립트/스트리밍 상태 전이 순수 헬퍼(테스트 가능 단위).
 *
 * chat/page.tsx 의 거대한 컴포넌트에서 로직만 떼어 순수 함수로 만든다 — 렌더 없이 단위 테스트로
 * (1) 히스토리 seed 가 초기 인사/lesson-intro 턴을 보존하는지, (2) 스트리밍 중 턴이 a11y announce
 * 게이트에서 제외되는지, (3) done 완결 시 forcedKey(학습 단계 키)가 보존되는지 검증한다.
 */
import type { QuickReplyKey } from '@/lib/mock';
import { dayKeyOf, todayKey } from '@/lib/store/today-key';

import type { ChatStreamCallbacks, ChatCard } from './chat-stream';

/** 히스토리 seed 로 붙는 turn 의 id 프리픽스 — 진입 시 대량 주입되는 과거 대화 식별자. */
export const HISTORY_TURN_ID_PREFIX = 'h';

/**
 * 히스토리 summary 카드의 달성도 배너 goalKey — **오늘 메시지에만** 주입한다(Codex #210).
 *
 * session-goal store 는 기기-로컬 persist(같은 날 유지용)라 **과거 히스토리의 권위가 아니다** —
 * 지난 날 goalKey 를 주입하면 다른 기기/스토리지 초기화 후 재입장 시 원래 달성했던 과거 summary 가
 * 0/N 으로 보이는 거짓 UI 가 된다. 오늘 메시지(같은 날 재입장)만 상단 SessionGoalBanner 와 같은
 * 라이브 store 를 읽어 항상 일치(B7 finding#2 의도 그대로), 지난 날은 undefined → 평문 폴백
 * (nextLine 본문 합성 — 정보 유실 없음).
 *
 * @param at - 히스토리 메시지 시각(epoch ms)
 * @param todayGoalKey - 오늘 세션 목표 키(`me::bot::YYYY-MM-DD`)
 * @returns 오늘 메시지면 todayGoalKey, 지난 날이면 undefined
 */
export function historySummaryGoalKey(at: number, todayGoalKey: string): string | undefined {
  return dayKeyOf(new Date(at)) === todayKey() ? todayGoalKey : undefined;
}

/**
 * seed 된 히스토리 summary 카드의 goalKey 를 현재 사용자 키로 **재바인딩**한다(Codex #210 R3).
 *
 * `useCurrentUser()` 는 세션 하이드레이션 전 데모 폴백(`student_001`)을 돌려주므로, 히스토리
 * fetch 가 그 시점에 끝나면 summary 배너가 폴백 id 의 goalKey 로 seed 될 수 있다. 이후 실제
 * me.id 로 effect 가 재실행돼도 `appendHistoryTurns` 의 idempotent 가드(h* 존재 → skip)가
 * 재주입을 막아 잘못된 키가 고정된다 — 그래서 append 결과에 이 보정을 항상 통과시켜, seed 가
 * skip 된 재실행에서도 오늘 summary 의 goalKey 가 현재 사용자 키로 수렴하게 한다(멱등).
 *
 * 대상: 히스토리(`h*`) + kind='summary' + payload.goalKey 보유 + 오늘 메시지만.
 * 무변경이면 **입력 배열 참조 그대로** 반환(불필요 리렌더 방지).
 *
 * @param turns - 현재 turns
 * @param todayGoalKey - 오늘 세션 목표 키(현재 사용자 기준)
 * @returns 재바인딩된 turns(무변경 시 동일 참조)
 */
export function rebindHistorySummaryGoalKeys<
  T extends { id: string; at: number; kind?: string; payload?: unknown },
>(turns: T[], todayGoalKey: string): T[] {
  let changed = false;
  const next = turns.map(t => {
    if (!t.id.startsWith(HISTORY_TURN_ID_PREFIX) || t.kind !== 'summary') return t;
    const p = t.payload as { goalKey?: string } | undefined;
    if (!p?.goalKey) return t;
    const key = historySummaryGoalKey(t.at, todayGoalKey);
    if (!key || key === p.goalKey) return t;
    changed = true;
    return { ...t, payload: { ...p, goalKey: key } };
  });
  return changed ? next : turns;
}

/**
 * 서버 완결 히스토리 turn 을 **초기 오프너 턴(인사+lesson-intro) 바로 뒤에 splice** 한다.
 * base spec §5 필수 초기 메시지 계약 — 인사/lesson-intro 는 항상 선두 유지, 서버 대화는 그 뒤.
 *
 * ⚠️ 비동기 seed 순서 경쟁 방어(유실 없이): 히스토리 fetch 가 늦게 끝나는 동안 사용자가 먼저
 * 메시지를 보내면 prev 에 이미 새 턴(오프너 아님)이 섞여 있다. 그 경우에도 히스토리를 버리지 않고
 * **선두 오프너 prefix 직후에 삽입**하고 기존 새 턴들은 히스토리 뒤로 보존한다:
 *   결과 = [오프너 prefix] + [서버 히스토리] + [오프너 이후 새 턴들].
 * 이미 히스토리(`h*`)가 삽입돼 있으면 재실행(strict-mode 이중 mount) 시 재삽입하지 않는다(idempotent).
 *
 * @param prev - 현재 turns(오프너 prefix + 선택적 새 턴)
 * @param historyTurns - 서버 히스토리를 매핑한 turn 배열
 * @param isOpenerTurn - 초기 오프너(인사/lesson-intro) 턴 판별자
 * @returns 오프너 prefix 유지 + 히스토리 삽입 + 새 턴 보존, 빈 히스토리/이미 seed면 prev 그대로
 */
export function appendHistoryTurns<T extends { id: string }>(
  prev: T[],
  historyTurns: T[],
  isOpenerTurn: (turn: T) => boolean,
): T[] {
  if (historyTurns.length === 0) return prev;
  // 이미 히스토리 seed됨 → 재삽입 안 함(idempotent).
  if (prev.some(t => t.id.startsWith(HISTORY_TURN_ID_PREFIX))) return prev;
  // 선두의 연속된 오프너 prefix 경계를 찾는다(오프너는 항상 최상단).
  let boundary = 0;
  while (boundary < prev.length && isOpenerTurn(prev[boundary])) boundary++;
  // [오프너 prefix] + [히스토리] + [오프너 이후 사용자 새 턴들(있으면)] — 유실·순서붕괴 없음.
  return [...prev.slice(0, boundary), ...historyTurns, ...prev.slice(boundary)];
}

/**
 * A5 aria-live announce 게이트 — **신규 도착한 완결 봇 턴만** 1회 announce 한다.
 * 제외 대상:
 *  - 스트리밍 중(streaming=true) 턴 — 토큰마다 turns 가 바뀌어도 announce 안 함(N회 중복 방지).
 *    done/error 에서 streaming=false 로 바뀌면 그때 1회.
 *  - seeded 턴(초기 오프너 + 히스토리 seed) — 진입 시 존재하던 과거 메시지를 "새 메시지"처럼
 *    재announce 하지 않는다(기존 대화 있는 방 입장 시 마지막 과거 응답 오announce 방지).
 * flag-OFF mock 신규 봇 턴은 streaming/seeded 미설정(undefined) → 기존처럼 announce(불변).
 *
 * @param turn - 마지막 turn(없을 수 있음)
 * @returns announce 해야 하면 true
 */
export function shouldAnnounceTurn(turn?: {
  role?: string;
  streaming?: boolean;
  seeded?: boolean;
}): boolean {
  return turn?.role === 'bot' && !turn.streaming && !turn.seeded;
}

/** buildRealSendCallbacks 의존성 — page 가 Turn 타입에 맞춰 주입하는 setter 묶음. */
export interface RealSendCallbackDeps {
  /**
   * 현재 열린 스트리밍 텍스트 세그먼트를 patch(streaming=true 유지). 열린 버블이 없으면
   * (직전 카드로 닫혀 있으면) page 가 새 스트리밍 버블을 lazy 생성한다.
   */
  setStreamingText: (text: string) => void;
  /**
   * 현재 열린 스트리밍 텍스트 세그먼트를 완결(streaming=false, announce 1회 트리거).
   * **빈 문자열이면 그 세그먼트를 제거**한다(카드로 끝나 남은 트레일링 빈 타이핑 버블 청소).
   */
  finalizeText: (text: string) => void;
  /**
   * v2 리치 카드(ADR-065) — 원자적 카드 turn 을 append. page 가 `chat-cards.adaptCardToTurn`
   * 으로 렌더 가능한 Turn 으로 적응(형식 불일치면 graceful skip). 카드는 텍스트 세그먼트 사이에
   * 순서대로 삽입된다(카드 앞 텍스트는 finalize, 카드 뒤 텍스트는 새 세그먼트).
   */
  appendCard: (card: ChatCard) => void;
  /** 완료 시 보존할 학습 단계 키(빠른칩 forcedKey, 자유발화면 undefined). */
  forcedKey?: QuickReplyKey;
  /** lastBotReplyKey setter — 빠른칩으로 시작한 학습 단계를 이어가도록 보존. */
  setLastReplyKey: (key?: QuickReplyKey) => void;
  /** pending 해제. */
  setPending: (pending: boolean) => void;
}

/**
 * 실챗 SSE 콜백(onToken/onCard/onDone/onError)을 만든다 — 토큰 누적·카드 삽입·완결 고정·에러 안내를
 * 순수 로직으로. **v2(ADR-065)**: 텍스트는 스트리밍 세그먼트로, 카드는 원자적 turn 으로 순서대로 교차.
 *
 * - onToken: 델타를 현재 세그먼트에 누적 → setStreamingText(streaming 유지 → announce 안 됨)
 * - onCard: 현재 텍스트 세그먼트를 finalize(비었으면 제거) → appendCard(카드 turn) → 누적 리셋
 *   (이후 토큰은 카드 **뒤** 새 세그먼트로). 카드/텍스트가 도착 순서대로 트랜스크립트에 인터리브.
 * - onDone: 마지막 세그먼트 완결(내용 없으면=카드로 끝나 빈 세그먼트 → 제거) + **forcedKey 보존** + pending 해제.
 *   (텍스트/카드는 이미 token/card 프레임으로 화면 반영 — done 은 마감·순서 확정 신호.)
 * - onError: 현재 세그먼트에 부분 토큰이 있으면 보존 후 안내 append, 없으면 안내만 + streaming=false + pending 해제
 *
 * @param deps - page 주입 setter/상태
 * @returns streamChat 에 넘길 콜백
 */
export function buildRealSendCallbacks(deps: RealSendCallbackDeps): ChatStreamCallbacks {
  // acc = 현재 열린 텍스트 세그먼트의 누적본(카드 사이 텍스트마다 리셋).
  let acc = '';
  return {
    onToken: delta => {
      acc += delta;
      deps.setStreamingText(acc);
    },
    onCard: card => {
      // 카드 앞의 텍스트 세그먼트를 닫고(비었으면 트레일링 빈 버블 제거), 카드 turn 을 삽입한 뒤
      // 누적을 리셋 → 이후 토큰은 카드 뒤 새 세그먼트로 스트리밍된다(순서 보존).
      deps.finalizeText(acc);
      deps.appendCard(card);
      acc = '';
    },
    onDone: done => {
      // done.content 는 구버전 하위호환(v2 는 blocks 만) — 있으면 우선, 없으면 마지막 세그먼트 누적본.
      deps.finalizeText(done.content || acc);
      // 빠른칩으로 시작한 학습 단계 키 보존 → 후속 빠른칩 흐름 유지(자유발화면 undefined).
      deps.setLastReplyKey(deps.forcedKey);
      deps.setPending(false);
    },
    onError: err => {
      // 부분 토큰이 있으면 보존하고 뒤에 안내를, 없으면 안내만.
      deps.finalizeText(acc ? `${acc}\n\n${err.message}` : err.message);
      deps.setPending(false);
    },
  };
}
