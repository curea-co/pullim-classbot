# [핸드오프 → OS팀] B-8: classbot Dev 호스트를 SSO next 복귀 allowlist 에 등록

> **From**: 풀림 클래스봇 (curea-co/pullim-classbot) · **To**: 풀림 OS/플랫폼 팀 (pullim-api / pullim-web)
> **작성일**: 2026-07-01 · **우선순위**: A트랙(데모 출시) 블로커 · **오너**: OS팀 BE/FE
> **관련**: classbot PR #175(B-7 FE 초안) · 런북 `proc/plan/2026-07-01_classbot-sso-dev-deploy-runbook.md` §3-4

---

## 1. 한 줄 요청

풀림 OS 로그인의 `next` 복귀 허용 목록(**`REDIRECT_HOST_ALLOWLIST`** 또는 동등 메커니즘)에 클래스봇 Dev 호스트 **`dev-classbot.pullim.ai`** 를 등록하고, OS `resolveNext` 가 **allowlist 에 속한 cross-host 절대 URL `next`** 로 로그인 후 복귀하도록 해 주세요.

## 2. 왜 필요한가 (배경)

클래스봇은 공통 헤더가 없는 별도 앱(`classbot.pullim.ai` / Dev `dev-classbot.pullim.ai`)으로, 인증을 풀림 OS SSO 로 위임합니다. 로그인 진입 시 OS `/login?next=…` 로 보내고, 로그인 완료 후 OS 가 `next` 로 클래스봇에 복귀시켜야 합니다.

- **로컬 미러**(OS·classbot 동일 상위 도메인/오리진 가정)에서는 내부 경로 `next=/classbot` 로 동작했습니다.
- **Dev 는 cross-host** 입니다: OS = `dev-os.pullim.ai`, classbot = `dev-classbot.pullim.ai`. 내부 경로 `next=/classbot` 는 OS 기준 상대경로로 해석돼 **`dev-os.pullim.ai/classbot`**(= OS 자신)을 가리켜, 클래스봇으로 복귀하지 못합니다.

## 3. 클래스봇(FE) 이 이미 한 것 — B-7 (PR #175)

클래스봇은 cross-host 일 때 `next` 를 **앱 오리진 절대 URL** 로 승격해 보냅니다:

```
https://dev-os.pullim.ai/login?next=https%3A%2F%2Fdev-classbot.pullim.ai%2Fclassbot
```

- 승격 로직: `apps/classbot/lib/auth/os-sso.ts` `resolveReturnTarget()` — OS 오리진 ≠ 앱 오리진일 때만 절대 URL, 동일 오리진이면 기존 내부 경로 유지.
- **open-redirect 방지**: 클래스봇은 **자기 자신의 오리진(`window.location.origin`)** 의 절대 URL 만 `next` 로 만듭니다(사용자 입력이 아님). 외부 호스트는 FE 가드에서 차단합니다.

즉 FE 는 준비됐고, **OS 가 이 cross-host `next` 를 수용**하기만 하면 복귀가 성립합니다.

## 4. OS팀에 필요한 변경 (B-8)

정확한 파일/env 이름은 OS 레포 소관이라 아래는 **계약(contract) 기준** 요청입니다 — 실제 위치는 OS팀이 확정해 주세요.

1. **allowlist 등록**: cross-host `next` 복귀 허용 호스트 목록에 아래를 추가.
   - Dev: `dev-classbot.pullim.ai` (이번 A트랙 대상)
   - Prod(후속, 프로덕션 SSO 승격 시): `classbot.pullim.ai`
2. **`resolveNext` 수용 범위 확장**: 현재 same-origin 한정으로 보이는 `resolveNext` 가, `next` 의 호스트가 allowlist 에 포함된 **절대 URL** 이면 그 URL 로 복귀하도록 허용. allowlist 밖 호스트는 지금처럼 거부(기본 홈 폴백) — open-redirect 방지 그대로 유지.

## 5. 함께 확인 필요한 인접 블로커 (같은 cross-host 원인)

cross-host 는 복귀뿐 아니라 세션 확인·로그아웃에도 영향이 있어, B-8 과 함께 아래도 필요합니다(런북 §3-3):

- **B-5 (CORS)**: pullim-api Dev 의 CORS 허용 오리진에 `https://dev-classbot.pullim.ai` 추가 — `/me`, `/auth/csrf`, `/auth/logout` 대상. `credentials:'include'` 이므로 `Access-Control-Allow-Credentials: true` + 정확한 오리진 반사 필요(와일드카드 불가).
- **B-6 (쿠키 속성)**: 세션 쿠키가 cross-site(`dev-classbot` → `api`)로 전송되려면 `SameSite=None; Secure` 여야 하고, 서브도메인 공유가 필요하면 `Domain=.pullim.ai` 도메인 쿠키여야 합니다.

## 6. 완료 기준 (Acceptance)

OS팀 변경 후 아래가 성립하면 B-8 완료로 간주합니다:

1. `https://dev-classbot.pullim.ai/classbot` 에서 로그인 진입 → `https://dev-os.pullim.ai/login?next=https%3A%2F%2Fdev-classbot.pullim.ai%2Fclassbot` 로 이동.
2. OS 로그인 완료 → **`dev-classbot.pullim.ai` 로 자동 복귀**(현재 경로 유지), 헤더에 사용자명 노출.
3. allowlist 밖 호스트(예: `https://evil.example.com`)를 `next` 로 위조 시 → 기본 홈 폴백(복귀 거부).

## 7. 검증 방법 (양팀 공용)

클래스봇에 게이트된 SSO 계약 e2e(`apps/classbot/tests/e2e/sso-login-roundtrip.spec.ts`)가 있습니다. B-8 + B-5/6 완료 후:

```bash
cd apps/classbot
SSO_E2E_BASE_URL=https://dev-classbot.pullim.ai \
  SSO_E2E_API_BASE_URL=https://api.pullim.ai \
  SSO_E2E_OS_URL=https://dev-os.pullim.ai \
  SSO_E2E_SESSION_COOKIE='local-pullim-at=<유효세션쿠키값>' \
  bunx playwright test tests/e2e/sso-login-roundtrip.spec.ts
```

(env 부재 시 자동 skip 되어 prod-verify 에는 영향 없음.)

## 8. 참고 링크

- classbot B-7 FE 초안: PR **#175** (`feat/sso-cross-host-next`) — allowlist 확정 후 머지 예정.
- 배포 런북(전체 블로커 체크리스트 포함): `proc/plan/2026-07-01_classbot-sso-dev-deploy-runbook.md`.
- SSO 배선 파일: `apps/classbot/lib/auth/{os-sso.ts, safe-next.ts, os-sso-provider.ts}`, `components/shell/app-header.tsx`.
