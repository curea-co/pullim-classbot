/**
 * 교사 클래스 참여(enrollment) 상태 — 참여 코드로 join, 나가기로 leave.
 * localStorage persist로 세션 간 유지. self-learning 스토어 패턴을 그대로 따른다.
 *
 * 출시 기준 mock `studentEnrollments`는 빈 배열이므로, 학생의 교사 배정은 이 스토어가 권위.
 * `getMyBots()`(static)의 reactive 대체로 `useMyClassBots()`를 쓴다.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';
import { resolveClassCode } from '@/lib/mock/class-codes';

export type JoinResult =
  | { ok: true; enrollment: StudentEnrollment }
  | { ok: false; error: string };

interface ClassEnrollmentStore {
  enrollments: StudentEnrollment[];
  /** 참여 코드로 join. 유효하면 enrollment 추가(중복 무시), 아니면 error. */
  join: (code: string) => JoinResult;
  /** 클래스 나가기 — botId의 enrollment 제거. */
  leave: (botId: string) => void;
}

export const useClassEnrollmentStore = create<ClassEnrollmentStore>()(
  persist(
    (set, get) => ({
      enrollments: [],
      join: (code) => {
        const enrollment = resolveClassCode(code);
        if (!enrollment) {
          return {
            ok: false,
            error: '참여할 수 없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.',
          };
        }
        const already = get().enrollments.some((e) => e.botId === enrollment.botId);
        if (!already) {
          set((s) => ({ enrollments: [enrollment, ...s.enrollments] }));
        }
        return { ok: true, enrollment };
      },
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

/**
 * enrollment → classBots 카탈로그 브릿지 (reactive).
 * 정적 `getMyBots()`의 store 기반 대체 — join/leave 시 소비 컴포넌트가 re-render된다.
 */
export function useMyClassBots(): { bot: ClassBot; enrollment: StudentEnrollment }[] {
  const enrollments = useClassEnrollmentStore((s) => s.enrollments);
  return enrollments
    .map((enrollment) => {
      const bot = classBots.find((b) => b.id === enrollment.botId);
      return bot ? { bot, enrollment } : null;
    })
    .filter((x): x is { bot: ClassBot; enrollment: StudentEnrollment } => x !== null);
}
