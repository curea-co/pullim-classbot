'use client';

import { ClipboardList, Heart, Sparkles, Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import { KpiTrendCard } from '@/components/classbot/kpi-trend-card';
import { reports } from '@/lib/mock';
import { useStudentMe } from '@/lib/current-user';

export default function MyReportPage() {
  // 종전에는 서버 컴포넌트라 상수(`DEMO_FALLBACK_USER_ID`)를 넘겼다 — 누가 열어도 데모
  // 「서연」의 주간 리포트였다. 세션은 client 에만 있으므로 이 화면을 client 로 내려
  // **실제 신원**을 본다.
  const me = useStudentMe();
  // 웰빙 게이지가 읽는 것은 **목 웰빙 기록**이고 키는 roster id 다. 실계정에는 그 행이 없어
  // 게이지가 「웰빙 데이터가 아직 없어요」로 선다.
  const demoKey = me.demo?.id ?? '';

  // 학부모 리포트가 있으면 그 KPI를 1인칭 톤으로 재가공
  const parentReport = reports.find(r => r.kind === 'parent') ?? reports[0];

  const rail = (
    <>
      {/* KPI */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="이번 주 지표" description="지난 주 대비" />
        <ul className="grid grid-cols-2 gap-2">
          {parentReport.kpis.map((kpi, i) => <KpiTrendCard key={i} kpi={kpi} />)}
        </ul>
      </section>

      {/*
        「선생님이 한 마디」 카드를 걷었다. 그 자리는 선생님이 적은 면담 메모를 그대로 보여
        주는 곳인데, 메모를 담아 두는 곳도 읽어 오는 문도 없어 **글도 서명도 지어낸 것**이었다
        ('서연 학생, …' + '— 김보람 선생님 · 오늘 18:00'). 로그인한 학생을 남의 이름으로 부르고,
        있지도 않은 선생님이 오늘 18:00 에 글을 남긴 것처럼 읽혔다.
        정본이 면담 메모를 낼 때 같은 자리에 되살린다 — 그때 쓸 것은 글쓴이·시각이 함께 오는 값이다.
      */}

      {/* 다음 주 도전 */}
      <Link
        href="/classbot/assignment"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 flex items-center gap-3 rounded-2xl p-4 text-white transition-colors"
      >
        <span className="bg-white/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <ClipboardList className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">다음 주 도전</div>
          <div className="text-pullim-blue-100 text-2xs">봇이 처방한 과제로 시작해봐요</div>
        </div>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </>
  );

  return (
    <div className="space-y-4">
      <BackLink href="/classbot/wellness">웰빙 허브</BackLink>

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '주간 리포트' }}
        title="이번 주의 나"
      />

      {/* [13 § 3.3.5·9.2] 본인 리포트 — 봇 인사이트 텍스트 유지 + CTA만 "다음 주 도전"(`/classbot/assignment`)으로 분기 */}
      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* MAIN: WellbeingGauge + 잘한점/신경쓸점 pair */}
        <WellbeingGauge studentId={demoKey} audience="student-self" />

        {/* 잘한 점 / 신경 쓸 점 — 색상 유지: blue-50/blue-700, slate-50/slate-700 */}
        <section className="space-y-2">
          <div className="bg-pullim-blue-50 rounded-2xl p-4">
            <div className="text-pullim-blue-700 inline-flex items-center gap-1 text-2xs font-bold tracking-wider uppercase">
              <Heart className="h-3 w-3" />
              오늘 잘한 점
            </div>
            <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed">
              힘들 때 봇에게 먼저 물어본 점 — 그게 진짜 용기야. 이번 주 정답률도 8%p 올라갔어.
            </p>
          </div>

          <div className="bg-pullim-slate-50 rounded-2xl p-4">
            <div className="text-pullim-slate-700 inline-flex items-center gap-1 text-2xs font-bold tracking-wider uppercase">
              <Target className="h-3 w-3" />
              다음에 신경 쓸 점
            </div>
            <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed">
              부호 변화 표 단계에서 종종 막혔어. 같은 패턴 5문항이 자동으로 처방돼 있어.
            </p>
          </div>
        </section>
      </ContextRail>
    </div>
  );
}
