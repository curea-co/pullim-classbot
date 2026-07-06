/**
 * chat-turns — 플래그 ON 실챗 트랜스크립트/스트리밍 상태 전이 순수 헬퍼 단위 테스트.
 * Codex #206 R2/R3 회귀 방지:
 *  (1) 히스토리 seed 가 초기 오프너(인사+lesson-intro) 턴을 선두 보존 + 순서 경쟁 방어(오프너-only 시만 seed)
 *  (2) 스트리밍 중/seeded 턴은 announce 게이트 제외 — 신규 완결 봇 턴만 announce(N토큰→1회, 과거 재announce X)
 *  (3) done 완결 시 forcedKey(학습 단계 키) 보존 → 후속 빠른칩 흐름 유지
 */
import {
  appendHistoryTurns,
  shouldAnnounceTurn,
  buildRealSendCallbacks,
  historySummaryGoalKey,
  rebindHistorySummaryGoalKeys,
} from '../chat-turns';

type MiniTurn = { id: string; role: 'student' | 'bot'; text: string; streaming?: boolean; seeded?: boolean };

describe('appendHistoryTurns — 초기 오프너 보존 + 순서 경쟁 방어', () => {
  const opener: MiniTurn[] = [
    { id: 't0_cb', role: 'bot', text: '안녕! 반가워', seeded: true },
    { id: 't1_cb', role: 'bot', text: '오늘의 수업', seeded: true },
  ];
  const history: MiniTurn[] = [
    { id: 'h0', role: 'student', text: '미분이 뭐야?', seeded: true },
    { id: 'h1', role: 'bot', text: '순간 변화율이야.', seeded: true },
  ];
  const isOpener = (t: MiniTurn) => t.id === 't0_cb' || t.id === 't1_cb';

  it('오프너-only 상태면 오프너를 선두 유지하고 서버 히스토리를 그 뒤에 이어붙인다', () => {
    const result = appendHistoryTurns(opener, history, isOpener);
    expect(result.map(t => t.id)).toEqual(['t0_cb', 't1_cb', 'h0', 'h1']);
    // 인사/lesson-intro 는 소거되지 않음(base spec §5 계약).
    expect(result[0].text).toBe('안녕! 반가워');
    expect(result[1].text).toBe('오늘의 수업');
  });

  it('빈 히스토리면 오프너 그대로(첫 진입 환영 유지)', () => {
    expect(appendHistoryTurns(opener, [], isOpener)).toBe(opener);
  });

  it('순서 경쟁 — 늦은 seed 여도 히스토리 유실 없이 오프너 직후 splice, 새 턴은 뒤로 보존', () => {
    // fetch resolve 전에 사용자가 먼저 보낸 새 턴이 prev 에 있는 상태.
    const withNewTurn: MiniTurn[] = [...opener, { id: 's123', role: 'student', text: '질문!' }];
    const result = appendHistoryTurns(withNewTurn, history, isOpener);
    // [오프너 prefix] + [서버 히스토리] + [오프너 이후 새 턴] — 유실·순서붕괴 없음.
    expect(result.map(t => t.id)).toEqual(['t0_cb', 't1_cb', 'h0', 'h1', 's123']);
  });

  it('이미 히스토리 seed(h*)가 붙어 있으면 재실행 시 재삽입 안 함(idempotent)', () => {
    const seeded = appendHistoryTurns(opener, history, isOpener);
    const again = appendHistoryTurns(seeded, history, isOpener);
    expect(again).toBe(seeded); // h* 존재 → 재삽입 스킵(동일 참조)
    expect(again.filter(t => t.id.startsWith('h'))).toHaveLength(2);
  });
});

