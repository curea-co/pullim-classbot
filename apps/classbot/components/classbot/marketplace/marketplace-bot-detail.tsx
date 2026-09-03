'use client';

import Link from 'next/link';
import { ArrowRight, KeyRound, LogIn, MessageCircle, Store, UserRound, Users } from 'lucide-react';

import { AlertCard } from '@/components/classbot/alert-card';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceBot } from '@/hooks/api/marketplace';
import { ApiClientError } from '@/lib/api/client-fetch';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';
import { formatPublishedAt } from './format';
import { SelfAddButton } from './self-add-button';

/**
 * 봇 상세 — 「이 봇이 누구인가」에 답하고, 학생이면 **담는다.**
 *
 * 마지막 칸이 안내에서 버튼으로 바뀌었다. 예전에는 「여기서는 담을 수 없어요, 선생님께
 * 참여 코드를 받으세요」라고 적혀 있었는데 지금은 담을 수 있다.
 *
 * 담기와 참여 코드는 **다른 것**이지 크고 작은 것이 아니다:
 *  - **담기** — 봇을 얻는다. 「내가 담은 봇」에 들어가고 1:1 로 쓴다. 누구나, 바로.
 *  - **참여 코드** — 선생님의 **반**을 얻는다. 과제를 받고 명단에 오른다. 선생님이 줄 때만.
 * 그래서 이 화면은 담기를 앞에 두되 참여 코드를 지우지 않고, 코드를 담기의 조건으로도
 * 적지 않는다. 「코드로만」·「코드뿐」은 예전에도 지금도 거짓이다.
 *
 * 학생 셸과 교사 셸이 같은 본문을 쓰고, 갈리는 것은 세로 간격(`className`)과 마지막
 * 칸(`viewer`)이다 — 교사는 담지 않는다. 대신 학생이 자기 봇을 담으면 무슨 일이
 * 벌어지는지(그리고 **벌어지지 않는지**) 그 자리에서 읽는다.
 */
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
  /** 안내 문구와 「내 수업방」 링크가 갈린다 — 교사를 학생 셸로 보내지 않는다. */
  viewer: 'student' | 'teacher';
  /** 셸별 세로 눈금. 교사 화면은 `space-y-7`. */
  className?: string;
}) {
  const query = useMarketplaceBot(botId);
  const bot = query.data?.bot ?? null;
  // 목록과 같은 이유로 401 만 따로 뗀다 — 고장이 아니라 로그인 안 한 상태다.
  const isSignedOut = query.error instanceof ApiClientError && query.error.status === 401;
  const sig = botSignature({ id: botId, subject: bot?.subject });
  const publishedLabel = formatPublishedAt(bot?.publishedAt);

  return (
    <div className={cn('space-y-5', className)}>
      <div className="space-y-2">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <PageHeader
          eyebrow={{ icon: Store, text: '봇 소개' }}
          title={bot?.name ?? '봇 상세'}
          description={
            bot?.blurb ??
            (query.isError ? '지금은 이 봇을 볼 수 없어요.' : '선생님이 만들어 공유한 봇이에요.')
          }

        />
      </div>

      {isSignedOut ? (
        <div data-testid="marketplace-detail-signin">
          <EmptyState
            icon={LogIn}
            title="로그인하면 이 봇을 볼 수 있어요"
            description="선생님들이 공유한 봇은 로그인한 뒤에 둘러볼 수 있어요."
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
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                style={{ backgroundColor: sig.hex }}
                aria-hidden
              >
                {bot.avatarEmoji || '🤖'}
              </span>
              {/*
                봇 이름을 여기서 다시 적지 않는다 — 바로 위 페이지 제목이 이미 그 이름이고,
                한 화면에 같은 글자가 두 번 서면 둘 중 무엇이 제목인지 안 읽힌다.
              */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <Chip tone="neutral">{bot.subject}</Chip>
                <Chip tone="outline">{bot.grade}</Chip>
                <Chip tone="outline">{bot.tone} 말투</Chip>
              </div>
            </div>

            <dl className="mt-4 space-y-2">
              {/* 호칭은 `teacherName` 에 이미 들어 있다 — 목록 카드와 같은 이유로 덧붙이지 않는다. */}
              <Fact icon={UserRound} label="만든 선생님">
                {bot.teacherName}
                {bot.organization ? ` · ${bot.organization}` : ''}
              </Fact>
              <Fact icon={Store} label="공유한 날">
                {publishedLabel ?? '알 수 없어요'}
              </Fact>
              <Fact icon={Users} label="참여 학생">
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
              {/*
                담기 버튼 바로 아래에 참여 코드를 적는다. 지우지 마라 —
                「담았으니 이 반 학생이 됐다」는 오해가 생기는 자리가 여기다.
                다만 조건으로 적지는 않는다. 담기는 코드를 기다리지 않는다.
              */}
              <p className="text-pullim-slate-600 border-pullim-slate-200 mt-4 border-t pt-4 text-xs leading-relaxed">
                담기는 이 봇을 <span className="text-pullim-slate-900 font-bold">내 것으로</span>{' '}
                두는 거예요. 선생님의{' '}
                <span className="text-pullim-slate-900 font-bold">반</span>에 들어가 과제를 받는
                건 다른 일이라, 그건 참여 코드로 해요.
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
            <AlertCard tone="info" icon={KeyRound} title="학생은 이 봇을 담아 갈 수 있어요">
              <p className="text-pullim-slate-700 text-sm leading-relaxed">
                공유한 봇은 누구나 담아서 혼자 쓸 수 있어요. 담은 학생은{' '}
                <span className="font-bold">반에 들어오지 않아요</span> — 참여 학생 수도, 학급
                관제소도, 과제 받는 명단도 그대로예요. 반에 들이려면 내 수업방에서 참여 코드를
                내고 알려 주세요.
              </p>
              {/*
                내려도 이미 담아 간 학생의 봇은 계속 돈다. 이 비대칭을 여기 적어 두는 이유:
                「내리면 회수된다」고 믿고 내렸다가 나중에 알게 되는 것이 제일 나쁘다.
              */}
              <p className="text-pullim-slate-700 mt-2 text-sm leading-relaxed">
                공유를 내리면 마켓에서는 사라지지만, 이미 담아 간 학생의 봇은 계속 돌아가요.
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

/** 값 한 줄 — 이름표와 값이 같은 줄에 서고, 좁아지면 값이 아래로 접힌다. */
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
