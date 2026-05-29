# 풀림 클래스봇 — 인증(로그인/회원가입) 풀세트 도입 plan

- 작성일: 2026-05-29
- 브랜치: `feat/auth-login-signup`
- 대상: `apps/backend` (NestJS 11, port 4032)
- 정본 참조: `curea-co/pullim` `apps/backend/src/modules/auth/*`, `.claude/rules/backend/*`
- 도메인 권위: `input/docs-archive/07_풀림_클래스봇_핸드오프.md` (교사 중심, P1 교사 / P2 학생)

> **현실 범위 명시 (정직 보고)**
> 이 plan은 **풀세트 전체 설계**를 담되, 이번 작업의 코드 산출물은 **핵심 동작만 실제 DB로 완성**한다:
> 이메일+비밀번호 회원가입 · 로그인 · JWT access/refresh · 로그아웃 (전부 실 Postgres 동작).
> 소셜 로그인 / 이메일 인증 / 비밀번호 재설정 / 이메일 찾기 / 로그인 이력은 **본체 미러링 골격 + `GATED:` 주석**으로 스캐폴드만 둔다 (DB·외부연동 미연결).
> **"풀세트 완성"이 아니라 "핵심 동작 + 구조 + plan"** 이 이번 산출물의 정직한 경계다.

---

## 0. 배경 & 제약 (정본 vs classbot)

### 0.1 정본(pullim)과 classbot 백엔드의 스택 차이

| 항목 | 정본 pullim/apps/backend | classbot apps/backend (이번 대상) |
|---|---|---|
| 모듈 시스템 | ESM (`module: nodenext`, import에 `.js`) | **CommonJS** (`module: commonjs`, `moduleResolution: node`) |
| path alias | `#common/*`, `#entities/*` (subpath imports) | tsconfig `paths` 미설정 → **상대경로 사용** |
| 패키지 매니저 | pnpm | **bun** workspace |
| 토큰 블랙리스트 | **Redis** (`RedisStoreInterface`, setnx/getdel) | Redis 없음 → **DB 테이블 기반 블랙리스트** (`auth_revoked_tokens`) |
| 비번 해시 | bcrypt + HMAC pepper (`crypto.util.ts`) | **동일 lib 적용** (bcrypt + pepper) |
| 날짜 | luxon `DateTime` + transformer | 핵심 범위는 **네이티브 `Date`** (luxon 미도입; transformer 의존 회피). plan 단계에서 luxon 정렬 검토 |

> **하드 제약 준수**: 본체 코드 복붙 금지. 정본은 ESM/`.js`/pnpm/Redis 관용구이므로 **패턴만 차용**하고, classbot은 CommonJS/상대경로/bun/DB-blacklist 관용구로 재작성한다.

### 0.2 Drizzle 잔재 현황 (확인 결과)

`git ls-files | grep -i drizzle` 결과:
```
apps/classbot/drizzle.config.ts
apps/classbot/drizzle/0000_stiff_ulik.sql
apps/classbot/drizzle/meta/0000_snapshot.json
apps/classbot/drizzle/meta/_journal.json
```
- classbot FE(`apps/classbot`)는 **Drizzle ORM** 기반 (`lib/db/schema.ts`, `lib/db/index.ts`).
- 로컬 Postgres(`pullim-classbot-postgres`, port 5434)에 **이미 `users` 테이블 존재** (Drizzle 생성).
  - shape: `id text PK`, `name text`, `role text {student|teacher|parent}`, `profile jsonb`, `created_at`.
  - **24행의 FE seed 데이터** 보유, **~17개 FK가 `users.id`를 참조** (assignments, class_bots, chat_messages, enrollments 등).
- **이번 작업은 이 Drizzle 자산을 일절 건드리지 않는다** (비파괴 하드 제약). 신규 TypeORM 테이블은 `auth_` 프리픽스로 **네임스페이스 분리**하여 공존시킨다.

---

## 1. 풀세트 전체 설계 (본체 정렬)

### 1.1 본체 엔드포인트 매핑표