describe('shouldAnnounceTurn — 신규 완결 봇 턴만 announce', () => {
  it('스트리밍 중(streaming=true) 봇 턴은 announce 안 함', () => {
    expect(shouldAnnounceTurn({ role: 'bot', streaming: true })).toBe(false);
  });
  it('완결(streaming=false) 신규 봇 턴은 announce', () => {
    expect(shouldAnnounceTurn({ role: 'bot', streaming: false })).toBe(true);
  });
  it('flag-OFF mock 신규 봇 턴(streaming/seeded 미설정)은 announce(기존 불변)', () => {
    expect(shouldAnnounceTurn({ role: 'bot' })).toBe(true);
  });
  it('seeded 턴(초기 오프너·히스토리 seed)은 announce 안 함 — 진입 시 과거 재announce 방지', () => {
    expect(shouldAnnounceTurn({ role: 'bot', seeded: true })).toBe(false);
    expect(shouldAnnounceTurn({ role: 'bot', seeded: true, streaming: false })).toBe(false);
  });
  it('학생 턴/없음은 announce 안 함', () => {
    expect(shouldAnnounceTurn({ role: 'student' })).toBe(false);
    expect(shouldAnnounceTurn(undefined)).toBe(false);
  });
});

describe('buildRealSendCallbacks — 스트리밍 상태전이 + forcedKey 보존', () => {
  function makeDeps(forcedKey?: 'lesson_concept') {
    return {
      setStreamingText: jest.fn(),
      finalizeText: jest.fn(),
      appendCard: jest.fn(),
      forcedKey,
      setLastReplyKey: jest.fn(),
      setPending: jest.fn(),
    };
  }

  it('토큰마다 setStreamingText(누적) 호출 — finalizeText 는 아직 없음(스트리밍 중=announce 제외)', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('안');
    cb.onToken('녕');
    expect(deps.setStreamingText.mock.calls).toEqual([['안'], ['안녕']]);
    expect(deps.finalizeText).not.toHaveBeenCalled();
  });

  it('done: 최종 content 로 finalizeText 1회(streaming=false=announce 1회) + pending 해제', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('부');
    cb.onDone({ content: '부호 변화표를 그려봐.', usage: undefined });
    expect(deps.finalizeText).toHaveBeenCalledTimes(1);
    expect(deps.finalizeText).toHaveBeenCalledWith('부호 변화표를 그려봐.');
    expect(deps.setPending).toHaveBeenCalledWith(false);
  });

  it('done content 가 비면 누적 토큰으로 폴백', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('가');
    cb.onToken('나');
    cb.onDone({ content: '', usage: undefined });
    expect(deps.finalizeText).toHaveBeenCalledWith('가나');
  });

  it('done: forcedKey(빠른칩 학습 단계 키) 보존 → 후속 빠른칩 흐름 유지', () => {
    const deps = makeDeps('lesson_concept');
    const cb = buildRealSendCallbacks(deps);
    cb.onDone({ content: '개념 설명', usage: undefined });
    expect(deps.setLastReplyKey).toHaveBeenCalledWith('lesson_concept');
  });

  it('done: 자유발화(forcedKey 없음)면 lastReplyKey undefined(기존대로)', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onDone({ content: '답변', usage: undefined });
    expect(deps.setLastReplyKey).toHaveBeenCalledWith(undefined);
  });

  it('error: 부분 토큰 보존 후 안내 append + finalizeText(streaming=false) + pending 해제', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('부분');
    cb.onError({ code: 'stream', message: '문제가 생겼어요.' });
    expect(deps.finalizeText).toHaveBeenCalledWith('부분\n\n문제가 생겼어요.');
    expect(deps.setPending).toHaveBeenCalledWith(false);
  });

  it('error: 토큰이 없으면 안내 카피만', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onError({ code: 'rate_limit', message: '잠시 후 다시.' });
    expect(deps.finalizeText).toHaveBeenCalledWith('잠시 후 다시.');
  });

  it('card: 앞 텍스트 세그먼트 finalize → appendCard → 누적 리셋(카드 뒤 토큰은 새 세그먼트)', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('AB');
    cb.onCard({ cardType: 'concept', payload: { id: 'c1' } });
    // 카드 앞 세그먼트 'AB' 를 완결하고 카드를 삽입.
    expect(deps.finalizeText).toHaveBeenLastCalledWith('AB');
    expect(deps.appendCard).toHaveBeenCalledWith({ cardType: 'concept', payload: { id: 'c1' } });
    // 카드 뒤 토큰은 새 세그먼트로 누적(직전 'AB' 를 잇지 않음).
    cb.onToken('CD');
    expect(deps.setStreamingText).toHaveBeenLastCalledWith('CD');
  });

  it('card: text→card→text→done 순서가 setter 호출 순서로 정확히 인터리브', () => {
    const calls: string[] = [];
    const deps = {
      setStreamingText: jest.fn((t: string) => calls.push(`text:${t}`)),
      finalizeText: jest.fn((t: string) => calls.push(`final:${t}`)),
      appendCard: jest.fn((c: { cardType: string }) => calls.push(`card:${c.cardType}`)),
      forcedKey: undefined,
      setLastReplyKey: jest.fn(),
      setPending: jest.fn(),
    };
    const cb = buildRealSendCallbacks(deps);
    cb.onToken('AB');
    cb.onCard({ cardType: 'quiz', payload: {} });
    cb.onToken('CD');
    cb.onDone({ content: '', usage: undefined });
    expect(calls).toEqual(['text:AB', 'final:AB', 'card:quiz', 'text:CD', 'final:CD']);
  });

  it('card 로 끝나면 done 이 빈 세그먼트 finalize(page 가 트레일링 빈 버블 제거)', () => {
    const deps = makeDeps();
    const cb = buildRealSendCallbacks(deps);
    cb.onCard({ cardType: 'summary', payload: { text: '정리' } });
    cb.onDone({ content: '', usage: undefined });
    // 카드 앞 빈 세그먼트 finalize('') + 카드 뒤 done 빈 세그먼트 finalize('').
    expect(deps.finalizeText.mock.calls).toEqual([[''], ['']]);
    expect(deps.appendCard).toHaveBeenCalledWith({ cardType: 'summary', payload: { text: '정리' } });
  });
});

