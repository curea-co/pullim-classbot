/**
 * 교사 관제 지표 mock — 학급 한 반(중1-3반 과학 · 과학봇) 스냅샷.
 *
 * 조사 근거로 고른 지표만 담는다.
 *  - 총량 사용 지표(오늘 대화 수 같은 것)는 담지 않는다 — 교사 워크숍에서 노이즈로 분류됐다.
 *  - 담는 것: 도달 상태 · 요구 수준 대비 깊이 · 지름길 시도 · 마지막 활동 시각.
 *    (K-12 878명·39개 학급 연구가 대시보드에 넣으라고 지목한 것 = 진행 상태 + 마지막 활동 시각)
 *  - 감정·집중도·체류시간은 담지 않는다 — 지표 타당도가 약하고 학생 수용도 조사에서 선을 넘는다.
 *
 * 더미 숫자를 조사 실측에 맞춰 둔 곳:
 *  - 진행은 도달/부분인데 목표 사고 수준에 못 닿은 학생 8/20 = 40% (실측 37.7%)
 *  - 지름길 시도 = 정답 요구 22 + 붙여넣기성 입력 10 → 22:10 ≈ 15.1% : 6.9% 비율
 *
 * 요약값(monitoringSummary)·다시 가르칠 개념(reteachConcepts)은 아래 roster 에서 **계산**한다.
 * 직접 쓴 숫자가 아니므로 roster 를 고치면 요약도 같이 움직인다.
 */

/** 성취기준 도달 상태 3값 */
export type ReachStatus = 'reached' | 'partial' | 'not-reached';

/** 교사가 의도한 사고 수준 (1~4) */
export type ThinkingDepth = 1 | 2 | 3 | 4;

export type MonitoredStudent = {
  id: string;
  /** 가명 */
  name: string;
  grade: string;
  reach: ReachStatus;
  /** 과제가 요구한 사고 수준 */
  targetDepth: ThinkingDepth;
  /** 대화에서 실제로 닿은 사고 수준 */
  actualDepth: ThinkingDepth;
  /** 답을 그냥 알려 달라고 요구한 횟수 */
  answerAsks: number;
  /** 붙여넣기성 입력(직접 쓰지 않고 통째로 넣은 것) 횟수 */
  pasteLikes: number;
  /** 마지막 활동 이후 지난 분 — 「n분 전 · n시간 전 · n일 전」 배지의 유일한 원천 */
  lastSeenMin: number;
  /** 대화에서 막힌 개념 — 학급 「다시 가르칠 개념」의 원천 */
  stuckConcepts: string[];
};

export const reachLabels: Record<ReachStatus, string> = {
  reached: '도달',
  partial: '부분',
  'not-reached': '미도달',
};

/** 사고 수준 눈금 — 「목표 3 · 닿음 2」의 3, 2 가 무엇인지 읽어주는 이름 */
export const depthLabels: Record<ThinkingDepth, string> = {
  1: '기억해 말하기',
  2: '절차 적용하기',
  3: '이유 설명하기',
  4: '새 상황에 옮기기',
};

/** 이 스냅샷이 보는 학급 */
export const monitoredClass = {
  classroomLabel: '중1-3반 과학',
  botName: '과학봇',
  teacherName: '박지훈 선생님',
  unit: '물질의 상태 변화',
  updatedAtLabel: '오후 4:26 기준',
};

/**
 * 기준 시각(오후 4:26)에서 오늘 자정까지 거슬러 간 분.
 * 마지막 활동이 이보다 오래됐으면 오늘은 한 번도 안 들어온 것이다 —
 * 「오늘 안 들어옴」 카드와 줄의 최근 접속 배지가 이 선 하나를 같이 읽는다.
 */
export const MINUTES_TODAY = 16 * 60 + 26;

/** 개념 카탈로그 — stuckConcepts 의 id 출처 */
const conceptCatalog: { id: string; label: string; nextStep: string }[] = [
  { id: 'heat-latent',    label: '숨은열 (녹는열·끓는열)',  nextStep: '다음 수업 도입 10분에 얼음물 그래프로 다시' },
  { id: 'graph-plateau',  label: '상태 변화 그래프의 평평한 구간', nextStep: '그래프 한 장 띄우고 평평한 구간 이유만 묻기' },
  { id: 'temp-vs-heat',   label: '온도와 열의 구분',         nextStep: '온도계 눈금 vs 열의 양, 예시 두 개로 비교' },
  { id: 'particle-motion', label: '입자의 운동과 배열',       nextStep: '입자 모형 그리기 5분 활동으로 확인' },
  { id: 'boil-vs-evap',   label: '끓음과 증발의 차이',        nextStep: '빨래 마르기 · 물 끓이기 두 장면 비교' },
  { id: 'mass-conserve',  label: '상태가 변해도 질량은 그대로', nextStep: '저울 시연 영상 1분 + 예상 적어보기' },
];

