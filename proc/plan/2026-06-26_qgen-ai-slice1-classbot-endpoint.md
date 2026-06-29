# Slice 1 / qgen-ai — classbot 재응시 생성 엔드포인트 (PR-2+3 통합, narrowed) 계획

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development / executing-plans. 단계는 `- [ ]`.
> **대상 리포:** `curea-co/qgen-ai` (base `dev`). 이 리포의 `.claude/rules` 준수. 아키텍처 변경 confirm-first 규칙 적용 — 본 계획이 그 confirm 문서.

**Goal:** classbot 재응시용으로 **lookup으로 해석된 커리큘럼 좌표**를 받아 **Claude Opus 4.8 명시 생성 → QC 게이트 → QC 통과 문항 반환**하는 thin 엔드포인트를 qgen-ai 에 추가한다. 전역 default(Gemini)는 건드리지 않는다(플랫폼 영향). 약점→좌표 자동 매핑은 후속.

**Architecture:** 신규 `classbot_controller`(함수형, `/ai/classbot` prefix) → 신규 `classbot_generate_requiz_usecase` → 기존 `generation_question_service.generate_via_task_family(provider=CLAUDE, model_id="claude-opus-4-8", ...)` 로 생성(set 영속) → `orchestration_qc_pipeline.run_qc(set_question_id=..., profile, session)` 인라인 QC → 통과분만 classbot-shaped 응답. 인증은 기존 전역 `ApiKeyAuthMiddleware`(x-api-key) 재사용.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, LangChain(`langchain-anthropic` 기존), pytest(asyncio auto), ruff.

## Global Constraints (qgen-ai 규칙 — verbatim 요지)
- 레이어 방향 `api→application→domain→infrastructure`, 역방향 금지. **usecase→usecase 호출 금지**(QC는 `run_qc` 파이프라인 헬퍼 사용, `qc_evaluate_question_usecase` import 금지).
- 컨트롤러는 **함수**, 비즈니스 로직 없음, `ApiResponse`로 래핑, 로깅은 미들웨어가. `HTTPException` 금지 → `BusinessException(ErrorCode.XXX)`. 에러코드 `{DOMAIN}_{SITUATION}`.
- 파일 `snake_case`(`classbot_controller.py`, `classbot_generate_requiz_usecase.py`), 상수 `UPPER_SNAKE`.
- 스키마 배치: HTTP DTO = `api/v1/schemas/classbot_schema.py`(re-export) ← `shared/schemas/classbot_api_schema.py`. shared/schemas 는 ORM/core/infra import 금지.
- **전역 `DEFAULT_PROVIDER`/`DEFAULT_GENERATION_MODEL` 변경 금지** — classbot usecase가 `provider=LLMProvider.CLAUDE, model_id="claude-opus-4-8"` 를 **명시 전달**.
- 도메인 서비스/usecase 신규·수정 시 **단위 테스트 필수**(`tests/unit/...`, 생성자 전 파라미터 명시, repo/provider = AsyncMock, `pytest.raises(BusinessException)` 에러 케이스).
- 생성 모델 파일(`infrastructure/persistence/models/models.py`) 직접 수정 금지(`make sync-models` 영역).

## ⚠️ 실행 전제조건 (코드 외 — 이게 충족돼야 실제 실행/검증 가능)
1. **QGen Supabase 접근 + Infisical 자격증명** — 생성·QC·lookup 모두 공유 DB 의존. 로컬 실행/통합테스트에 필요.
2. **유효한 커리큘럼 좌표 1개** — lookup API 로 실제 QGen 데이터에서 해석한 `task_family_id, subject_id, grade_id, source_id, achievement_standard_id`(+선택 `difficulty_id`). UUID를 임의 생성 불가.
3. **`llm_models` 행(`claude-opus-4-8`)** — `_get_llm_model()` DB 조회 의존; 없으면 매 호출 `BusinessException`. **이 테이블이 NestJS/TypeORM 관리(generated)면 seed 는 NestJS 측 또는 데이터 마이그레이션** — 소유권 확인 필요(qgen-ai Alembic 관리 대상은 Taxonomy 9 + flywheel_events 뿐).
4. **`api_secret_key`** — 기존 미들웨어 인증용(classbot BE 가 보유해야 호출 가능).

---

### Task 1: classbot requiz 요청/응답 DTO

**Files:** Create `app/shared/schemas/classbot_api_schema.py`, `app/api/v1/schemas/classbot_schema.py`(re-export).

**Produces:**
- `ClassbotRequizRequest(BaseModel)`: `task_family_id: UUID`, `subject_id: UUID`, `grade_id: int`, `achievement_standard_id: UUID | None`, `difficulty_id: int | None`, `count: int = Field(ge=1, le=20)`.
- `ClassbotRequizQuestion(BaseModel)`: `stem: str`, `passage_paragraphs: list[str] | None`, `boxed_lines: list[str] | None`, `options: list[str]`, `answer_index: int`, `explanation: str`, `subject_label: str` — classbot `ReplayQuestion` 와 1:1 매핑되는 직렬화 형태.
- `ClassbotRequizResponse(BaseModel)`: `questions: list[ClassbotRequizQuestion]`, `qc_passed: bool`, `set_question_id: UUID`.

