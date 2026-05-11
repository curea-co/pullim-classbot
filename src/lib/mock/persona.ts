/**
 * 고등학생 페르소나 — 1차 타겟 (SKILL.md 1장).
 * 데모 화면은 이 한 명의 학생 시점에서 일관되게 표현.
 */

export type Persona = {
  id: string;
  name: string;
  grade: '고1' | '고2' | '고3' | '재수';
  track: '문과' | '이과' | '예체능';
  school: string;
  examDate: string;       // ISO date (수능 또는 다음 시험)
  examLabel: string;      // "2026 수능", "2학기 중간고사" 등
  focusSubjects: SubjectKey[];
  weeklyHours: number;    // 평균 주간 학습 시간
  preferredStudyTime: '아침' | '오후' | '저녁' | '심야';
  joinedAt: string;
  streakDays: number;
};

export type SubjectKey = 'korean' | 'math' | 'english' | 'science' | 'social' | 'history';

export const subjectLabels: Record<SubjectKey, string> = {
  korean:  '국어',
  math:    '수학',
  english: '영어',
  science: '과학',
  social:  '사회',
  history: '한국사',
};

export const currentPersona: Persona = {
  id: 'student_001',
  name: '서연',
  grade: '고2',
  track: '이과',
  school: '풀림고등학교',
  examDate: '2026-06-04',         // 6월 모의평가
  examLabel: '6월 모의평가',
  focusSubjects: ['math', 'english', 'science'],
  weeklyHours: 28,
  preferredStudyTime: '저녁',
  joinedAt: '2026-01-12',
  streakDays: 17,
};

/** 오늘 기준 D-day (음수면 종료) */
export function getDday(persona: Persona, today = new Date()): number {
  const exam = new Date(persona.examDate);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** 한국어 받침 보유 여부 — 한 글자 단위로 판정 */
function hasFinalConsonant(char: string | undefined): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

/**
 * 한국어 조사 자동 분기 헬퍼.
 * 받침 유무에 따라 자연스러운 조사 선택. 페르소나 이름·과목 라벨 등에 사용.
 */
export function josa(word: string, kind: '이/가' | '을/를' | '은/는' | '와/과'): string {
  const has = hasFinalConsonant(word[word.length - 1]);
  switch (kind) {
    case '이/가': return word + (has ? '이' : '가');
    case '을/를': return word + (has ? '을' : '를');
    case '은/는': return word + (has ? '은' : '는');
    case '와/과': return word + (has ? '과' : '와');
  }
}
