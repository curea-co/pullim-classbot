# 2026-05-06 Spec 마이그레이션 (옛 docs/ + pullim-study-screens 스킬 → proc/spec/)

## 목표
기존 `docs/` 11개 마스터/핸드오프 문서 + `pullim-study-screens` 스킬 + `STATUS.md`를 `create-spec`/`update-spec`/`update-plan` 3개 스킬 컨벤션의 `proc/spec/` + `proc/plan/`으로 역설계 마이그레이션.

## 작업 항목
- [x] **Step 0**: 백업 — `.migration-backup-2026-05-06/`에 docs/, storyboard/, 옛 스킬 보존
- [x] **Step 1**: 스킬 이식 + 디렉토리 구조 생성
  - [x] `create-spec`, `update-spec`, `update-plan` 3개 스킬 복사
  - [x] `proc/spec/`, `proc/plan/`, `proc/archive/` 생성
  - [x] `input/docs-archive/`, `input/storyboard-archive/`, `input/design-prototype/` 생성
- [x] **Step 2**: 자산 이전
  - [x] `docs/*` → `input/docs-archive/`
  - [x] `storyboard/*` → `input/storyboard-archive/`
  - [x] `pullim-study-demo-design/*` → `input/design-prototype/` (사본)
- [x] **Step 3**: 원천 자료 추출 (Explore 서브에이전트 2개 병렬)
  - [x] 4 마스터 문서 (00, 01, 03, 04)
  - [x] 8 핸드오프·스토리보드 (02, 05, 06, 07, 08, 09, Q스토리보드, 라이브러리스토리보드)
  - [x] web/CLAUDE.md, AGENTS.md, package.json
  - [x] web/lib/tokens, globals.css
- [x] **Step 4**: `proc/spec/` 10개 문서 생성
  - [x] 00-index.md
  - [x] 01-ai-instruction.md (옛 SKILL.md + 00_기능기획_Skill 통합)
  - [x] 02-product-definition.md (3축 + Persona)
  - [x] 03-features-and-ia.md (14→8 통합 + 라우트 매핑)
  - [x] 04-ux-flow.md (3개 UC + Navigation Flow)
  - [x] 05-business-rules.md (Scope Guard·CSP·Leitner·RBAC·ERD·AI Tier)
  - [x] 06-content-data.md (Mock 페르소나·시드 데이터)
  - [x] 07-branding.md (Tone & Voice·Microcopy)
  - [x] 08-design-system.md (토큰·컴포넌트·차트)
  - [x] 09-tech-stack.md (Next 16·React 19·Tailwind 4)
  - [x] 10-roadmap.md (Phase·STATUS 통합)
- [x] **Step 5**: `proc/plan/` 회고 plan 백필 (이 문서 포함 5개)
  - [x] 2026-04-27_audit-pass-cleanup.md
  - [x] 2026-04-29_classbot-teacher-routes.md
  - [x] 2026-04-XX_feature-consolidation-14-to-8.md
  - [x] 2026-04-XX_unified-shell-implementation.md
  - [x] 2026-05-06_spec-migration-from-pullim-skill.md (본 문서)
- [x] **Step 6**: 옛 `pullim-study-screens` 스킬 폐기 (2026-05-06)
- [x] **Step 7**: 검증
  - [x] 라우트 정합 확인 (proc/spec/03 ↔ web/app/ 실제 라우트)
  - [x] mock 페르소나 일관성 확인 (proc/spec/06 ↔ web/lib/mock/persona.ts)
  - [x] 토큰 정합 확인 (proc/spec/08 ↔ web/app/globals.css)
  - [x] drift 보고서 작성 (`2026-05-06_drift-report.md`)
- [x] **Step 8 (옵션 A 선택)**: drift 7건을 spec에 반영 (코드 = 진실)
  - [x] Drift 1: 교사 라우트 위치 (`/teacher/*` 직속) → spec 갱신
  - [x] Drift 2: 분석 탭 → 별도 sub-route (`/q/analysis/{ability,process}`) 반영
  - [x] Drift 3: `/q/review/master` 미구현 명시 (사이드바 잠금만 표시)
  - [x] Drift 4: 플래너 day/week/month redirect 페이지로 의도된 잔존 명시
  - [x] Drift 5+6: 신규 라우트(store, studio, onboarding 8개, library 확장 5개) spec에 추가
  - [x] Drift 7: `phase1.ts` mock 파일 spec에 추가
  - [x] components 폴더 정합화 (`tutor` 폴더 부재 반영)

## 비고

### 결정 사항 (사용자 합의)
1. **옛 스킬 폐기** — `pullim-study-screens` 스킬은 본 spec 문서로 완전 흡수 후 삭제
2. **백업 로컬만 보관** — `.migration-backup-2026-05-06/`는 git에 올리지 않음

### 마이그레이션 비용·이득

#### 잃은 것
- **옛 스킬의 자동 활성화**: description 키워드 매칭으로 자동 발동되던 동작 → `proc/spec/`은 정적 문서이므로 작업 시마다 직접 참조 필요
- **STATUS.md의 풍부한 메타데이터**: Audit 정정 사항(false positive 4건 같은) 상세 기록 → plan 파일의 `## 비고`로 이전했으나 표현력은 다소 감소

#### 얻은 것
- **3개 스킬과 정합**: 이후 `/update-spec`이 정확히 동작
- **컨벤션 통일**: 다른 풀림 프로젝트(spark-ipo-onething-auction 등)와 같은 구조
- **`input/` 활용**: 원천 자료를 보존하면서 단일 진실원(`proc/spec/`) 확보
- **변경 추적 용이**: spec과 plan 분리로 무엇이 바뀌었는지(spec) vs 무엇을 했는지(plan) 명확

### 향후 운영
- 명세 변경 시 `/update-spec` 호출
- 신규 작업 계획 시 `/update-plan` 호출
- `input/` 폴더는 read-only (원천 자료 보존)
- `proc/archive/`로 완료된 plan 격리 (선택)