/**
 * 학생 20명 스냅샷.
 * 도달 8 · 부분 8 · 미도달 4, 오늘 미접속 3명.
 *
 * 도달 배지 3값(도달·미달·미도달)은 서로 배타라 「도달인데 사고 수준은 모자란 학생」이 있으면 안 된다.
 * 성취기준에 닿았어도 요구한 수준엔 못 미친 학생은 `partial` 로 둔다 — 그래야 상단 카드 숫자와 줄 배지 수가 같다.
 */
export const monitoredRoster: MonitoredStudent[] = [
  { id: 'm01', name: '김서연', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 1, pasteLikes: 0, lastSeenMin: 2,  stuckConcepts: [] },
  { id: 'm02', name: '이준서', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 0, pasteLikes: 0, lastSeenMin: 5,  stuckConcepts: [] },
  { id: 'm03', name: '박하람', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 2, pasteLikes: 1, lastSeenMin: 8,  stuckConcepts: ['graph-plateau', 'heat-latent'] },
  { id: 'm04', name: '최도현', grade: '중1', reach: 'not-reached', targetDepth: 3, actualDepth: 1, answerAsks: 4, pasteLikes: 2, lastSeenMin: 12, stuckConcepts: ['heat-latent', 'temp-vs-heat', 'graph-plateau'] },
  { id: 'm05', name: '정예린', grade: '중1', reach: 'reached',     targetDepth: 2, actualDepth: 2, answerAsks: 0, pasteLikes: 0, lastSeenMin: 3,  stuckConcepts: [] },
  { id: 'm06', name: '강주원', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 1, pasteLikes: 0, lastSeenMin: 6,  stuckConcepts: [] },
  { id: 'm07', name: '조은채', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 2, pasteLikes: 1, lastSeenMin: 15, stuckConcepts: ['heat-latent', 'temp-vs-heat'] },
  { id: 'm08', name: '윤시우', grade: '중1', reach: 'not-reached', targetDepth: 3, actualDepth: 1, answerAsks: 3, pasteLikes: 2, lastSeenMin: 21, stuckConcepts: ['heat-latent', 'particle-motion', 'graph-plateau'] },
  { id: 'm09', name: '임나린', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 1, pasteLikes: 1, lastSeenMin: 9,  stuckConcepts: ['boil-vs-evap'] },
  { id: 'm10', name: '한건우', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 0, pasteLikes: 0, lastSeenMin: 4,  stuckConcepts: [] },
  { id: 'm11', name: '오소율', grade: '중1', reach: 'reached',     targetDepth: 4, actualDepth: 4, answerAsks: 0, pasteLikes: 0, lastSeenMin: 7,  stuckConcepts: [] },
  { id: 'm12', name: '서재이', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 2, pasteLikes: 1, lastSeenMin: 18, stuckConcepts: ['graph-plateau', 'boil-vs-evap'] },
  { id: 'm13', name: '신윤서', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 0, pasteLikes: 0, lastSeenMin: 5,  stuckConcepts: [] },
  { id: 'm14', name: '권태민', grade: '중1', reach: 'not-reached', targetDepth: 2, actualDepth: 1, answerAsks: 1, pasteLikes: 0, lastSeenMin: 3 * 24 * 60, stuckConcepts: ['particle-motion', 'mass-conserve'] },
  { id: 'm15', name: '황아인', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 1, pasteLikes: 1, lastSeenMin: 11, stuckConcepts: ['temp-vs-heat'] },
  { id: 'm16', name: '안리아', grade: '중1', reach: 'reached',     targetDepth: 3, actualDepth: 3, answerAsks: 0, pasteLikes: 0, lastSeenMin: 6,  stuckConcepts: [] },
  { id: 'm17', name: '배서진', grade: '중1', reach: 'not-reached', targetDepth: 3, actualDepth: 1, answerAsks: 2, pasteLikes: 1, lastSeenMin: 24, stuckConcepts: ['heat-latent', 'graph-plateau', 'mass-conserve'] },
  { id: 'm18', name: '문준호', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 1, pasteLikes: 0, lastSeenMin: 13, stuckConcepts: ['temp-vs-heat', 'heat-latent'] },
  { id: 'm19', name: '남유하', grade: '중1', reach: 'partial',     targetDepth: 2, actualDepth: 1, answerAsks: 1, pasteLikes: 0, lastSeenMin: 20 * 60 + 14, stuckConcepts: ['particle-motion'] },
  { id: 'm20', name: '장현우', grade: '중1', reach: 'partial',     targetDepth: 3, actualDepth: 2, answerAsks: 0, pasteLikes: 0, lastSeenMin: 21 * 60 + 46, stuckConcepts: ['boil-vs-evap'] },
];

/** 지름길 시도 = 정답 요구 + 붙여넣기성 입력. 처벌 신호가 아니라 과제·프롬프트 설계 신호. */
export function shortcutTries(s: MonitoredStudent): number {
  return s.answerAsks + s.pasteLikes;
}