정본 `auth.controller.ts`의 전체 엔드포인트를 classbot로 매핑. **상태(Status)** 열이 이번 작업 경계.

| # | Method | Path (`/api/auth/...`) | 정본 UseCase | classbot 상태 | 비고 |
|---|---|---|---|---|---|
| 1 | POST | `/signup` | SignupUseCase | **실DB 구현** | KCB 본인인증/약관/만14세 게이트는 classbot 범위 밖 → 단순화(이메일+비번+이름+role) |
| 2 | POST | `/login` | LoginUseCase | **실DB 구현** | 실패카운트/잠금은 핵심에 포함, 로그인이력은 GATED |
| 3 | POST | `/refresh` (JwtRefreshGuard) | RefreshUseCase | **실DB 구현** | DB 블랙리스트 rotation |
| 4 | POST | `/logout` | LogoutUseCase | **실DB 구현** | refresh 토큰 DB 블랙리스트 등록 |
| 5 | GET | `/check-email` | CheckEmailUseCase | **실DB 구현(보너스)** | signup 검증 재사용, 가벼워서 포함 |
| 6 | POST | `/email-verification/send` | SendEmailVerificationUseCase | `GATED:` 스캐폴드 | 메일러 미연동 |
| 7 | POST | `/email-verification/verify` | VerifyEmailCodeUseCase | `GATED:` 스캐폴드 | |
| 8 | POST | `/social/state` | GenerateOAuthStateUseCase | `GATED:` 스캐폴드 | OAuth state (Redis 부재로 DB/메모리 대체 설계만) |
| 9 | POST | `/social/:provider` | SocialLoginUseCase | `GATED:` 스캐폴드 | 카카오/네이버 |
| 10 | POST | `/signup/social` | SocialSignupUseCase | `GATED:` 스캐폴드 | |
| 11 | POST | `/find-email` | FindEmailUseCase | `GATED:` 스캐폴드 | 본인인증 의존 |
| 12 | POST | `/reset-password/send-code` | SendPasswordResetCodeUseCase | `GATED:` 스캐폴드 | |
| 13 | POST | `/reset-password/verify-code` | VerifyPasswordResetCodeUseCase | `GATED:` 스캐폴드 | |
| 14 | POST | `/reset-password/confirm` | ConfirmPasswordResetUseCase | `GATED:` 스캐폴드 | |

### 1.2 클린 아키텍처 레이어 (본체 동일)

```
Controller → UseCase(Facade) → Service → RepositoryInterface → TypeORM Adapter → DB
```
- Controller: HTTP/DTO만. 비즈니스 로직·throw 금지.
- UseCase: Service 조합(orchestration) + 트랜잭션 경계. 비즈니스 로직·throw 금지.
- Service: 단일 도메인 로직 + 모든 예외 throw (`ErrorMessages` 상수).
- Repository Interface(추상 클래스) ← DI ← Adapter(TypeORM 구현).

### 1.3 디렉토리 구조 (classbot apps/backend/src)

