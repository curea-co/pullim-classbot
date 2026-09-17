'use client';

import Link from 'next/link';
import { Bot, ChevronRight, MessageSquare, Plus, Settings, Shield } from 'lucide-react';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBots } from '@/hooks/api/bot';
import { isUnauthorized } from '@/lib/api/classbot-client';
import type { BotDto } from '@/lib/api/classbot-dto';
import { botPolicyTabs } from '@/lib/mock/classbot-bot-policy';
import { isScopeLevel, scopeMeta } from '@/lib/mock/tutor';

/**
 * 봇 관리 목록 본문 — 내가 owner 인 봇을 **정본에서** 읽어 늘어놓는다
 * (`GET /classbot/me/bots` · `useMyBots` · api.md § 3.5b · 계획 PR 5d).
 *
 * 종전에는 mock 카탈로그(`getManagedBots()`)가 줄을 정했다. 그때는 어느 교사가 열어도 같은 다섯 줄이라
 * 「내 봇」이라는 말이 화면에서 참이 아니었다 — 이제 목록이 곧 내 봇 전부다(응답은 최신순 · 없으면 `[]`).
 *
 * 그래서 이 화면에 상태가 넷 더 생긴다. mock 은 실패하지도 늦지도 않아 필요 없던 것들이다:
 * 읽는 중(뼈대) · 세션 끊김(로그인 안내) · 읽기 실패(다시 시도) · 한 개도 없음(빈 상태).
 * 401 을 에러 카드로 그리지 않는 까닭은 `classroom-workspace.tsx` 와 같다 — `classbotRead` 가 이미 OS
 * 로그인으로 보내는 중이고, 그 한 박자를 게이트가 든다(prod-verify 익명 레인이 읽는 자리).
 *
 * **서버에 없는 값은 줄에 싣지 않는다.** `subject`·`grade`·`tone` 은 `BotDto` 에서 null 이 될 수 있고,
 * 그때는 그 칸을 통째로 빼지 빈 글자나 「null」을 그리지 않는다.
 *
 * @param carriedTab - 봇을 가리키지 못한 링크가 실어 보낸 탭(`page.tsx` 가 이미 걸렀다). 고른 봇의 그 탭으로 잇는다.
 * @returns 봇 관리 목록 화면
 */
export function BotsWorkspace({ carriedTab }: { carriedTab?: string }) {
  const query = useMyBots();
  const bots = query.data ?? [];
  const carriedTabLabel = botPolicyTabs.find((t) => t.value === carriedTab)?.label;

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Bot, text: '클래스봇' },
        title: '봇 관리',
        description: carriedTabLabel
          ? `어느 봇의 「${carriedTabLabel}」을 고칠지 골라주세요.`
          : '봇을 누르면 그 봇의 이름·말투와 운영 규칙 — 안전 등급 · 이탈 대응 — 을 고칠 수 있어요.',
        /*
          봇 만들러 가는 길은 화면에 **하나만** 둔다 — 봇이 있으면 헤더 CTA,
          없으면 아래 빈 상태. 둘이 같이 뜨면 같은 화면에 같은 일을 하는 버튼이 둘이다
          (`07 § 6.6.2(2)`). 읽는 중·실패에는 아직 「있다」고 말할 수 없어 둘 다 뜨지 않는다.
          이름은 「새 클래스봇」 — 교사 홈(`teacher/page.tsx`)과 운영 화면(`teacher/classbot/page.tsx`)이
          이미 그렇게 부르고 있어, 이 자리까지 맞추면 **빌더로 보내는 세 화면이 한 이름**이 된다.
          빌더를 다시 시작하는 만든 뒤 화면(`components/builder/done-view.tsx`)도 같은 이름이라
          **새 봇을 만드는 버튼은 앱 안에서 넷 다 같은 글자**다.
          두 단어라 `07 § 6.6` 「버튼은 단어로」의 두 단어 한도 안이다.

          TODO(봇 빌더 이식): 다음 작업에서 [봇 빌더]를 이 화면 하위(`/teacher/bots/new`)로 옮긴다.
          그때 이 버튼과 아래 빈 상태의 href 만 `/teacher/bots/new` 로 바꾸면 되도록
          진입점을 이 화면 안 두 자리로만 모아 뒀다.

          **레일 쪽은 했다** — 교사 레일(`components/shell/nav-config.ts`)의 [봇 빌더] 항목은
          2026-09-15 에 내렸다(사용자 직접 지시). **경로 이동은 아직이다** — 라우트
          `/teacher/builder` 는 살아 있고 앱 안 여러 진입점이 계속 쓴다. 미뤄 둔 것이지
          접은 것이 아니다 (`proc/spec/03 § 4.4.7`).
          그래서 이 버튼과 아래 빈 상태의 href 도 아직 `/teacher/builder` 그대로다.
        */
        action:
          bots.length > 0 ? (
            <Link
              href="/teacher/builder"
              data-testid="bots-new-cta"
              className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              새 클래스봇
            </Link>
          ) : undefined,
      }}
    >
      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true" data-testid="bot-manage-loading">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : query.isError ? (
        // 라벨은 게이트 문장 `${label}를 보려면` 에 들어간다 — 받침 없는 말이어야 「를」이 맞는다(「봇 목록를」 ✗).
        isUnauthorized(query.error) ? (
          <ReadLoginGate label="봇 관리" />
        ) : (
          <ReadErrorState onRetry={() => void query.refetch()} />
        )
      ) : bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="아직 만든 봇이 없어요"
          description="봇을 만들면 여기에서 그 봇의 이름·말투와 운영 규칙을 고칠 수 있어요."
          action={{ href: '/teacher/builder', label: '봇 만들기' }}
        />
      ) : (
        <ul data-testid="bot-manage-list" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bots.map((bot) => (
            <BotManageCard key={bot.id} bot={bot} carriedTab={carriedTab} />
          ))}
        </ul>
      )}
    </TeacherPageShell>
  );
}

