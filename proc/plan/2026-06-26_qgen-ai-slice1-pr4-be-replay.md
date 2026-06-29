# Slice 1 / PR-4 — classbot BE 리플레이 requiz 모듈 + QgenClient (contract-level) 계획

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development. 단계는 `- [ ]`.
> **대상:** `apps/backend` (NestJS, base `dev`). 기존 클린아키텍처 패턴(`modules/auth/{controller,use-cases,service,infrastructure,interface,controller/dto}`) 그대로 따른다.

**Goal:** classbot 재응시용 `POST /api/replay/:id/requiz` 를 추가한다. qgen-ai requiz 엔드포인트를 **공유 계약대로 호출**하는 `QgenClient`(native fetch)를 통해 문항을 받아 `ReplayQuestion[]`(=`@pullim-classbot/types`) 로 매핑해 반환한다. qgen-ai 미가용/flag-off 시 기존 mock 으로 graceful degrade. **QGen 접근 불필요 — fetch mock 으로 완전 테스트.**

**Architecture:** `ReplayController` → `RequizUseCase` → `ReplayService`(매핑·폴백 판정) + `QgenClient`(infra, fetch+타임아웃+검증). feature flag(`qgen.enabled` config)로 실 경로 게이트, 기본 off. 좌표는 지금은 config seed(`qgen.demoCoordinate`) — 약점→좌표 매핑은 후속.

**Tech Stack:** NestJS 11, TypeORM(기존), class-validator, native `fetch`(새 의존성 없음), Jest. `@pullim-classbot/types` 의 `ReplayQuestion` import.

## Global Constraints
- 기존 모듈 패턴 미러(`modules/auth/*` 참조): controller(얇음, DTO·ApiResponse)→use-case→service→infrastructure, interface 로 의존 역전. 글로벌 `JwtAuthGuard` 적용 — requiz 는 학생 인증 필요(@Public() 안 붙임).
- 새 npm 의존성 추가 금지(native fetch 사용). config 는 `ConfigModule.load` 에 등록 + `.env.example` 갱신.
- 외부(qgen-ai) 응답은 **경계에서 런타임 검증**(PR-1 리뷰가 여기로 미룬 가드) — 스키마 불일치/타임아웃/5xx → mock 폴백(`degraded:true`), FE 무중단.
- 단위 테스트 필수(`*.spec.ts`, 기존 `modules/auth/*.spec.ts` 스타일): QgenClient(fetch mock: 성공/타임아웃/malformed), use-case(flag on→client, off→mock).
- 검증: `bun --filter @pullim-classbot/backend {typecheck,lint,test}`(build/CI 권위). `ReplayRequizResponse` envelope 는 지금 BE DTO — FE(PR-6) 소비 시 packages/types 로 승격.

---

### Task 1: qgen config + feature flag
**Files:** Create `apps/backend/src/config/qgen.config.ts`. Modify `apps/backend/src/app.module.ts`(load 배열에 추가), `apps/backend/.env.example`.
**Produces:** `qgenConfig` (`registerAs('qgen', ...)`) → `{ baseUrl: string, apiKey: string, enabled: boolean, demoCoordinate: { taskFamilyId, subjectId, gradeId, achievementStandardId, sourceId } | null }` from env (`QGEN_BASE_URL`, `QGEN_API_KEY`, `QGEN_ENABLED`, `QGEN_DEMO_*`).
- [ ] Step 1: config 작성(jwt.config.ts/database.config.ts 패턴 미러), `.env.example` 에 QGEN_* 추가, app.module `load:[databaseConfig, jwtConfig, qgenConfig]`.
- [ ] Step 2: `bun --filter @pullim-classbot/backend typecheck` PASS.
- [ ] Step 3: 커밋 `feat(classbot-be): qgen config + feature flag`.

