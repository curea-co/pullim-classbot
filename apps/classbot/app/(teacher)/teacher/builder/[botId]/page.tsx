import { BotEditWorkspace } from './edit-workspace';

type Params = Promise<{ botId: string }>;

/**
 * 봇 수정 — 봇 관리·운영 화면의 「수정하기」와 만든 뒤 화면의 「고치기」가 오는 자리.
 *
 * 새 봇을 만드는 자리(`/teacher/builder`)의 **한 칸 아래**에 둔다. 여기서 하는 일이
 * 빌더가 하는 일과 같아서다 — 과목·학년·이름·말투·수업 자료·답 범위·가르치는 법.
 * 운영 규칙(안전 등급 시간대 · 이탈 대응)은 봇 관리(`/teacher/bots/[botId]`) 몫이라
 * 이 화면이 건드리지 않는다.
 *
 * **서버에서는 아무것도 읽지 않는다.** 봇은 신원에 매인 자원이라(`GET /classbot/me/bots` — 내가 owner 인
 * 것만) OS 쿠키를 든 브라우저에서 읽어야 하고, 여기서 미리 그려 두면 캐시된 남의 봇이 보일 수 있다.
 * 그래서 이 파일은 `params` 에서 봇 id 만 꺼내 넘기는 얇은 껍데기이고, 「없는 봇」 판정도
 * `notFound()` 가 아니라 클라이언트가 한다(`edit-workspace.tsx`) — 정본이 남의 봇을 404 로 가르므로
 * 서버가 미리 단정할 근거가 없다.
 */
export default async function BotEditPage({ params }: { params: Params }) {
  const { botId } = await params;

  return <BotEditWorkspace botId={botId} />;
}
