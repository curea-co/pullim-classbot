/**
 * chat-stream — pullim-api 튜터 챗 SSE 클라이언트 단위 테스트 (ADR-064, api.md §3.8).
 * fetch/stream 은 전부 jest mock (실 BE·실 Anthropic 불요). 검증:
 *  - POST `${API_BASE}/classbot/classes/:classId/chat` — credentials:'include' + X-CSRF-Token + {message, clientTurnId}
 *  - SSE token(증분)→done(완결) 파싱, 청크 경계 재조립
 *  - 개시 전 429/403/503 → onError 사용자향 카피(스트림 read 없음)
 *  - event:error 프레임·끊김 → stream 에러, fetch throw → network 에러
 *  - fetchChatHistory: domainFetch GET 위임(완결 turn seed)
 */

// domainFetch 는 별도 유닛에서 검증됨 — 여기선 위임만 확인(모킹).
const domainFetchMock = jest.fn();
jest.mock('../domain-fetch', () => ({
  domainFetch: (...args: unknown[]) => domainFetchMock(...args),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import {
  streamChat,
  fetchChatHistory,
  CHAT_ERROR_COPY,
  type ChatStreamCallbacks,
  type ChatCard,
} from '../chat-stream';

const fetchMock = jest.fn();
const CLASSBOT_BASE = `${API_BASE}/classbot`;
const CSRF_URL = `${API_BASE}/auth/csrf`;

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  domainFetchMock.mockReset();
});

/** CSRF 발급 응답(json 파싱). */
function csrfRes(token: string): Response {
  return { ok: true, status: 200, json: async () => ({ csrfToken: token }) } as unknown as Response;
}

/** SSE 응답 — chunks(문자열)를 Uint8Array 시퀀스로 흘려주는 ReadableStream body 목. */
function sseRes(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const encoded = chunks.map((c) => encoder.encode(c));
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read: async () =>
            i < encoded.length
              ? { done: false, value: encoded[i++] }
              : { done: true, value: undefined },
        };
      },
    },
  } as unknown as Response;
}

/** non-2xx 개시 전 실패 응답(body 없음). */
function errorStatusRes(status: number): Response {
  return { ok: false, status, body: null } as unknown as Response;
}

/** raw byte 청크(Uint8Array[])를 흘려주는 SSE 응답 — 멀티바이트 경계 쪼갬 테스트용. */
function sseResBytes(chunks: Uint8Array[]): Response {
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          read: async () =>
            i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
        };
      },
    },
  } as unknown as Response;
}

/** 콜백 스파이 묶음. */
function spies(): ChatStreamCallbacks & { tokens: string[]; cards: ChatCard[] } {
  const tokens: string[] = [];
  const cards: ChatCard[] = [];
  return {
    tokens,
    cards,
    onToken: jest.fn((d: string) => tokens.push(d)),
    onCard: jest.fn((c: ChatCard) => cards.push(c)),
    onDone: jest.fn(),
    onError: jest.fn(),
  };
}

describe('streamChat — 요청 계약(POST + 쿠키 + CSRF + clientTurnId)', () => {
  it('CSRF 발급 후 정본 경로로 credentials include + X-CSRF-Token + {message, clientTurnId} POST', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfRes('csrf-1'))
      .mockResolvedValueOnce(sseRes(['event: done\ndata: {"content":"안녕"}\n\n']));
    const cb = spies();

    await streamChat('cb_001', '안녕하세요', 'turn-abc', cb);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [csrfUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(csrfUrl).toBe(CSRF_URL);

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`${CLASSBOT_BASE}/classes/cb_001/chat`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('csrf-1');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({
      message: '안녕하세요',
      clientTurnId: 'turn-abc',
    });
  });
});