describe('historySummaryGoalKey — 오늘 메시지에만 배너 goalKey(Codex #210: 로컬 store 는 과거 권위 아님)', () => {
  const todayGoalKey = 's1::cb_001::today';

  it('오늘 시각 → todayGoalKey 반환(같은 날 재입장 시 라이브 배너와 일치)', () => {
    expect(historySummaryGoalKey(Date.now(), todayGoalKey)).toBe(todayGoalKey);
  });

  it('지난 날 시각 → undefined(과거 summary 는 평문 폴백 — 거짓 0/N 배너 방지)', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    expect(historySummaryGoalKey(yesterday, todayGoalKey)).toBeUndefined();
  });
});

describe('rebindHistorySummaryGoalKeys — 세션 하이드레이션 레이스 보정(Codex #210 R3)', () => {
  const now = Date.now();
  const staleKey = 'student_001::cb_001::stale';
  const realKey = 's-real::cb_001::today';
  const seededSummary = { id: 'h2', at: now, kind: 'summary', payload: { goalKey: staleKey, nextLine: '다음' } };

  it('폴백 id 로 seed 된 오늘 summary 의 goalKey 를 현재 키로 재바인딩', () => {
    const turns = [{ id: 'h0', at: now, kind: 'text', payload: undefined }, seededSummary];
    const out = rebindHistorySummaryGoalKeys(turns, realKey);
    expect(out[1].payload).toEqual({ goalKey: realKey, nextLine: '다음' });
    expect(out[0]).toBe(turns[0]); // 다른 turn 은 그대로
  });

  it('goalKey 없는 summary(지난 날 평문 폴백)·비히스토리 turn 은 건드리지 않음', () => {
    const turns = [
      { id: 'h1', at: now - 86400000, kind: 'summary', payload: undefined },
      { id: 'b123', at: now, kind: 'summary', payload: { goalKey: staleKey } }, // 실시간 turn(h* 아님)
    ];
    expect(rebindHistorySummaryGoalKeys(turns, realKey)).toBe(turns); // 무변경 → 동일 참조
  });

  it('이미 올바른 키면 동일 참조 반환(불필요 리렌더 방지)', () => {
    const turns = [{ id: 'h2', at: now, kind: 'summary', payload: { goalKey: realKey } }];
    expect(rebindHistorySummaryGoalKeys(turns, realKey)).toBe(turns);
  });
});
