/**
 * 웰빙 페이지 담당 봇 코멘트 합성.
 * 권위: [13 § 3.3.3·9.3](proc/spec/13-reports-and-emotion-checkin.md) — 가장 점수 낮은 영역의 담당 봇이 한 줄 코멘트 + actionable CTA.
 */

import { getMyBots, getWellbeingTrend, type EmotionMood, type ClassBot } from './classbot';

export type WellnessBotComment = {
  bot: ClassBot;
  /** 봇 톤에 맞춘 1줄 코멘트 */
  text: string;
  /** actionable CTA — 1 문항/짧은 세션/대화 진입 등 */
  ctaLabel: string;
  ctaHref: string;
  /** "가장 낮은 영역" 정보 (디버그/툴팁용) */
  weakArea: '수면' | '집중' | '감정' | '사회' | '학업';
  /** [13 § 3.3.3·9.3] 메타 표시용 시간 ("HH:MM"). 시연용 fixed — v1에서 동적 생성. */
  timeLabel: string;
};

/**
 * 5지표 영역 → 담당 봇 매핑 (시연용).
 * 영역별로 가장 자연스러운 봇을 고른다. 실제로는 학생·학원별 동적 매핑.
 */
const AREA_TO_BOT_KIND: Record<string, 'math' | 'english' | 'science' | 'korean' | 'social'> = {
  '수면':  'social',   // 생활 코치
  '집중': 'math',     // 학업 코어 = 수학
  '감정': 'korean',   // 감정·언어
  '사회': 'english',  // 소통
  '학업': 'math',
};

/** 봇별 한 줄 코멘트 시드 — 어조에 맞춘 격려 + actionable. */
const TEXT_BY_KIND: Record<string, { text: string; cta: string }> = {
  math:    { text: '오늘 그럭저럭이었구나. 6일째 출석! 내일 1문항만 같이 풀어볼까?', cta: '좋아 → 1문항' },
  english: { text: '오늘 좀 무거웠어요? 짧은 지문 한 단락만 같이 봐요.',            cta: '좋아요 → 1단락' },
  science: { text: '컨디션 신경 쓰자. 짧은 실험 1개부터 같이 가보자.',             cta: '좋아 → 1실험' },
  korean:  { text: '오늘 기분은 어땠어요? 한 줄 일기처럼 짧게 적어볼래요?',        cta: '좋아요 → 한 줄' },
  social:  { text: '오늘도 잘 왔어! 5분짜리 시사 요약 한 편 같이 볼까?',           cta: '좋아 → 5분' },
};

/**
 * 학생의 오늘 웰빙 snapshot에서 가장 낮은 5지표 영역의 담당 봇 코멘트를 생성.
 * 분해 데이터가 없으면 null.
 */
export function getWellnessBotComment(studentId: string): WellnessBotComment | null {
  const trend = getWellbeingTrend(studentId);
  if (trend.length === 0) return null;
  const today = trend[trend.length - 1];
  const c = today.components;
  if (!c) return null;

  // 가장 낮은 지표 영역
  const entries: { key: keyof NonNullable<typeof c>; label: '수면' | '집중' | '감정' | '사회' | '학업' }[] = [
    { key: 'sleep',    label: '수면' },
    { key: 'focus',    label: '집중' },
    { key: 'mood',     label: '감정' },
    { key: 'social',   label: '사회' },
    { key: 'academic', label: '학업' },
  ];
  const lowest = entries.reduce((acc, cur) => (c[cur.key] < c[acc.key] ? cur : acc), entries[0]);
  const targetKind = AREA_TO_BOT_KIND[lowest.label];

  // 추출본 mock — 단일 학생(서연) 가정, studentId는 v2 대비 인자 보존
  void studentId;
  const myBots = getMyBots().map(b => b.bot);
  // 시연용 봇별 subject로 매칭 — 없으면 첫 봇 fallback
  const bot =
    myBots.find(b => {
      // 영역 → 봇 매핑이 subject 기반이므로 간단히 매칭
      if (targetKind === 'math')    return b.subject.includes('수학') || b.subject.includes('미적');
      if (targetKind === 'english') return b.subject.includes('영어');
      if (targetKind === 'science') return b.subject.includes('과학') || b.subject.includes('물리') || b.subject.includes('화학');
      if (targetKind === 'korean')  return b.subject.includes('국어') || b.subject.includes('문학');
      if (targetKind === 'social')  return b.subject.includes('사회') || b.subject.includes('한국사');
      return false;
    }) ?? myBots[0];
  if (!bot) return null;

  const seed = TEXT_BY_KIND[targetKind] ?? TEXT_BY_KIND.math;
  return {
    bot,
    text: seed.text,
    ctaLabel: seed.cta,
    ctaHref: `/classbot/chat?bot=${bot.id}`,
    weakArea: lowest.label,
    timeLabel: '19:55',  // 시연용 fixed — spec § 3.3.3 예시
  };
}

/**
 * 체크인 직후 봇 반응 ([13 § 3.3.4]) — 학생 입력한 mood에 따라 봇 한 줄 + actionable CTA.
 */
export function getCheckInReaction(studentId: string, mood: EmotionMood | null): WellnessBotComment | null {
  // 가장 낮은 영역 기반 봇 매칭은 동일 — 체크인 mood에 따라 텍스트만 조정
  const base = getWellnessBotComment(studentId);
  if (!base) return null;

  // mood가 낮을수록(3·4 = "그저그래"·"힘들었어") 더 부드럽게
  if (mood !== null && mood >= 3) {
    return {
      ...base,
      text: `오늘 좀 무거웠지. 6일째 출석! 내일은 짧게 1개만 같이 가보자.`,
      ctaLabel: '내일 1개',
    };
  }
  // 좋아·그럭저럭 — 정상 격려
  return base;
}
