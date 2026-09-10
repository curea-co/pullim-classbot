import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useClassEnrollmentStore } from './class-enrollment';
import { useSelfLearningStore } from './self-learning';
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
 * 효과적 모드 — 저장값 우선, 없으면 항상 `class`(교사 수업).
 *
 * 기획 보류 — 자기주도 모드가 보류되어 헤더 토글(StudentModeToggle)을 비노출로 내렸다.
 * 그에 맞춰 default 도 `class` 로 고정한다(이전: 교사 enrollment 0개면 `self`).
 * 스토어 구조·`setMode` 계약은 그대로 두어 재개 시 이 한 줄만 되돌리면 된다.
 *
 * `hydrated`: persist 스토어(student-mode·class-enrollment)는 SSR·첫 클라이언트 페인트 시점엔
 * 빈 초기 상태로 평가된다(localStorage 미반영). 그 시점의 `mode`는 신뢰할 수 없으므로,
 * 소비부는 `hydrated`가 true가 된 뒤에만 모드 기반 분기를 렌더해야 한다 — 그렇지 않으면
 * 이미 참여한 학생이 잠깐 `self`/빈 `TeacherClassHome`을 봤다가 바뀌는 플래시·하이드레이션 불일치가 난다.
 * `useStoresHydrated`는 단순 mount가 아니라 실제 `persist.hasHydrated()` 완료를 본다.
 * mode 결정은 student-mode·class-enrollment에 달려 있지만, 모드별 봇 소스(self 모드 = self-learning)까지
 * 함께 기다려야 소비부가 `hydrated` 하나로 "모드+봇 준비됨"을 신뢰할 수 있다.
 */
export function useStudentMode(): { mode: StudentMode; setMode: (m: StudentMode) => void; toggle: () => void; hydrated: boolean } {
  const stored = useStudentModeStore((s) => s.mode);
  const setMode = useStudentModeStore((s) => s.setMode);
  const hydrated = useStoresHydrated(useStudentModeStore, useClassEnrollmentStore, useSelfLearningStore);
  const mode: StudentMode = stored ?? 'class';
  const toggle = () => setMode(mode === 'class' ? 'self' : 'class');
  return { mode, setMode, toggle, hydrated };
}
