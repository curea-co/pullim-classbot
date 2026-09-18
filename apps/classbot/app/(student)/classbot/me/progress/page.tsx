'use client';

import { BarChart3, GraduationCap, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { useMyRooms } from '@/components/classbot/home/my-rooms';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 학습 기록 · 성취기준 달성도 — SCR-C-30 / FR-C-31.
 *
 * ## 지금 이 화면은 빈 상태 하나다
 *
 * 2026-09-18 까지 이 화면은 「공부한 시간 4시간 20분 · 끝낸 과제 7건 · 봇과 주고받음 38번 ·
 * 평균 달성도 71%」를 「8월 10일 ~ 8월 14일」 기간으로 보여 줬다. 성취기준 다섯 줄·학습 이력
 * 세 날·낸 과제 넉 줄·성장 추이 막대까지 **전부 지어낸 값**이었다(`lib/mock/classbot-progress.ts`
 * 의 기간별 더미 3세트). 누구의 기록도 아니었고, 학생이 제 기록이라고 읽을 자리에 그런 숫자를
 * 세워 두는 것이 화면이 할 수 있는 가장 나쁜 거짓말이라 걷었다.
 *
 * **자리까지 지우지는 않았다** — 학생이 제 기록을 볼 곳이 있다는 것 자체는 사실이라, 여기를
 * 「아직 없어요」로 세워 둔다. 참여한 반이 0곳이면 참여 코드로 보내고, 반은 있는데 모인 기록이
 * 없으면 무엇을 하면 쌓이는지 말한다.
 *
 * ## 정본이 이 수치를 주게 되면 — 여기에 꽂는다
 *
 * 정본(pullim-api)에는 **학생 본인의 학습 집계를 주는 문이 아직 없다.** 생기면(예:
 * `GET /classbot/me/progress?period=week|month|all` — 기간 합계 넉 장 · 성취기준 줄 · 학습 이력 ·
 * 낸 과제) 아래 `roomsError` 갈래 다음에 그 훅 하나를 두고, 받은 값이 비었을 때만 지금의 빈
 * 상태로 떨어지게 하면 된다. 화면 뼈대(뒤로 가기 · 머리글 · 빈 상태)는 그대로 쓴다.
 *
 * 주간 리포트(`/classbot/me/report`)와 역할이 다르다는 구분은 그대로다 — 그쪽은 한 주를 봇
 * 목소리로 요약하고, 여기는 성취기준 한 줄 단위로 파고든다. 그래서 같은 숫자를 두 번 보여주지
 * 않는다.
 */
export default function MyProgressPage() {
  // 참여한 클래스가 있어야 학습 기록이 쌓인다 — 홈·봇 대화와 같은 게이트를 쓴다.
  // 집계가 없는 지금도 이 조회는 남긴다. 빈 상태의 **나가는 길**이 여기서 갈리기 때문이다
  // (반이 0곳이면 참여 코드로, 있으면 봇과 공부하라고).
  // `isError` 도 같이 받는다 — 조회 실패를 「기록이 없어요」로 확정하면 안 된다.
  const { rooms: myBots, isLoading: roomsLoading, isError: roomsError, retry: retryRooms } = useMyRooms();
  const hydrated = useStoresHydrated(useClassEnrollmentStore) && !roomsLoading;

  // persist hydration 전에는 참여 여부를 신뢰할 수 없다 → 빈 상태 플래시 방지.
  // 이 분기의 `justify-center` 는 남겨 둔다 — 여기 든 것은 상자가 아니라 **한 줄 글자**라
  // 가로 가운데가 맞다. 아래 빈 상태에서 같은 클래스를 걷어낸 것과 어긋나 보이지만 다른 경우다.
  if (!hydrated) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="text-pullim-slate-500 text-sm">불러오는 중…</div>
      </div>
    );
  }

  // 못 읽은 것과 없는 것을 가른다 — 실패를 빈 상태로 적으면 「내 기록이 사라졌다」로 읽힌다.
  if (roomsError) {
    return <ReadErrorState onRetry={retryRooms} />;
  }

  return (
    // 빈 상태를 flex 로 감싸지 마라. 세로 가운데는 기댈 확정 높이가 위에 없어 처음부터 돌지
    // 않았고, 가로 가운데는 flex 아이템을 글자 폭으로 줄여 상자를 봇 마켓보다 좁게 만들었다.
    // 블록으로 두면 제 폭을 쓴다 (e2e `student-live-and-flows.spec.ts` 가 그 폭을 잰다).
    <div className="space-y-4">
      <BackLink href="/classbot/me">내 정보</BackLink>

      <PageHeader eyebrow={{ icon: BarChart3, text: '학습 기록' }} title="성취기준 달성도" />

      {myBots.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="아직 쌓인 학습 기록이 없어요"
          description="선생님께 받은 참여 코드로 클래스에 참여하고 과제를 풀면 여기에 기록이 쌓여요."
          action={{ href: '/classbot/classroom', label: '참여 코드', ariaLabel: '참여 코드 입력하러 가기' }}
        />
      ) : (
        <EmptyState
          icon={LineChart}
          title="아직 보여 줄 학습 기록이 없어요"
          description="봇과 공부하고 과제를 내면 여기에 하나씩 모여요."
        />
      )}
    </div>
  );
}