/**
 * 봇 한 줄 — 카드째 누르는 자리다. 줄 안에 링크를 또 깔지 않는다.
 * 담는 것: 아바타·이름·과목·학년 / 지금 안전 등급 / 말투.
 * 운영 상태·인원·낸 과제는 담지 않는다 — 운영 화면 몫이다(작업판 머리주석).
 *
 * `subject`·`grade`·`tone` 은 정본에서 null 일 수 있다. 빈 칸을 그리면 「값이 비었다」가 아니라
 * 「모른다」로 읽히고 가운뎃점만 남은 줄(`· 고2`)은 그냥 깨진 줄이라, **없는 칸은 통째로 뺀다.**
 *
 * @param bot - 정본 한 행
 * @param carriedTab - 이어 붙일 탭(없으면 상세 기본 탭)
 * @returns 목록 한 줄
 */
function BotManageCard({ bot, carriedTab }: { bot: BotDto; carriedTab?: string }) {
  const href = carriedTab
    ? `/teacher/bots/${encodeURIComponent(bot.id)}?tab=${encodeURIComponent(carriedTab)}`
    : `/teacher/bots/${encodeURIComponent(bot.id)}`;
  // 과목·학년 중 있는 것만 잇는다 — 둘 다 없으면 줄 자체가 없다.
  const facts = [bot.subject, bot.grade].filter((v): v is string => Boolean(v)).join(' · ');

  return (
    <li data-testid={`bot-manage-card-${bot.id}`}>
      <Link
        href={href}
        className="bg-card hover:border-pullim-blue-300 focus-visible:ring-pullim-blue-400/50 flex items-start gap-4 rounded-2xl border p-5 transition-colors outline-none focus-visible:ring-2"
      >
        <BotAvatar subject={bot.subject} name={bot.name} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="text-pullim-slate-900 block text-sm font-bold">{bot.name}</span>
          {facts && <span className="text-pullim-slate-500 mt-0.5 block text-2xs">{facts}</span>}

          {/* 지금 정해져 있는 규칙 둘 — 이름은 scopeMeta 하나만 쓴다(운영 화면과 같은 출처) */}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <ScopeChip scope={bot.scope} />
            {bot.tone && (
              <Chip tone="neutral" className="py-1">
                <MessageSquare aria-hidden />
                <span>
                  <span className="sr-only">말투 </span>
                  {bot.tone}
                </span>
              </Chip>
            )}
          </span>
        </span>
        <span className="text-pullim-slate-400 flex shrink-0 items-center gap-0.5 self-center text-2xs font-bold">
          <Settings className="h-3.5 w-3.5" aria-hidden />
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

/**
 * 안전 등급 칩 — 목록과 상세가 같은 모양을 쓴다.
 *
 * 서버는 `scope` 를 `number` 로 준다(`bots.scope` 는 CHECK 없는 integer — `lib/mock/tutor.ts` `isScopeLevel`
 * 머리주석). 다섯으로 좁히는 일은 읽는 쪽 몫이고, **좁혀지지 않는 값을 L1~L5 중 하나로 고쳐 부르지 않는다** —
 * 그때는 서버가 준 숫자를 그대로 말한다(반 상세 「봇」 탭과 같은 처리).
 *
 * @param scope - 정본이 준 안전 등급
 * @param testId - 칩을 집을 이름. 목록은 줄마다 여럿이라 붙이지 않고, 상세 머리는 하나뿐이라 붙인다.
 * @returns 등급 칩
 */
export function ScopeChip({ scope, testId }: { scope: number; testId?: string }) {
  return (
    <Chip tone="outline" data-testid={testId} className="py-1">
      <Shield className="text-pullim-blue-600" aria-hidden />
      <span>
        <span className="sr-only">안전 등급 </span>
        {isScopeLevel(scope) ? (
          <>
            <span className="font-mono">{scopeMeta[scope].short}</span> {scopeMeta[scope].label}
          </>
        ) : (
          <>
            등급 <span className="font-mono">{scope}</span>
          </>
        )}
      </span>
    </Chip>
  );
}
