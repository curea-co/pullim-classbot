# Slice 1 / PR-1 — qgen-ai 통합 공유 타입 (packages/types) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slice 1(문제 생성)의 FE↔BE↔qgen-ai 계약을 `@pullim-classbot/types` 에 **plain TS 타입**으로 정의해, 이후 BE(PR-5)·FE(PR-6)가 동일 시그니처를 import 하게 한다.

**Architecture:** 기존 `packages/types` 컨벤션(plain TS 타입, BE source of truth, zod 미사용) 그대로 따른다. **런타임 검증은 이 패키지가 아니라 BE↔qgen-ai 경계(PR-5 `QgenClient`)에서** 수행한다(시스템 경계에서만 검증). 따라서 본 PR은 타입 + 컴파일타임 fixture 만 추가하고, 검증 도구는 `tsc --noEmit`.

**Tech Stack:** TypeScript 5.7(ESM), tsc(`bun --filter @pullim-classbot/types typecheck`). 새 의존성 없음.

## Global Constraints
- `packages/*` 컨벤션: plain TS 타입만, BE 가 source of truth, 임의 필드명 변경 금지. zod·런타임 의존성 추가 금지.
- 계약 필드는 spec `proc/spec/2026-06-26_qgen-ai-integration-design.md` §2 기준. qgen-ai 실제 필드명은 PR-3에서 `generation_schema.py` 에 핀(본 PR은 classbot 측 계약 형태).
- 검증: `bun --filter @pullim-classbot/types typecheck` (build 는 CI). 새 파일은 `src/` 아래, barrel(`src/index.ts`) 에서 export.
- 브랜치: `feat/qgen-types`(off `dev`). PR base = `dev`. FE/BE 코드 미포함(shared 단위 PR).

---

### Task 1: qgen-ai 생성 계약 타입 (요청·문항·응답)

**Files:**
- Create: `packages/types/src/qgen.ts`
- Create: `packages/types/src/qgen.types-test.ts` (컴파일타임 fixture — tsc 가 검증)

**Interfaces:**
- Produces:
  - `QgenQuizRequest` = `{ achievementStandardId?: string; subjectCoords?: { subjectId: string; unitId: string }; difficulty: number; count: number; format: 'structured'; seedExampleId?: string }`
  - `GeneratedQuestion` = `{ passage?: string; stem: string; choices: string[]; answerIndex: number; rationale: string; sourceStandardId: string }`
  - `QgenQuizResponse` = `{ questions: GeneratedQuestion[] }`

- [ ] **Step 1: 실패하는 컴파일타임 fixture 작성**

`packages/types/src/qgen.types-test.ts`:
```ts
// 컴파일타임 계약 검증 — 런타임 테스트 아님. `tsc --noEmit` 이 통과/실패로 판정한다.
import type { QgenQuizRequest, GeneratedQuestion, QgenQuizResponse } from './qgen';

// 유효한 요청(성취기준 기반)
export const validReq: QgenQuizRequest = {
  achievementStandardId: '9수03-01',
  difficulty: 3,
  count: 5,
  format: 'structured',
};

// 유효한 요청(좌표 기반 + seed)
export const validReqByCoords: QgenQuizRequest = {
  subjectCoords: { subjectId: 'math', unitId: 'u-3' },
  difficulty: 2,
  count: 3,
  format: 'structured',
  seedExampleId: 'q-42',
};

// 유효한 문항
export const validQ: GeneratedQuestion = {
  stem: '다음 중 옳은 것은?',
  choices: ['1', '2', '3', '4'],
  answerIndex: 2,
  rationale: '...',
  sourceStandardId: '9수03-01',
};

// 유효한 응답
export const validResp: QgenQuizResponse = { questions: [validQ] };

// format 은 리터럴 'structured' 만 허용 — 잘못된 값은 타입 에러여야 한다
// @ts-expect-error format 은 'structured' 리터럴
export const badFormat: QgenQuizRequest = { difficulty: 1, count: 1, format: 'freeform' };
```

- [ ] **Step 2: typecheck 로 실패 확인**

Run: `bun --filter @pullim-classbot/types typecheck`
Expected: FAIL — `Cannot find module './qgen'` (아직 미작성).

- [ ] **Step 3: 타입 구현**

`packages/types/src/qgen.ts`:
```ts
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
```

- [ ] **Step 4: typecheck 로 통과 확인**

Run: `bun --filter @pullim-classbot/types typecheck`
Expected: PASS (no errors). `@ts-expect-error` 라인이 실제로 에러를 잡아 통과.

