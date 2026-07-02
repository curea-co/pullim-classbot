'use client';

import { useRosterMe } from '@/lib/current-user';
import { useMergedAssignments, useAssignmentStore } from '@/lib/store/assignments';
import { useLiveStore } from '@/lib/store/live';
import { useMyClassBots, useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { useLowConditionToday } from '@/lib/mock/classbot-light-day';
import { useLightDayOn, useLightDayActions, useLightDayStore } from '@/lib/store/light-day';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { todayKey } from '@/lib/store/today-key';
import { useStudentMode } from '@/lib/store/student-mode';
import { SelfHomePlaceholder } from '@/components/classbot/self-home-placeholder';
import { TeacherClassHome } from '@/components/classbot/teacher-class-home';
import {
  LearningHero,
  TutorShowcase,
  TodoPanel,
  GrowthPanel,
  WellnessNudge,
  LightDayNudge,
  LightDayExitStrip,
} from '@/components/classbot/home';

/**
 * 학생 홈 — 튜터+모멘텀 하이브리드 (feat/classbot-home-redesign).
 *
 * 구성:
 *   1. LearningHero  — 인사 + 스트릭 + 이어서 하기 CTA + 주간 진행
 *   2. TutorShowcase — 내 튜터 personality 카드 그리드
 *   3. 2-col: TodoPanel(좌) + GrowthPanel(우)
 *   4. WellnessNudge  — 웰빙 봇 코멘트 (optional)
 */
export default function StudentClassbotPage() {
  // ── hooks (ALL unconditional — Rules of Hooks) ──────────────────────────────
  const { mode, hydrated } = useStudentMode();            // hook 1 — must be first
  const me = useRosterMe();                               // hook 2
  const activeLive = useLiveStore(s => s.active);         // hook 3
  const allAssignments = useMergedAssignments(me.id);     // hook 4
  const submissions = useAssignmentStore(s => s.submissions); // hook 5
  const myBots = useMyClassBots();                        // hook 6 — 참여 코드로 join된 교사 클래스 (reactive)
  const leaveClass = useClassEnrollmentStore(s => s.leave); // hook 7
  // 가벼운 모드(Light Day) — 저조 신호·상태·hydration (spec §6 홈 배선). todayKey 는 같은 날 안정적.
  const lowToday = useLowConditionToday(me.id);           // hook 8
  const lightOn = useLightDayOn(todayKey());              // hook 9
  const { enable: enableLight, disable: disableLight } = useLightDayActions(); // hook 10
  const lightHydrated = useStoresHydrated(useLightDayStore); // hook 11

  // persist(mode·enrollment) hydration 전에는 모드/봇이 빈 상태로 평가됨 → 분기를 신뢰할 수 없다.
  // hydration 완료 전까지 스켈레톤을 그려 SSR·첫 페인트 불일치와 모드 전환 플래시를 막는다.
  if (!hydrated) return <HomeSkeleton />;

  // 모드별 분기 — hooks 전부 실행 후 render만 분기 (Rules of Hooks 준수)
  // 클래스 0개 홈에는 TodoPanel 이 없어 Light Day 해제 UI가 사라진다 — 같은 날 원복 계약(spec §3/§8)을
  // 지키도록 안전망 스트립을 함께 렌더 (예: light on 상태에서 마지막 클래스 나가기, Codex #182 R3).
  if (mode === 'class' && myBots.length === 0) {
    return (
      <div className="space-y-5">
        {lightHydrated && lightOn && <LightDayExitStrip onExit={disableLight} />}
        <TeacherClassHome />
      </div>
    );
  }
  if (mode === 'self') return <SelfHomePlaceholder />;
  const liveBots = myBots.filter(b => Boolean(activeLive[b.bot.id]));

  // 참여 중인 클래스(봇) 범위로 과제 스코프 — 반에서 나가면 그 반 과제도 홈에서 사라진다.
  // (useMergedAssignments는 학생 id만 보므로 enrollment 기준 재필터 필요)
  const enrolledBotIds = new Set(myBots.map(b => b.bot.id));

  // Incomplete assignments — enrolled 범위 + sorted urgent first
  const incompleteAssignments = allAssignments
    .filter(a => enrolledBotIds.has(a.botId))
    .filter(a => a.completedCount < a.questionCount)
    .sort((a, b) => {
      const order = (d: string) => d === '오늘' ? 0 : d === 'D-1' ? 1 : 2;
      return order(a.dDay) - order(b.dDay);
    });

  // 웰빙 코멘트도 홈과 같은 데이터 소스(useMyClassBots)를 쓰도록 봇 주입 — join 반영 일관성
  const wellnessComment = getWellnessBotComment(me.id, myBots.map(b => b.bot));

  // suppress unused var lint — submissions hook is retained for hook ordering
  void submissions;

  // ── class mode JSX ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* 0. LightDayNudge — 저조 신호 & 아직 opt-in 전이면 홈 상단에 (hydration 후에만, spec §8) */}
      {lightHydrated && lowToday && !lightOn && (
        <LightDayNudge onEnable={() => enableLight(todayKey())} />
      )}

      {/* 1. LearningHero — navy band */}
      <LearningHero incompleteAssignments={incompleteAssignments} />

      {/* 2. TutorShowcase — personality cards */}
      <TutorShowcase bots={myBots} activeLive={activeLive} />

      {/* 3. Two-column panel — 오늘 할 일 + 나의 성장 (라이트 데이면 핵심 1개로 축소 렌더) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodoPanel
          incompleteAssignments={incompleteAssignments}
          liveBots={liveBots}
          light={lightHydrated && lightOn}
          onExitLight={disableLight}
        />
        <GrowthPanel />
      </div>

      {/* 4. WellnessNudge — optional */}
      {wellnessComment && <WellnessNudge comment={wellnessComment} />}

      {/* 5. 참여 중인 클래스 — 반 단위 나가기 (전체 일괄 삭제 금지) */}
      <div className="space-y-1.5 pt-2">
        <p className="px-1 text-xs font-semibold text-pullim-slate-400">참여 중인 클래스</p>
        <ul className="space-y-1.5">
          {myBots.map(({ bot, enrollment }) => (
            <li
              key={bot.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-pullim-slate-200 bg-white px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-pullim-slate-700">
                {enrollment.classroomLabel} · {enrollment.assignedBy}
              </span>
              <button
                type="button"
                onClick={() => leaveClass(bot.id)}
                aria-label={`${enrollment.classroomLabel} 나가기`}
                className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-medium text-pullim-slate-400 underline-offset-2 hover:text-pullim-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
              >
                나가기
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** persist hydration 전 플레이스홀더 — 모드 분기 확정 전 레이아웃 유지(플래시 방지). */
function HomeSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-40 animate-pulse rounded-2xl bg-pullim-slate-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-pullim-slate-100" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl bg-pullim-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-pullim-slate-100" />
      </div>
    </div>
  );
}
