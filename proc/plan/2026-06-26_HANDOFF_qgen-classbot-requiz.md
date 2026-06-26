# [핸드오프] qgen-ai → classbot 재응시(requiz) 생성 엔드포인트 요청

> **받는 사람:** qgen-ai 담당자
> **보내는 맥락:** 풀림 클래스봇(classbot)에 "다시 풀기(재응시)" 실 AI 기능을 붙이는 중입니다. **classbot 백엔드(NestJS) 쪽은 이미 구현·머지 완료**(PR #152)이고, qgen-ai 가 호출할 엔드포인트를 **이 계약 그대로** 제공해 주시면 연동됩니다. classbot 은 현재 feature flag OFF + mock 폴백 상태라, 이 엔드포인트가 준비되면 flag 만 켜서 검증합니다.
> **이 문서 하나로 작업 가능하도록** 계약·구현 가이드·전제조건을 모두 담았습니다.

---

## 1. 한 줄 요청

classbot 가 호출할 **classbot 전용 문제 생성 엔드포인트**를 qgen-ai 에 추가해 주세요. 동작은:
**커리큘럼 좌표를 받아 → Claude Opus 4.8 로 문제 생성(`generate_via_task_family`) → QC 게이트(`run_qc`) 통과분만 → classbot 형태로 매핑해 반환.**

핵심 원칙 2가지:
- **전역 default(Gemini)는 절대 건드리지 말 것.** 이 엔드포인트(또는 그 usecase)에서만 `provider=LLMProvider.CLAUDE, model_id="claude-opus-4-8"` 를 **명시 전달**합니다. (플랫폼 전체 영향 방지)
- **QC 인라인 필수.** 생성 후 `run_qc` 를 통과한 문항만 반환. 실패 시 에러(또는 빈 결과) — classbot 은 실패를 받으면 mock 으로 안전하게 degrade 합니다.

---

## 2. ⭐ API 계약 (classbot 이 이미 이대로 호출함 — 반드시 일치)

### 요청 (classbot BE → qgen-ai)
```
POST {QGEN_BASE_URL}/api/v1/ai/classbot/requiz
Headers:
  content-type: application/json
  x-api-key:    <기존 전역 api_secret_key 와 동일 — 별도 키 아님>
  x-source-id:  <sourceId (UUID)>
Body (JSON, camelCase 주의):
  {
    "taskFamilyId":          "<uuid>",
    "subjectId":             "<uuid>",
    "gradeId":               "<문자열>",   // ⚠️ 문자열로 옴 — 서버에서 int 로 coerce 필요
    "achievementStandardId": "<uuid>",
    "sourceId":              "<uuid>",
    "count":                 5
  }
```

> ⚠️ **주의점 (연동 실패 방지 — 꼭 처리):**
> - body 키가 **camelCase** 입니다(`taskFamilyId` 등). qgen 의 기존 컨트롤러가 snake_case 를 쓴다면, 이 엔드포인트는 camelCase 입력을 받도록 alias 처리하거나 별도 요청 스키마를 두세요.
> - `gradeId` 가 **문자열**로 전송됩니다(classbot 측 env 에서 문자열). `generate_via_task_family(grade_id: int)` 에 넘기기 전 `int(...)` 변환 필요.
> - `sourceId` 는 `x-source-id` **헤더**로도 옵니다(기존 컨트롤러와 동일 패턴). 헤더를 source 로 쓰시면 됩니다.

### 응답 (qgen-ai → classbot BE) — classbot 의 `QgenClient` 가 검증하는 형태
```
200 OK  (기존 ApiResponse 래퍼)
{
  "data": {
    "set_question_id": "<uuid>",
    "questions": [
      {
        "stem":               "<발문, string>",
        "passage_paragraphs": ["문단1", "문단2"] | null,   // 국어/영어 지문(선택)
        "boxed_lines":        ["보기줄1", "보기줄2"] | null, // 수학/과학 〈보기〉(선택)
        "options":            ["①...", "②...", ...],         // 비어있지 않은 string 배열
        "answer_index":       0,                              // 0 <= n < options.length 정수
        "explanation":        "<해설, string>",
        "subject_label":      "영어 · 빈칸 추론"               // 시험지 헤더 라벨
      }
    ]
  }
}
```

> **classbot 의 경계 검증 규칙(이걸 어기면 classbot 이 mock 으로 폴백):**
> - `questions` 의 각 문항은 위 필드를 **정확히** 만족해야 함.
> - `options`: 비어있지 않은 배열 + **모든 요소 string**.
> - `answer_index`: **정수** + `0 <= answer_index < options.length`.
> - `passage_paragraphs` / `boxed_lines`: 있으면(null 아니면) **모든 요소 string**. 둘 다 선택(없어도 됨).
> - `subject_label`, `explanation`, `stem`: string 필수.
> - `set_question_id`: string 필수 (classbot 은 이걸 `attemptId` 로 사용).
> - **`qc_passed` 같은 필드는 넣어도 무방하나 classbot 은 안 읽음** — 200 응답 자체가 "QC 통과분"이라는 전제(QC 실패 시엔 200 으로 문항을 주지 마세요).

---

## 3. 구현 가이드 (qgen-ai 코드 기준, 컨벤션 준수)

권장 구조 (기존 클린아키텍처 패턴):
- `app/api/v1/classbot_controller.py` — 함수형 컨트롤러, `router = APIRouter(prefix="/ai/classbot", tags=["classbot"])`, `@router.post("/requiz", status_code=201)`. `main.py` 에 `app.include_router(classbot_router, prefix="/api/v1")`. 인증은 **기존 전역 `ApiKeyAuthMiddleware`(x-api-key) 그대로 적용**(추가 코드 불필요).
- `app/application/classbot/classbot_generate_requiz_usecase.py` — usecase. 흐름:
  1. `generation_question_service.generate_via_task_family(*, task_family_id, subject_id, grade_id(int), source_id, creator_id, achievement_standard_id=, model_id="claude-opus-4-8", provider=LLMProvider.CLAUDE, ...)` → `(set_q, questions, task_family)` (생성 set 영속됨).
  2. `run_qc(set_question_id=set_q.id, profile=..., session=session)` → `QcGateOutcome(passed, reason, evaluation_log_id)`. **`run_qc` 사용**(usecase→usecase 호출 금지 규칙: `qc_evaluate_question_usecase` import 금지 — `orchestration_qc_pipeline.run_qc` 헬퍼 사용).
  3. `passed=False` 면 `BusinessException(ErrorCode.CLASSBOT_REQUIZ_QC_FAILED)` (또는 빈 결과). `passed=True` 면 생성 문항을 §2 응답 형태(`ClassbotRequizQuestion`)로 매핑해 반환.
- 스키마: `app/shared/schemas/classbot_api_schema.py` (+ `app/api/v1/schemas/classbot_schema.py` re-export). `extra="forbid"` 권장.
- 상수: `app/shared/constants/llm_constant.py` 의 `DefaultModels` 에 `CLAUDE_OPUS_4_8 = "claude-opus-4-8"` 추가하고 usecase 가 이 상수 참조. **전역 `DEFAULT_PROVIDER`/`DEFAULT_GENERATION_MODEL` 은 변경 금지.**

준수 규칙(.claude/rules): 컨트롤러는 함수·얇게·`ApiResponse` 래핑·로깅 미들웨어, `HTTPException` 금지(→`BusinessException`), 레이어 방향 `api→application→domain→infrastructure`, 도메인 서비스/usecase 신규 시 **단위 테스트 필수**(repo/provider AsyncMock, `pytest.raises` 에러 케이스).

매핑 메모: 내부 생성 출력(`choices/rationale/...`)을 §2 응답의 snake_case(`options/explanation/subject_label`, 지문은 `passage_paragraphs`, 보기 박스는 `boxed_lines`)로 변환해 주세요.

---

## 4. ✅ 전제조건 체크리스트 (이게 충족돼야 실제로 동작)

- [ ] **`llm_models` 테이블에 `claude-opus-4-8` 행** — `GenerationQuestionService._get_llm_model()` 이 DB 조회. 없으면 매 호출 `BusinessException`. **이 테이블이 NestJS/TypeORM(generated) 관리면 seed 가 NestJS 측 또는 데이터 마이그레이션** — 소유권 확인 후 seed 필요. (qgen Alembic 관리 대상은 Taxonomy 9 + flywheel_events 뿐.)
- [ ] **유효한 데모 커리큘럼 좌표 1세트** — lookup API(`/api/v1/ai/lookup/...`)로 실제 QGen 데이터에서 해석한 `task_family_id / subject_id / grade_id / achievement_standard_id / source_id`. classbot 검증 시 이 값을 env 로 주입합니다. **이 값 1세트만 알려주시면** classbot dev 에서 바로 검증 가능.
- [ ] **QC 모델 행도 확인** — `qc_constant.py` 의 QC Tier 모델(`claude-sonnet-4-5-...`)에 대응하는 `llm_models` 행 존재 여부.
- [ ] (선택) Opus 4.8 출력이 `TaskFamilyQuestionGenerationResponse`(`extra="forbid"`) 스키마와 맞는지 프롬프트 1회 검증 — 추가 필드 나오면 `QUESTION_LLM_PARSING_FAILED`.

---

## 5. classbot 측 현황 (참고 — 이미 완료)

- **PR #152 머지됨(dev):** `POST /api/replay/:id/requiz` + `QgenClient`(native fetch, 30s 타임아웃, **응답 경계 검증**, **일시 실패 1회 재시도**) + flag/mock 폴백.
- **현재 flag OFF**(`QGEN_ENABLED=false`) → mock 으로 동작 중. 이 엔드포인트 준비되면 classbot 에 `QGEN_BASE_URL / QGEN_API_KEY / QGEN_DEMO_*` env 주입하고 `QGEN_ENABLED=true` 로 dev preview 검증.
- classbot 은 실패(non-2xx / malformed / timeout)를 받으면 **mock 으로 graceful degrade**(`degraded:true`) — 화면은 안 깨집니다. 즉 **부분 동작이어도 안전하게 붙여볼 수 있음.**

---

## 6. 참고 문서 (classbot 리포: curea-co/pullim-classbot, dev)

- 우산 설계: `proc/spec/2026-06-26_qgen-ai-integration-design.md`
- 이 엔드포인트 상세 계획: `proc/plan/2026-06-26_qgen-ai-slice1-classbot-endpoint.md`
- classbot 호출부 코드: `apps/backend/src/modules/replay/infrastructure/qgen.client.ts` (계약의 single source — 응답 검증 로직이 여기 있음)
- 설계 결정(맥락): 약점→커리큘럼 좌표 자동 매핑은 후속(지금은 lookup-선택 좌표로 파이프라인 증명), 시도 영속도 후속(현재 `attemptId = set_question_id`).

문의 주시면 계약 디테일(특히 camelCase/gradeId 처리)은 classbot 측에서 조정도 가능합니다 — 편하신 방향으로 맞추겠습니다.
