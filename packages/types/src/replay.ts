// ============================================================================
// 리플레이 시험지 문항 — FE↔BE 공유 타입 (Slice 1).
// 권위 ExamQuestion(apps/classbot lib/mock/classbot-replay-exam.ts)과 1:1.
// FE 렌더러(ExamSheet)와 BE(qgen-ai 원시 출력 매핑)가 같은 문항 형태를 쓰도록 공유한다.
//
// 재응시 응답 envelope(ReplayRequizResponse)는 BE(#152)가 BE-local DTO 로 먼저 구현했고,
// 이제 FE(PR-6)가 import 할 수 있도록 공유로 승격한다 — questions 는 ReplayQuestion[] 재사용.
// BE↔qgen-ai 내부 계약 타입은 apps/backend 소유 — 공유 패키지에 노출하지 않는다.
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
  /** ①~⑤ 보기(모의고사 5지선다 전제). */
  options: string[];
  answerIndex: number;
  /** 제출 후 해설 */
  explanation: string;
  /** 시험지 헤더 라벨 — "영어 · 빈칸 추론" 등 */
  subjectLabel: string;
}

/**
 * classbot BE → FE 재응시 응답 envelope. (BE #152 의 BE-local DTO 와 동형 — 공유 승격.)
 * qgen-ai 장애/flag-off 시 mock 폴백이면 degraded=true (형태는 동일).
 */
export interface ReplayRequizResponse {
  replayId: string;
  /** classbot 시도 식별자 — 실 경로는 qgen setQuestionId, mock 폴백은 mock id. */
  attemptId: string;
  questions: ReplayQuestion[];
  /** mock 폴백 여부(graceful degrade). */
  degraded: boolean;
  /** ISO 8601. */
  generatedAt: string;
}
