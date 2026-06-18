'use client';

import { use, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { getReplayById, classBots, type Replay, type ReplayStatus } from '@/lib/mock';
import { useReplayStore } from '@/lib/store/replay';
import { PageHeader } from '@/components/shell/page-header';
import { ReplayReviewActions } from '@/components/classbot/replay-review-actions';
import { cn } from '@/lib/utils';
import { ContextRail } from '@/components/shell/context-rail';
import { BotNote } from '@/components/classbot/bot-note';

type Params = { id: string };

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

export default function TeacherReplayDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const overrides = useReplayStore(s => s.overrides);
  const created = useReplayStore(s => s.created);

  const data = useMemo(() => {
    // 1) seed에 있으면 override 적용
    const seed = getReplayById(id);
    if (seed) {
      const o = overrides[id];
      return {
        kind: 'seed' as const,
        status: o?.status ?? seed.status,
        title: seed.title,
        chapter: seed.chapter,
        botName: seed.botName,
        startedAt: seed.startedAt,
        endedAt: seed.endedAt,
        participantCount: seed.participantCount,
        keyTakeaways: o?.keyTakeaways ?? seed.keyTakeaways,
        segments: seed.segments,
      };
    }
    // 2) created (라이브 종료로 신규 생성)에서 찾기
    const c = created.find(r => r.id === id);
    if (c) {
      const o = overrides[id];
      return {
        kind: 'created' as const,
        status: o?.status ?? c.status,
        title: c.title,
        chapter: c.chapter,
        botName: c.botName,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        participantCount: c.participantCount,
        keyTakeaways: o?.keyTakeaways ?? c.keyTakeaways,
        segments: [],
      };
    }
    return null;
  }, [id, overrides, created]);

  if (!data) {
    // 라이브 시작 후 페이지를 새로 받았지만 store가 아직 hydrate 전인 경우 잠깐 보일 수 있음
    return (
      <div className="space-y-4">
        <Link href="/teacher/replay" className="text-pullim-slate-500 inline-flex items-center gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> 리플레이 목록
        </Link>
        <section className="bg-card rounded-2xl border p-6 text-center text-sm text-pullim-slate-500">
          리플레이를 찾을 수 없어요. 라이브 종료 직후라면 잠시 후 다시 시도해주세요.
        </section>
      </div>
    );
  }

  const meta = STATUS_META[data.status];
  const Icon = meta.icon;
  // ReplayReviewActions에 넘길 최소 형태
  const replayForActions = {
    id,
    status: data.status,
    title: data.title,
    keyTakeaways: data.keyTakeaways,
  } as unknown as Replay;

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
        eyebrow={{ icon: Sparkles, text: data.botName }}
        title={data.title}
        description={`${data.chapter} · ${data.startedAt}~${data.endedAt} · ${data.participantCount}명 참여`}
      />

      <section className={cn('rounded-2xl border p-4', meta.tone)}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-bold">{meta.label}</span>
        </div>
        <p className="mt-1 text-xs">{meta.hint}</p>
      </section>

      {data.status === 'processing' && (
        <section className="bg-card rounded-2xl border p-5 text-center">
          <Sparkles className="text-pullim-blue-400 mx-auto h-8 w-8 animate-pulse" />
          <p className="text-pullim-slate-700 mt-3 text-sm font-bold">AI 처리 중</p>
          <BotNote icon={Sparkles}>처리 완료 시 검수 대기 상태로 자동 전환돼요.</BotNote>
        </section>
      )}

      {data.status !== 'processing' && (
        <ContextRail
          railWidth="sm"
          rail={data.segments.length > 0 ? (
            <section className="bg-card rounded-2xl border p-4">
              <header className="mb-2">
                <h2 className="text-pullim-slate-900 text-sm font-bold">세그먼트 ({data.segments.length}개)</h2>
              </header>
              <ul className="space-y-1.5">
                {data.segments.slice(0, 6).map((s, i) => (
                  <li key={i} className="text-pullim-slate-600 flex items-center gap-2 text-xs">
                    <span className="text-pullim-slate-400 font-mono">{s.at}</span>
                    <span className="text-pullim-slate-500 text-[10px] uppercase font-bold">{s.type}</span>
                    <span className="truncate">{s.label}</span>
                  </li>
                ))}
                {data.segments.length > 6 && (
                  <li className="text-pullim-slate-400 text-[11px]">… 외 {data.segments.length - 6}개</li>
                )}
              </ul>
            </section>
          ) : undefined}
        >
          <section className="bg-card rounded-2xl border p-4">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="text-pullim-slate-900 text-sm font-bold">이 수업 핵심 3개</h2>
              <span className="text-pullim-slate-400 text-[10px]">AI 추출 — 검수 단계에서 편집 가능</span>
            </header>
            <ol className="space-y-2">
              {data.keyTakeaways.map((t, i) => (
                <li key={i} className="bg-pullim-slate-50 flex items-start gap-2 rounded-lg p-3 text-sm">
                  <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-pullim-slate-700">{t}</span>
                </li>
              ))}
            </ol>
          </section>
        </ContextRail>
      )}

      <ReplayReviewActions replay={replayForActions} />
    </div>
  );
}
