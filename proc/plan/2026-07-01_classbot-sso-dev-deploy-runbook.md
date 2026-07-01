# 클래스봇 SSO 데모 출시 — Dev 배포 런북

> **목적**: A트랙(데모 출시) OS SSO 연동을 `dev-classbot.pullim.ai`(Vercel Dev 환경)에서 동작시키고 검증하는 절차를 기록한다.
> **대상 환경**: Vercel Dev(`dev-classbot.pullim.ai`) · Dev origin 기준.
> **작성일**: 2026-07-01

---

## 1. 목적과 범위

A트랙은 클래스봇 FE를 풀림 OS SSO 세션으로 인증한 채 외부에 데모하는 단계다.
이 런북은 아래 두 가지를 다룬다.

1. Vercel Dev 환경변수 설정 — 코드 변경 없이 SSO를 활성화한다.
2. 배포 후 동작 검증 — 수동 확인 순서와 자동 SSO 라운드트립 spec 실행 명령.

> 로컬 리허설 절차는 §5에 별도 수록한다. Dev 배포 전에 로컬에서 먼저 SSO 흐름을 검증해 두면 원인 분리가 빠르다.

---

## 2. Vercel Dev 환경변수

### 2-1. 필수 변수 표

Vercel 대시보드 > **`classbot` 프로젝트** > Settings > Environment Variables에서 아래 변수를 **Preview(Dev)** 스코프로 설정한다.

| 변수명 | Dev 값 | 소비 지점 | 필수 여부 |
|--------|--------|-----------|-----------|
| `NEXT_PUBLIC_OS_SSO` | `true` | `apps/classbot/lib/auth/auth-mode.ts:3` — `OS_SSO_ENABLED` 플래그. `true`이면 `OsSsoAuthProvider`로 전환 | **필수** |
| `NEXT_PUBLIC_OS_URL` | `https://dev-os.pullim.ai` | `apps/classbot/lib/auth/os-sso.ts:25` — OS 로그인 리다이렉트 대상(`/login?next=<path>`) | **필수** |
| `NEXT_PUBLIC_OS_API_URL` | `https://api.pullim.ai` | `apps/classbot/lib/auth/os-sso.ts:33` — `/me` · `/auth/csrf` · `/auth/logout` 호출 대상. `credentials:'include'`로 세션 쿠키 동반 | **필수** |
| `NEXT_PUBLIC_API_URL` | `https://api.classbot.pullim.ai/api` (또는 classbot NestJS Dev 호스트) | `packages/api-client/src/index.ts:21` — classbot 자체 BE(재응시 등) 호출 대상. OS API와 완전히 별개 | 권장 (미설정 시 `localhost:4032`로 폴백 → Vercel에서 실패) |

### 2-2. 변수 분리 주의 사항

`NEXT_PUBLIC_OS_API_URL`과 `NEXT_PUBLIC_API_URL`은 서로 다른 백엔드를 가리키는 **완전히 별개의 변수**다.

| 변수 | 가리키는 백엔드 | 경로 패턴 | 용도 |
|------|----------------|-----------|------|
| `NEXT_PUBLIC_OS_API_URL` | 풀림 OS `pullim-api` (api.pullim.ai) | `/me`, `/auth/csrf`, `/auth/logout` — 루트 기준, `/api` 프리픽스 없음 | SSO 세션 쿠키 확인·로그아웃 |
| `NEXT_PUBLIC_API_URL` | classbot 자체 NestJS BE | `/api/classbot/*`, `/api/replay/*` — `/api` 프리픽스 포함 | 재응시(QGen), 클래스봇 도메인 API |

`NEXT_PUBLIC_OS_API_URL`을 누락하면 `/me` 호출이 코드 내 기본값(`http://api.pullim.local:3000`)으로 새어 **모든 SSO 세션이 null 반환**된다.

### 2-3. Next.js 정적 인라인 제약

`NEXT_PUBLIC_*` 변수는 빌드 시 정적 문자열로 인라인된다. 환경변수를 변경한 뒤에는 **반드시 재빌드·재배포**가 필요하다.
동적 우회(`globalThis.process` 등)는 클라이언트 번들에서 치환 대상이 아니어서 항상 `undefined`가 된다.

---

## 3. 사람 선행 블로커 체크리스트

배포 전에 아래 항목을 각 오너가 확인하고 체크해야 한다. **미완료 블로커가 있으면 SSO가 동작하지 않는다.**

### 3-1. Vercel Dev 프로젝트 · 도메인

