/**
 * 봇대화 우측 레일·인라인 카드용 — 연습 퀴즈 + 학습 가이드.
 *
 * 데이터 권위는 `classbot-lesson.ts` 로 통합됐다(봇 주도 가이드 수업과 단일 출처 공유).
 * 이 파일은 기존 import 경로 호환을 위한 thin re-export.
 */

export {
  getChatQuizzes,
  getStudyGuide,
  type ChatQuiz,
  type StudyConcept,
} from './classbot-lesson';
