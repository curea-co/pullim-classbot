/**
 * 채팅 메시지 영속화 thin-slice — 쓰기 가드 + 명의 실증(plan Phase 3).
 *
 * 목적: 도메인 write 가 **로그인 사용자 명의(user_id)** 로 저장되는지 실DB 로 증명한다.
 *  - 인증 필수: 세션(Authorization: Bearer access)이 없으면 401.
 *    (읽기 데모 폴백과 달리 per-user 쓰기는 본인 명의가 필수.)
 *  - studentId 는 클라이언트 입력이 아니라 **JWT claim(sub)** 에서만 결정한다
 *    (명의 위조 방지). bot_id/text 만 본문으로 받는다.
 *  - 같은 봇에 여러 학생이 보내면 각자 다른 student_id 로 분리 저장된다.
 *
 * 본격 채팅 영속화(봇 응답 생성·턴 동기화 등)는 이 plan 범위 밖. 여기서는
 * 신원 격리 증명을 위한 최소 저장 경로만 둔다.
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';

// node:crypto / pg 사용 — Edge 가 아닌 Node 런타임 강제.
export const runtime = 'nodejs';

interface ChatBody {
  botId?: unknown;
  text?: unknown;
}

/**
 * 학생 채팅 메시지를 본인 명의로 저장한다.
 * @param req - { botId, text } JSON 본문 + Authorization: Bearer
 * @returns 201 { id, studentId, botId } | 400 | 401
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);

  // 쓰기 가드 — per-user 쓰기는 본인 세션 필수(데모 폴백 불가).
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ message: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const botId = typeof body.botId === 'string' ? body.botId : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!botId || !text) {
    return NextResponse.json(
      { message: 'botId 와 text 는 필수입니다.' },
      { status: 400 },
    );
  }

  const id = `msg_${randomUUID()}`;
  try {
    await db.insert(chatMessages).values({
      id,
      botId,
      // 명의는 세션 claim 에서만 — 본문으로 받지 않는다(위조 방지).
      studentId,
      role: 'student',
      text,
    });
  } catch {
    // FK 위반(없는 봇/사용자) 등은 400 으로.
    return NextResponse.json(
      { message: '메시지를 저장하지 못했습니다. botId 를 확인하세요.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, studentId, botId }, { status: 201 });
}
