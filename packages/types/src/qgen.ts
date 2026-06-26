// ============================================================================
// qgen-ai 문제 생성 계약 (Slice 1). spec §2.
// classbot BE → qgen-ai 요청 / qgen-ai → classbot 응답의 형태.
// 런타임 검증은 BE QgenClient(PR-5)에서 — 본 파일은 타입 계약만.
// ============================================================================

/** 커리큘럼 좌표 (성취기준 ID 가 없을 때 과목/단원으로 지정). */
export interface SubjectCoords {
  subjectId: string;
  unitId: string;
}

/** classbot BE → qgen-ai 문제 생성 요청. achievementStandardId 또는 subjectCoords 중 하나 필수(런타임 검증은 BE). */
export interface QgenQuizRequest {
  achievementStandardId?: string;
  subjectCoords?: SubjectCoords;
  /** 1(쉬움)~5(어려움). */
  difficulty: number;
  /** 생성 문항 수. */
  count: number;
  /** structured outputs 강제 — 자유형 파싱 없음. */
  format: 'structured';
  /** 학생이 틀린 문항 기반 생성(generate_by_example) 시드. */
  seedExampleId?: string;
}

/** qgen-ai 가 반환하는 QC 통과 문항(structured). */
export interface GeneratedQuestion {
  /** 지문(있을 때만 — 독해형). */
  passage?: string;
  stem: string;
  choices: string[];
  /** 정답 인덱스(0-based, choices 범위 내 — 런타임 검증은 BE). */
  answerIndex: number;
  rationale: string;
  /** 근거 성취기준 ID(추적성). */
  sourceStandardId: string;
}

/** qgen-ai 응답 envelope. */
export interface QgenQuizResponse {
  questions: GeneratedQuestion[];
}

/**
 * classbot BE → FE 재응시 응답.
 * classbot 가 자체 소유하는 시도 메타(attemptId)를 포함.
 * qgen-ai 장애 시 mock 폴백이면 degraded=true (응답 형태는 동일).
 */
export interface ReplayRequizResponse {
  replayId: string;
  /** classbot DB replay_attempt row id. */
  attemptId: string;
  questions: GeneratedQuestion[];
  /** mock 폴백 여부(graceful degrade). */
  degraded: boolean;
  /** ISO 8601. */
  generatedAt: string;
}
