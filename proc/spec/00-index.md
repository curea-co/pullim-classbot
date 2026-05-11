# 풀림(Pullim) 프로젝트 명세 인덱스

이 디렉토리(`proc/spec/`)는 풀림 프로젝트의 단일 진실원(Single Source of Truth)이다. 코드와 명세가 어긋나면 코드를 진실로 보고 spec을 갱신한다(`update-spec` 스킬 활용).

## 문서 구성

| # | 파일 | 다루는 내용 |
|---|------|----------|
| 01 | [01-ai-instruction.md](01-ai-instruction.md) | AI 명령지침 — 이 명세를 읽고 개발할 AI에게 전달할 행동 규칙 |
| 02 | [02-product-definition.md](02-product-definition.md) | 제품 정의 — 풀림 3축, 문제·목표·페르소나 |
| 03 | [03-features-and-ia.md](03-features-and-ia.md) | 핵심 기능·IA·사이트맵·라우트 매핑 |
| 04 | [04-ux-flow.md](04-ux-flow.md) | UX 플로우·시나리오·핵심 인터랙션 패턴 |
| 05 | [05-business-rules.md](05-business-rules.md) | 비즈니스 규칙·RBAC·ERD·검증 규칙·AI Tier |
| 06 | [06-content-data.md](06-content-data.md) | 콘텐츠 데이터셋·Mock 페르소나·시드 데이터 |
| 07 | [07-branding.md](07-branding.md) | 브랜드 네이밍·톤앤보이스·마이크로카피·UX writing(한자어/전문용어 정책) |
| 08 | [08-design-system.md](08-design-system.md) | 디자인 토큰·컬러·타이포·레이아웃·컴포넌트·버튼 어포던스 |
| 09 | [09-tech-stack.md](09-tech-stack.md) | 기술 스택·개발 환경·배포 정책 |
| 10 | [10-roadmap.md](10-roadmap.md) | 로드맵·Phase·통합 이력·검증 기준 |

## 참고 자료

- `input/docs-archive/` — 이전 11개 마스터/핸드오프 원문 (영구 보존, read-only)
- `input/storyboard-archive/` — 라이브러리 스토리보드 원문
- `input/design-prototype/` — 초기 React 프로토타입 (`pullim-study-demo-design/`의 사본)
- `proc/plan/` — 일자별 작업 계획·이력
- `proc/archive/` — 완료된 plan 격리

## 갱신 정책

- 명세 변경 시 `/update-spec`을 호출해 본 디렉토리만 수정
- 신규 명세는 `/create-spec`로 생성 (완전 신규 영역에 한정)
- 작업 계획은 `/update-plan`으로 `proc/plan/`에 누적

## 변경 이력

- **2026-05-06**: 기존 `docs/` 11개 문서 + `pullim-study-screens` 스킬을 본 spec으로 합성 (역설계 마이그레이션)
- **2026-05-06**: UX/디자인 베이스라인 보강 — `04 § 6.6` 오버플로 처리 규칙 신설, `08 § 7.3` 버튼 어포던스 규칙 신설, `07 § 5.2` 학술 기호·약어 매핑 추가, `07 § 6` UX writing(한자어 정책) 신설. 트리거: `/q/infinity/solve` 시험 모드 다이얼로그 viewport 초과 버그, `/q/review` "정복 세트 풀이" 버튼 어포던스 미달, θ 등 학술 기호 노출 + 한자어("잔존" 등) 사용성 이슈.
- **2026-05-07**: 명세 회귀 사례 closing — `04 § 6.6.3/6.6.4` (오버플로·다이얼로그 footer cleanup), `08 § 7.3.5` (버튼 어포던스 회귀: Q·라이브러리·클래스봇·플래너 처리 완료), `07 § 5.2` (학술 기호 회귀: 2026-05-06 시점 5건 + 2026-05-07 시점 신규 도메인 발견 처리 완료) 갱신. [2026-05-07 spec-regression-closing plan](../archive/2026-05-07_spec-regression-closing.md).
