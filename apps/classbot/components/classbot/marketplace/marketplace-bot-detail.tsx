'use client';

import Link from 'next/link';
import {
  ArrowRight,
  KeyRound,
  MessageCircle,
  Sparkles,
  Store,
  UserRound,
  Users,
} from 'lucide-react';

import { AlertCard } from '@/components/classbot/alert-card';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceBot } from '@/hooks/api/marketplace';
import { isNotFound } from '@/lib/api/classbot-client';
import { cn } from '@/lib/utils';
import { formatPublishedAt } from './format';
import { SelfAddButton } from './self-add-button';

/** 마켓 봇 상세 — 학생은 담고, 교사는 반에 활용하는 길을 본다. */
export function MarketplaceBotDetail({
  botId,
  backHref,
  backLabel,
  viewer,
  className,
}: {
  botId: string;
  backHref: string;
  backLabel: string;
  viewer: 'student' | 'teacher';
  className?: string;
}) {
  const query = useMarketplaceBot(botId);
  const bot = query.data?.bot ?? null;
  const isUnavailable = isNotFound(query.error);
  const unavailableDescription =
    viewer === 'student'
      ? '공개가 내려갔거나 아직 공개되지 않았어요. 이미 담아 둔 봇이라면 그대로 쓸 수 있어요.'
      : '지금은 마켓에서 볼 수 없는 봇이에요. 공개된 공식 봇 목록으로 돌아가 다른 봇을 둘러보세요.';
  const publishedLabel = formatPublishedAt(bot?.publishedAt);

  return (
    <div className={cn('space-y-5', className)}>
      <div className="space-y-2">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <PageHeader
          eyebrow={{ icon: Store, text: '봇 소개' }}
          title={bot?.name ?? '봇 상세'}
          description={
            bot?.blurb ?? (query.isError ? '지금은 이 봇을 볼 수 없어요.' : '마켓에 공개된 봇이에요.')
          }
        />
      </div>

      {isUnavailable ? (
        <div data-testid="marketplace-detail-unavailable">
          <EmptyState
            icon={Store}
            title="지금은 볼 수 없는 봇이에요"
            description={unavailableDescription}
          />
        </div>
      ) : query.isError ? (
        <AlertCard tone="danger" icon={Store} title="봇을 불러오지 못했어요">
          <p className="text-pullim-slate-700 text-sm" data-testid="marketplace-detail-error">
            {query.error.message}
          </p>
        </AlertCard>
      ) : query.isPending || !bot ? (
        <div className="space-y-5" aria-hidden>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="bg-card rounded-2xl border p-5" data-testid="marketplace-detail">
            <div className="flex items-start gap-4">
              <BotAvatar subject={bot.subject} name={bot.name} size="xl" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {bot.isOfficial && (
                  <Chip tone="info">
                    <Sparkles aria-hidden />
                    풀림 공식<span className="sr-only"> — 풀림이 제공하는 공식 봇이에요</span>
                  </Chip>
                )}
                {bot.subject && <Chip tone="neutral">{bot.subject}</Chip>}
                {bot.grade && <Chip tone="outline">{bot.grade}</Chip>}
                {bot.tone && <Chip tone="outline">{bot.tone} 말투</Chip>}
              </div>
            </div>

            <dl className="mt-4 space-y-2">
              {!bot.isOfficial && (
                <Fact icon={UserRound} label="만든 선생님">
                  {bot.teacherName || '알 수 없어요'}
                  {bot.organization ? ` · ${bot.organization}` : ''}
                </Fact>
              )}
              {!bot.isOfficial && (
                <Fact icon={Store} label="공개한 날">
                  {publishedLabel ?? '알 수 없어요'}
                </Fact>
              )}
              <Fact icon={Users} label="이용 학생">
                {bot.enrolledCount}명
              </Fact>
            </dl>
          </section>

          <section className="bg-card rounded-2xl border p-5">
            <SectionHeading
              title="첫인사"
              description="이 봇이 학생을 처음 만났을 때 건네는 말이에요."
            />
            <p className="text-pullim-slate-700 flex gap-2 text-sm leading-relaxed">
              <MessageCircle
                className="text-pullim-slate-400 mt-0.5 h-4 w-4 shrink-0"
                aria-hidden
              />
              <span>{bot.greeting}</span>
            </p>
          </section>

          {viewer === 'student' ? (
            <section
              className="bg-card rounded-2xl border p-5"
              data-testid="marketplace-detail-self-add"
            >
              <SectionHeading
                title="이 봇 담기"
                description="담으면 「내가 담은 봇」에 들어가요. 언제든 다시 뺄 수 있어요."
                action={<SelfAddButton botId={botId} botName={bot.name} />}
              />
              <p className="text-pullim-slate-600 border-pullim-slate-200 mt-4 border-t pt-4 text-xs leading-relaxed">
                담기는 공식 봇과 혼자 공부할 수 있는 전용 공간을 만드는 일이에요. 선생님의
                반에 들어가 과제를 받는 것은 참여 코드로 해요.
              </p>
              <Link
                href="/classbot/classroom"
                aria-label="내 수업방으로 가기"
                className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 mt-1 inline-flex min-h-11 items-center gap-1 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
                data-testid="marketplace-detail-classroom-link"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                내 수업방
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </section>
          ) : (
            <AlertCard tone="info" icon={KeyRound} title="풀림 공식 봇을 수업에 활용해 보세요">
              <p className="text-pullim-slate-700 text-sm leading-relaxed">
                내 수업방의 봇 설정에서 이 공식 봇을 고르면 학생들이 기존 참여 공간에서
                바로 쓸 수 있어요.
              </p>
              <Link
                href="/teacher/classroom"
                aria-label="내 수업방으로 가기"
                className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
                data-testid="marketplace-detail-classroom-link"
              >
                <KeyRound className="h-4 w-4" aria-hidden />내 수업방
              </Link>
            </AlertCard>
          )}
        </>
      )}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Store;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-pullim-slate-500 flex items-center gap-1.5 text-2xs font-bold">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="text-pullim-slate-700 min-w-0 text-2xs">{children}</dd>
    </div>
  );
}
