import { Gauge } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { ReteachConcepts } from '@/components/classbot/reteach-concepts';
import { BotNote } from '@/components/classbot/bot-note';
import {
  monitoredClass, monitoredRoster, monitoringSummary, reteachConcepts,
} from '@/lib/mock/classbot-monitoring';
import { MonitorBoard } from './monitor-board';

/**
 * 학급 관제소 (SCR-C-29 / FR-C-29) — 한 학급을 자세히 보는 화면.
 *
 * 교사 홈과의 경계:
 *   - 홈(/teacher) = 오늘 먼저 볼 사람 + 나를 기다리는 일. 예외만 짧게.
 *   - 여기        = 학급 전체 진단. 거르개 + 학생 20줄 + 다시 가르칠 개념.
 *
 * 순서는 **거르개 → 그 결과 → 학급 처방**이다.
 * 상단 요약 카드는 명단을 거르는 손잡이다 — 누르면 아래 명단이 바뀐다.
 * 그래서 카드와 명단 사이에는 아무것도 끼우지 않는다. 사이에 다른 블록이 있으면
 * 누른 손잡이와 바뀐 결과가 화면에서 떨어져 무엇이 달라졌는지 읽히지 않는다.
 * 학급 단위 「다시 가르칠 개념」은 명단을 다 훑고 나서 「그래서 다음 시간에 뭘 하지」로
 * 넘어가는 자리라 화면 맨 아래에 둔다.
 *
 * 담지 않는 것: 감정·집중도·체류시간. 지표 타당도가 약하고 학생 수용도 조사에서 선을 넘는다.
 * 총량 사용 지표(오늘 대화 수 같은 합계)도 담지 않는다 — 교사 워크숍에서 노이즈로 분류됐다.
 */
export default function TeacherMonitorPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      spacing="space-y-5"
      header={{
        eyebrow: { icon: Gauge, text: '학급 관제소' },
        title: `${monitoredClass.classroomLabel} 지금 상태`,
        description: `${monitoredClass.botName} · ${monitoredClass.unit} · ${monitoredClass.updatedAtLabel} · 학생 ${monitoringSummary.total}명`,
      }}
    >
      {/* 학급·봇·단원·기준 시각은 위 헤더가 이미 달고 있다 — 명단에서 한 번 더 달지 않는다. */}
      <MonitorBoard students={monitoredRoster} />

      {/* 학급 단위 — 명단을 다 보고 나서 「다음 시간에 무엇을 다시 가르칠지」 */}
      <ReteachConcepts concepts={reteachConcepts} totalStudents={monitoringSummary.total} />

      <BotNote>
        이 화면은 <b>도달 상태 · 사고 수준 · 지름길 · 이탈 · 마지막 활동</b>만 봐요.
        감정·집중도·체류시간은 재는 값이 못 미덥고 학생이 받아들이기 어려워서 담지 않았어요.
      </BotNote>
    </TeacherPageShell>
  );
}