- [ ] Step 1: 스키마 작성(위 필드, `extra="forbid"`), `classbot_schema.py` 에서 re-export.
- [ ] Step 2: `uv run ruff check app/...` + import 타입체크.
- [ ] Step 3: 커밋 `feat(classbot): requiz 요청/응답 DTO`.

### Task 2: `classbot_generate_requiz_usecase` (생성→QC 인라인)

**Files:** Create `app/application/classbot/classbot_generate_requiz_usecase.py`. Test `tests/unit/application/classbot/test_classbot_generate_requiz_usecase.py`.

**Interfaces:**
- Consumes: `generation_question_service.generate_via_task_family(*, task_family_id, subject_id, grade_id, source_id, creator_id, achievement_standard_id=, difficulty_id=, model_id="claude-opus-4-8", provider=LLMProvider.CLAUDE, ...) -> (set_q, questions, task_family)`; `run_qc(*, set_question_id, profile, session) -> QcGateOutcome(passed, reason, evaluation_log_id)`.
- Produces: `async def classbot_generate_requiz_usecase(*, request: ClassbotRequizRequest, source_id: UUID, creator_id: UUID | None, session: AsyncSession) -> ClassbotRequizResponse`.

- [ ] Step 1: 실패 테스트 — generate(mock)가 set_q+questions 반환, run_qc(mock) `passed=True` → 응답 `qc_passed=True`, questions 매핑 검증; `passed=False` → `BusinessException(ErrorCode.CLASSBOT_REQUIZ_QC_FAILED)`. (서비스/파이프라인은 AsyncMock.)
- [ ] Step 2: RED — `uv run pytest tests/unit/application/classbot/...`.
- [ ] Step 3: 구현 — service/pipeline 팩토리 조립(DI 패턴), `provider=LLMProvider.CLAUDE, model_id="claude-opus-4-8"` 명시 전달, 생성 결과를 `ClassbotRequizQuestion`(passage→paragraphs, boxed→lines, options/answer_index/explanation/subject_label) 로 매핑, `run_qc` 인라인, 실패 시 `BusinessException`.
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): 재응시 생성→QC 인라인 usecase`.

### Task 3: `classbot_controller` 엔드포인트

**Files:** Create `app/api/v1/classbot_controller.py`. Modify `app/main.py`(router 등록). Test `tests/unit/api/test_classbot_controller.py`(또는 통합 — 전제조건 충족 시).

**Interfaces:** Consumes Task 2 usecase. Produces `POST /api/v1/ai/classbot/requiz -> ApiResponse[ClassbotRequizResponse]`.

- [ ] Step 1: 실패 테스트 — usecase(mock) 반환을 `ApiResponse.created/ok` 로 래핑하는지(컨트롤러 얇은지) 검증.
- [ ] Step 2: RED.
- [ ] Step 3: 구현 — `router = APIRouter(prefix="/ai/classbot", tags=["classbot"])`, `@router.post("/requiz", status_code=201)`, `x-source-id`/`x-creator-id` Header + `Depends(get_db)`, usecase 호출 → `ApiResponse.created(result, "...")`. `main.py` 에 `app.include_router(classbot_router, prefix="/api/v1")`.
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): POST /ai/classbot/requiz 엔드포인트`.

### Task 4: `claude-opus-4-8` 모델 상수 + llm_models seed (전제조건 3 의존)
**Files:** Modify `app/shared/constants/llm_constant.py`(`DefaultModels.CLAUDE_OPUS_4_8 = "claude-opus-4-8"` 추가 — 전역 default 는 불변). Seed: 소유권 확인 후 Alembic 데이터 마이그레이션 **또는** NestJS 측.
- [ ] Step 1: `DefaultModels` 에 `CLAUDE_OPUS_4_8` 상수 추가(usecase가 문자열 대신 상수 참조).
- [ ] Step 2: llm_models seed — **소유권 확인 후** 진행(테이블이 NestJS 관리면 별도 요청). 커밋/요청 분리.

## Self-Review
- 전역 default 불변(§Constraints) — usecase 명시 전달로만 Opus 사용 ✅
- usecase→usecase 금지 — `run_qc` 파이프라인 헬퍼 사용 ✅
- 컨트롤러 얇음/`ApiResponse`/`BusinessException` ✅
- 단위 테스트(usecase 생성→QC 분기, 컨트롤러 래핑) ✅
- 실행 전제조건(DB/좌표/seed/key) 명시 — 코드 외 의존 ⚠️

## classbot 측 후속 (이 PR 이후, 별도 리포 PR)
- PR-4 classbot BE 부트스트랩 + QgenClient(이 엔드포인트 호출, lookup 좌표 해석 또는 seed 좌표) + `ReplayRequizResponse` envelope(공유) + `POST /api/replay/:id/requiz` + 매핑/영속.
- PR-6 classbot FE: `classbot-replay-exam.ts` mock → BE, feature flag.
