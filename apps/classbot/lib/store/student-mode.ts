import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useClassEnrollmentStore } from './class-enrollment';
import { useStoresHydrated } from './use-hydrated';

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
 *
 * `hydrated`: persist 스토어(student-mode·class-enrollment)는 SSR·첫 클라이언트 페인트 시점엔
 * 빈 초기 상태로 평가된다(localStorage 미반영). 그 시점의 `mode`는 신뢰할 수 없으므로,
 * 소비부는 `hydrated`가 true가 된 뒤에만 모드 기반 분기를 렌더해야 한다 — 그렇지 않으면
 * 이미 참여한 학생이 잠깐 `self`/빈 `TeacherClassHome`을 봤다가 바뀌는 플래시·하이드레이션 불일치가 난다.
 * `useStoresHydrated`는 단순 mount가 아니라 두 스토어의 실제 `persist.hasHydrated()` 완료를 본다.
 */
export function useStudentMode(): { mode: StudentMode; setMode: (m: StudentMode) => void; toggle: () => void; hydrated: boolean } {
  const stored = useStudentModeStore((s) => s.mode);
  const setMode = useStudentModeStore((s) => s.setMode);
  const enrollmentCount = useClassEnrollmentStore((s) => s.enrollments.length);
  const hydrated = useStoresHydrated(useStudentModeStore, useClassEnrollmentStore);
  const mode: StudentMode = stored ?? (enrollmentCount > 0 ? 'class' : 'self');
  const toggle = () => setMode(mode === 'class' ? 'self' : 'class');
  return { mode, setMode, toggle, hydrated };
}