describe('streamChat — SSE 파싱(token → done)', () => {
  it('token 델타를 순서대로 onToken, done 에서 content/messageId 로 onDone', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes([
        'event: token\ndata: {"delta":"안"}\n\n',
        'event: token\ndata: {"delta":"녕"}\n\n',
        'event: done\ndata: {"messageId":"m1","content":"안녕","usage":{"model":"claude-sonnet-4-6"}}\n\n',
      ]),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['안', '녕']);
    expect(cb.onDone).toHaveBeenCalledWith({
      messageId: 'm1',
      content: '안녕',
      usage: { model: 'claude-sonnet-4-6' },
    });
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('CRLF(\\r\\n\\r\\n) 프레임 구분자도 정규화해 token/done 정상 파싱', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes([
        'event: token\r\ndata: {"delta":"안"}\r\n\r\n',
        'event: token\r\ndata: {"delta":"녕"}\r\n\r\n',
        'event: done\r\ndata: {"content":"안녕"}\r\n\r\n',
      ]),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['안', '녕']);
    expect(cb.onDone).toHaveBeenCalledWith({ messageId: undefined, content: '안녕', usage: undefined });
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('UTF-8 멀티바이트(한글)가 청크 바이트 중간에서 쪼개져도 정확히 디코드', async () => {
    // 전체 SSE 텍스트를 바이트로 인코딩한 뒤, 한글 문자의 UTF-8 3바이트 시퀀스 중간에서 쪼갠다.
    const full = 'event: token\ndata: {"delta":"한글"}\n\nevent: done\ndata: {"content":"한글 답변"}\n\n';
    const enc = new TextEncoder();
    const bytes = enc.encode(full);
    // 첫 '한'(UTF-8 3바이트)의 시작 오프셋 + 1 → 멀티바이트 시퀀스 중간에서 절단.
    const cut = enc.encode(full.slice(0, full.indexOf('한'))).length + 1;
    fetchMock
      .mockResolvedValueOnce(csrfRes('t'))
      .mockResolvedValueOnce(sseResBytes([bytes.slice(0, cut), bytes.slice(cut)]));
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['한글']); // 깨짐(replacement char) 없음
    expect(cb.onDone).toHaveBeenCalledWith({ messageId: undefined, content: '한글 답변', usage: undefined });
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('청크 경계가 프레임 중간을 갈라도 버퍼 재조립으로 정확히 파싱', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes([
        'event: tok', // 프레임이 두 청크에 걸침
        'en\ndata: {"delta":"A"}\n\nevent: done\ndata: {"con',
        'tent":"A"}\n\n',
      ]),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['A']);
    expect(cb.onDone).toHaveBeenCalledWith({ messageId: undefined, content: 'A', usage: undefined });
  });
});

describe('streamChat — v2 리치 카드 프레임(ADR-065)', () => {
  it('event: card 프레임 → onCard({cardType, payload}), token 과 순서대로 인터리브', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes([
        'event: token\ndata: {"delta":"먼저 "}\n\n',
        'event: card\ndata: {"cardType":"concept","payload":{"id":"c1","title":"기울기"}}\n\n',
        'event: token\ndata: {"delta":"이제 퀴즈"}\n\n',
        'event: card\ndata: {"cardType":"quiz","payload":{"question":"Q"}}\n\n',
        'event: done\ndata: {"blocks":[{"messageId":"m1","kind":"text"},{"messageId":"m2","kind":"card","cardType":"concept"}],"usage":{"model":"claude-sonnet-4-6"}}\n\n',
      ]),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['먼저 ', '이제 퀴즈']);
    expect(cb.cards).toEqual([
      { cardType: 'concept', payload: { id: 'c1', title: '기울기' } },
      { cardType: 'quiz', payload: { question: 'Q' } },
    ]);
    // 카드는 종료 프레임 아님 — done 까지 스트림 계속.
    expect(cb.onDone).toHaveBeenCalledTimes(1);
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('done.blocks 순서 보존 목록을 파싱해 onDone 에 실어준다(kind 정규화)', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes([
        'event: done\ndata: {"blocks":[{"messageId":"a","kind":"text"},{"messageId":"b","kind":"card","cardType":"summary"},{"messageId":"c","kind":"bogus"}],"usage":{"outputTokens":9}}\n\n',
      ]),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.onDone).toHaveBeenCalledWith({
      messageId: undefined,
      content: '',
      usage: { outputTokens: 9 },
      blocks: [
        { messageId: 'a', kind: 'text', cardType: undefined },
        { messageId: 'b', kind: 'card', cardType: 'summary' },
        { messageId: 'c', kind: 'text', cardType: undefined }, // 임의 kind → text 정규화
      ],
    });
  });

  it('cardType 없는 card 프레임은 스킵(onCard 미호출·크래시 없음)', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(
      sseRes(['event: card\ndata: {"payload":{"x":1}}\n\n', 'event: done\ndata: {"blocks":[]}\n\n']),
    );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.onCard).not.toHaveBeenCalled();
    expect(cb.onDone).toHaveBeenCalledTimes(1);
  });
});

