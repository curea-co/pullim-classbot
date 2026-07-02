# 클래스봇 실출시 로드맵 — mock 데모 → 실서비스 전환

> **상태**: 사용자 결정 반영(2026-07-02). BE 설계 권위: `proc/spec/2026-05-18_be-api-design.md`(9-Phase).
> **목적 재정의**: 데모가 아니라 **실제 출시**. 임계 경로 = 기능 추가가 아니라 데이터·신원·BE 전환.

## 0. 확정 결정 (사용자)

| 결정 | 선택 | 함의 |
|---|---|---|
| **신원** | **풀림 OS SSO 통합 출시** | pullim-api 가 신원 SoT. B-1~3(Vercel Dev)·CORS·allowlist 가 출시 블로커로 복귀(런북 준비됨, B-5~8은 코드/설정 검증 완료). SSO sub ↔ classbot 도메인 `users` 매핑 신설. 자체 auth(JWT)는 전환기 공존 후 정리 |
| **MVP 범위** | **코어 루프 + 챗/문항(QGen)** | 실 BE: 계정·클래스/enrollment·과제 발사→제출→진행률·개입 알림 + 챗 영속 + QGen 실 문항. 웰빙·리플레이·라이브는 mock 유지 → 2차 |
| **인프라** | **AWS (RDS Postgres + App Runner/ECS)** | 회사 AWS(022038145489, qgen 동거). Ph9 해소 |

## 1. 현재 자산 (이미 있는 것)

- Ph1 인프라·Ph2 시드(mock→DB 1:1)·Ph8 자체 auth **완료**. `apps/backend` auth·replay 모듈(클린아키텍처), Drizzle 스키마(users/classrooms/classBots/enrollments/assignments 계열 테이블 존재), `packages/api-client`(토큰 첨부+401 refresh)
- 학생 read 훅 실API 경로(`useMyAssignments` 등) — Ph3 일부 인도
- SSO FE 배선 완료(플래그 OFF)·계약 e2e(게이트)·Dev 배포 런북·qgen requiz 엔드포인트(#277 머지)
- 로컬 Postgres(docker-compose, :5434) — M2 를 AWS 없이 로컬에서 개발/검증 가능

## 2. 마일스톤

### M0 — AWS 기반 (인프라, 병렬 가능)
- RDS Postgres(dev/prod), BE 컨테이너 배포(App Runner 권장 — 단일 서비스 저운영), 시크릿(SSM/Secrets Manager), 도메인/네트워크
- Drizzle(도메인)+TypeORM(auth) 마이그레이션 적용 플로우 확정(§6.2 공존 노트)
- ⚠️ **과금 리소스 생성 전 비용 승인 필요** — 착수 전 사용자 확인

### M1 — 신원 (OS SSO 실전화)
- B-1~3 Vercel Dev 셋업(런북 §3-1 상세 절차 준비됨) + dev CORS env + `COOKIE_DOMAIN` 확인 → SSO Dev 실검증(§4-3 e2e)
- **신원 매핑 설계·구현**: SSO `sub`(auth_users uuid) → classbot 도메인 `users` 프로비저닝(기존 Ph8 패턴 확장) → enrollment 가 실사용자 FK. **roster 브리지(s1~18) 제거** — 개입/제출 조인이 실 신원으로
- prod 전환: `NEXT_PUBLIC_OS_SSO=true` + prod CORS/allowlist(코드상 이미 허용 규칙 존재)

### M2 — 코어 루프 BE (가장 큰 코드 덩어리, **로컬에서 즉시 착수 가능**)
- `apps/backend/src/modules/` 신규: `classroom`(bots/classrooms/enrollments) · `assignment`(발사/제출/진행률) · `intervention`(개입 4종+읽음) — auth·replay 의 클린아키텍처/Facade 패턴 준용, 단위 테스트 필수
- Ph3 read + Ph4 mutate + 트랜잭션 invariant(스펙 §2)
- Ph7 FE 교체(점진): 코어 스토어(`pullim-assignments`·`pullim-interventions`·`pullim-class-enrollment`) → `packages/api-client` fetch. 플래그 가드로 mock 폴백 유지(기존 `QGEN_ENABLED` 패턴)
- e2e: 기존 39 spec 의 localStorage 시드 전제를 실API 시드로 점진 전환(별도 spec 트랙)

### M3 — 챗 + QGen 실 문항
- QGen flag ON: `llm_models` seed·커리큘럼 좌표·`QGEN_*` env(전제 3개) → 재응시 실 AI
- 발사 문항도 QGen 생성 경로 연결(현재 mock 시드 fallback 대체)
- chat 영속(Ph5 일부) + ⚠️ **미결정: 챗 봇 응답의 실 LLM 게이트웨이** — 현재 챗 응답은 스크립트 mock. 실 출시 챗이려면 LLM 연동 필요(별도 결정: 직접 Claude API vs qgen-ai 경유 vs pullim 공용 게이트웨이)

### M4 — 운영 준비
- 에러 추적/모니터링 — ⚠️ 현재 "Sentry 금지" 규칙은 데모 전제. 실 출시면 재검토(글로벌 규칙 변경 = 사용자 승인)
- DB 백업/복구, prod-verify 확장(SSO·실데이터 시나리오), 기본 부하 점검, 개인정보(학생 데이터) 처리 점검

## 3. 순서와 병렬성

```
M0 (AWS)          ──────────────┐            ← 비용 승인 후, 사람+에이전트
M1 (신원/SSO)      ─ B-1~3 사람 ─┤→ 통합 → M3 → M4 → 출시
M2 (코어 BE)       ─ 로컬 즉시 ───┘            ← 에이전트 주도, 인프라 비의존
```
- **M2 가 즉시 착수 가능**(로컬 Postgres) — 코드 볼륨이 가장 커서 먼저 돌리는 게 임계 경로 단축
- M0·M1 의 사람 액션(AWS 승인, Vercel/도메인)과 병렬

## 4. 리스크

- FE 의 `@/lib/mock` 의존 ~50파일 — Ph7 은 빅뱅 금지, 스토어 단위 플래그 전환
- 신원 매핑: 교사·클래스·학생 온보딩 실플로우(참여 코드 발급 등) 설계 필요 — mock 코드(MATH-2024)의 실전판
- 챗 LLM 미결정(M3) / e2e 재작성 볼륨
- PR 규율 유지: FE/BE 분리, 전부 dev 경유 — BE 모듈 신규는 이 로드맵 승인으로 갈음
