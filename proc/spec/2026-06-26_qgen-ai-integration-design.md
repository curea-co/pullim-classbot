# 클래스봇 × qgen-ai 통합 설계 (Umbrella) — 실 AI 런치 준비

> **상태:** 설계 승인됨 (2026-06-26). 이 문서는 **우산(umbrella) 아키텍처** + **Slice 1(문제 생성) 상세**다.
> Slice 2(튜터 챗)·Slice 3(리플레이 리캡)은 각자 별도 spec→plan→PR 사이클로 이어진다.
> **다음 단계:** 이 문서 승인 후 Slice 1 구현 계획(writing-plans)으로 전환.

## 0. 목적과 범위

클래스봇은 현재 **localStorage mock**으로 봇 답변·리플레이·퀴즈를 흉내 낸다(NestJS BE는 `/health`만, Phase β 미시작). 이 설계는 외부 AI 엔진 [`curea-co/qgen-ai`](https://github.com/curea-co/qgen-ai)를 붙여 **실 AI로 런치 가능한** 상태로 가는 경로를, 본 리포의 최상위 규칙(FE/BE 분리 PR, `feature→dev→main`)을 지키며 정의한다.

**런치 준비의 P0 3축:** 실 AI(qgen-ai) · 실 BE(classbot NestJS Phase β) · 실 인증. 본 문서는 앞 두 축을 다루고, **인증은 병렬 foundation 트랙**으로 분리한다(§7).

### qgen-ai 가 무엇인가 (grounded)
- QGen 플랫폼의 **콘텐츠/문제 생성 마이크로서비스** — Python/FastAPI(:3003), 클린 아키텍처(`api→application→domain→infrastructure`).
- 도메인: `generation`(문제/지문 실시간 LLM), `qc`(품질 검증), `embedding`, `batch`, `media`, `model_eval`, `orchestration`, `lookup`, `inventory`.
- `generation` 도메인은 **커리큘럼 grounded** — repo: `achievement_standard`, `curriculum_subject`, `question_example`, `question_pattern`; usecase: `generate_question` / `generate_by_example` / `generate_via_task_family`.
- **이미 멀티 프로바이더**(LangChain: `langchain-anthropic` / `langchain-openai` / `langchain-google-genai`). 따라서 "SOTA LLM 적용" = **실시간 경로 기본을 Claude Opus 4.8로 표준화**하는 것이지 프로바이더 레이어를 새로 만드는 게 아니다(`model_eval` 멀티프로바이더 능력은 유지).
- QGen Supabase DB를 NestJS와 공유. **클래스봇은 이 DB를 공유하지 않는다**(§1).

### 클래스봇 AI 표면 ↔ qgen-ai 매핑 (불균등 — 알고 가기)
| 클래스봇 표면 | qgen-ai 매핑 | Slice |
|---|---|---|
| 문제/지문 생성 (리플레이 재응시, "실 시험지" UX) | `generation`+`qc` 도메인에 **1:1** | **1** |
| 튜터 챗 / 봇 답변(봇찾기) | qgen-ai에 **없음**(생성 엔진) → 신규 Claude 챗 워크플로 + `embedding` RAG grounding | 2 |
| 리플레이 약점 리캡 | 분석 워크플로 + embedding grounding | 3 |
| 웰빙 | AI 코어 아님 | — |

## 1. 아키텍처 & 토폴로지 (결정: 외부 서비스 HTTP)

```
┌─────────────┐   HTTPS    ┌──────────────────┐   HTTPS (S2S key)   ┌────────────────┐
│ classbot FE │ ─────────▶ │ classbot BE      │ ──────────────────▶ │ qgen-ai        │
│ (Next 16)   │  session   │ (NestJS, Phase β)│  internal API key   │ (FastAPI :3003)│
│ flag gated  │ ◀───────── │ auth·DB·QgenClient│ ◀────────────────── │ generation/qc/ │
└─────────────┘            └────────┬─────────┘                     │ embedding      │
                                    │                               └───────┬────────┘
                            classbot 자체 DB                          QGen Supabase
                            (Postgres :5434)                         (qgen-ai 소유, 비공유)
```

**원칙:**
- **FE는 classbot BE하고만 통신.** FE→qgen-ai 직접 호출 금지(qgen-ai 키를 서버사이드에 가둠 + 응답 검증/정형 + classbot 인증 게이트).
- **classbot가 자기 데이터 소유**(수강 등록·챗 이력·리플레이 시도·웰빙)를 자체 Postgres(:5434, 리포 `docker-compose` 기존)에. QGen 스키마와 비결합.
- **qgen-ai는 AI 엔진**, S2S 자격증명으로 HTTP 호출. classbot BE가 유일한 호출자.
- **크로스 리포, 분리 PR**(최상위 규칙): qgen-ai PR(SOTA 모델 + 엔드포인트) / classbot BE PR / classbot FE PR 각각 분리. 공유 타입은 `packages/types`에 **먼저** 별도 PR.
- **SOTA 모델:** qgen-ai 실시간 경로 기본 = **Claude Opus 4.8**(기존 `langchain-anthropic`); 환각 제어 = **커리큘럼 grounded RAG**(qgen-ai `embedding`/`generation` repo) + **structured outputs**(퀴즈 스키마 강제) + `qc` 게이트.
- **시퀀싱:** Slice 1(문제 생성) → Slice 2(튜터 챗) → Slice 3(리캡). 각 슬라이스 = 독립 spec→plan→PR. 본 문서 = 우산 + Slice 1 상세.

## 2. Slice 1 데이터 흐름 & qgen-ai 계약 (문제/지문 생성)

**리플레이 재응시 end-to-end:**
```
학생이 약점에서 "다시 풀기"
  └─FE→ POST /api/replay/:id/requiz        (classbot BE, 학생 세션)
       └─BE: 약점 → 커리큘럼 좌표(성취기준 + 난이도 + N)
          └─BE→ POST {qgen-ai}/api/v1/generation/…   (S2S 키, Opus 4.8, QC)
             └─qgen-ai: 커리큘럼 grounded 생성 → qc 통과 → structured questions
          ←─ questions[] {passage, stem, choices[], answerIndex, rationale, sourceStandardId}
       └─BE: classbot ExamQuestion 형태로 매핑; 시도 row 영속(classbot DB)
  ←─FE: 기존 ExamSheet 렌더(실 시험지 UX 기존 구현 재사용)
```

**계약(classbot BE ⇄ qgen-ai)** — qgen-ai 수정 가능하므로 우리가 소유, 정확한 필드는 Slice 1 plan에서 `app/api/v1/schemas/generation_schema.py`에 핀:
- **요청:** `{ achievementStandardId | subjectCoords, difficulty, count, format: "structured", seedExampleId? }`
  (`seedExampleId`는 학생이 틀린 문항 기반 `generate_by_example` 경로용)
- **응답:** `{ passage?, stem, choices[], answerIndex, rationale, sourceStandardId }[]` — **서버사이드 QC 통과분만**.
- **모델/grounding:** qgen-ai `langchain-anthropic` 경로 Opus 4.8; structured outputs로 스키마 강제(자유형 파싱 없음); 커리큘럼 repo가 RAG grounding; `qc` 도메인이 환각 게이트.

**타입 소유권(중요 — 패키지 경계):** 위 BE⇄qgen-ai 계약(`QgenQuizRequest`, qgen 원시 문항)은 **BE 내부 계약**이라 `apps/backend`(PR-5 `QgenClient` 옆)가 소유한다 — FE 가 import 하지 않으므로 FE↔BE 공유 패키지(`packages/types`)에 넣지 않는다. `packages/types`에는 **권위에 있는 문항 타입만** 둔다: `ReplayQuestion`(+ `ReplayPassage`, `ReplayBoxed`). **`ReplayQuestion`은 권위 `ExamQuestion`과 1:1**(`stem`, `passage?{paragraphs}`, `boxed?{lines}`, `options[]`, `answerIndex`, `explanation`, `subjectLabel`) — 시험지 렌더러가 요구하는 문단형 지문/〈보기〉/과목/해설을 보장한다. **BE 가 qgen-ai 원시 출력을 `ReplayQuestion`으로 매핑**한다. 재응시 응답 envelope(`ReplayRequizResponse` — 다문항·시도 메타)는 아직 권위에 없으므로 **BE API spec 확정 후 PR-5 에서** 공유한다(권위 외 형태를 PR-1 에서 미리 굳히지 않는다 — Codex #150).

**기존 mock 매핑:** `apps/classbot/lib/mock/classbot-replay-exam.ts`(`ExamQuestion`, `getReplayQuiz`)가 스왑 지점. `ReplayQuestion`이 `ExamQuestion`과 동형이므로 같은 형태 in, 실 데이터는 **feature flag** 뒤에서. flag off면 mock 유지(폴백).

**영속(classbot DB):** 신규 `replay_attempt` + `generated_question` 테이블 — classbot가 시도 이력 소유, qgen-ai가 생성/QC 소유. QGen 스키마 비결합.

## 3. 크로스 리포 PR 분해 & 시퀀싱

Slice 1 = **2개 리포, 6개 PR**, 각 PR은 `feature→dev`. (분리 이유: diff를 작게 유지해 Codex 리뷰가 **수렴**하도록 — 본 리포 최상위 규칙.)

```
SLICE 1 (문제 생성)                                           repo          depends
──────────────────────────────────────────────────────────────────────────────────
PR-1  packages/types: 권위 문항 타입 공유                        classbot      —
      (ReplayQuestion ≡ 권위 ExamQuestion + ReplayPassage/Boxed)(shared, 먼저)
      ※ qgen-ai 내부 계약·재응시 envelope 는 여기 아님 — PR-5 소유
PR-2  qgen-ai: 실시간 generate 경로 Opus 4.8 표준화 +          qgen-ai       —  (병렬)
      structured-output 문제 스키마 + QC 게이트
PR-3  qgen-ai: classbot 호출용 generation 엔드포인트 +          qgen-ai       PR-2
      S2S API-key 인증 미들웨어
PR-4  classbot BE: Phase β 부트스트랩 — Nest config, 자체 DB    classbot BE   PR-1
      (TypeORM, :5434), auth guard, qgen-ai secret/config
PR-5  classbot BE: 리플레이 requiz 기능 — QgenClient(+BE↔qgen-ai  classbot BE   PR-1,3,4
      내부 계약 타입 소유) + 원시→ReplayQuestion 매핑 + 런타임 검증 +
      ReplayRequizResponse envelope(공유) + POST /api/replay/:id/requiz +
      시도 영속 + 테스트
PR-6  classbot FE: replay-exam mock → BE flag 게이트 스왑;      classbot FE   PR-1,5
      mock 폴백 유지
```

**순서 근거:** 공유 타입 먼저(양쪽이 import); qgen-ai 두 PR은 classbot 작업과 **병렬**(다른 리포/리뷰어); BE 부트스트랩(PR-4)은 **세 슬라이스 모두** 재사용하므로 Slice 1 기능(PR-5)과 분리해 diff를 작게; FE는 마지막, flag 뒤에서 dev preview로 실 경로 검증 후 mock 은퇴.

**Slice 2·3은 PR-1/PR-4 foundation 재사용:**
- **Slice 2(튜터 챗):** qgen-ai에 chat/RAG 엔드포인트 추가 **또는** classbot BE가 Claude 챗 워크플로 직접 실행 + qgen-ai `embedding` grounding(Slice 2 spec에서 결정) → BE 챗 컨트롤러 + 이력 영속 → FE `useModeBots` 답변 스왑.
- **Slice 3(리캡):** BE 리캡 워크플로(오답 분석 → grounded 리캡) → FE 리플레이 리캡 mock 스왑.

## 4. 에러 핸들링 / 테스트 / 롤아웃

### 에러 핸들링 — 모든 실패는 mock으로 graceful degrade, 화면은 절대 깨지지 않음
- **qgen-ai 도달 불가 / 타임아웃 / 5xx:** `QgenClient`에 타임아웃 버짓(~30s, LLM 생성은 느림) + 1회 재시도; 소진 시 BE가 기존 mock 퀴즈를 `degraded: true`로 반환. 학생은 항상 재응시 가능.
- **QC 거부 / 빈 결과:** qgen-ai `qc` 게이트가 권위; 사용 불가 시 1회 재시도 후 mock 폴백.
- **모델 refusal**(Opus 4.8 `stop_reason: "refusal"`): qgen-ai 내부 처리; classbot BE는 refusal-degraded payload를 "생성 불가"로 보고 폴백. qgen-ai generate 경로는 **Opus 4.8 server-side fallback**(`server-side-fallback-2026-06-01` + `fallbacks:[{model:"claude-opus-4-8"}]`)를 달아 일시 refusal이 classbot에 닿기 전 자가 복구.
- **스키마 불일치:** BE가 qgen-ai 응답을 `packages/types` 스키마로 검증; malformed → 거부 + 폴백 + 로그. 공유 스키마가 **계약 단일 소스**.
- **S2S 인증 실패:** FE-safe 502 + 알림; qgen-ai 키/원시 에러 FE 노출 금지.

### 테스트 (리포 TDD 규율)
- **packages/types:** 스키마 검증 테스트(양쪽이 assert하는 계약 fixture).
- **qgen-ai PR:** pytest — generate가 스키마 유효·QC 통과 출력 생성; structured-output 강제; Opus 4.8 기본 배선.
- **classbot BE:** 단위(`QgenClient` mocked HTTP — 타임아웃/refusal/malformed 포함), 컨트롤러, 시도 영속; 공유 fixture 기반 qgen-ai stub에 대한 **계약 테스트**.
- **classbot FE:** RTL — flag on → BE(mocked fetch) → `ExamSheet` 렌더; flag off → mock. **기존 prod-verify Playwright green 유지**(`x-build-sha` 계약 불변).

### 롤아웃 / flag
- `NEXT_PUBLIC_USE_REAL_AI`(또는 BE 주도 flag)가 실 경로 게이트; **기본 OFF**.
- 단계: **dev**에서 on → `dev-classbot.pullim.ai` 검증 → `dev→main` 승격(prod에선 flag OFF 유지) → dev 검증 후 prod에서 on. **flag-off = 킬스위치**(배포 없이 즉시 mock 복귀).
- **관측:** qgen-ai 지연시간, QC 거부율, 폴백율, refusal율 로깅 — 런치 준비 신호.

## 5. 미해결 의존성 (침묵 흡수하지 않고 명시)
1. **실 인증.** classbot는 현재 `MockAuthProvider`(`packages/auth` `IAuthProvider`). 런치엔 실 학생/교사 인증 필요. **병렬 foundation 트랙**(자체 spec/PR)으로 분리 — Slice 1은 기존 인증 추상화 위에서 동작. Slice 1로 끌어올지 여부는 별도 결정.
2. **classbot BE 스택.** PR-4는 pullim BE 패턴(NestJS + TypeORM, 클린 아키텍처) 가정. 구체는 BE-foundation 슬라이스 spec에서 핀.
3. **qgen-ai 네트워크 도달성/배포.** classbot BE → qgen-ai 호출의 네트워크 위치·secret 주입(Infisical) 경로는 PR-4에서 확정.

## 6. 성공 기준
- 학생이 리플레이 약점에서 "다시 풀기" → **실 Opus 4.8 생성·QC 통과** 문항이 기존 ExamSheet UX로 렌더(flag on, dev).
- qgen-ai 장애 시 mock으로 graceful degrade, 화면 무중단.
- FE/BE/qgen-ai/shared-types가 각각 분리 PR로 `dev` 머지, Codex 리뷰 수렴.
- prod-verify Playwright green 유지.

## 7. 비범위 (이 문서)
- 실 인증 구현(병렬 트랙), Slice 2·3 상세, qgen-ai 내부 도메인 리팩터, 결제/배포 인프라 변경.
