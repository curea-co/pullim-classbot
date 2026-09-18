'use client';

import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 나의 성장 — 연속 학습일 + 한 주 되돌아보기 자리.
 *
 * ## 「주 평균 28시간」과 주간 히트맵을 걷었다 (2026-09-18)
 *
 * 이 패널은 `currentPersona` 의 `weeklyHours: 28` 과 `weeklyActivity: [2,3,1,3,2,0,2]` 를 읽어
 * 「28시간 주 평균 학습」과 「이번 주 5/7일 학습」 히트맵을 그렸다. 데모 페르소나(서연)의 값이라
 * **누가 보든 늘 같은 숫자**였고, 제 기록으로 읽는 자리라 걷었다. 목 모듈은 그대로 두고
 * 여기서 읽지 않을 뿐이다(`lib/mock/persona.ts` 는 다른 화면이 아직 쓴다).
 *
 * 남은 `streakDays` 는 **지어낸 값이 아니다** — `useSelfStreak()` 이 실제로 공부한 날짜에서
 * 센다. 그 날짜가 어디 있는지는 신원을 따라간다(`hooks/api/self-bots.ts:439` 머리주석) —
 * 신원이 있으면 서버(`GET /api/me/study-days`)고, 없는 데모에서는 이 기기의 기록이다.
 * 어느 쪽이든 누가 보든 같은 숫자가 나오는 페르소나 상수와는 다르다.
 *
 * 밖에서 받는 이유는 히어로의 스트릭 칩과 **같은 화면**에 있어서, 한쪽만 실제 기록을 읽으면
 * 두 숫자가 서로 어긋나기 때문이다.
 *
 * ## 정본이 주간 집계를 주게 되면 — 빈 상태 자리에 꽂는다
 *
 * 정본(pullim-api)에 학생 본인의 주간 학습량을 주는 문이 아직 없다. 생기면(예:
 * `GET /classbot/me/progress?period=week` 의 기간 합계 · 요일별 강도) 아래 `EmptyState` 자리에
 * 그 값을 그리고, 값이 없을 때만 지금의 빈 상태로 떨어지게 하면 된다.
 *
 * @param streakDays - 연속 학습일(서버 · 데모면 이 기기의 기록).
 */
export function GrowthPanel({ streakDays }: { streakDays: number }) {
  return (
    // 옆 칸의 [오늘 할 일]과 바닥선을 맞추려면 카드가 칸을 끝까지 채워야 한다.
    <section className="flex h-full flex-col">
      <SectionHeading title="나의 성장" />
      <div className="bg-card flex-1 rounded-xl border border-pullim-slate-100 p-4 shadow-pullim-xs">
        {/* 연속 학습일 — 이 패널에서 유일하게 실제로 센 숫자다.
            불꽃은 히어로의 스트릭 칩이 이미 쓴다. */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-pullim-blue-700 font-mono text-3xl leading-none font-bold">
              {streakDays}
            </span>
            <span className="text-pullim-blue-700 text-sm font-bold">일</span>
          </div>
          <div className="text-pullim-slate-500 mt-1 text-xs font-semibold">연속 학습</div>
        </div>

        <div className="border-pullim-slate-100 my-3.5 border-t" />

        <EmptyState
          tone="plain"
          size="sm"
          title="한 주 기록은 아직 없어요"
          description="봇과 공부한 날이 쌓이면 이번 주를 여기서 되돌아볼 수 있어요."
        />
      </div>
    </section>
  );
}
