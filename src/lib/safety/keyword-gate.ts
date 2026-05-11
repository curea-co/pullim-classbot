/**
 * 키워드 게이트 — 학생 자기보고 텍스트에서 위기 시그널 감지.
 * spec 13 § 5.2.
 *
 * 정책:
 * - 화이트리스트 기반 (전체 검열 X)
 * - 강도 1~5: 5단계로 분류
 * - 강도 4+에서만 모달·3자 알림 트리거 (false-positive 방지)
 * - 학교 폭력은 Wee센터 대신 학교 상담교사 라우트 (v2 분리)
 */

export type CrisisCategory = 'suicidal' | 'depression' | 'bullying';
export type CrisisSeverity = 1 | 2 | 3 | 4 | 5;

export type KeywordHit = {
  category: CrisisCategory;
  severity: CrisisSeverity;
  /** 매치된 표현 (UI 노출 금지, 로그 한정) */
  matched: string;
};

type Rule = {
  category: CrisisCategory;
  severity: CrisisSeverity;
  patterns: RegExp[];
};

// 의도적으로 정규식만 — 외부 사전 의존 0.
// 화이트리스트는 추출본 단계 mock — v1에서 보안 감사 후 확장.
const rules: Rule[] = [
  {
    category: 'suicidal', severity: 5,
    patterns: [
      /자살/, /죽고\s*싶/, /죽어\s*버리/, /사라지고\s*싶/, /끝내고\s*싶/, /목숨\s*끊/,
    ],
  },
  {
    category: 'suicidal', severity: 4,
    patterns: [
      /살기\s*싫/, /살\s*가치\s*없/, /의미\s*없/, /존재하기\s*싫/,
    ],
  },
  {
    category: 'depression', severity: 4,
    patterns: [
      /우울/, /무기력/, /절망/, /희망\s*없/,
    ],
  },
  {
    category: 'depression', severity: 3,
    patterns: [
      /너무\s*힘들/, /지친다/, /지쳤어/, /버틸\s*수\s*없/,
    ],
  },
  {
    category: 'bullying', severity: 4,
    patterns: [
      /왕따/, /괴롭힘/, /때려/, /폭행/,
    ],
  },
];

/**
 * 텍스트에서 위기 시그널 매치.
 * 가장 높은 강도만 1개 리턴 (학생 화면 부하 방지).
 */
export function scanText(text: string): KeywordHit | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  let best: KeywordHit | null = null;
  for (const rule of rules) {
    for (const pat of rule.patterns) {
      const m = trimmed.match(pat);
      if (m) {
        if (!best || rule.severity > best.severity) {
          best = { category: rule.category, severity: rule.severity, matched: m[0] };
        }
      }
    }
  }
  return best;
}

/**
 * 모달·3자 알림 트리거 임계 — 강도 4 이상.
 * spec 13 § 5.2.
 */
export const CRISIS_TRIGGER_THRESHOLD: CrisisSeverity = 4;

export function shouldTrigger(hit: KeywordHit | null): boolean {
  return hit !== null && hit.severity >= CRISIS_TRIGGER_THRESHOLD;
}

/**
 * 3자 알림 mock — 교사 + 학부모(요약) + Wee센터.
 * P0은 console.log, 실 API는 v2.
 */
export function fireThreePartyAlert(hit: KeywordHit, context: { studentId?: string; source: string }) {
  // eslint-disable-next-line no-console
  console.log('[CRISIS 3-PARTY ALERT MOCK]', {
    category: hit.category,
    severity: hit.severity,
    studentId: context.studentId,
    source: context.source,
    notifiedAt: new Date().toISOString(),
    routes: ['teacher', 'parent-summary', 'wee-center-anonymized'],
  });
}
