'use client';

import { Bot, Share2 } from 'lucide-react';

import { KpiStat } from '@/components/classbot/kpi-stat';
import { formatAddedAt } from '@/components/classbot/marketplace';
import { SectionHeading } from '@/components/shell/section-heading';
import { MetaRow } from '@/components/ui/meta-row';
import type { ParentSelfStudyBot, ParentSelfStudyChild } from '@/hooks/api/types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { formatStudyDay, scopeSentence } from './self-study-visibility';

/**
 * 자녀 한 명의 자기주도 요약 카드.
 *
 * 골격은 학부모 홈의 자녀 카드와 같다 — 카드 `p-5`, 제목↔본문 `mb-4`, 숫자 셋,
 * 그 아래 목록 `space-y-2`. 같은 사람이 같은 셸 안에서 옮겨 다니는 화면이라
 * 눈금이 갈리면 다른 제품처럼 읽힌다.
 *
 * 다른 점은 **머리에 범위 띠가 하나 더 있다**는 것 하나다. 홈의 자녀 카드는 교사에게서
 * 파생된 권한이라 「왜 내가 이걸 보나」를 물을 일이 없지만, 이 카드는 근거가 아이의 동의
 * 하나뿐이라 그 근거를 카드보다 위에 둔다.
 *
 * ## 안 그리는 것 (계약 §4)
 * 대화 원문·요약, 문항별 오답, 감정·웰빙, 단원 진행. 서버가 애초에 안 준다 —
 * 여기에 그럴듯한 자리를 만들어 두지 마라. 필드가 없다는 것이 계약이 작동한 결과다.
 */
export function ChildSelfStudyCard({ child }: { child: ParentSelfStudyChild }) {
  const scope = scopeSentence(child);
  const lastStudy = formatStudyDay(child.streak.lastStudyDate);

  return (
    <section
      className="bg-card rounded-2xl border p-5"
      data-testid={`self-study-child-${child.id}`}
    >
      {/*
        범위 띠 — 카드 머리. 계약 §3 이 「숨기지 않는다」로 못 박은 자리다.
        경고가 아니라 **아이가 한 말**이라 위험색을 쓰지 않는다. 파랑 한 겹으로 둔다.
      */}
      <p className="bg-pullim-blue-50 text-pullim-blue-700 mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-xl px-3 py-2.5 text-2xs font-bold">
        <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {scope.lead}
        {scope.until && (
          <>
            <span className="text-pullim-blue-400" aria-hidden>
              ·
            </span>
            <span className="font-semibold">{scope.until}</span>
          </>
        )}
      </p>

      <SectionHeading
        title={child.name}
        // 연속일수만 있고 마지막 날이 없으면 그 숫자가 언제 것인지 알 수 없다 —
        // 「5일 연속」이 지난달 것일 수도 있어서, 날짜를 붙여야 숫자가 정직해진다.
        description={lastStudy ? `마지막으로 공부한 날은 ${lastStudy}이에요.` : undefined}
      />

      <ul className="grid grid-cols-3 gap-3">
        <KpiStat label="고른 봇" value={`${child.bots.length}개`} />
        <KpiStat
          label="이번 주 공부한 날"
          value={`${child.streak.thisWeekDays}일`}
          tone={child.streak.thisWeekDays > 0 ? 'accent' : 'default'}
        />
        <KpiStat label="이어서 공부한 날" value={`${child.streak.count}일`} />
      </ul>

      <div className="mt-5">
        <h3 className="text-pullim-slate-900 mb-2 text-sm leading-tight font-bold">
          스스로 고른 봇 {child.bots.length}개
        </h3>
        {child.bots.length === 0 ? (
          /*
            봇은 없는데 공부한 날이 있는 자리 — 담았다가 뺐을 때 그렇게 된다.
            빈 상태를 「아직 안 골랐어요」로 적지 않는다. 골랐던 적이 있는지 여기서는 모른다.
          */
          <p className="text-pullim-slate-500 text-2xs">
            지금 담아 둔 봇은 없어요. 공부한 날은 그대로 남아 있어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {child.bots.map(bot => (
              <SelfStudyBotRow key={bot.botId} bot={bot} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * 봇 한 줄 — 이름 · 과목 · 시작한 날.
 *
 * 봇 색은 **이 타일 한 곳뿐**이다(`lib/tokens/bot-signature.ts` 의 사용 범위 주석).
 * 라이너도 칩도 덧대지 않는다 — 자녀가 봇을 넷 담으면 그것만으로도 카드에 hue 가 넷이라,
 * 한 줄에 두 번 찍으면 [08 § 14.1] 한도를 넘는다.
 *
 * 순색을 그대로 깔지 않고 흰색에 20% 섞는 이유도 같다. 시그니처 다섯의 밝기가 제각각이라
 * (수학은 `L 0.967`, 국어는 `L 0.62`) 순색으로 깔면 어떤 줄은 글자가 안 보이고 어떤 줄은
 * 면이 너무 세게 튄다. 20% 틴트는 다섯을 같은 밝기로 눕혀 두면서 색상은 남긴다 —
 * 「어느 과목인지 알아보는 표시」라는 원래 용도에는 그걸로 충분하다.
 *
 * ## 타일 안의 그림은 **임시다** — `avatarEmoji` 가 오면 갈아 끼운다
 *
 * 아이는 봇을 🧑‍🔬 로 보고 「과학봇」이라 부르는데 부모는 회색 lucide 글리프를 본다.
 * 둘이 같은 봇을 이야기하면서 다른 것을 보고 있는 셈이라, 이건 취향 문제가 아니라 **어긋남**이다.
 * `avatarEmoji` 는 아이가 고른 봇의 공개 필드라 내보내도 새는 게 없어서
 * `ParentSelfStudyBot` 에 추가를 요청해 뒀다(계약 §4 가 막는 값이 아니다).
 *
 * 오면 아래 한 줄만 바꾼다 — `{bot.avatarEmoji || <Bot … />}`.
 * **글리프를 지우지 마라.** 이모지가 빈 봇이 있을 수 있어 그대로 대체 그림으로 남는다.
 */
function SelfStudyBotRow({ bot }: { bot: ParentSelfStudyBot }) {
  const sig = botSignature({ id: bot.botId, subject: bot.subject });
  const startedAt = formatAddedAt(bot.addedAt);

  return (
    <li className="border-pullim-slate-100 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${sig.hex} 20%, white)` }}
        aria-hidden
      >
        <Bot className="h-4 w-4" style={{ color: sig.inkLight }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-pullim-slate-900 truncate text-sm font-bold">{bot.name}</p>
        <MetaRow
          primary={bot.subject}
          secondary={startedAt ? `${startedAt}부터` : undefined}
        />
      </div>
    </li>
  );
}
