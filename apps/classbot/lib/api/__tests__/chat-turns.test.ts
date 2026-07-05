/**
 * chat-turns — 플래그 ON 실챗 트랜스크립트/스트리밍 상태 전이 순수 헬퍼 단위 테스트.
 * Codex #206 R2 3건 회귀 방지:
 *  (1) 히스토리 seed 가 초기 오프너(인사+lesson-intro) 턴을 선두 보존하고 그 뒤 append(멱등)
 *  (2) 스트리밍 중 턴은 announce 게이트 제외 — 완결(streaming=false)에서만 announce(N토큰→1회)
 *  (3) done 완결 시 forcedKey(학습 단계 키) 보존 → 후속 빠른칩 흐름 유지
 */
import {
  appendHistoryTurns,
  shouldAnnounceTurn,
  buildRealSendCallbacks,
} from '../chat-turns';

type MiniTurn = { id: string; role: 'student' | 'bot'; text: string; streaming?: boolean };

describe('appendHistoryTurns — 초기 오프너 보존 + 히스토리 append(멱등)', () => {
  const opener: MiniTurn[] = [
    { id: 't0_cb', role: 'bot', text: '안녕! 반가워' },
    { id: 't1_cb', role: 'bot', text: '오늘의 수업' },
  ];
  const history: MiniTurn[] = [
    { id: 'h0', role: 'student', text: '미분이 뭐야?' },
    { id: 'h1', role: 'bot', text: '순간 변화율이야.' },
  ];

  it('오프너 2턴을 선두에 유지하고 서버 히스토리를 그 뒤에 이어붙인다', () => {
    const result = appendHistoryTurns(opener, history);
    expect(result.map(t => t.id)).toEqual(['t0_cb', 't1_cb', 'h0', 'h1']);
    // 인사/lesson-intro 는 소거되지 않음(base spec §5 계약).
    expect(result[0].text).toBe('안녕! 반가워');
    expect(result[1].text).toBe('오늘의 수업');
  });

  it('빈 히스토리면 오프너 그대로(첫 진입 환영 유지)', () => {
    expect(appendHistoryTurns(opener, [])).toBe(opener);
  });

  it('이미 히스토리 seed(h*)가 붙어 있으면 재실행 시 중복 append 안 함(멱등)', () => {
    const seeded = appendHistoryTurns(opener, history);
    const again = appendHistoryTurns(seeded, history);
    expect(again).toBe(seeded); // 동일 참조 — 재append 없음
    expect(again.filter(t => t.id.startsWith('h'))).toHaveLength(2);
  });
});

describe('shouldAnnounceTurn — 완결 봇 턴만 announce(스트리밍 중 제외)', () => {
  it('스트리밍 중(streaming=true) 봇 턴은 announce 안 함', () => {
    expect(shouldAnnounceTurn({ role: 'bot', streaming: true })).toBe(false);
  });
  it('완결(streaming=false) 봇 턴은 announce', () => {
    expect(shouldAnnounceTurn({ role: 'bot', streaming: false })).toBe(true);
  });
  it('flag-OFF mock 봇 턴(streaming 미설정)은 announce(기존 불변)', () => {
    expect(shouldAnnounceTurn({ role: 'bot' })).toBe(true);
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