| # | 항목 | 오너 | 완료 |
|---|------|------|------|
| B-1 | Vercel `classbot` 프로젝트에 `dev-classbot.pullim.ai` 커스텀 도메인이 할당되어 있는가 | Infra | [ ] |
| B-2 | `dev-classbot.pullim.ai` Vercel Preview 배포가 `dev` 브랜치를 소스로 인식하는가 | Infra | [ ] |
| B-3 | `dev-classbot.pullim.ai`가 외부 차단(Vercel Password Protection 또는 allowlist)으로 보호되어 있는가 (Dev = preview, 외부 노출 금지) | Infra | [ ] |

### 3-2. classbot 포트 · 서비스 표준 배정

| # | 항목 | 오너 | 완료 |
|---|------|------|------|
| B-4 | `pullim-api` 로컬 포트 표준 문서(`pullim-api/.claude/rules/local-ports.md`)에 classbot 서비스가 등재되어 있는가 (`.env.example` 주석에 "임시 3012" 기재 — 확정 필요) | BE(OS팀) | [ ] |

### 3-3. Dev pullim-api CORS allowlist

| # | 항목 | 오너 | 완료 |
|---|------|------|------|
| B-5 | `pullim-api` Dev 배포의 CORS 허용 오리진 목록에 `https://dev-classbot.pullim.ai`가 추가되어 있는가 — `/me`, `/auth/csrf`, `/auth/logout` 모두 해당 | BE(OS팀) | [ ] |
| B-6 | 쿠키 `SameSite`, `Domain` 설정이 `dev-classbot.pullim.ai` ↔ `api.pullim.ai` 간 cross-origin 쿠키 전송을 허용하는가 (`credentials:'include'` 필수 — `SameSite=None; Secure` 필요) | BE(OS팀) | [ ] |

### 3-4. cross-app 리다이렉트 HOST_ALLOWLIST

| # | 항목 | 오너 | 완료 |
|---|------|------|------|
| B-7 | `pullim-api` 또는 `pullim-web`의 `REDIRECT_HOST_ALLOWLIST`(또는 동등한 next 복귀 경로 허용 목록)에 `dev-classbot.pullim.ai`가 등록되어 있는가 — OS 로그인 완료 후 `?next=https://dev-classbot.pullim.ai/...` 복귀를 위해 필요 | BE(OS팀) | [ ] |
| B-8 | OS 로그인 완료 후 `next` 파라미터로 classbot Dev URL로 복귀하는 경로를 pullim-web이 허용하는가 | FE(OS팀) | [ ] |

---

## 4. 배포 후 검증 절차

### 4-1. 환경변수 주입 확인 (빌드 직후)

```bash
# Dev 배포 URL의 HTML 소스에서 빌드 SHA를 확인한다
curl -s https://dev-classbot.pullim.ai/classbot \
  | grep 'x-build-sha'
# 예: <meta name="x-build-sha" content="abc1234...">
# 최신 커밋 SHA와 일치해야 정상
```

### 4-2. SSO 플로우 수동 확인 (순서대로)

1. **미로그인 상태** — `https://dev-classbot.pullim.ai/classbot` 접속 확인
   - 헤더 프로필 버튼이 로그인 아이콘(`LogIn`)으로 표시되는가
2. **로그인 진입** — 헤더 프로필 버튼 클릭
   - `https://dev-os.pullim.ai/login?next=%2Fclassbot`으로 리다이렉트되는가
   - `next` 파라미터가 classbot 내부 경로(`/classbot`)로 인코딩되어 있는가
3. **OS 로그인 완료 후 복귀**
   - OS 로그인 후 classbot Dev URL로 자동 복귀되는가
   - 헤더 프로필 버튼에 사용자 이름 이니셜이 표시되는가
   - 역할(학생/교사)에 따라 올바른 홈 화면으로 진입되는가
4. **세션 복원 확인**
   - 페이지 새로고침 후에도 로그인 상태가 유지되는가 (`GET /me` 200 응답)
5. **로그아웃**
   - 프로필 메뉴 > 로그아웃 클릭
   - `GET /auth/csrf` → `POST /auth/logout` 순서로 호출되는가 (DevTools Network 탭)
   - 로그아웃 후 `https://dev-os.pullim.ai`로 리다이렉트되는가

### 4-3. 자동 SSO 라운드트립 spec 실행

