import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertTriangle, MessageCircle, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import { KpiTrendCard } from '@/components/classbot/kpi-trend-card';
import { ParentMessagePreview } from '@/components/classbot/parent-message-preview';
import { reports, classRoster, buildParentMessage } from '@/lib/mock';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Params = Promise<{ id: string }>;

export default async function ReportDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const report = reports.find(r => r.id === id);
  if (!report) notFound();

  // 학생 개인·학부모 리포트면 대상 학생 추출
  const studentName = (() => {
    const m = report.subject.match(/(서연|민준|지우|도현|하윤|예은|윤서)/);
    return m ? m[1] : null;
  })();
  const student = studentName ? classRoster.find(s => s.name === studentName) : null;

  const hasAlerts = (report.alerts?.length ?? 0) > 0;
  const isParent = report.kind === 'parent';

  return (
    <div className="space-y-4 py-4 lg:py-6">
      <Link
        href="/teacher/reports"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        리포트 센터
      </Link>

      <PageHeader
        eyebrow={{ icon: FileText, text: report.subject }}
        title={report.title}
        description={`${report.generatedAt} · ${report.status === 'sent' ? '발송 완료' : report.status === 'approved' ? '승인됨' : report.status === 'pending-approval' ? '승인 대기' : '초안'}`}
      />

      {/* 위기 신호 */}
      {hasAlerts && (
        <section className="border-pullim-danger/30 bg-pullim-danger-bg rounded-2xl border p-4">
          <header className="mb-2 flex items-center gap-2">
            <AlertTriangle className="text-pullim-danger h-4 w-4" />
            <h3 className="text-pullim-danger text-sm font-bold">위기 신호 {report.alerts?.length}건</h3>
          </header>
          <ul className="text-pullim-slate-700 space-y-1 text-[12px] leading-relaxed">
            {report.alerts?.map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled
              aria-disabled="true"
              title="준비 중 (v2 — 1:1 상담)"
              className="bg-pullim-slate-900 hover:bg-pullim-slate-800 text-white opacity-60 cursor-not-allowed"
            >
              <MessageCircle />
              1:1 상담 시작 (v2)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              aria-disabled="true"
              title="준비 중 (v2 — Wee센터 연계)"
              className="opacity-60 cursor-not-allowed"
            >
              Wee센터 연결 (v2)
            </Button>
          </div>
        </section>
      )}

      {/* KPI */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading
          title="핵심 지표"
          description="AI 자동 추출 · 추세는 지난 주 대비"
        />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {report.kpis.map((kpi, i) => <KpiTrendCard key={i} kpi={kpi} />)}
        </ul>
      </section>

      {/* 1줄 요약 */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title="1줄 요약" description="AI 초안 — 필요하면 수정해주세요." />
        <Label htmlFor="report-summary" className="sr-only">1줄 요약 AI 초안</Label>
        <Textarea
          id="report-summary"
          defaultValue={report.summary}
          rows={3}
          className="rounded-xl text-sm leading-relaxed"
        />
      </section>

      {/* 2-col: 리포트 본문 + 학생 추세 사이드 */}
      <ContextRail
        railWidth="md"
        rail={student ? (
          <>
            {/* [13 § 3.3.2] 사이드 — 학생 7일 추세 mini chart. compact mode로 봇 CTA 자동 미노출. */}
            <WellbeingGauge studentId={student.id} compact />
            <section className="bg-pullim-slate-50 rounded-2xl p-4">
              <h4 className="text-pullim-slate-900 inline-flex items-center gap-1 text-xs font-bold">
                <MessageCircle className="h-3 w-3" />
                첨부된 1:1 면담 메모
              </h4>
              <p className="text-pullim-slate-500 mt-2 text-[11px] leading-relaxed">
                채점 허브에서 작성된 메모는 학생 개인 리포트에 자동 첨부돼요.
              </p>
            </section>
          </>
        ) : undefined}
      >
        {/* 학부모 리포트: 학부모 메시지 미리보기 */}
        {isParent && (
          <ParentMessagePreview
            initialMessage={buildParentMessage(report)}
            status={report.status}
          />
        )}
        {/* 비학부모 리포트: AI 리포트 본문 요약 */}
        {!isParent && (
          <section className="bg-card rounded-2xl border p-4">
            <SectionHeading title="리포트 본문" description="AI 초안 — 필요하면 수정해주세요." />
            <Label htmlFor="report-body" className="sr-only">리포트 본문 AI 초안</Label>
            <Textarea
              id="report-body"
              defaultValue={report.summary}
              rows={6}
              className="rounded-xl text-sm leading-relaxed"
            />
          </section>
        )}
      </ContextRail>
    </div>
  );
}