```
apps/backend/src/
├── common/
│   ├── constants/
│   │   ├── error-messages.constant.ts      # AUTH_*/USER_* 에러
│   │   ├── jwt.constant.ts                  # 기본 만료/radix
│   │   └── security.constant.ts             # bcrypt rounds, 최대 로그인 시도
│   ├── decorators/
│   │   ├── public.decorator.ts              # @Public()
│   │   └── current-user.decorator.ts        # @CurrentUser()
│   ├── entities/
│   │   └── base.model.ts                    # uuid PK + created/updated/deletedAt
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                # 글로벌 (@Public 예외)
│   │   └── jwt-refresh.guard.ts
│   ├── infrastructure/
│   │   ├── jwt.strategy.ts                  # access 검증
│   │   ├── jwt-refresh.strategy.ts          # refresh 검증
│   │   └── passport-token.provider.ts       # 토큰 발급
│   ├── interfaces/
│   │   └── token-provider.interface.ts
│   └── utils/
│       └── crypto.util.ts                   # bcrypt + pepper (본체 동일 lib)
├── config/
│   ├── jwt.config.ts                        # registerAs('jwt')
│   └── database.config.ts                   # TypeORM 연결
├── database/
│   ├── data-source.ts                       # CLI 마이그레이션용 DataSource
│   └── migrations/
│       └── 1748*-CreateAuthTables.ts
├── entities/
│   ├── enums/
│   │   ├── user-role.enum.ts                # student/teacher (+admin reserved)
│   │   └── auth-provider.enum.ts            # email/kakao/naver
│   ├── auth-user.entity.ts                  # @Entity('auth_users')
│   ├── auth-user-provider.entity.ts         # @Entity('auth_user_providers')
│   └── auth-revoked-token.entity.ts         # @Entity('auth_revoked_tokens')  ← Redis 대체
├── modules/
│   └── auth/
│       ├── auth.module.ts
│       ├── controller/
│       │   ├── auth.controller.ts
│       │   └── dto/ (login, signup, logout, token-response, signup-response, ...)
│       ├── use-cases/ (signup, login, refresh, logout, check-email + GATED 골격)
│       ├── service/
│       │   ├── auth.service.ts              # 토큰/블랙리스트/비번 검증
│       │   └── ...GATED 골격
│       ├── interface/
│       │   ├── auth-user-repository.interface.ts
│       │   └── revoked-token-repository.interface.ts
│       └── infrastructure/
│           ├── auth-user.repository.ts
│           └── revoked-token.repository.ts
├── app.module.ts                            # TypeOrmModule.forRoot + AuthModule + 글로벌 가드/파이프/필터
└── main.ts                                  # 기존 (글로벌 prefix /api) + ValidationPipe
```

### 1.4 User 엔티티 본체 정렬 + classbot 역할 반영

본체 `User`(uuid PK, BaseModel, name/email/phone/role/isEmailVerified/...)를 차용하되:

- **역할 enum**: 본체는 `UserRole { USER, ADMIN }`. classbot은 핸드오프 권위상 **교사 중심**(P1 교사, P2 학생)이고, Drizzle `users.role`이 이미 `student|teacher|parent`이므로:
  ```ts
  export enum UserRole {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin',     // 운영자 (예약, FE 미사용)
  }
  ```
  - `parent`(보호자)는 Drizzle에 존재하나 클래스봇 인증 진입 주체가 아니라 이번 enum에서 **제외**(plan에 사유 기록). 향후 보호자 로그인 도입 시 추가.
  - 회원가입 기본 role은 명시값(없으면 `STUDENT`).

- **auth_users 필드** (본체 핵심 정렬 + classbot 단순화):

| 필드 | 타입 | 본체 대응 | 노출 |
|---|---|---|---|
| `id` | uuid PK | BaseModel.id | @Expose |
| `name` | varchar | User.name | @Expose |
| `email` | varchar | User.email | @Expose |
| `role` | enum(student/teacher/admin) | User.role | @Expose |
| `isEmailVerified` | boolean | User.isEmailVerified | @Expose |
| `passwordChangedAt` | timestamptz null | User.passwordChangedAt | @Exclude |
| `createdAt/updatedAt/deletedAt` | timestamptz | BaseModel | created/updated @Expose, deleted @Exclude |

> 본체의 phone/profileImage/marketing*/ci/di/diHash/verifiedAt/metadata 등은 KCB·마케팅·본인인증 도메인 의존 → classbot 핵심 범위에서 제외. plan에 "본체 확장 필드"로 기록(향후 흡수 시 추가).

- **auth_user_providers** (본체 `UserAuthProvider` 정렬): `provider`(email/kakao/naver), `providerId`, `password`(@Exclude, bcrypt), `userId` FK, `failedLoginCount`, `lockedAt`.
  - 비번은 `auth_users`가 아니라 **provider 테이블에만** 저장 (본체 패턴 — 소셜 확장 대비, 비번 컬럼을 user에서 분리).

- **auth_revoked_tokens** (Redis 블랙리스트 대체): `jti`(unique), `expiresAt`. refresh 토큰의 `jti`를 등록하여 재사용 차단. 만료 토큰 정리는 `expiresAt < now()` 배치(이번엔 미구현, GATED 주석).

