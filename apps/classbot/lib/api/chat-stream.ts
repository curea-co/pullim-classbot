/**
 * chat-stream — pullim-api 실시간 튜터 챗 **SSE 클라이언트**(ADR-064, api.md §3.8).
 *
 * `domain-fetch.ts` 는 JSON 왕복 전용이라 스트리밍을 소비할 수 없다. 챗 send 는
 * `POST ${API_BASE}/classbot/classes/:classId/chat` → `Content-Type: text/event-stream` 이므로
 * **`fetch` + `response.body.getReader()`** 로 SSE 프레임을 직접 파싱한다. 네이티브 `EventSource`
 * 는 GET·쿠키 전용이라 CSRF 헤더·POST body 를 못 실어 쓸 수 없다(§3.8).
 *
 * 신원 계약은 domain-fetch 와 동일 — OS access 쿠키(`credentials:'include'`) + write CSRF
 * double-submit(`X-CSRF-Token`, `fetchOsCsrfToken` 재사용). FE 는 x-user-id·Bearer 를 보내지 않는다.
 *
 * 이벤트(§3.8):
 *  - `event: token` · `data: { "delta": "..." }`  — 증분 토큰(반복)
 *  - `event: done`  · `data: { "messageId", "content", "usage" }` — 완결(종료)
 *  - `event: error` · `data: { "code" }` — 스트림 중도 실패(종료·재시도 가능)
 *
 * 스트림 개시 **전** 실패는 실 HTTP 상태로 온다 — 429(rate-limit)·403(비멤버)·503(미가용).
 * 이들은 `onError` 로 사용자향 카피에 매핑한다(스트림 read 없음).
 *
 * ⚠️ 이 모듈은 `USE_REAL_CORE_BE` 플래그를 보지 않는다 — 순수 transport. 플래그 게이트는 호출부
 *   (chat/page.tsx send)의 책임이다.
 */
import { API_BASE, fetchOsCsrfToken } from '@/lib/auth/os-sso';

import { domainFetch } from './domain-fetch';

/** classbot 정본 표면 base — OS API 호스트의 서비스 경계 프리픽스(`/classbot/*`). */
const CLASSBOT_API_BASE = `${API_BASE}/classbot`;

/** LLM 사용량(관측성) — done 이벤트 payload. */
export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

/** done 이벤트 payload — 완결된 assistant turn. */
export interface ChatDone {
  messageId?: string;
  content: string;
  usage?: ChatUsage;
}

/**
 * 클라이언트 에러 taxonomy — 사용자향 카피 키. 서버의 generic `error.code` 와는 별개다
 * (서버 code 는 관측용, 사용자에겐 아래 카피만 노출).
 */
export type ChatStreamErrorCode = 'rate_limit' | 'forbidden' | 'unavailable' | 'stream' | 'network';

export interface ChatStreamError {
  code: ChatStreamErrorCode;
  /** 버블에 그대로 노출할 사용자향 한글 카피. */
  message: string;
}

/** 에러 코드 → 사용자향 카피(한글 하드코딩 — i18n 미도입). */
export const CHAT_ERROR_COPY: Record<ChatStreamErrorCode, string> = {
  rate_limit: '메시지를 너무 빨리 보냈어요. 잠시 후 다시 시도해 주세요.',
  forbidden: '이 클래스의 봇과 대화할 권한이 없어요.',
  unavailable: '지금은 튜터에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
  stream: '답변을 받는 중 문제가 생겼어요. 다시 시도해 주세요.',
  network: '연결에 문제가 생겼어요. 네트워크를 확인하고 다시 시도해 주세요.',
};

export interface ChatStreamCallbacks {
  /** 증분 토큰 델타. */
  onToken: (delta: string) => void;
  /** 완결(done) — 최종 content/messageId/usage. */
  onDone: (done: ChatDone) => void;
  /** 개시 전 실패(403/429/503) 또는 스트림 중도 실패. */
  onError: (err: ChatStreamError) => void;
}

/** 스트림 개시 전 non-2xx HTTP 상태 → 클라이언트 에러 코드. */
function statusToErrorCode(status: number): ChatStreamErrorCode {
  if (status === 429) return 'rate_limit';
  if (status === 403) return 'forbidden';
  // 503(미가용) + 그 외 개시 전 서버 실패(500 등)는 모두 "잠시 후 재시도" 카피로.
  return 'unavailable';
}

/** JSON.parse 방어 — 파싱 실패 시 null. */
function safeJson(data: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

interface SseFrame {
  event: string;
  data: string;
}

/**
 * 단일 SSE 프레임(빈 줄로 구분된 텍스트 블록)을 event/data 로 파싱한다.
 * 다중 `data:` 줄은 `\n` 으로 결합(SSE 규약). 주석(`:` 시작)·빈 줄은 무시.
 * data 가 하나도 없으면 무의미 프레임 → null.
 */
function parseFrame(frame: string): SseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const raw of frame.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).replace(/^ /, ''));
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

/**
 * 프레임 1개를 콜백으로 디스패치한다.
 * @returns true = 종료 프레임(done/error)이라 스트림 소비를 멈춰야 함.
 */
