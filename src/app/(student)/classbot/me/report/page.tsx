import Link from 'next/link';
import { ArrowLeft, ArrowRight, Heart, MessageCircle, Sparkles, Target } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import { KpiTrendCard } from '@/components/classbot/kpi-trend-card';
import { currentPersona, classRoster, reports } from '@/lib/mock';

export default function MyReportPage() {
  const me = classRoster.find(s => s.name === currentPersona.name) ?? classRoster[0];

  // 학부모 리포트가 있으면 그 KPI를 1인칭 톤으로 재가공
  const parentReport = reports.find(r => r.kind === 'parent') ?? reports[0];

  return (
    <div className="space-y-4">
      <Link
        href="/classbot/wellness"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        웰빙 허브
      </Link>

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '주간 리포트' }}
        title="이번 주의 나"
        description="봇이 본 나의 한 주 — 1인칭 톤"
      />

      <WellbeingGauge studentId={me.id} />

      {/* KPI */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="이번 주 지표" description="지난 주 대비" />
        <ul className="grid grid-cols-2 gap-2">
          {parentReport.kpis.map((kpi, i) => <KpiTrendCard key={i} kpi={kpi} />)}
        </ul>
      </section>

      {/* 잘한 점 / 신경 쓸 점 */}
      <section className="space-y-2">
        <div className="bg-pullim-success/10 rounded-2xl p-4">
          <div className="text-pullim-success inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
            <Heart className="h-3 w-3" />
            오늘 잘한 점
          </div>
          <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed">
            힘들 때 봇에게 먼저 물어본 점 — 그게 진짜 용기야. 이번 주 정답률도 8%p 올라갔어.
          </p>
        </div>

        <div className="bg-pullim-blue-50 rounded-2xl p-4">
          <div className="text-pullim-blue-700 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
            <Target className="h-3 w-3" />
            다음에 신경 쓸 점
          </div>
          <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed">
            부호 변화 표 단계에서 종종 막혔어. 같은 패턴 5문항이 자동으로 처방돼 있어.
          </p>
        </div>
      </section>

      {/* 1:1 메시지 — 면담 메모가 있을 때만 */}
      <section className="bg-pullim-slate-900 text-white rounded-2xl p-4">
        <h3 className="text-pullim-lemon inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase">
          <MessageCircle className="h-3 w-3" />
          선생님이 한 마디
        </h3>
        <p className="text-pullim-slate-200 mt-2 text-sm leading-relaxed">
          서연 학생, 이번 주 모든 과제 끝까지 풀어준 게 정말 보기 좋았어요. 다음 주도 천천히 같이 가요.
        </p>
        <div className="text-pullim-slate-400 mt-3 text-[10px] font-mono">
          — 수학이 형 · 오늘 18:00
        </div>
      </section>

      {/* 다음 주 도전 */}
      <Link
        href="/classbot/assignment"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 flex items-center gap-3 rounded-2xl p-4 text-white transition-colors"
      >
        <span className="bg-white/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg">
          🎯
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">다음 주 도전</div>
          <div className="text-pullim-blue-100 text-[11px]">봇이 처방한 과제로 시작해봐요</div>
        </div>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <FlywheelNote>
        매일의 작은 기록이 다음 주 봇 처방의 정확도를 만들어요.
      </FlywheelNote>
    </div>
  );
}
