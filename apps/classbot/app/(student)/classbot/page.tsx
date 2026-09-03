'use client';

import { useRosterMe } from '@/lib/current-user';
import { useMergedAssignments, useAssignmentStore } from '@/lib/store/assignments';
import { useLiveStore } from '@/lib/store/live';
import { useLowConditionToday } from '@/lib/mock/classbot-light-day';
import { useLightDayOn, useLightDayActions, useLightDayStore } from '@/lib/store/light-day';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { todayKey } from '@/lib/store/today-key';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { TeacherClassHome } from '@/components/classbot/teacher-class-home';
import {
  LearningHero,
  TutorShowcase,
  TodoPanel,
  GrowthPanel,
  LightDayNudge,
  LightDayExitStrip,
  JoinedClasses,
  useMyRooms,
} from '@/components/classbot/home';

/**
 * 학생 홈 — 튜터+모멘텀 하이브리드 (feat/classbot-home-redesign).
 *
 * 구성(아래 JSX 의 번호 주석과 같은 순서):
 *   0. LightDayNudge — 저조 신호 & 아직 opt-in 전일 때만 (optional)
 *   1. LearningHero  — 인사 + 스트릭 + 이어서 하기 CTA + 주간 진행
 *   2. TutorShowcase — 내 튜터 personality 카드 그리드
 *   3. 2-col: TodoPanel(좌) + GrowthPanel(우)
 *   5. 참여 중인 클래스 — 규모 한 줄 + 「내 수업방」 상시 입구
 *
 * 4 번은 비어 있다 — 「웰빙 한 마디」(WellnessNudge)를 걷어낸 자리다. 없어진 섹션이지
 * 빠뜨린 섹션이 아니다.
 *
 * **홈은 하나다.** 예전에는 학습 모드(`lib/store/student-mode.ts`)를 보고 `self` 면 다른 홈
 * (`SelfHomePlaceholder`)을 그렸다. 그 분기는 걷었다 — 봇 마켓에서 담은 봇도 반 봇과 같은
 * 챗·기록으로 들어가므로 홈이 갈릴 이유가 없다(계약 §5). 스토어 자체는 남아 있고
 * (`components/classbot/replay-detail.tsx` 가 아직 읽는다) 여기서 읽지 않을 뿐이다.
 */
export default function StudentClassbotPage() {
  // ── hooks (ALL unconditional — Rules of Hooks) ──────────────────────────────
  // hook 1 — 참여(persist) 하이드레이션. 예전엔 학습 모드 스토어가 이 신호를 겸했는데
  // 홈이 더는 모드로 갈리지 않으므로(위 머리주석) 참여 스토어를 직접 본다.
  const hydrated = useStoresHydrated(useClassEnrollmentStore);
  const me = useRosterMe();                               // hook 2
  const activeLive = useLiveStore(s => s.active);         // hook 3
  const allAssignments = useMergedAssignments(me.id);     // hook 4
  const submissions = useAssignmentStore(s => s.submissions); // hook 5
  // hook 6 — 참여 중인 수업방. 서버(`/api/me/classrooms`) + 데모 스토어를 합친다.
  // 스토어만 보면 **선생님이 발급한 진짜 코드로 들어온 방이 안 보인다** — 스토어의
  // 브리지가 mock 봇 카탈로그에 없는 봇을 걸러 내기 때문이다(`components/classbot/home/my-rooms.ts`).
  const { rooms: myBots, isLoading: roomsLoading } = useMyRooms();
  // 가벼운 모드(Light Day) — 저조 신호·상태·hydration (spec §6 홈 배선). todayKey 는 같은 날 안정적.
  const lowToday = useLowConditionToday(me.id);           // hook 7
  const lightOn = useLightDayOn(todayKey());              // hook 8
  const { enable: enableLight, disable: disableLight } = useLightDayActions(); // hook 9
  const lightHydrated = useStoresHydrated(useLightDayStore); // hook 10

  // persist(참여) hydration 전에는 봇이 빈 상태로 평가됨 → 분기를 신뢰할 수 없다.
  // hydration 완료 전까지 스켈레톤을 그려 SSR·첫 페인트 불일치와 빈 홈 플래시를 막는다.
  if (!hydrated) return <HomeSkeleton />;

  // 서버 목록이 아직 안 왔는데 「참여한 방이 없다」로 단정하면, 방이 있는 학생에게도
  // 참여 hero 가 한 번 번쩍인다 — 도착할 때까지는 스켈레톤으로 자리를 지킨다.
  if (myBots.length === 0 && roomsLoading) return <HomeSkeleton />;

  // 참여한 방이 없는 홈 — spec §6 데이터 흐름 그대로. 저조&!on 이면 넛지(진입로 유지, Codex #182 R5),
  // on 이면 해제 안전망 스트립(TodoPanel 이 없어 같은 날 원복 계약 §3/§8 을 스트립이 보장, R3).
  if (myBots.length === 0) {
    return (
      <div className="space-y-5">
        {lightHydrated && lowToday && !lightOn && (
          <LightDayNudge onEnable={() => enableLight(todayKey())} />
        )}
        {lightHydrated && lightOn && <LightDayExitStrip onExit={disableLight} />}
        <TeacherClassHome />
      </div>
    );
  }
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

  // suppress unused var lint — submissions hook is retained for hook ordering
  void submissions;

  // ── 참여한 방이 있는 홈 ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* 0. LightDayNudge — 저조 신호 & 아직 opt-in 전이면 홈 상단에 (hydration 후에만, spec §8) */}
      {lightHydrated && lowToday && !lightOn && (
        <LightDayNudge onEnable={() => enableLight(todayKey())} />
      )}

      {/* 1. LearningHero — navy band */}
      <LearningHero incompleteAssignments={incompleteAssignments} name={me.name} />

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

      {/* 5. 참여 중인 클래스 — 규모를 한 줄로 말하고 「내 수업방」으로 보낸다.
          반별 나가기는 여기 없다 — 그 버튼은 `/classbot/classroom` 의 반 카드에 있다. */}
      <JoinedClasses rooms={myBots} />
    </div>
  );
}

/** persist hydration 전 플레이스홀더 — 참여 목록 확정 전 레이아웃 유지(플래시 방지). */
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
