import { getWellbeingTrend, getCheckInsForStudent, type EmotionMood } from './classbot';

/**
 * 가벼운 모드(Light Day) 저조 판정. spec §5.
 * 오늘 웰빙 score<60 OR flag OR 오늘 체크인 mood≥3(그저그래/힘들었어) → 저조.
 * 순수 함수(테스트 용이) + 오늘 신호를 모으는 얇은 래퍼.
 */
export function isLowConditionDay(input: {
  score: number;
  flag?: string | null;
  mood: EmotionMood | null;
}): boolean {
  return input.score < 60 || Boolean(input.flag) || (input.mood != null && input.mood >= 3);
}

/** 오늘 신호(웰빙 snapshot + 오늘 체크인 mood)를 모아 저조 여부 반환. */
export function useLowConditionToday(studentId: string): boolean {
  const trend = getWellbeingTrend(studentId);
  const today = trend[trend.length - 1];
  if (!today) return false;
  const checkIns = getCheckInsForStudent(studentId);
  const todayMood = checkIns.find(c => c.daysAgo === 0)?.mood ?? null;
  return isLowConditionDay({ score: today.score, flag: today.flag, mood: todayMood });
}
