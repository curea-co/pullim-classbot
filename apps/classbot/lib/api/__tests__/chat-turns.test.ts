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

  it('순서 경쟁 — seed 전에 사용자 새 턴이 생겼으면 과거를 새 턴 뒤에 섞지 않고 스킵', () => {
    // fetch resolve 전에 사용자가 먼저 보낸 새 턴이 prev 에 있는 상태.
    const withNewTurn: MiniTurn[] = [...opener, { id: 's123', role: 'student', text: '질문!' }];
    const result = appendHistoryTurns(withNewTurn, history, isOpener);
    expect(result).toBe(withNewTurn); // 동일 참조 — seed 스킵(과거가 새 턴 뒤에 붙지 않음)
  });

  it('이미 히스토리 seed(h*)가 붙어 있으면 재실행 시 중복 append 안 함', () => {
    const seeded = appendHistoryTurns(opener, history, isOpener);
    const again = appendHistoryTurns(seeded, history, isOpener);
    expect(again).toBe(seeded); // h* 는 오프너 아님 → every(isOpener) 실패 → 스킵
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
});
