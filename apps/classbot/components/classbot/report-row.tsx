import Link from 'next/link';
import { ChevronRight, AlertCircle, Mail, FileText, BookOpen, Users, BarChart3, Radio } from 'lucide-react';
import type { ReportSummary, ReportKind } from '@/lib/mock';
import { cn } from '@/lib/utils';

const kindMeta: Record<ReportKind, { label: string; icon: typeof FileText; color: string }> = {
  realtime:    { label: '실시간',    icon: Radio,     color: 'bg-pullim-danger' },
  'lesson-end': { label: '수업 종료', icon: FileText,  color: 'bg-pullim-blue-500' },
  student:     { label: '학생 개인', icon: BookOpen,  color: 'bg-pullim-blue-600' },
  period:      { label: '기간',     icon: BarChart3, color: 'bg-pullim-slate-700' },
  class:       { label: '학급',     icon: Users,     color: 'bg-pullim-slate-700' },
  parent:      { label: '학부모',   icon: Mail,      color: 'bg-pullim-blue-400' },
};

const statusMeta = {
  draft:               { label: '초안', color: 'bg-pullim-slate-100 text-pullim-slate-600' },
  'pending-approval':  { label: '승인 대기', color: 'bg-pullim-slate-100 text-pullim-slate-700' },
  approved:            { label: '승인됨', color: 'bg-pullim-blue-100 text-pullim-blue-700' },
  sent:                { label: '발송됨', color: 'bg-pullim-blue-50 text-pullim-blue-700' },
} as const;

/**
 * 리포트 큐 행.
 * spec 13 § 3.3.1.
 */
export function ReportRow({ report }: { report: ReportSummary }) {
  const k = kindMeta[report.kind];
  const Icon = k.icon;
  const s = statusMeta[report.status];
  const hasAlerts = report.alerts && report.alerts.length > 0;

  return (
    <Link
      href={`/teacher/reports/${report.id}`}
      className="bg-pullim-slate-50/50 hover:bg-pullim-slate-50 group block rounded-xl p-3 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white', k.color)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-micro">
            <span className={cn('rounded-full px-1.5 py-0.5 font-bold', s.color)}>{s.label}</span>
            <span className="text-pullim-slate-400 font-bold">{k.label}</span>
            {hasAlerts && (
              <span className="text-pullim-danger inline-flex items-center gap-0.5 font-bold">
                <AlertCircle className="h-2.5 w-2.5" />
                위기 신호 {report.alerts?.length}
              </span>
            )}
          </div>
          <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{report.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-2xs">
            {report.subject} · {report.generatedAt}
          </div>
        </div>
        <ChevronRight className="text-pullim-slate-400 mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
