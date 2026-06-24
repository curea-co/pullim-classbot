import { type ClassBot } from '@/lib/mock/classbot';
import { useStudentMode } from './student-mode';
import { useMyClassBots } from './class-enrollment';
import { useEnrolledTutors } from './self-learning';

/**
 * 현재 학습 모드에 맞는 학생 봇 목록 (reactive).
 *
 * spec §2 — "학생은 둘 다 가질 수 있으나 각 모드는 자기 목록만 노출":
 *   - class 모드 → 교사 배정 봇(class-enrollment)
 *   - self  모드 → 자기 등록 공식 튜터(self-learning)
 *
 * `OfficialTutor`는 `ClassBot`을 확장하므로 두 모드 모두 `ClassBot[]`로 통일해 노출한다.
 * 채팅·웰빙 등 "모드 공유" 화면이 모드 분기 없이 두 소스를 섞지 않도록 이 단일 소스를 쓴다.
 */
export function useModeBots(): ClassBot[] {
  const { mode } = useStudentMode();
  const classBots = useMyClassBots();
  const tutors = useEnrolledTutors();
  return mode === 'class' ? classBots.map((c) => c.bot) : tutors;
}
