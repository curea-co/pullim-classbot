import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useClassEnrollmentStore } from './class-enrollment';

export type StudentMode = 'class' | 'self';

interface StudentModeStore {
  /** null = 사용자가 아직 명시 선택 안 함 → 등록 기반 default 로 해석 */
  mode: StudentMode | null;
  setMode: (m: StudentMode) => void;
}

export const useStudentModeStore = create<StudentModeStore>()(
  persist(
    (set) => ({ mode: null, setMode: (m) => set({ mode: m }) }),
    { name: 'pullim-student-mode' },
  ),
);

/**
 * 효과적 모드 — 저장값 우선, 없으면 교사 enrollment 유무로 default (있음→class, 없음→self).
 * enrollment 권위는 class-enrollment 스토어(`pullim-class-enrollment`). spec §1 준수 —
 * 정적 `getMyBots()`(빈 배열)가 아니라 실제 참여 상태를 본다.
 */
export function useStudentMode(): { mode: StudentMode; setMode: (m: StudentMode) => void; toggle: () => void } {
  const stored = useStudentModeStore((s) => s.mode);
  const setMode = useStudentModeStore((s) => s.setMode);
  const enrollmentCount = useClassEnrollmentStore((s) => s.enrollments.length);
  const mode: StudentMode = stored ?? (enrollmentCount > 0 ? 'class' : 'self');
  const toggle = () => setMode(mode === 'class' ? 'self' : 'class');
  return { mode, setMode, toggle };
}
