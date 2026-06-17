import { Sparkles, Shield } from 'lucide-react';
import { myClassBot, scopeMeta } from '@/lib/mock';
import { BotIdentityCard } from './bot-identity-card';

/**
 * 학생 뷰 — 봇 정체성 헤더 (디지털 분신 강조).
 * 핸드오프 7.1 (봇 정체성).
 *
 * `headingLevel` — 봇 이름을 어떤 시맨틱으로 렌더링할지.
 * 페이지 1차 헤더로 쓰일 땐 'h1', 다른 헤더가 있거나 온보딩 데모처럼
 * 미리보기 안에서 쓰일 땐 'h2'/'span'로 강등.
 *
 * `compact` — 좁은 공간(미리보기 등)에서 p-3 밀도 사용.
 *
 * 내부 구현은 BotIdentityCard primitive 위임.
 * chat/page.tsx 채택(collapse/back/liner)은 PR-3에서.
 */
export function BotHeader({
  compact,
  headingLevel = 'h1',
}: {
  compact?: boolean;
  headingLevel?: 'h1' | 'h2' | 'span';
}) {
  const bot = myClassBot;
  const scope = scopeMeta[bot.scope];

  return (
    <BotIdentityCard
      bot={bot}
      density={compact ? 'compact' : 'comfortable'}
      headingLevel={headingLevel}
    >
      {/* 봇 범위 배지 — 학생은 변경 불가, 한글 라벨 우선 + 코드 괄호 ([07 § 5.3]) */}
      <div className="bg-white/10 backdrop-blur mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
        <Shield className="text-pullim-lemon h-3.5 w-3.5" />
        <span className="font-semibold">{scope.label}</span>
        <span className="font-mono text-[9px] text-white/55">({scope.short})</span>
        <span className="text-white/60 ml-auto text-[10px]">
          선생님이 설정 · {scope.allow}
        </span>
      </div>

      {/* 라이브 수업 진행 상태 */}
      {bot.isLive && bot.currentLesson && (
        <div className="border-t border-white/10 mt-3 flex items-center gap-2 pt-3 text-xs">
          <Sparkles className="text-pullim-lemon h-3.5 w-3.5" />
          <span className="text-white/80">지금</span>
          <span className="font-semibold">{bot.currentLesson.title}</span>
          <span className="text-white/60 ml-auto font-mono">
            {bot.currentLesson.startedAt}~ · {bot.currentLesson.studentCount}명 참여
          </span>
        </div>
      )}
    </BotIdentityCard>
  );
}
