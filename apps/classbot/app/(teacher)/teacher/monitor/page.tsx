import { Gauge } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { BotNote } from '@/components/classbot/bot-note';
import { MonitorConsole } from './monitor-console';

/** Next 16 `searchParams` — 같은 키가 여러 번 오면 배열이다. 그때는 첫 반으로 떨어진다. */
type SearchParams = Promise<{ class?: string | string[] }>;

/**
 * 학급 관제소 (SCR-C-29 / FR-C-29) — 반 하나를 골라 **위험 신호 집계**를 학생 줄로 본다. 완성 설계 § 6.2 · § 7 ·
 * `proc/spec/05 § 3`. 계획 PR 7.
 *
 * 종전 목 관제소(`lib/mock/classbot-monitoring` 의 20명 스냅샷 · 도달·목표 대비 깊이·지름길·이탈 표)는 은퇴했다 —
 * 그 열들은 서버에 원천이 없다. 지금 담는 것은 **정본이 주는 것뿐**: 명단(`GET /classes/:id/members`)과 신호 집계
 * (`GET /classes/:id/signals`). 줄을 누르면 반 상세 「대화」 탭으로 그 학생을 고른 채 들어간다 — 원문과 확인은 거기서.
 *
 * `?class=` 로 반을 미리 고를 수 있다(교사 홈·운영 화면이 실어 보내는 날을 위해 열어 둔다 · 모르는 값은 첫 반).
 * 본문은 전부 클라이언트에서 읽는다 — 신원이 OS 쿠키에 매인 데이터다.
 *
 * 담지 않는 것: 감정·집중도·체류시간(지표 타당도 · 학생 수용도), 총량 사용 지표(대화 수 합계 — 노이즈). 종전과 같다.
 */
export default async function TeacherMonitorPage({ searchParams }: { searchParams: SearchParams }) {
  const { class: rawClass } = await searchParams;
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Gauge, text: '학급 관제소' },
        title: '반의 위험 신호',
        description: '반을 고르면 학생마다 어떤 신호가 몇 번 잡혔는지, 아직 확인 안 한 것이 몇 건인지 보여요.',
      }}
    >
      <MonitorConsole initialClassId={typeof rawClass === 'string' && rawClass.length > 0 ? rawClass : null} />

      <BotNote>
        이 화면은 <b>봇 대화에서 규칙으로 잡은 신호</b>만 봐요 — 답 구하기 · 부적절한 말 · 위기 신호 · 반복 시도 ·
        무의미 입력, 그리고 명단의 최근 활동. 세기 4 이상 위기 신호는 서버가 학생에게 곁에 있다는 한마디를 먼저 보내요.
        감정·집중도·체류시간은 재는 값이 못 미덥고 학생이 받아들이기 어려워서 담지 않았어요.
      </BotNote>
    </TeacherPageShell>
  );
}