describe('streamChat — 개시 전 실패(실 HTTP 상태 → 사용자향 카피)', () => {
  it.each([
    [429, 'rate_limit'],
    [403, 'forbidden'],
    [503, 'unavailable'],
  ] as const)('%s → onError %s 카피, 스트림 read 없음', async (status, code) => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockResolvedValueOnce(errorStatusRes(status));
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.onError).toHaveBeenCalledWith({ code, message: CHAT_ERROR_COPY[code] });
    expect(cb.onToken).not.toHaveBeenCalled();
    expect(cb.onDone).not.toHaveBeenCalled();
  });
});

describe('streamChat — 스트림 중도 실패 / 네트워크', () => {
  it('event:error 프레임 → onError(stream) 로 종료', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfRes('t'))
      .mockResolvedValueOnce(
        sseRes(['event: token\ndata: {"delta":"부"}\n\n', 'event: error\ndata: {"code":"UPSTREAM"}\n\n']),
      );
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.tokens).toEqual(['부']);
    expect(cb.onError).toHaveBeenCalledWith({ code: 'stream', message: CHAT_ERROR_COPY.stream });
    expect(cb.onDone).not.toHaveBeenCalled();
  });

  it('done/error 없이 스트림이 끝나면 stream 에러로 마감', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfRes('t'))
      .mockResolvedValueOnce(sseRes(['event: token\ndata: {"delta":"x"}\n\n']));
    const cb = spies();

    await streamChat('cb_001', 'hi', 'turn-1', cb);

    expect(cb.onError).toHaveBeenCalledWith({ code: 'stream', message: CHAT_ERROR_COPY.stream });
  });

  it('fetch 자체가 throw 하면 network 에러(throw 하지 않음)', async () => {
    fetchMock.mockResolvedValueOnce(csrfRes('t')).mockRejectedValueOnce(new Error('offline'));
    const cb = spies();

    await expect(streamChat('cb_001', 'hi', 'turn-1', cb)).resolves.toBeUndefined();
    expect(cb.onError).toHaveBeenCalledWith({ code: 'network', message: CHAT_ERROR_COPY.network });
  });
});

describe('fetchChatHistory — 완결 turn seed(domainFetch GET 위임)', () => {
  it('정본 히스토리 경로로 domainFetch 위임, 메시지 배열 반환', async () => {
    const msgs = [
      { role: 'user', content: '미분이 뭐야?', createdAt: '2026-06-01T00:00:00Z' },
      { role: 'assistant', content: '순간 변화율이야.', createdAt: '2026-06-01T00:00:01Z' },
    ];
    domainFetchMock.mockResolvedValueOnce(msgs);

    const result = await fetchChatHistory('cb_001');

    expect(domainFetchMock).toHaveBeenCalledWith('/classes/cb_001/chat');
    expect(result).toEqual(msgs);
  });
});