### Task 2: QgenClient (infra, fetch + 타임아웃 + 검증)
**Files:** Create `apps/backend/src/modules/replay/infrastructure/qgen.client.ts`, `.../qgen.client.spec.ts`, `apps/backend/src/modules/replay/interface/qgen-client.interface.ts`.
**Interfaces:**
- Produces: `IQgenClient { requiz(input: QgenRequizInput): Promise<QgenRequizResult> }` where `QgenRequizInput = { count: number }`(좌표는 client 가 config.demoCoordinate 에서 채움), `QgenRequizResult = { questions: ReplayQuestion[]; setQuestionId: string }`. `QgenClient` 는 `@Injectable()`, `ConfigService` 주입, `fetch(baseUrl+'/api/v1/ai/classbot/requiz', { method:'POST', headers:{'x-api-key':apiKey,'x-source-id':...}, body, signal: AbortSignal.timeout(30000) })`, 응답 JSON 을 qgen `ClassbotRequizQuestion`(passage_paragraphs/boxed_lines/options/answer_index/explanation/subject_label)→`ReplayQuestion`(passage{paragraphs}/boxed{lines}/options/answerIndex/explanation/subjectLabel) 매핑. 검증 실패/비-2xx/타임아웃 → throw `QgenUnavailableError`.
- [ ] Step 1: 실패 테스트(`qgen.client.spec.ts`) — global `fetch` 를 jest mock: (a) 정상 payload → ReplayQuestion[] 매핑·answerIndex 보존; (b) malformed(필드 누락) → throws QgenUnavailableError; (c) 500 → throws; (d) AbortError(타임아웃) → throws.
- [ ] Step 2: RED — `bun --filter @pullim-classbot/backend test src/modules/replay`.
- [ ] Step 3: 구현(인터페이스 + 클라이언트 + 매핑 + 런타임 검증 가드 함수 `assertQgenQuestion`).
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot-be): QgenClient(fetch) + 응답 매핑/검증`.

### Task 3: replay 모듈(service/use-case/controller) + flag·폴백 + 등록
**Files:** Create `apps/backend/src/modules/replay/{service/replay.service.ts, use-cases/requiz.use-case.ts, controller/replay.controller.ts, controller/dto/requiz-response.dto.ts, replay.module.ts}` + 각 `.spec.ts`. Modify `app.module.ts`(ReplayModule import).
**Interfaces:**
- Consumes: `IQgenClient`(Task 2), `qgenConfig`(Task 1), `ReplayQuestion`(@pullim-classbot/types).
- Produces: `RequizUseCase.execute(replayId: string): Promise<ReplayRequizResponseDto>` where `ReplayRequizResponseDto = { replayId, attemptId, questions: ReplayQuestion[], degraded: boolean, generatedAt: string }`(attemptId=qgen setQuestionId; flag-off/QgenUnavailableError 시 mock 폴백 + degraded:true). `POST /api/replay/:id/requiz`.
- [ ] Step 1: 실패 테스트 — service: flag off → mock 문항 + degraded:true; flag on + client 성공 → client 문항 + degraded:false; client throws → mock + degraded:true. use-case/controller: 위임·DTO 래핑.
- [ ] Step 2: RED.
- [ ] Step 3: 구현 — service(flag·폴백 판정, mock 문항은 작은 상수 fixture), use-case, controller(`@Param('id')`, 학생 가드 적용), DTO(class-validator), ReplayModule(providers: QgenClient·service·use-case, controllers), app.module 등록.
- [ ] Step 4: GREEN — `bun --filter @pullim-classbot/backend {test,typecheck,lint}`.
- [ ] Step 5: 커밋 `feat(classbot-be): POST /api/replay/:id/requiz + flag·mock 폴백`.

## Self-Review
- 기존 모듈 패턴(controller/use-case/service/infra/interface) 미러 ✅
- 새 의존성 0(native fetch) ✅
- 경계 런타임 검증 + graceful degrade(degraded flag) ✅ (PR-1 리뷰가 미룬 가드 여기서)
- flag 기본 off → 실 경로는 dev 검증 후 ✅
- envelope BE DTO(FE 소비 시 packages/types 승격), ReplayQuestion 만 공유 import ✅
- 단위 테스트(client 3+ 케이스, service 3 분기) ✅
- 좌표 seed(config) — 약점→좌표 매핑은 후속(명시) ⚠️
- attempt 영속 미포함(attemptId=qgen setQuestionId) — 영속은 flow live 후 ⚠️

## 다음
- qgen-ai 엔드포인트 live + QGen 좌표 확보 후 flag on, dev preview 검증.
- PR-6 FE: `classbot-replay-exam.ts` mock → 이 BE 엔드포인트, envelope 를 packages/types 로 승격.