### 1.5 JWT access + refresh 설계 (본체 동일)

- **Access payload**: `{ sub, email, role, type: 'access', jti }`, 만료 `JWT_EXPIRATION`(기본 3600s).
- **Refresh payload**: `{ sub, type: 'refresh', jti }`, 만료 `JWT_REFRESH_EXPIRATION`(기본 1209600s = 14d).
- **JwtStrategy('jwt')**: `type !== 'access'` 차단, DB에서 user 조회, `passwordChangedAt` 이전 발급 토큰 무효화(S-5).
- **JwtRefreshStrategy('jwt-refresh')**: `type !== 'refresh'` 차단, DB user 조회, req에서 토큰 추출하여 `{ user, refreshToken }` 주입.
- **Refresh rotation**: refresh 시 기존 refresh 토큰 `jti`를 `auth_revoked_tokens`에 **원자적 INSERT(중복 시 충돌→401)** 하여 동시요청 중복 사용 차단 (본체 setnx 대체).
- **Logout**: refresh 토큰 `jti`를 `auth_revoked_tokens`에 등록. access는 짧은 만료로 자연 소멸.
- **글로벌 가드**: `JwtAuthGuard`를 `APP_GUARD`로 등록 → 기본 전체 보호, `@Public()`만 예외.

### 1.6 보안 원칙 (rules/security 정렬)

- 비번 **평문 저장 금지**: bcrypt(rounds=10) + HMAC pepper(`PASSWORD_PEPPER`). 본체 `crypto.util.ts` 동일 lib.
- `@Exclude()` 로 비번/민감 필드 응답 차단. 응답은 Response DTO `static from()` 으로만.
- JWT secret은 **env(`JWT_SECRET`)** 로만. 하드코딩·`process.env` 직접참조(서비스 내) 금지 → `jwt.config.ts` + ConfigService.
- 계정 열거 방지: `/login` 실패는 user-없음/비번-틀림 구분 없이 동일 `AUTH_LOGIN_FAILED`.
- 로그인 실패 5회 → 계정 잠금(`lockedAt`), 원자적 UPDATE 증가.
- 예외는 **Service 레이어에서만** throw, `ErrorMessages` 상수.

---

## 2. 핵심 구현 범위 (이번 작업, 실DB)

### 2.1 산출물
- 인증 공통 인프라: JwtAuthGuard(글로벌)+@Public, JwtStrategy, JwtRefreshStrategy, @CurrentUser, jwt.config, crypto.util, base.model.
- 엔티티: AuthUser, AuthUserProvider, AuthRevokedToken (+ enums).
- AuthModule: signup·login·refresh·logout·check-email use-case + AuthService + DTO + Repository interface/adapter.
- TypeORM 마이그레이션: `auth_users`, `auth_user_providers`, `auth_revoked_tokens` (+ FK, partial unique index).
- `.env.example`: DATABASE_*, JWT_SECRET, JWT_EXPIRATION, JWT_REFRESH_EXPIRATION, PASSWORD_PEPPER.
- app.module: TypeOrmModule.forRoot, 글로벌 ValidationPipe, 글로벌 JwtAuthGuard.

### 2.2 실DB 동작 검증 (보고 필수)
1. 포트 충돌 사전 체크 (5434 = classbot postgres, 이미 healthy).
2. `bun run db:up` (또는 기존 컨테이너 재사용) → 마이그레이션 실행.
3. curl 실증: `POST /signup` → `POST /login` → `POST /refresh` → `POST /logout`.
4. tsc / lint / build + curl 결과 보고.

---

## 3. 나머지 스캐폴드 (GATED)

소셜(state/login/social-signup) · 이메일 인증(send/verify) · 비번 재설정(send/verify/confirm) · 이메일 찾기:
- 본체 미러링 디렉토리·시그니처로 use-case/service/dto 골격만 생성, 본문은 `GATED:` 주석 + `NotImplementedException` 또는 TODO.
- 외부 의존(메일러/카카오/네이버/KCB/Redis)은 미연결. plan의 매핑표(1.1)에 1:1 대응.

