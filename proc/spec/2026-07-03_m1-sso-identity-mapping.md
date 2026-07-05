# M1 — SSO 신원 매핑 설계 (OS sub → classbot 도메인 users)

> ## ⚠️ SUPERSEDED / 개정 (2026-07-05) — pullim-api 정본화 피벗
>
> classbot **코어 루프 BE 정본이 pullim-api `src/classbot`** 로 이관됐다(ADR-063, pullim-api PR #316~#322).
> 정본 표면·인가는 [`pullim-api/docs/design/services/classbot/api.md`](../../../pullim-api/docs/design/services/classbot/api.md)·
> [`authz.md`](../../../pullim-api/docs/design/services/classbot/authz.md) 가 권위다. 이 피벗으로 본 문서(§2.1·§2.2)의
> 핵심 결정은 **폐지**됐다 — 아래 각 절 상단의 개정 노트를 우선한다. FE 는 이에 맞춰 재배선됨(#203):
> `me-sync`·`x-user-id`·3-way 신원 제거, OS 쿠키(`credentials:'include'`) + 쓰기 CSRF(`X-CSRF-Token`)만.
>
> **여전히 유효한 부분**: §2.4(roster 브리지 = mock/데모 flag-OFF 전용 존치), §3 검증 계획의 로컬 SSO 리허설 골격.

> **근거**: 실출시 로드맵(`proc/plan/2026-07-02_real-launch-roadmap.md`) M1.
> **선행 정합**: FE Ph7(#196)의 신원 게이트(인증=raw id, 데모=roster 브리지)가 이 설계의 FE 측 절반을 이미 깔아 둠.

## 1. 문제

OS SSO 모드에서 classbot 의 신원은 pullim-api `/me`(쿠키 세션)에서 파생된 **OS sub(uuid)** 다.
그러나 classbot 도메인 테이블(enrollments·submissions·interventions)의 FK 주체는 도메인 `users` 행 —
SSO 사용자의 users 행이 없으면 코드 참여·제출·개입이 전부 FK 실패한다. 또한 FE 의 `domain-fetch` 는
classbot 자체 JWT(Bearer)만 인증 경로로 인식해, **SSO 세션 사용자(토큰 없음)는 데모로 오분류**된다.

## 2. 결정

> **🚫 §2.1 폐지 (2026-07-05)** — pullim-api 정본은 **도메인 users 를 프로비저닝하지 않는다**. OS `sub`(uuid)를
> plain ID-참조 컬럼으로 직접 사용하며 cross-schema FK 가 없다(pullim-api `db-structure §2`). enrollment/submission/
> intervention 쓰기는 사전 user 행 전제 없이 `sub` 만으로 성립한다 → **me/sync 자체가 불필요**, FE 에서 제거함이
> 맞다(#203). 아래 §2.1 원문은 이력 보존용이며 더 이상 유효하지 않다.

### 2.1 프로비저닝 — `POST /api/me/sync` (classbot BE, 멱등 upsert) — ⛔ 폐지

- body `{ name, role }` + 신원(`x-user-id` = OS sub — Ph7 과도기 규약 그대로).
- 도메인 `users` 에 `(id=sub, name, role, profile:{})` **upsert** (auth 모듈 `provisionDomainUser` 의
  `ON CONFLICT DO NOTHING` 패턴 + name 갱신). role 은 재호출 시 **최초 값 유지**(역할 승격 방지).
- role 은 `student|teacher` 만(400). **parent 거부 근거**: 이 추출본은 보호자 표면이 제거된
  클래스봇 단일 도메인(CLAUDE.md — `(parent)/parent/*` 부재)이라 parent 의 SSO 진입 유스케이스가
  없다. 도메인 `users.role` enum 에 parent 가 있는 것은 시드(가족 링크)용 — SSO 프로비저닝
  경로와는 별개. 보호자 표면 도입 시 이 목록을 확장한다.
- FE 가 SSO 세션 확립 직후(auth-context 의 getSession 성공 시) 호출 — 실패해도 UX 비차단.
  **dedup 은 성공 시에만 마킹**(실패는 다음 트리거에서 재시도) — sync 실패 후 첫 도메인 쓰기가
  FK 로 실패하는 창을 최소화. 쓰기 시점 FK 에러는 최후 방어선.

> **🚫 §2.2 폐지 (2026-07-05)** — 3-way 신원(classbot JWT Bearer / SSO `x-user-id` / 데모 `x-user-id`)은 **폐지**됐다.
> 정본은 **OS access 쿠키**(`__Secure-*-pullim-at`, HttpOnly, `JwtVerifyGuard` 서버 검증)에서 `sub` 를 도출한다.
> FE 는 `credentials:'include'` 로 쿠키를 자동 첨부하고 쓰기에만 CSRF(`X-CSRF-Token`)를 실을 뿐, **`x-user-id`·
> `Bearer` 를 전송하지 않는다**(#203). 위조 가능한 `x-user-id` 과도기 규약(§2.3)도 함께 폐지 — 서버 검증 쿠키로
> 신원 위조 창이 닫혔다(보안 강화). FE 는 세션 `sub` 를 인박스/목록 **로컬 필터·재동기화 캐시 키**로만 보유한다.
> 아래 §2.2·§2.3 원문은 이력 보존용이며 더 이상 유효하지 않다.

### 2.2 FE 신원 확장 — `domain-fetch` 의 SSO 경로 — ⛔ 폐지

`getAuthUserSnapshot()` 3-way 로 확장:
1. classbot JWT 토큰 보유 → Bearer(`authRequest`) — 기존.
2. **OS SSO 모드(`OS_SSO_ENABLED`) + OS 세션 인증** → `x-user-id = OS sub`(raw uuid) 직접 전송.
   HttpOnly 쿠키라 FE 는 토큰을 못 읽음 — 세션 스냅샷은 auth-context 가 이미 보유한 `AuthUser`
   를 모듈 레벨로 노출(publish)해 사용. 데모 브리지 미적용(#196 R2 규칙 그대로).
3. 미인증 → 데모 `x-user-id`(roster 브리지) — 기존.

### 2.3 신뢰 경계 (정직한 한계 — Ph7 과도기)

`x-user-id` 는 **위조 가능**하다. 이는 M2 부터 문서화된 과도기 규약(spec 개정 §3)이며 M1 도 동일
경계 안에 있다. **완전한 서버측 검증**(classbot BE 가 OS 쿠키를 pullim-api `/me` 로 introspect)은
M1-후속(hardening)으로 분리 — 후속 시 `OptionalJwtAuthGuard` 자리에 OS-세션 가드를 추가하면
FE 는 무변경(쿠키 자동 동봉, Domain=.pullim.ai 가 classbot BE 도메인을 커버하도록 배포 필요).

### 2.4 roster 브리지의 위치 (제거 아님 — 격리) — ✅ 유효

로드맵의 "브리지 제거"의 실체: **실사용자 경로에서 브리지를 배제**하는 것(#196 R2 → #203 으로 완료) +
SSO 사용자가 도메인 행을 갖게 하는 것(§2.1). 브리지 자체는 미인증 데모 전용으로 존치(의도).

> **개정 (2026-07-05)**: 실사용자 경로의 브리지 제거가 #203 에서 완결됐다 — 정본은 `sub` 를 직접 쓰므로
> `toDomainUserId`/`fromDomainUserId`(seed `student_001↔s1`) 변환을 실경로에서 삭제했다. §2.1 이 폐지돼
> "SSO 사용자 도메인 행 확보"는 불요가 됐다(서버가 `sub` 로 직접 성립). mock/데모(flag-OFF)의 roster
> 브리지는 그대로 유지된다(회귀 0).

## 3. 검증 계획

- BE 단위: sync upsert 멱등·role 검증·무신원 401.
- FE 단위: SSO 스냅샷 → x-user-id=sub / 데모 브리지 미적용 / sync 1회 호출.
- 로컬 SSO 리허설(런북 §5) + flag ON: OS 로그인 → me/sync → 코드 참여 → 발사 수신 → 제출 → 개입 인박스.
- Dev 검증(런북 §4-3): B-1~3 완료 후 `SSO_E2E_*` e2e.

## 범위 외 (M1-후속)

OS 쿠키 서버측 introspection 가드, classbot BE 의 `.pullim.ai` 서브도메인 배포(M0), 교사 SSO 온보딩 플로우(반/봇 생성).
