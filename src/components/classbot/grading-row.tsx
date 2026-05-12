import Link from 'next/link';
import { AlertCircle, ChevronRight, FileText, Calculator, MessageSquare } from 'lucide-react';
import type { GradingItem } from '@/lib/mock';
import { cn } from '@/lib/utils';

const typeMeta = {
  essay:   { label: '서술형', icon: FileText },
  short:   { label: '단답',   icon: MessageSquare },
  numeric: { label: '수치',   icon: Calculator },
} as const;

const statusMeta = {
  queue:      { label: '대기',     color: 'bg-pullim-slate-100 text-pullim-slate-600' },
  reviewing:  { label: '검토중',   color: 'bg-pullim-blue-100 text-pullim-blue-700' },
  approved:   { label: '승인됨',   color: 'bg-pullim-blue-50 text-pullim-blue-700' },
  overridden: { label: '오버라이드', color: 'bg-pullim-slate-100 text-pullim-slate-700' },
} as const;

/**
 * 채점 큐 한 행 — AI 신뢰도 + 위기 인디케이터 포함.
 * spec 11 § 3.3.1.
 */
export function GradingRow({ item }: { item: GradingItem }) {
  const t = typeMeta[item.type];
  const TypeIcon = t.icon;
  const status = statusMeta[item.status];
  const isLowConfidence = item.aiConfidence < 70;
  const isCrisis = item.responsePreview.length < 25 || /모르겠|어려워|힘들/.test(item.responsePreview);
  const pct = (item.draftScore / item.maxScore) * 100;

  return (
    <Link
      href={`/teacher/grading/${item.id}`}
      className="bg-pullim-slate-50/50 hover:bg-pullim-slate-50 group block rounded-xl p-3 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* 아바타 */}
        <div className="bg-pullim-blue-100 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
          {item.studentName[0]}
        </div>

        <div className="min-w-0 flex-1">
          {/* 1행: 학생명 + 상태 + 위기 신호 */}
          <div className="flex items-center gap-2">
            <span className="text-pullim-slate-900 truncate text-sm font-bold">{item.studentName}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', status.color)}>
              {status.label}
            </span>
            {isCrisis && (
              <span title="응답 빈약·감정 키워드" className="text-pullim-danger inline-flex items-center gap-0.5 text-[10px] font-bold">
                <AlertCircle className="h-3 w-3" />
                신경 쓸 신호
              </span>
            )}
            <ChevronRight className="text-pullim-slate-400 ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* 2행: 과제명 + 타입 */}
          <div className="text-pullim-slate-600 mt-1 flex items-center gap-1.5 text-[11px]">
            <TypeIcon className="h-3 w-3 shrink-0" />
            <span>{t.label}</span>
            <span className="text-pullim-slate-300">·</span>
            <span className="truncate">{item.assignmentTitle}</span>
            <span className="text-pullim-slate-300">·</span>
            <span>{item.submittedAt}</span>
          </div>

          {/* 3행: AI 초안 점수 + 신뢰도 바 */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-pullim-slate-400 text-[10px] font-semibold uppercase tracking-wider">AI 초안</span>
              <span className="font-mono text-sm font-bold">
                <span className={cn(pct >= 80 ? 'text-pullim-blue-700' : pct >= 60 ? 'text-pullim-blue-500' : 'text-pullim-slate-500')}>
                  {item.draftScore}
                </span>
                <span className="text-pullim-slate-400">/{item.maxScore}</span>
              </span>
            </div>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="text-pullim-slate-400 text-[10px]">신뢰도</span>
              <div className="bg-pullim-slate-200 h-1 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full', isLowConfidence ? 'bg-pullim-slate-400' : 'bg-pullim-blue-500')}
                  style={{ width: `${item.aiConfidence}%` }}
                />
              </div>
              <span className={cn('font-mono text-[10px] font-bold', isLowConfidence ? 'text-pullim-slate-500' : 'text-pullim-slate-500')}>
                {item.aiConfidence}%
              </span>
              <span className="text-pullim-slate-300 font-mono text-[10px]">·</span>
              <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded px-1 font-mono text-[9px] font-bold">
                {item.tier}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