---

## 4. Drizzle → TypeORM 이전 설계 (plan 전용, 이번 미실행)

> 이번 작업은 **신규 TypeORM auth 테이블만 추가**(비파괴). 아래는 향후 단계 설계.

### Phase D1 — 공존 (이번 작업)
- TypeORM auth 테이블을 `auth_` 프리픽스로 분리. Drizzle `users`(24행, ~17 FK)와 물리적 충돌 없음.
- 동일 DB(`pullim_classbot`)를 두 ORM이 공유하되 테이블 비중첩.

### Phase D2 — 식별자 브릿지
- 신규 가입 사용자는 `auth_users`(uuid)에 생성. FE Drizzle 도메인(`users.id text`)과 매핑이 필요.
- 옵션 (a) `auth_users.legacyUserId text` 컬럼 추가 → Drizzle `users.id` 참조 (점진 연결).
- 옵션 (b) Drizzle `users`에 `auth_user_id uuid` 컬럼 추가 → 역참조.
- 결정 보류: FE가 Drizzle `users`를 owner로 두는 한 (b)가 FK 영향 최소.

### Phase D3 — 스키마 권위 이전
- classbot 도메인 테이블(class_bots, enrollments, chat_messages 등)의 FK 권위를 TypeORM 엔티티로 재정의.
- Drizzle schema.ts → TypeORM entity 1:1 포팅 (id 타입 text→uuid 마이그레이션 포함, 데이터 백필).
- `drizzle.config.ts`/`drizzle/*` 제거는 이 단계에서만. (이번엔 절대 제거 금지.)

### Phase D4 — 통합 & 정리
- `auth_users` ↔ `users` 통합 (단일 users 테이블, role enum 합치기 student/teacher/parent/admin).
- Drizzle 마이그레이션 자산 아카이브, TypeORM 마이그레이션 단일 권위.

---

## 5. pullim 서브도메인 병합 구조 고려

- classbot auth는 **본체 pullim auth와 동일 패턴**(clean arch + Passport/JWT + provider 분리 + DB user)으로 작성 → 병합 시 모듈 이식 비용 최소.
- 차이(ESM vs CJS, Redis vs DB-blacklist)는 **인터페이스 경계**로 격리: `TokenProvider`·`RevokedTokenRepositoryInterface` 추상화 → 병합 시 구현체만 교체(DB→Redis).
- 역할 enum은 병합 시 본체 `UserRole`와 union 필요 (student/teacher ↔ user/admin) — plan에 기록.

---

## 6. GATED 시크릿 / 글로벌 작업 (사용자 권한)

- `apps/backend/package.json` auth 의존성 추가는 **정당**(앱 범위) → 추가 후 보고.
- 다음은 **GATED(사용자 확인 필요)**, 이번엔 미편집:
  - root `package.json`/`turbo.json`/`tsconfig.base.json`/`docker-compose.yml` (Redis 추가 등).
  - `.github/workflows/**`.
  - `packages/*` 인터페이스 변경.
- `.env`(실값)는 커밋 금지(.gitignore `.env*`). `.env.example`만 placeholder로 커밋.

---

## 7. 완료 기준

- [ ] 핵심 4(+1) 엔드포인트 실 Postgres 동작 (signup/login/refresh/logout/check-email).
- [ ] 비번 bcrypt+pepper 해시 저장, 응답에 비번 비노출.
- [ ] JWT access/refresh 발급·검증·rotation·블랙리스트(DB) 동작.
- [ ] 마이그레이션으로 `auth_*` 테이블 생성, Drizzle `users` 무손상.
- [ ] tsc / lint / build 통과.
- [ ] GATED 스캐폴드가 매핑표(1.1)와 1:1 대응.
- [ ] 기존 apps/classbot FE 비파괴 (백엔드 추가만).
- [ ] push/PR/merge 없이 워크트리 로컬 커밋까지.
