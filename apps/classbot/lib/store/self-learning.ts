/**
 * 자기주도 수강 상태 — 학생 ↔ 공식 튜터(teacher-free) 등록 관리.
 * localStorage persist 로 세션 간 유지.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getOfficialTutor, type OfficialTutor, type TutorUnit } from '@/lib/mock/classbot-official';

export type SelfEnrollment = {
  tutorId: string;
  enrolledAt: string;
};

export type LearningGoal = {
  tutorId: string;
  unitId: string;
  addedAt: string;
};

export type Streak = {
  count: number;
  lastStudyDate: string | null;
};

interface SelfLearningStore {
  enrollments: SelfEnrollment[];
  goals: LearningGoal[];
  streak: Streak;
  enroll: (tutorId: string) => void;
  unenroll: (tutorId: string) => void;
  addGoal: (tutorId: string, unitId: string) => void;
  removeGoal: (tutorId: string, unitId: string) => void;
  recordStudyToday: (today?: string) => void;
}

export const useSelfLearningStore = create<SelfLearningStore>()(
  persist(
    (set, get) => ({
      enrollments: [],
      goals: [],
      streak: { count: 0, lastStudyDate: null },

      enroll: (tutorId) => {
        const already = get().enrollments.some((e) => e.tutorId === tutorId);
        if (already) return;
        set((s) => ({
          enrollments: [
            ...s.enrollments,
            { tutorId, enrolledAt: new Date().toISOString() },
          ],
        }));
      },

      unenroll: (tutorId) => {
        set((s) => ({
          enrollments: s.enrollments.filter((e) => e.tutorId !== tutorId),
        }));
      },

      addGoal: (tutorId, unitId) => {
        const already = get().goals.some(
          (g) => g.tutorId === tutorId && g.unitId === unitId,
        );
        if (already) return;
        set((s) => ({
          goals: [
            ...s.goals,
            { tutorId, unitId, addedAt: new Date().toISOString() },
          ],
        }));
      },

      removeGoal: (tutorId, unitId) => {
        set((s) => ({
          goals: s.goals.filter(
            (g) => !(g.tutorId === tutorId && g.unitId === unitId),
          ),
        }));
      },

      recordStudyToday: (today = new Date().toISOString().slice(0, 10)) => {
        const { streak } = get();
        if (streak.lastStudyDate === today) return;
        const isConsecutive =
          streak.lastStudyDate !== null &&
          Date.parse(today) - Date.parse(streak.lastStudyDate) === 86400000;
        set({
          streak: {
            count: isConsecutive ? streak.count + 1 : 1,
            lastStudyDate: today,
          },
        });
      },
    }),
    { name: 'pullim-self-learning' },
  ),
);

export function useSelfEnrollments(): SelfEnrollment[] {
  return useSelfLearningStore((s) => s.enrollments);
}

export function useIsEnrolled(tutorId: string): boolean {
  return useSelfLearningStore((s) =>
    s.enrollments.some((e) => e.tutorId === tutorId),
  );
}

export function useEnrolledTutors(): OfficialTutor[] {
  const enrollments = useSelfLearningStore((s) => s.enrollments);
  return enrollments
    .map((e) => getOfficialTutor(e.tutorId))
    .filter((t): t is OfficialTutor => t !== undefined);
}

export function useGoals(): LearningGoal[] {
  return useSelfLearningStore((s) => s.goals);
}

export function useIsGoal(tutorId: string, unitId: string): boolean {
  return useSelfLearningStore((s) =>
    s.goals.some((g) => g.tutorId === tutorId && g.unitId === unitId),
  );
}

export function useTutorGoals(tutorId: string): LearningGoal[] {
  const goals = useSelfLearningStore((s) => s.goals);
  return goals.filter((g) => g.tutorId === tutorId);
}

export function useStreak(): Streak {
  return useSelfLearningStore((s) => s.streak);
}

export function useTodayOneThing(): { tutor: OfficialTutor; unit: TutorUnit } | null {
  const goals = useSelfLearningStore((s) => s.goals);
  for (const g of goals) {
    const tutor = getOfficialTutor(g.tutorId);
    if (!tutor) continue;
    const unit = tutor.curriculum.find((u) => u.id === g.unitId);
    if (!unit) continue;
    return { tutor, unit };
  }
  return null;
}