/** 오늘 한 번도 안 들어온 학생 — 마지막 활동이 오늘 자정보다 앞선 경우 */
export function isOfflineToday(s: MonitoredStudent): boolean {
  return s.lastSeenMin > MINUTES_TODAY;
}

/**
 * 줄에 붙는 도달 배지 3값 — **서로 배타**다. 한 학생이 동시에 둘일 수 없다.
 *   - `reached`     도달   성취기준에 닿았고 요구한 사고 수준도 채웠다
 *   - `depth-short` 미달   닿긴 했는데 요구한 사고 수준엔 못 미쳤다
 *   - `not-reached` 미도달 성취기준까지 못 갔다
 *
 * 상단 카드 세 장(도달 · 미도달 · 목표 수준 미달)이 이 셋을 그대로 가리킨다.
 * 판정은 여기 한 곳에서만 한다 — 화면마다 따로 재면 카드 숫자와 배지 수가 어긋난다.
 */
export type ReachBadge = 'reached' | 'depth-short' | 'not-reached';

export function reachBadge(s: MonitoredStudent): ReachBadge {
  if (s.reach === 'not-reached') return 'not-reached';
  return s.actualDepth < s.targetDepth ? 'depth-short' : 'reached';
}

export const reachBadgeLabels: Record<ReachBadge, string> = {
  reached: '도달',
  'depth-short': '미달',
  'not-reached': '미도달',
};

/**
 * 진행은 도달/부분으로 보이는데 요구한 사고 수준엔 못 닿은 학생.
 * 진행률로는 안 잡히는 구멍 — 배지와 같은 판정을 읽는다.
 */
export function isDepthShort(s: MonitoredStudent): boolean {
  return reachBadge(s) === 'depth-short';
}

/** 이 뒤로는 날짜를 세지 않는다 — 30일이 지나면 「오래됨」 한 마디 */
export const STALE_AFTER_MIN = 30 * 24 * 60;

/**
 * 최근 접속 배지 문구 — 분 · 시간 · 일 세 단위로만 말한다.
 * 「어제 오후 8:12」처럼 줄마다 모양이 다른 문구는 20줄을 훑을 때 눈이 걸린다.
 */
export function relativeSeenLabel(min: number): string {
  if (min >= STALE_AFTER_MIN) return '오래됨';
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  if (min < 24 * 60) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / (24 * 60))}일 전`;
}

/** 마지막 활동 표시 문구 */
export function lastSeenText(s: MonitoredStudent): string {
  return relativeSeenLabel(s.lastSeenMin);
}

/** 정렬 키 — 오래된 순. 오늘 미접속은 지난 분이 크므로 자연히 뒤로 간다. */
export function lastSeenRank(s: MonitoredStudent): number {
  return s.lastSeenMin;
}

/** 이 학생이 대화에서 막힌 개념 — 첫 한 가지만. 없으면 빈 문자열 */
export function stuckConceptLabel(s: MonitoredStudent): string {
  const first = s.stuckConcepts[0];
  return conceptCatalog.find(c => c.id === first)?.label ?? '';
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** 상단 요약 — roster 에서 계산 (직접 쓴 숫자 아님) */
export const monitoringSummary = {
  total: monitoredRoster.length,
  reached: monitoredRoster.filter(s => s.reach === 'reached').length,
  partial: monitoredRoster.filter(s => s.reach === 'partial').length,
  notReached: monitoredRoster.filter(s => s.reach === 'not-reached').length,
  depthShort: monitoredRoster.filter(isDepthShort).length,
  answerAsks: sum(monitoredRoster.map(s => s.answerAsks)),
  pasteLikes: sum(monitoredRoster.map(s => s.pasteLikes)),
  shortcutTries: sum(monitoredRoster.map(shortcutTries)),
  offlineToday: monitoredRoster.filter(isOfflineToday).length,
};

export type ReteachConcept = {
  id: string;
  label: string;
  /** 이 개념에서 막힌 학생 수 */
  studentCount: number;
  studentNames: string[];
  /** 다음 수업에서 뭘 할지 */
  nextStep: string;
};

/**
 * 학급에서 공통으로 무너진 개념 — 빈도순.
 * 교사가 원한다고 답한 건 개인 20명치 숫자가 아니라 「다음 시간에 다시 가르칠 개념」 목록이다.
 * 동률이면 카탈로그 순서를 따른다(표시 순서 고정).
 */
export function buildReteachConcepts(
  roster: MonitoredStudent[] = monitoredRoster,
  limit = 3,
): ReteachConcept[] {
  return conceptCatalog
    .map(c => {
      const names = roster.filter(s => s.stuckConcepts.includes(c.id)).map(s => s.name);
      return { id: c.id, label: c.label, studentCount: names.length, studentNames: names, nextStep: c.nextStep };
    })
    .filter(c => c.studentCount > 0)
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, limit);
}

export const reteachConcepts: ReteachConcept[] = buildReteachConcepts();
