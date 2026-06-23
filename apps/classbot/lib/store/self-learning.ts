/**
 * 자기주도 수강 상태 — 학생 ↔ 공식 튜터(teacher-free) 등록 관리.
 * localStorage persist 로 세션 간 유지.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getOfficialTutor, type OfficialTutor } from '@/lib/mock/classbot-official';

export type SelfEnrollment = {
  tutorId: string;
  enrolledAt: string;
};

interface SelfLearningStore {
  enrollments: SelfEnrollment[];
  enroll: (tutorId: string) => void;
  unenroll: (tutorId: string) => void;
}

export const useSelfLearningStore = create<SelfLearningStore>()(
  persist(
    (set, get) => ({
      enrollments: [],
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
