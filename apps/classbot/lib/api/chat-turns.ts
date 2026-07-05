/**
 * chat-turns — 플래그 ON 실챗의 트랜스크립트/스트리밍 상태 전이 순수 헬퍼(테스트 가능 단위).
 *
 * chat/page.tsx 의 거대한 컴포넌트에서 로직만 떼어 순수 함수로 만든다 — 렌더 없이 단위 테스트로
 * (1) 히스토리 seed 가 초기 인사/lesson-intro 턴을 보존하는지, (2) 스트리밍 중 턴이 a11y announce
 * 게이트에서 제외되는지, (3) done 완결 시 forcedKey(학습 단계 키)가 보존되는지 검증한다.
 */
import type { QuickReplyKey } from '@/lib/mock';

import type { ChatStreamCallbacks } from './chat-stream';

/** 히스토리 seed 로 붙는 turn 의 id 프리픽스 — 진입 시 대량 주입되는 과거 대화 식별자. */
export const HISTORY_TURN_ID_PREFIX = 'h';

/**
 * 서버 완결 히스토리 turn 을 **초기 오프너 턴(인사+lesson-intro) 바로 뒤에 이어붙인다**.
 * base spec §5 필수 초기 메시지 계약 — 인사/lesson-intro 는 항상 선두 유지, 서버 대화는 그 뒤.
 *
 * ⚠️ 비동기 seed 순서 경쟁 방어: 히스토리 fetch 가 늦게 끝나는 동안 사용자가 먼저 메시지를 보내면
 * prev 에 이미 새 턴이 섞여 있다. 그 경우 과거 히스토리를 새 턴 뒤에 붙이면 순서가 붕괴하므로,
 * **prev 가 오프너만 있는 초기 상태일 때만** seed 한다(그 외 — 새 턴 존재 or 이미 seed됨 — 스킵).
 *
 * @param prev - 현재 turns(진입 직후 = 초기 오프너 턴들)
 * @param historyTurns - 서버 히스토리를 매핑한 turn 배열
 * @param isOpenerTurn - 초기 오프너(인사/lesson-intro) 턴 판별자
 * @returns 오프너 선두 유지 + 히스토리 append(오프너-only 상태에서만), 아니면 prev 그대로
 */
export function appendHistoryTurns<T extends { id: string }>(
  prev: T[],
  historyTurns: T[],
  isOpenerTurn: (turn: T) => boolean,
): T[] {
  if (historyTurns.length === 0) return prev;
  // 오프너만 있는 초기 상태에서만 seed. 새 턴이 이미 생겼거나(순서 경쟁) 이미 seed됐으면 스킵.
  if (!prev.every(isOpenerTurn)) return prev;
  return [...prev, ...historyTurns];
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
  /** 스트리밍 중 봇 턴 텍스트 patch(streaming=true 유지). */
  setStreamingText: (text: string) => void;
  /** 완결 — 최종 텍스트 patch + streaming=false(announce 1회 트리거). */
  finalizeText: (text: string) => void;
  /** 완료 시 보존할 학습 단계 키(빠른칩 forcedKey, 자유발화면 undefined). */
  forcedKey?: QuickReplyKey;
  /** lastBotReplyKey setter — 빠른칩으로 시작한 학습 단계를 이어가도록 보존. */
  setLastReplyKey: (key?: QuickReplyKey) => void;
  /** pending 해제. */
  setPending: (pending: boolean) => void;
}

/**
 * 실챗 SSE 콜백(onToken/onDone/onError)을 만든다 — 토큰 누적·완결 고정·에러 안내를 순수 로직으로.
 *
 * - onToken: 델타 누적 → setStreamingText(streaming 유지 → announce 안 됨)
 * - onDone: 최종 content(없으면 누적본) 고정 + streaming=false + **forcedKey 보존** + pending 해제
 * - onError: 부분 토큰 보존 후 안내 카피 append(없으면 안내만) + streaming=false + pending 해제
 *
 * @param deps - page 주입 setter/상태
 * @returns streamChat 에 넘길 콜백
 */
export function buildRealSendCallbacks(deps: RealSendCallbackDeps): ChatStreamCallbacks {
  let acc = '';
  return {
    onToken: delta => {
      acc += delta;
      deps.setStreamingText(acc);
    },
    onDone: done => {
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