- [ ] **Step 5: 커밋**

```bash
git add packages/types/src/qgen.ts packages/types/src/qgen.types-test.ts
git commit -m "feat(types): qgen-ai 생성 계약 타입(QgenQuizRequest/GeneratedQuestion/QgenQuizResponse)"
```

---

### Task 2: classbot BE→FE 재응시 응답 타입 + barrel export

**Files:**
- Modify: `packages/types/src/qgen.ts` (타입 추가)
- Modify: `packages/types/src/index.ts:7` (barrel 에 qgen export 추가)
- Modify: `packages/types/src/qgen.types-test.ts` (fixture 추가)

**Interfaces:**
- Consumes: `GeneratedQuestion` (Task 1)
- Produces:
  - `ReplayRequizResponse` = `{ replayId: string; attemptId: string; questions: GeneratedQuestion[]; degraded: boolean; generatedAt: string }`

- [ ] **Step 1: 실패하는 fixture 추가**

`packages/types/src/qgen.types-test.ts` 끝에 추가:
```ts
import type { ReplayRequizResponse } from './qgen';

// 유효한 재응시 응답(정상 생성)
export const validRequiz: ReplayRequizResponse = {
  replayId: 'r-1',
  attemptId: 'a-1',
  questions: [validQ],
  degraded: false,
  generatedAt: '2026-06-26T00:00:00.000Z',
};

// degraded 폴백(mock 으로 대체된 경우)도 동일 형태
export const degradedRequiz: ReplayRequizResponse = {
  replayId: 'r-1',
  attemptId: 'a-2',
  questions: [validQ],
  degraded: true,
  generatedAt: '2026-06-26T00:00:00.000Z',
};
```

- [ ] **Step 2: typecheck 로 실패 확인**

Run: `bun --filter @pullim-classbot/types typecheck`
Expected: FAIL — `Module './qgen' has no exported member 'ReplayRequizResponse'`.

- [ ] **Step 3: 타입 구현 + barrel export**

`packages/types/src/qgen.ts` 끝에 추가:
```ts
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
```

`packages/types/src/index.ts` 의 `export * from "./auth";` 다음 줄에 추가:
```ts
export * from "./qgen";
```

- [ ] **Step 4: typecheck 로 통과 확인**

Run: `bun --filter @pullim-classbot/types typecheck`
Expected: PASS. 추가로 루트 typecheck 도 통과: `bun run typecheck` → 모든 워크스페이스 PASS.

- [ ] **Step 5: 커밋**

```bash
git add packages/types/src/qgen.ts packages/types/src/index.ts packages/types/src/qgen.types-test.ts
git commit -m "feat(types): ReplayRequizResponse + qgen 계약 barrel export"
```

---

## Self-Review

**1. Spec coverage (spec §2 계약):**
- `QgenQuizRequest`(achievementStandardId | subjectCoords, difficulty, count, format, seedExampleId) → Task 1 ✅
- `GeneratedQuestion`(passage?, stem, choices, answerIndex, rationale, sourceStandardId) → Task 1 ✅
- `QgenQuizResponse`(questions[]) → Task 1 ✅
- `ReplayRequizResponse`(replayId, attemptId, questions, degraded, generatedAt) → Task 2 ✅
- 런타임 검증: 본 PR 비범위(BE PR-5 경계에서) — spec §4 "BE validates qgen-ai response" 와 일치하도록 위치 명시.

**2. Placeholder scan:** 모든 step 에 실제 코드/명령. TBD 없음.

**3. Type consistency:** `GeneratedQuestion` 이 Task 1 정의 → Task 2 `ReplayRequizResponse.questions` 에서 동일 사용. `format: 'structured'` 리터럴 일관. barrel export 경로 `./qgen` 일관.

## 다음 PR (이 PR 머지 후)
- **PR-2/PR-3 (qgen-ai 리포):** generate 경로 Opus 4.8 표준화 + structured 스키마 + QC; classbot 호출용 엔드포인트 + S2S 인증. 별도 plan(qgen-ai 컨벤션).
- **PR-4 (classbot BE):** Phase β 부트스트랩(config, DB, auth guard, qgen secret).
- **PR-5 (classbot BE):** `QgenClient`(여기서 위 타입을 런타임 검증) + `POST /api/replay/:id/requiz` + 시도 영속.
- **PR-6 (classbot FE):** `classbot-replay-exam.ts` mock → BE, feature flag.
