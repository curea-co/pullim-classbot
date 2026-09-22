import { Clock, Target, AlertCircle, Sparkles } from 'lucide-react';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
import { BotNote } from '@/components/classbot/bot-note';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { cn } from '@/lib/utils';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

/**
 * 배지 색은 `assignmentModeBadge` 가 진실원이다 — 목록과 상세가 갈리지 않게.
 * 여기서 더하는 것은 `tone`(이 화면에서만 쓰는 한마디)뿐이다.
 */
export const modeMeta = {
  'practice':       { ...assignmentModeBadge.practice,          color: assignmentModeBadge.practice.bg,          icon: Target,      tone: '한 번 해보자' },
  'exam':           { ...assignmentModeBadge.exam,              color: assignmentModeBadge.exam.bg,              icon: AlertCircle, tone: '집중하는 시간' },
  'wrong-conquest': { ...assignmentModeBadge['wrong-conquest'], color: assignmentModeBadge['wrong-conquest'].bg, icon: Sparkles,    tone: '이번엔 잡아내자' },
} as const;

const sourceMeta = {
  'teacher-assigned': '선생님 과제',
  'bot-prescribed':   '봇 처방',
  'self':             '내가 추가',
} as const;

/**
 * 과제 개요 헤더 — 발송자·모드·D-day·메타.
 * spec 12 § 3.3.2.
 */
export function AssignmentOverviewHeader({ assignment: a }: { assignment: AssignmentReadRow }) {
  const m = modeMeta[a.mode];
  const ModeIcon = m.icon;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <div className={cn('h-1 w-full', m.color)} aria-hidden />
      <div className="p-4">
        <div className="flex items-center gap-2 text-2xs">
          <span className="text-pullim-slate-500 font-bold">
            <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            {/*
              라벨 뒤에 동사를 붙이지 않는다. `assignedAtLabel` 은 이 화면 말고 학생 목록
              (`assignment/page.tsx:277`)·교사 목록(`teacher/classbot/page.tsx:446`)에서
              **그대로** 찍히므로, 문장을 완성하는 쪽은 라벨이지 여기가 아니다.
              종전엔 여기만 ` 발사` 를 덧붙여, 라벨이 「방금 냈어요」인 새 과제에서
              「방금 냈어요 발사」로 겹쳤다. 주체는 바로 앞 `assignedBy` 가 말한다(14 § 8.1.2).

              정본 행에는 교사 표시명이 없어 `assignedBy` 가 빈 문자열로 온다(`use-assignment-reads.ts` 머리주석) —
              그때 「 · 날짜」로 점만 남지 않게, 있는 것만 점으로 잇는다.
            */}
            {[a.assignedBy, a.assignedAtLabel].filter(Boolean).join(' · ')}
          </span>
          <span className="text-pullim-slate-300">·</span>
          <span className="text-pullim-slate-500">{sourceMeta[a.source]}</span>
          <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold text-white', m.color)}>
            <ModeIcon className="h-2.5 w-2.5" />
            {m.label}
          </span>
        </div>

        <h1 className="text-pullim-slate-900 mt-2 text-xl font-bold tracking-tight">{a.title}</h1>
        <p className="text-pullim-slate-500 mt-1 text-xs">{a.scope}</p>

        <KpiStatBar cols={3}>
          <KpiStat label="문항" value={`${a.questionCount}문항`} />
          <KpiStat label="난이도" value={a.difficulty} />
          <KpiStat label="D-day" value={a.dDay} tone={isUrgent ? 'alert' : 'default'} />
        </KpiStatBar>

        <p className="text-pullim-slate-500 mt-3 text-2xs">
          {m.tone} · 마감 {a.dueLabel}
        </p>

        {a.reasonHint && (
          <BotNote>{a.reasonHint}</BotNote>
        )}
      </div>
    </section>
  );
}

