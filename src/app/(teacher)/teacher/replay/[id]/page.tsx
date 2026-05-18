import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles, CheckCircle2, Edit3, Send } from 'lucide-react';
import { getReplayById, getTeacherReplays, classBots, type ReplayStatus } from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return getTeacherReplays().map(r => ({ id: r.id }));
}

const STATUS_META: Record<ReplayStatus, { label: string; tone: string; icon: typeof Clock; hint: string }> = {
  processing: {
    label: '처리 중',
    tone: 'bg-pullim-slate-100 text-pullim-slate-700 border-pullim-slate-200',
    icon: Sparkles,
    hint: 'AI가 STT·세그먼트·핵심 메시지를 추출하고 있어요. 보통 5~10분 소요.',
  },
  review: {
    label: '검수 대기',
    tone: 'bg-pullim-lemon text-pullim-lemon-ink border-pullim-lemon',
    icon: Clock,
    hint: '핵심 메시지를 검토하고 승인하면 학생에게 발송돼요.',
  },
  sent: {
    label: '발송 완료',
    tone: 'bg-pullim-blue-100 text-pullim-blue-700 border-pullim-blue-200',
    icon: CheckCircle2,
    hint: '학생 리플레이 탭에 노출돼요.',
  },
};

export default async function TeacherReplayDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const replay = getReplayById(id);
  if (!replay) notFound();

  const bot = classBots.find(b => b.id === replay.botId);
  const meta = STATUS_META[replay.status];
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      <Link
        href="/teacher/replay"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        리플레이 목록
      </Link>

      <PageHeader
        eyebrow={{ icon: Sparkles, text: replay.botName }}
        title={replay.title}
        description={`${replay.chapter} · ${replay.startedAt}~${replay.endedAt} · ${replay.participantCount}명 참여`}
      />

      <section className={cn('rounded-2xl border p-4', meta.tone)}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-bold">{meta.label}</span>
        </div>
        <p className="mt-1 text-xs">{meta.hint}</p>
      </section>

      {replay.status === 'processing' && (
        <section className="bg-card rounded-2xl border p-5 text-center">
          <Sparkles className="text-pullim-blue-400 mx-auto h-8 w-8 animate-pulse" />
          <p className="text-pullim-slate-700 mt-3 text-sm font-bold">AI 처리 중</p>
          <p className="text-pullim-slate-500 mt-1 text-xs">
            처리 완료 시 검수 대기 상태로 자동 전환돼요.
          </p>
        </section>
      )}

      {replay.status !== 'processing' && (
        <>
          <section className="bg-card rounded-2xl border p-4">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="text-pullim-slate-900 text-sm font-bold">이 수업 핵심 3개</h2>
              <span className="text-pullim-slate-400 text-[10px]">AI 추출 — 검수 단계에서 편집 가능</span>
            </header>
            <ol className="space-y-2">
              {replay.keyTakeaways.map((t, i) => (
                <li key={i} className="bg-pullim-slate-50 flex items-start gap-2 rounded-lg p-3 text-sm">
                  <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-pullim-slate-700">{t}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-card rounded-2xl border p-4">
            <header className="mb-2">
              <h2 className="text-pullim-slate-900 text-sm font-bold">세그먼트 ({replay.segments.length}개)</h2>
            </header>
            <ul className="space-y-1.5">
              {replay.segments.slice(0, 6).map((s, i) => (
                <li key={i} className="text-pullim-slate-600 flex items-center gap-2 text-xs">
                  <span className="text-pullim-slate-400 font-mono">{s.at}</span>
                  <span className="text-pullim-slate-500 text-[10px] uppercase font-bold">{s.type}</span>
                  <span className="truncate">{s.label}</span>
                </li>
              ))}
              {replay.segments.length > 6 && (
                <li className="text-pullim-slate-400 text-[11px]">… 외 {replay.segments.length - 6}개</li>
              )}
            </ul>
          </section>
        </>
      )}

      {replay.status === 'review' && (
        <section className="bg-pullim-slate-50 rounded-2xl border border-dashed p-4">
          <header className="mb-2">
            <h2 className="text-pullim-slate-700 text-sm font-bold">검수 액션</h2>
            <p className="text-pullim-slate-500 text-[11px]">핵심 메시지 편집 + 승인 → 학생에게 발송</p>
          </header>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              title="다음 사이클에서 활성화 (B9 — proc/plan/2026-05-18_*.md)"
              className="bg-white text-pullim-slate-600 border-pullim-slate-200 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold opacity-60 cursor-not-allowed"
            >
              <Edit3 className="h-3.5 w-3.5" />
              핵심 메시지 편집
            </button>
            <button
              type="button"
              disabled
              title="다음 사이클에서 활성화 (B9 — proc/plan/2026-05-18_*.md)"
              className="bg-pullim-blue-600 text-white inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold opacity-60 cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              승인 → 학생 발송
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
