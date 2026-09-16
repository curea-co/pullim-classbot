/**
 * 교사 클래스 참여(enrollment) 상태 — 예전 데모 코드로 들어온 로컬 방의 목록과 나가기.
 * localStorage persist로 세션 간 유지. self-learning 스토어 패턴을 그대로 따른다.
 *
 * **로컬 전용 캐시다 — 은퇴 대상(2026-09-16 계획 §10 결정 ① · PR 5).** 학생의 반 참여·내 반 목록은
 * 이제 pullim-api 정본이 진실이고 화면은 react-query 훅으로 읽는다(`hooks/api/classroom.ts` 의
 * `useJoinByCode`·`useMyClassrooms` → `components/classbot/home/my-rooms.ts`).
 *
 * 계획 PR 4 가 이 스토어에서 걷은 것: 데모 코드 `join`(`resolveClassCode`)과 그 결과 타입, 카탈로그
 * 브리지 `useMyClassBots` — 호출부(`join-code-form.tsx` 목 폴백 · `my-rooms.ts` 로컬 폴백)를 그 PR 이
 * 지웠기 때문이다. `USE_REAL_CORE_BE` 플래그로 켜던 정본 동기화 레인도 같은 이유로 없다.
 *
 * 남은 것과 남은 이유:
 *  - `enrollments` — 하이드레이션 게이트(`useStoresHydrated(useClassEnrollmentStore)`) 여섯 곳과
 *    받은 과제 목록의 데모 필터(`app/(student)/classbot/assignment/page.tsx`)가 읽는다.
 *  - `leave` — 내 수업방의 「나가기」(`app/(student)/classbot/classroom/page.tsx`). 로컬 방(`source='local'`)
 *    에만 붙는데 그 방은 더 만들어지지 않는다 — 서버 탈퇴 문과 함께 PR 5 가 정리한다.
 * 이 persist 의 은퇴는 챗이 반을 고르게 되는 PR 5 다(계획 §07 「class-enrollment persist」).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudentEnrollment } from '@/lib/mock/classbot';

interface ClassEnrollmentStore {
  enrollments: StudentEnrollment[];
  /** 클래스 나가기 — botId의 enrollment 제거. */
  leave: (botId: string) => void;
}

export const useClassEnrollmentStore = create<ClassEnrollmentStore>()(
  persist(
    (set) => ({
      enrollments: [],
      leave: (botId) =>
        set((s) => ({ enrollments: s.enrollments.filter((e) => e.botId !== botId) })),
    }),
    { name: 'pullim-class-enrollment' },
  ),
);

/** 참여 중인 enrollment 목록 (reactive). */
export function useClassEnrollments(): StudentEnrollment[] {
  return useClassEnrollmentStore((s) => s.enrollments);
}
