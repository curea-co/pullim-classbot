// ============================================================================
// 리플레이 '다시 풀기' FE↔BE 공유 계약 (Slice 1).
// 문항 형태는 권위 ExamQuestion(apps/classbot lib/mock/classbot-replay-exam.ts)
// 렌더러 요구사항과 1:1 — 문단형 지문/〈보기〉/과목 라벨/해설을 보장한다.
// classbot BE 가 qgen-ai 원시 출력을 이 형태로 매핑한다.
// (BE↔qgen-ai 내부 계약 타입은 apps/backend 소유 — FE↔BE 공유 패키지에 노출하지 않는다.)
// ============================================================================

/** 국어/영어 지문 — serif 박스(문단 구조). 권위 ExamPassage 와 동일. */
export interface ReplayPassage {
  paragraphs: string[];
}

/** 수학/과학 〈보기〉·조건 박스. 권위 ExamBoxed 와 동일. */
export interface ReplayBoxed {
  lines: string[];
}

/** 시험지 렌더러가 요구하는 문항 형태(권위 ExamQuestion 과 1:1). */
export interface ReplayQuestion {
  /** 발문 */
  stem: string;
  passage?: ReplayPassage;
  boxed?: ReplayBoxed;
  /** ①~⑤ 보기 */
  options: string[];
  answerIndex: number;
  /** 제출 후 해설 */
  explanation: string;
  /** 시험지 헤더 라벨 — "영어 · 빈칸 추론" 등 */
  subjectLabel: string;
}

/**
 * classbot BE → FE 재응시 응답.
 * classbot 가 자체 소유하는 시도 메타(attemptId) 포함.
 * qgen-ai 장애 시 mock 폴백이면 degraded=true (응답 형태는 동일).
 */
export interface ReplayRequizResponse {
  replayId: string;
  /** classbot DB replay_attempt row id. */
  attemptId: string;
  questions: ReplayQuestion[];
  /** mock 폴백 여부(graceful degrade). */
  degraded: boolean;
  /** ISO 8601. */
  generatedAt: string;
}
