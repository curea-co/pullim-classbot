# M1 — SSO 신원 매핑 설계 (OS sub → classbot 도메인 users)

> **근거**: 실출시 로드맵(`proc/plan/2026-07-02_real-launch-roadmap.md`) M1.
> **선행 정합**: FE Ph7(#196)의 신원 게이트(인증=raw id, 데모=roster 브리지)가 이 설계의 FE 측 절반을 이미 깔아 둠.

## 1. 문제

OS SSO 모드에서 classbot 의 신원은 pullim-api `/me`(쿠키 세션)에서 파생된 **OS sub(uuid)** 다.
그러나 classbot 도메인 테이블(enrollments·submissions·interventions)의 FK 주체는 도메인 `users` 행 —
SSO 사용자의 users 행이 없으면 코드 참여·제출·개입이 전부 FK 실패한다. 또한 FE 의 `domain-fetch` 는
classbot 자체 JWT(Bearer)만 인증 경로로 인식해, **SSO 세션 사용자(토큰 없음)는 데모로 오분류**된다.

## 2. 결정

### 2.1 프로비저닝 — `POST /api/me/sync` (classbot BE, 멱등 upsert)

- body `{ name, role }` + 신원(`x-user-id` = OS sub — Ph7 과도기 규약 그대로).
- 도메인 `users` 에 `(id=sub, name, role, profile:{})` **upsert** (auth 모듈 `provisionDomainUser` 의
  `ON CONFLICT DO NOTHING` 패턴 + name 갱신). role 은 `student|teacher` 만(admin/parent 거부 400).
- FE 가 SSO 세션 확립 직후(auth-context 의 getSession 성공 시) 1회 호출 — 실패해도 UX 비차단
  (도메인 쓰기 시점에 FK 에러로 드러나면 재시도).

### 2.2 FE 신원 확장 — `domain-fetch` 의 SSO 경로

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

### 2.4 roster 브리지의 위치 (제거 아님 — 격리)

로드맵의 "브리지 제거"의 실체: **실사용자 경로에서 브리지를 배제**하는 것(#196 R2 로 완료) +
SSO 사용자가 도메인 행을 갖게 하는 것(§2.1). 브리지 자체는 미인증 데모 전용으로 존치(의도).

## 3. 검증 계획

- BE 단위: sync upsert 멱등·role 검증·무신원 401.
- FE 단위: SSO 스냅샷 → x-user-id=sub / 데모 브리지 미적용 / sync 1회 호출.
- 로컬 SSO 리허설(런북 §5) + flag ON: OS 로그인 → me/sync → 코드 참여 → 발사 수신 → 제출 → 개입 인박스.
- Dev 검증(런북 §4-3): B-1~3 완료 후 `SSO_E2E_*` e2e.

## 범위 외 (M1-후속)

OS 쿠키 서버측 introspection 가드, classbot BE 의 `.pullim.ai` 서브도메인 배포(M0), 교사 SSO 온보딩 플로우(반/봇 생성).
