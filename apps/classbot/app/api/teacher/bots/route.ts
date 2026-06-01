/**
 * 교사 전용 mutation — 클래스봇 생성(봇 빌더). RBAC 가드 실증(plan Phase 3).
 *
 * classbot 핵심은 학생/교사 역할 분기다. 봇 생성·채점·라이브 개설 등 교사 전용
 * 기능은 **role=teacher** 만 통과해야 한다. 이 route 가 그 가드의 정본 예시다.
 *  - 미로그인 → 401
 *  - 로그인했지만 role !== teacher(학생 등) → 403 (학생은 교사 기능 불가)
 *  - teacher → 본인(teacherId) 명의로 class_bots insert
 *
 * 명의(teacherId)는 클라이언트 입력이 아니라 JWT claim(sub)에서만 결정한다.
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { classBots, users } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';

export const runtime = 'nodejs';

const TONES = ['정중', '친근', '스파르타', '차분', '열정'] as const;
type Tone = (typeof TONES)[number];

interface BotBody {
  name?: unknown;
  subject?: unknown;
  grade?: unknown;
  tone?: unknown;
  greeting?: unknown;
  organization?: unknown;
}

/**
 * 교사 전용 — 클래스봇을 본인 명의로 생성한다.
 * @param req - 봇 메타 JSON + Authorization: Bearer
 * @returns 201 { id, teacherId } | 400 | 401 | 403
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: teacherId, role, isAuthenticated } = getCurrentUserIdFromRequest(req);

  // 쓰기 가드 — 미로그인 차단.
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }
  // RBAC — 교사 전용. 학생/기타 role 은 403.
  if (role !== 'teacher') {
    return NextResponse.json(
      { message: '교사만 사용할 수 있는 기능입니다.', code: 'FORBIDDEN_ROLE' },
      { status: 403 },
    );
  }

  let body: BotBody;
  try {
    body = (await req.json()) as BotBody;
  } catch {
    return NextResponse.json({ message: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const grade = typeof body.grade === 'string' ? body.grade.trim() : '';
  const tone: Tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : '친근';
  const greeting =
    typeof body.greeting === 'string' && body.greeting.trim()
      ? body.greeting.trim()
      : '안녕! 오늘도 같이 공부해보자.';
  const organization =
    typeof body.organization === 'string' && body.organization.trim()
      ? body.organization.trim()
      : '풀림';

  if (!name || !subject || !grade) {
    return NextResponse.json(
      { message: 'name, subject, grade 는 필수입니다.' },
      { status: 400 },
    );
  }

  // teacherName 은 도메인 users 의 본인 이름(없으면 임시).
  const teacherRow = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, teacherId))
    .limit(1);
  const teacherName = teacherRow[0]?.name ?? '선생님';

  const id = `cb_${randomUUID()}`;
  try {
    await db.insert(classBots).values({
      id,
      name,
      teacherId,
      teacherName,
      organization,
      subject,
      grade,
      tone,
      greeting,
    });
  } catch {
    return NextResponse.json(
      { message: '봇을 생성하지 못했습니다.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, teacherId, teacherName }, { status: 201 });
}
