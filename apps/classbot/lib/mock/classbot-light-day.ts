import { getWellbeingTrend, getCheckInsForStudent, type EmotionMood } from './classbot';

/**
 * 가벼운 모드(Light Day) 저조 판정. spec §5 + 권위(07 Flow D, 13 §4.3·§5.1·§8.2).
 *
 * 권위 문서의 개입 트리거는 좁다 — 단발 score<60/그저그래로 띄우지 않는다:
 *   - `flag`(below-60-3days = 3일 지속 저조, below-40-instant = 즉시) 가 있거나,
 *   - 최근 3일 연속 '힘들었어'(mood 4).
 * 순수 함수(테스트 용이) + 오늘 신호를 모으는 얇은 래퍼.
 */
export function isLowConditionDay(input: {
  flag?: string | null;
  /** 최근 체크인 mood, 최신(오늘)→과거 순. '3일 연속 힘듦' 판정용. */
  recentMoods: EmotionMood[];
}): boolean {
  if (input.flag) return true;
  const last3 = input.recentMoods.slice(0, 3);
  return last3.length >= 3 && last3.every(m => m === 4); // 3일 연속 '힘들었어'
}

/** 오늘 신호(웰빙 flag + 최근 3일 연속 체크인 mood)를 모아 저조 여부 반환. */
export function useLowConditionToday(studentId: string): boolean {
  // daysAgo===0 을 직접 찾는다 — trend 정렬(DESC) 내부 구현에 의존하지 않도록
  const today = getWellbeingTrend(studentId).find(s => s.daysAgo === 0);
  if (!today) return false;
  const checkIns = getCheckInsForStudent(studentId);
  // daysAgo 0,1,2 가 모두 있을 때만 연속 — 빠진 날이 있으면 연속 아님(undefined로 끊김)
  const recentMoods = [0, 1, 2]
    .map(d => checkIns.find(c => c.daysAgo === d)?.mood)
    .filter((m): m is EmotionMood => m != null);
  return isLowConditionDay({ flag: today.flag, recentMoods });
}
