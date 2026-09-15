'use client';

import { Share2 } from 'lucide-react';

import { BotAvatar } from '@/components/classbot/bot-avatar';
import { KpiStat } from '@/components/classbot/kpi-stat';
import { formatAddedAt } from '@/components/classbot/marketplace';
import { SectionHeading } from '@/components/shell/section-heading';
import { MetaRow } from '@/components/ui/meta-row';
import type { ParentSelfStudyBot, ParentSelfStudyChild } from '@/hooks/api/types';
import {
  SHARE_CAN_STOP,
  formatStudyDay,
  sharedByChildSentence,
} from './self-study-visibility';

/**
 * 자녀 한 명의 자기주도 요약 카드.
 *
 * 골격은 학부모 홈의 자녀 카드와 같다 — 카드 `p-5`, 제목↔본문 `mb-4`, 숫자 셋,
 * 그 아래 목록 `space-y-2`. 같은 사람이 같은 셸 안에서 옮겨 다니는 화면이라
 * 눈금이 갈리면 다른 제품처럼 읽힌다.
 *
 * 다른 점은 **머리에 출처 띠가 하나 더 있다**는 것 하나다. 홈의 자녀 카드는 교사에게서
 * 파생된 권한이라 「왜 내가 이걸 보나」를 물을 일이 없지만, 이 카드는 근거가 아이의 동의
 * 하나뿐이라 그 근거를 카드보다 위에 둔다.
 *
 * 그 띠는 **상수 문장**이다 — 범위 라벨도 기한도 싣지 않는다. 그 두 값은 미동의 자녀에게
 * `null` 이 되어 오라클이 되므로 서버 응답에서 걷혔다(`sharedByChildSentence` 머리주석).
 *
 * ## 안 그리는 것 (계약 §4)
 * 대화 원문·요약, 문항별 오답, 감정·웰빙, 단원 진행. 서버가 애초에 안 준다 —
 * 여기에 그럴듯한 자리를 만들어 두지 마라. 필드가 없다는 것이 계약이 작동한 결과다.
 */
export function ChildSelfStudyCard({ child }: { child: ParentSelfStudyChild }) {
  const sharedBy = sharedByChildSentence(child.name);
  const lastStudy = formatStudyDay(child.streak.lastStudyDate);

  return (
    <section
      className="bg-card rounded-2xl border p-5"
      data-testid={`self-study-child-${child.id}`}
    >
      {/*
        출처 띠 — 카드 머리. 부모가 이걸 읽어도 되는 근거를 적는 자리다.
        경고가 아니라 **아이가 한 말**이라 위험색을 쓰지 않는다. 파랑 한 겹으로 둔다.
      */}
      <p className="bg-pullim-blue-50 text-pullim-blue-700 mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-xl px-3 py-2.5 text-2xs font-bold">
        <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {sharedBy}
        <span className="text-pullim-blue-400" aria-hidden>
          ·
        </span>
        <span className="font-semibold">{SHARE_CAN_STOP}</span>
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
 * ## 타일 안은 **아이가 보는 그 얼굴**이다
 *
 * 아이는 봇을 「과」라 적힌 파란 배지로 보고 「과학봇」이라 부른다. 부모 화면에 다른 표시가
 * 떠 있으면 둘이 같은 봇을 이야기하면서 서로 다른 것을 보고 있는 셈이다. 그래서 이 자리는
 * 아이의 담은 봇 카드(`my-bots/my-bot-card.tsx`)와 **같은 `BotAvatar`** 를 쓴다 — 크기까지
 * 같을 필요는 없지만 면·글자·모양은 한 컴포넌트가 정한다.
 *
 * 종전에는 `avatarEmoji` 와 시그니처 색 20% 틴트였다. 이모지를 걷어낸 것은 이 화면의 사정이
 * 아니라 **봇 배지 전체의 규격이 바뀐 것**이고(`components/classbot/bot-avatar.tsx`),
 * 색을 걷어낸 것은 자녀가 봇을 넷 담으면 그것만으로 카드에 hue 가 넷이 되어
 * [08 § 14.1] 한도를 넘기 때문이다. 이제 넷을 담아도 hue 는 브랜드 블루 하나다.
 *
 * ⛔ **폴백의 lucide `Bot` 글리프는 `subject`·`name` 이 둘 다 없을 때뿐이다 — 값이 있는데
 * 글리프로 되돌리지 마라.** 종전 주석이 「lucide 글리프로 되돌리지 마라」고 못 박은 자리가
 * 여기이고, **규격이 바뀌어도 그 경고는 그대로 유효하다.** `BotAvatar` 는 폴백에서 실제로
 * lucide `Bot` 을 그리므로(`{initial ?? <Bot …/>}`) 되돌아갈 문이 닫혀 있지 않다.
 * 부모 쪽만 글리프로 갈아 끼우면 아이는 「과」를 보고 부모는 회색 글리프를 보게 되어,
 * 이 자리가 없애려던 어긋남이 **정확히 그대로 되살아난다.** 폴백이 정당한 경로인 것은
 * 아이 화면도 같은 조건에서 **같은 글리프**를 그리기 때문이다 — 두 화면이 같이 내려간다.
 *
 * 기준은 「빈 값을 어떻게 메우나」가 아니라 **「아이 화면과 같은가」**다. 그 하나만 지키면 된다.
 */
function SelfStudyBotRow({ bot }: { bot: ParentSelfStudyBot }) {
  const startedAt = formatAddedAt(bot.addedAt);

  return (
    <li className="border-pullim-slate-100 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <BotAvatar subject={bot.subject} name={bot.name} size="md" />
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