function handleFrame(frame: string, cb: ChatStreamCallbacks): boolean {
  const parsed = parseFrame(frame);
  if (!parsed) return false;

  if (parsed.event === 'token') {
    const delta = safeJson(parsed.data)?.delta;
    if (typeof delta === 'string') cb.onToken(delta);
    return false;
  }
  if (parsed.event === 'done') {
    const d = safeJson(parsed.data) ?? {};
    cb.onDone({
      messageId: typeof d.messageId === 'string' ? d.messageId : undefined,
      content: typeof d.content === 'string' ? d.content : '',
      usage: (d.usage as ChatUsage | undefined) ?? undefined,
    });
    return true;
  }
  if (parsed.event === 'error') {
    // 서버 generic code 는 관측용 — 사용자에겐 stream 카피로 통일.
    cb.onError({ code: 'stream', message: CHAT_ERROR_COPY.stream });
    return true;
  }
  return false;
}

/**
 * ReadableStream 본문을 SSE 프레임 단위로 소비한다. 청크 경계와 프레임 경계는 무관하므로
 * 버퍼에 누적하다 `\n\n`(프레임 구분) 마다 잘라 디스패치한다. done/error 프레임이면 즉시 종료.
 * done/error 없이 스트림이 끝나면(끊김) stream 에러로 마감한다.
 */
async function consumeSse(body: ReadableStream<Uint8Array>, cb: ChatStreamCallbacks): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    // CRLF 정규화 — 서버/프록시가 `\r\n\r\n` 로 프레임을 구분해도 아래 `\n\n` split 이 동작하도록.
    // (청크 경계가 `\r\n` 중간을 갈라도 다음 루프에서 재결합돼 정규화된다.) parseFrame 의 `\r`
    // 제거도 방어적으로 유지.
    buffer = buffer.replace(/\r\n/g, '\n');

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (handleFrame(frame, cb)) return; // done/error → 종료
    }

    if (done) break;
  }

  // 스트림 종료 flush — decoder 내부에 남은 멀티바이트(UTF-8) 조각을 방출한다. 단일 decoder +
  // stream:true 로 청크 경계에 걸친 한글 등 멀티바이트는 이미 다음 청크와 합쳐 디코드되지만,
  // 마지막 청크가 문자 중간에서 끝난 경우의 잔여 바이트는 이 최종 flush 로 마감한다.
  buffer += decoder.decode();
  buffer = buffer.replace(/\r\n/g, '\n');

  // blank-line 종결자 없이 남은 마지막 프레임 flush.
  if (buffer.trim() && handleFrame(buffer, cb)) return;

  // done/error 프레임 없이 스트림이 끝남 = 끊김.
  cb.onError({ code: 'stream', message: CHAT_ERROR_COPY.stream });
}

/**
 * 학생 발화를 봇 튜터에게 보내고 응답을 SSE 로 스트리밍한다.
 *
 * 개시 전 실패(403/429/503/네트워크)는 `onError` 로, 스트림은 `onToken`(증분)→`onDone`(완결)
 * 또는 `onError`(중도 실패)로 디스패치한다. **throw 하지 않는다** — 모든 실패는 onError 경유.
 *
 * @param classId - 봇==클래스 id(ADR-063). `:classId` 경로 세그먼트.
 * @param message - 학생 발화 본문.
 * @param clientTurnId - FE 생성 uuid(멱등 키). 동일 값 재전송 = 서버 dedup·done 재생.
 * @param cb - onToken/onDone/onError.
 * @param signal - 선택 AbortSignal(언마운트 취소).
 */
export async function streamChat(
  classId: string,
  message: string,
  clientTurnId: string,
  cb: ChatStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    // write 표면 — CsrfGuard double-submit 토큰 첨부(domain-fetch write 와 동일 규약).
    const csrf = await fetchOsCsrfToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (csrf) headers['X-CSRF-Token'] = csrf;

    res = await fetch(`${CLASSBOT_API_BASE}/classes/${classId}/chat`, {
      method: 'POST',
      // OS access 쿠키(Domain=.pullim.ai, HttpOnly)를 cross-origin 자동 첨부.
      credentials: 'include',
      headers,
      body: JSON.stringify({ message, clientTurnId }),
      cache: 'no-store',
      signal,
    });
  } catch {
    cb.onError({ code: 'network', message: CHAT_ERROR_COPY.network });
    return;
  }

  // 개시 전 실패 — 실 HTTP 상태(429/403/503/…). 스트림 read 없음.
  if (!res.ok) {
    const code = statusToErrorCode(res.status);
    cb.onError({ code, message: CHAT_ERROR_COPY[code] });
    return;
  }
  if (!res.body) {
    cb.onError({ code: 'stream', message: CHAT_ERROR_COPY.stream });
    return;
  }

  try {
    await consumeSse(res.body, cb);
  } catch {
    // read 중 예외(abort·네트워크 끊김).
    cb.onError({ code: 'network', message: CHAT_ERROR_COPY.network });
  }
}

/** 히스토리 메시지 — 완결된 turn 만(§3.8). id/token_usage/clientTurnId 노출 안 함. */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/**
 * 봇 대화 멀티턴 히스토리를 로드한다(GET, read + membership).
 * `WHERE class_id=:classId AND student_id=sub ORDER BY created_at` — **완결 turn 만** 반환.
 * @param classId - 봇==클래스 id.
 * @returns 시간순 완결 turn 배열(빈 배열 = 첫 진입).
 */
export function fetchChatHistory(classId: string): Promise<ChatHistoryMessage[]> {
  return domainFetch<ChatHistoryMessage[]>(`/classes/${classId}/chat`);
}
