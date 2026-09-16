import { AssignmentForm } from './assignment-form';

type SearchParams = Promise<{ classId?: string; bot?: string }>;

/**
 * 과제 내기 — 반 상세·봇 운영 화면의 「과제 내기」가 오는 자리.
 *
 * 어느 반에서 눌렀는지를 `?classId=` 로 받아 ① 의 「반」을 그 반으로 열어 둔다(2026-09-16 계획 §06 「대상 반은 반
 * 상세에서 진입한 그 반」). `?bot=` 은 봇 운영 화면이 아직 보내는 옛 이름이다 — bot == class 라 같은 값이다.
 * 여기서 걸러내지 않는 이유: 그 목록은 정본(`GET /classbot/bots?role=teacher`)이고 클라이언트가 읽는다.
 * 목록에 없는 id 면 폼이 첫 반으로 연다(없는 반을 고른 척하지 않는다).
 */
export default async function NewAssignmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { classId, bot } = await searchParams;

  return <AssignmentForm initialClassId={classId ?? bot ?? ''} />;
}
