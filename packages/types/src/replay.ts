// ============================================================================
// 리플레이 시험지 문항 — FE↔BE 공유 타입 (Slice 1).
// 권위 ExamQuestion(apps/classbot lib/mock/classbot-replay-exam.ts)과 1:1.
// FE 렌더러(ExamSheet)와 BE(qgen-ai 원시 출력 매핑)가 같은 문항 형태를 쓰도록 공유한다.
//
// 응답 envelope(재응시 N문항·시도 메타)는 BE API spec 확정 후 별도 PR(PR-5)에서 추가한다 —
// 아직 권위 spec 에 없는 형태를 공유 계약으로 미리 굳히지 않는다(Codex #150).
// BE↔qgen-ai 내부 계약 타입도 apps/backend(PR-5) 소유 — 공유 패키지에 노출하지 않는다.
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