> 현재 `apps/classbot/tests/e2e/` 디렉터리에는 SSO 전용 spec(`sso-login-roundtrip.spec.ts`)이 아직 없다.
> 아래 명령은 해당 spec이 추가된 이후의 실행 방법을 선술한다.

```bash
# SSO 전용 e2e spec (작성 후)
SSO_E2E_BASE_URL=https://dev-classbot.pullim.ai \
  PLAYWRIGHT_BASE_URL=https://dev-classbot.pullim.ai \
  bunx playwright test apps/classbot/tests/e2e/sso-login-roundtrip.spec.ts
```

**기존 prod-verify spec을 Dev에 대해 실행 (SSO 무관 회귀 확인):**

```bash
# 기존 e2e 전체 — SSO 세션 없이 접근 가능한 공개 페이지 회귀 확인
PLAYWRIGHT_BASE_URL=https://dev-classbot.pullim.ai \
  bunx playwright test apps/classbot/tests/e2e/
```

### 4-4. /me 엔드포인트 직접 확인

```bash
# Dev 환경 브라우저 콘솔에서 실행 (쿠키 동반)
# DevTools > Console
fetch('https://api.pullim.ai/me', {
  credentials: 'include',
  headers: { Accept: 'application/json' }
}).then(r => r.json()).then(console.log)
# 로그인 상태 → { sub, email, displayName, role, globalRole } 반환
# 미로그인   → 401 (세션 없음)
```

---

## 5. 로컬 SSO 리허설 레시피 (참고)

Dev 배포 전에 로컬에서 SSO 흐름 전체를 검증하는 환경 구성이다.
이 절차는 `apps/classbot/.env.example` 주석과 `pullim-web docs/common/2026-06-22-local-pullim-local-sso/runbook.md`를 권위로 한다.

### 5-1. /etc/hosts 추가

```
# pullim local SSO
127.0.0.1  os.pullim.local
127.0.0.1  api.pullim.local
127.0.0.1  classbot.pullim.local
```

### 5-2. 서비스 기동 순서

```bash
# 1. pullim-api (OS SSO 백엔드) — port 3000
#    pullim-api 리포에서:
bun run dev

# 2. pullim-web (OS 로그인 UI) — port 3001 (os.pullim.local:3001)
#    pullim-web 리포에서:
bun run dev

# 3. classbot FE — SSO 모드 (port 3012, os.pullim.local:3012)
#    pullim-classbot 리포에서 (apps/classbot/.env.local을 아래 값으로 설정):
#      NEXT_PUBLIC_OS_SSO=true
#      NEXT_PUBLIC_OS_URL=http://os.pullim.local:3001
#      NEXT_PUBLIC_OS_API_URL=http://api.pullim.local:3000
bun run dev:classbot
# 기본 포트(3032)가 충돌하면 PORT=3012 bun run dev:classbot
```

### 5-3. 로컬 쿠키 공유 원리

OS 로그인(`os.pullim.local:3001`)이 set한 host-only 세션 쿠키는 포트 무관으로 같은 host(`os.pullim.local`)의 다른 포트(`3012`)에도 전송된다.
classbot의 `GET /me`는 `credentials:'include'`로 이 쿠키를 자동 동봉한다.

### 5-4. 로컬 SSO 플로우 확인

1. `http://classbot.pullim.local:3012/classbot` 접속
2. 헤더 로그인 버튼 → `http://os.pullim.local:3001/login?next=%2Fclassbot`으로 이동
3. OS 로그인 완료 → classbot 로컬로 복귀
4. 헤더에 사용자 이름 표시 확인

---

## 6. 참고 파일 맵

| 파일 | 역할 |
|------|------|
| `apps/classbot/lib/auth/auth-mode.ts` | `OS_SSO_ENABLED` 플래그 (`NEXT_PUBLIC_OS_SSO === 'true'`) |
| `apps/classbot/lib/auth/os-sso.ts` | `OS_URL`, `API_BASE` 상수 · `osLoginUrl()` · `osSignupUrl()` |
| `apps/classbot/lib/auth/os-sso-provider.ts` | `OsSsoAuthProvider` — `/me`, `/auth/csrf`, `/auth/logout` 호출 |
| `apps/classbot/lib/auth/auth-context.tsx` | `AuthProvider` — SSO 플래그에 따라 provider 선택 |
| `apps/classbot/components/shell/app-header.tsx` | `goLogin()` (OS 리다이렉트) · `handleLogout()` (CSRF+로그아웃) |
| `apps/classbot/.env.example` | 환경변수 예시 및 로컬/Dev/prod 값 주석 |
