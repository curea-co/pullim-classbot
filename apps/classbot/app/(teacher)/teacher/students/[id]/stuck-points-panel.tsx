import { HelpCircle } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import type { StuckPoint } from '@/lib/mock/classbot-student-report';

/**
 * 막힌 지점 — 「이 학생이 어디서 걸렸나」 (spec 11 § 3.3.3).
 *
 * 채점 허브에서 학생을 눌러 들어오면 답해야 하는 질문이 셋이다.
 *   어떤 봇과(헤더) · 어떤 대화를 했고(대화 기록 뷰어) · **어디서 막혔나(이 패널)**.
 * 앞 둘은 이미 있었고 이 패널만 없었다.
 *
 * 원천은 `MonitoredStudent.stuckConcepts` 하나뿐 — 학급 「다시 가르칠 개념」이 읽는 값과 같다.
 * 질문·되묻기 문구는 이 패널이 만들지 않는다. `buildStuckPoints` 가 대화 기록에서 그대로 뽑는다.
 * 그래서 여기 뜬 말은 아래 대화 기록을 열면 같은 시각에 그대로 있다.
 *
 * 그 「대화 기록」은 아직 **실제 로그가 아니라 mock** 이다 — `buildTranscript()` 가 `stuckConcepts`
 * 로 합성한 것이다. BE 가 대화 기록을 내려주기 시작하면 그 자리만 갈아 끼우면 된다.
 */
export function StuckPointsPanel({
  stuckPoints,
  studentName,
  botName,
}: {
  stuckPoints: StuckPoint[];
  studentName: string;
  botName: string;
}) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={`막힌 지점 ${stuckPoints.length}개`}
        description={`${studentName} 학생이 ${botName}과 대화하다 걸린 곳이에요. 아래 대화 기록의 그 턴을 그대로 옮겼어요.`}
      />

      {stuckPoints.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="이 학생이 막힌 개념은 기록에 없어요"
          description="대화에서 되짚어야 할 개념이 잡히면 여기에 쌓여요."
        />
      ) : (
        <ol className="space-y-2.5">
          {stuckPoints.map(point => (
            <li key={point.conceptId} className="bg-pullim-slate-50 rounded-xl p-3">
              <div className="flex items-baseline gap-2">
                <HelpCircle className="text-pullim-slate-400 h-3.5 w-3.5 shrink-0 translate-y-0.5" aria-hidden />
                <span className="text-pullim-slate-900 min-w-0 text-sm font-bold">{point.label}</span>
                {point.at && (
                  <span className="text-pullim-slate-400 ml-auto shrink-0 font-mono text-micro">{point.at}</span>
                )}
              </div>

              {point.ask && (
                <p className="text-pullim-slate-700 mt-1.5 text-2xs leading-relaxed">
                  <b className="text-pullim-slate-500">{studentName}</b> · {point.ask}
                </p>
              )}
              {point.probe && (
                <p className="border-pullim-blue-200 text-pullim-slate-600 mt-1.5 border-l-2 bg-white px-2.5 py-1.5 text-2xs leading-relaxed">
                  <b className="text-pullim-slate-500">{botName}</b> · {point.probe}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        여기 뜬 개념은 학급 <b className="text-pullim-slate-700">「다시 가르칠 개념」</b>이 세는 값과 같아요.
        한 학생에게서 보이는 것과 학급에서 보이는 것이 어긋나지 않게 같은 곳에서 읽어요.
      </p>
    </section>
  );
}
