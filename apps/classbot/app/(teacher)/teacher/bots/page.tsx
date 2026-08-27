import Link from 'next/link';
import { Bot, ChevronRight, MessageSquare, Plus, Settings, Shield } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';
import { Chip } from '@/components/ui/chip';
import { scopeMeta } from '@/lib/mock/tutor';
import { botPolicyTabs, getManagedBots, isBotPolicyTab, type ManagedBot } from '@/lib/mock/classbot-bot-policy';

type SearchParams = Promise<{ tab?: string }>;

/**
 * 봇 관리 — 목록 (SCR-C-25 / FR-C-06, `proc/spec/03 § 4.4`).
 *
 * 종전에는 봇 설정이 화면 하나였다. 봇은 여럿인데 화면이 하나라
 * 「지금 어느 봇을 고치고 있나」가 화면에 없었다. 그래서 목록 → 상세로 가른다.
 *   이 화면      — 내가 만든 봇을 늘어놓고 고르게 한다
 *   [botId] 화면 — 고른 봇의 운영 규칙을 고친다
 *
 * 운영 화면(`/teacher/classbot`)과의 역할 분리:
 *   운영 화면은 「지금 잘 돌고 있나」 — 운영 중·멈춤과 그 이유, 붙은 학급과 인원, 낸 과제.
 *   이 화면은  「이 봇을 어떻게 굴릴까」 — 봇 정체와 지금 규칙(안전 등급·말투)뿐이다.
 * 그래서 운영 사실을 여기에 옮겨 적지 않는다. 같은 카드를 두 벌 만들면 둘 다 안 읽힌다.
 *
 * 보여주는 값은 전부 카탈로그(`classBots`)가 이미 아는 것이다 — 없는 값을 지어내지 않는다.
 */
export default async function TeacherBotsPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab: rawTab } = await searchParams;
  const bots = getManagedBots();

  /*
    봇을 가리키지 못하는 링크가 실어 보낸 탭.
    학급 관제소(`monitor-roster.tsx`)는 학급의 봇 id 를 모르고, 봇 빌더(`build-yards.tsx`)는
    아직 봇을 만들기 전이다. 그래서 둘 다 이 목록으로 오고, **봇은 교사가 고르고 탭만 이어 붙인다** —
    고른 봇의 그 탭으로 바로 들어간다.
  */
  const carriedTab = isBotPolicyTab(rawTab) ? rawTab : undefined;
  const carriedTabLabel = botPolicyTabs.find(t => t.value === carriedTab)?.label;

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Bot, text: '클래스봇' },
        title: '봇 관리',
        description: carriedTabLabel
          ? `어느 봇의 「${carriedTabLabel}」을 고칠지 골라주세요.`
          : '봇을 누르면 그 봇의 운영 규칙 — 안전 등급 · 이탈 대응 — 을 고칠 수 있어요.',
        /*
          봇 만들러 가는 길은 화면에 **하나만** 둔다 — 봇이 있으면 헤더 CTA,
          없으면 아래 빈 상태. 둘이 같이 뜨면 같은 화면에 같은 일을 하는 버튼이 둘이다
          (`07 § 6.6.2(2)`).
          이름은 「새 봇」 — `07 § 6.6.3` 이 빌더 만든 뒤 화면의 「봇 하나 더 만들기」에
          준 이름과 같다. 같은 뜻은 같은 이름으로 부른다.

          TODO(봇 빌더 이식): 다음 작업에서 [봇 빌더]를 이 화면 하위(`/teacher/bots/new`)로 옮긴다.
          그때 이 버튼과 아래 빈 상태의 href 만 `/teacher/bots/new` 로 바꾸면 되도록
          진입점을 이 화면 안 두 자리로만 모아 뒀다.
          함께 고칠 곳 — components/shell/nav-config.ts 의 [봇 빌더] 항목,
          운영 화면(`/teacher/classbot`)의 「새 클래스봇」.
        */
        action: bots.length > 0 ? (
          <Link
            href="/teacher/builder"
            data-testid="bots-new-cta"
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            새 봇
          </Link>
        ) : undefined,
      }}
    >
      {bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="아직 만든 봇이 없어요"
          description="봇을 만들면 여기에서 그 봇의 운영 규칙을 고칠 수 있어요."
          action={{ href: '/teacher/builder', label: '봇 만들기' }}
        />
      ) : (
        <ul data-testid="bot-manage-list" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {bots.map(bot => (
            <BotManageCard key={bot.botId} bot={bot} carriedTab={carriedTab} />
          ))}
        </ul>
      )}
    </TeacherPageShell>
  );
}

/**
 * 봇 한 줄 — 카드째 누르는 자리다. 줄 안에 링크를 또 깔지 않는다.
 * 담는 것: 아바타·이름·과목·학년 / 지금 안전 등급 / 말투.
 * 운영 상태·인원·낸 과제는 담지 않는다 — 운영 화면 몫이다(위 파일 주석).
 */
function BotManageCard({ bot, carriedTab }: { bot: ManagedBot; carriedTab?: string }) {
  const scope = scopeMeta[bot.scope];
  const href = carriedTab ? `/teacher/bots/${bot.botId}?tab=${carriedTab}` : `/teacher/bots/${bot.botId}`;

  return (
    <li data-testid={`bot-manage-card-${bot.botId}`}>
      <Link
        href={href}
        className="bg-card hover:border-pullim-blue-300 focus-visible:ring-pullim-blue-400/50 flex items-start gap-3 rounded-2xl border p-4 transition-colors outline-none focus-visible:ring-2"
      >
        <span className="bg-pullim-blue-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" aria-hidden>
          {bot.avatarEmoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-pullim-slate-900 block text-sm font-bold">{bot.botName}</span>
          <span className="text-pullim-slate-500 mt-0.5 block text-2xs">
            {bot.subject} · {bot.grade}
          </span>

          {/* 지금 정해져 있는 규칙 둘 — 이름은 scopeMeta 하나만 쓴다(운영 화면과 같은 출처) */}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip tone="outline" className="py-1">
              <Shield className="text-pullim-blue-600" aria-hidden />
              <span>
                <span className="sr-only">안전 등급 </span>
                <span className="font-mono">{scope.short}</span> {scope.label}
              </span>
            </Chip>
            <Chip tone="neutral" className="py-1">
              <MessageSquare aria-hidden />
              <span>
                <span className="sr-only">말투 </span>
                {bot.tone}
              </span>
            </Chip>
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
