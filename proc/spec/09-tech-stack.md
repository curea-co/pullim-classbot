# 09. 기술 환경 및 개발 도구 (SDD / Tech Stack / DevEnv)

## 1. 프레임워크

| 영역 | 선택 | 버전 | 비고 |
|------|------|------|------|
| **프레임워크** | Next.js | 16.2.4 | App Router 기반 |
| **런타임** | Node.js + React | React 19.2.4 | RSC + Server Action 활용 |
| **언어** | TypeScript | ^5 | strict 모드 |
| **번들러** | Turbopack | (Next.js 내장) | dev/build 가속 |

⚠️ **중요**: Next.js 16은 학습 데이터 컷오프 이후 버전. `node_modules/next/dist/docs/`를 먼저 확인하라 (web/AGENTS.md).

### 1.1 라우팅 구조
- App Router (`web/app/`)
- 라우트 그룹: `(student)`, `(teacher)` — 레이아웃 분리
- catch-all: `app/(student)/q/[slug]/page.tsx` (Coming Soon 안내)

---

## 2. 상태 관리

| 영역 | 선택 | 버전 |
|------|------|------|
| **UI 상태** | Zustand | ^5.0.12 |
| **서버 상태** | TanStack Query | ^5.100.1 |

### 2.1 Zustand 사용 패턴
- 클라이언트 사이드 UI 상태 (모달 open, 탭 active 등)
- 도메인별 store 분리

### 2.2 TanStack Query 사용 패턴
- 서버 상태 (mock 또는 API)
- 캐시 무효화 전략: 도메인별 query key 컨벤션

---

## 3. 스타일

| 영역 | 선택 | 버전 |
|------|------|------|
| **CSS 프레임워크** | Tailwind CSS | ^4 (`@tailwindcss/postcss` ^4) |
| **컴포넌트** | shadcn/ui | ^4.4.0 (`@base-ui/react` 기반) |
| **유틸** | clsx + tailwind-merge | ^2.1.1 / ^3.5.0 |
| **CVA** | class-variance-authority | ^0.7.1 |
| **애니메이션** | tw-animate-css | ^1.4.0 |
| **테마** | next-themes | ^0.4.6 |

### 3.1 토큰
- 정의: `web/app/globals.css` (CSS 변수)
- 런타임: `web/lib/tokens/index.ts`
- 3-Tier AI 메타: `web/lib/tokens/tier.ts`

---

## 4. 차트·시각화·수식

| 영역 | 선택 | 버전 |
|------|------|------|
| **차트** | Recharts | ^3.8.1 |
| **수식** | KaTeX + react-katex | ^0.16.45 / ^3.1.0 |
| **D3** | (필요 시 추가) | — |

---

## 5. 실시간 통신 (계획)

| 영역 | 선택 | 비고 |
|------|------|------|
| **실시간** | Socket.IO | 튜터 스트리밍, 클래스봇 모니터링 (현재 미구현, mock 단계) |

---

## 6. 아이콘 / 토스트

| 영역 | 선택 | 버전 |
|------|------|------|
| **아이콘** | lucide-react | ^1.9.0 |
| **토스트** | sonner | ^2.0.7 |

---

## 7. 폴더 구조 (실제 구현)

```
web/
├── app/
│   ├── (student)/                    # 학생 — AppShell role="student"
│   │   ├── q/                        # Q 도메인
│   │   │   ├── page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── infinity/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── onboarding/page.tsx
│   │   │   │   ├── solve/page.tsx
│   │   │   │   ├── explain/page.tsx
│   │   │   │   ├── explain/[sku]/page.tsx
│   │   │   │   ├── exam-result/page.tsx
│   │   │   │   └── history/page.tsx
│   │   │   ├── talk/
│   │   │   │   ├── page.tsx          # AI 대화 단일 페이지 (코치+튜터)
│   │   │   │   └── onboarding/page.tsx
│   │   │   ├── analysis/             # 풀림 분석 (sub-route)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── onboarding/page.tsx
│   │   │   │   ├── ability/page.tsx  # 능력치 (θ)
│   │   │   │   ├── process/page.tsx  # 과정 (메타인지)
│   │   │   │   └── diagnose/page.tsx
│   │   │   └── review/
│   │   │       ├── page.tsx
│   │   │       ├── onboarding/page.tsx
│   │   │       └── conquer/page.tsx
│   │   ├── planner/
│   │   │   ├── page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── builder/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── day/page.tsx          # redirect → /planner/calendar
│   │   │   ├── week/page.tsx         # redirect → /planner/calendar?view=week
│   │   │   └── month/page.tsx        # redirect → /planner/calendar?view=month
│   │   ├── classbot/
│   │   │   ├── page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── discover/page.tsx     # 클래스봇 발견
│   │   │   ├── chat/page.tsx
│   │   │   └── replay/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── library/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx         # 자료 상세
│   │   │   ├── storage/page.tsx      # 내 자료실
│   │   │   ├── create/[type]/page.tsx # image|short|audio|card
│   │   │   ├── visual/page.tsx       # VLM 카탈로그
│   │   │   ├── visual/[id]/page.tsx
│   │   │   └── visual/onboarding/page.tsx
│   │   ├── studio/page.tsx           # Phase 2 안내
│   │   ├── store/page.tsx            # Phase 3 안내
│   │   ├── me/page.tsx
│   │   └── page.tsx                  # 학생 홈 대시보드
│   │
│   ├── (teacher)/                    # 교사 — AppShell role="teacher"
│   │   └── teacher/
│   │       ├── page.tsx              # 교사 홈
│   │       ├── classbot/page.tsx     # 클래스봇 운영 메인
│   │       ├── builder/page.tsx      # 봇 빌더 8단계
│   │       ├── live/page.tsx         # 라이브 모니터링
│   │       ├── quiz/page.tsx         # 퀴즈 운영
│   │       ├── reports/page.tsx      # 리포트 6종
│   │       ├── grading/page.tsx      # 하이브리드 채점
│   │       ├── templates/page.tsx    # 템플릿 마켓
│   │       ├── settings/page.tsx     # 8탭 봇 설정
│   │       └── replay/
│   │           ├── page.tsx
│   │           └── [id]/page.tsx
│   │
│   ├── globals.css                   # 토큰 + Tailwind
│   └── layout.tsx
│
├── components/
│   ├── shell/                        # ★ 통합 shell (학생/교사 공용)
│   │   ├── app-shell.tsx
│   │   ├── app-header.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── mobile-drawer.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── role-switcher.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── coach-fab.tsx
│   │   ├── nav-config.ts             # ★ 모든 네비 항목 단일 소스
│   │   └── section-heading.tsx
│   ├── brand/                        # 풀림 로고
│   ├── study/                        # 대시보드
│   ├── planner/                      # 플래너
│   ├── planner-builder/              # 플래너 빌더
│   ├── infinity/                     # 무한풀기
│   ├── coach/                        # 코치 (튜터 5단계 힌트도 여기 통합)
│   ├── conqueror/                    # 오답정복
│   ├── memory/                       # 기억장치
│   ├── study-index/                  # 분석
│   ├── xray/                         # 풀이분석
│   ├── classbot/                     # 클래스봇
│   ├── builder/                      # 봇 빌더
│   ├── visual/                       # 라이브러리 (VLM)
│   └── ui/                           # shadcn/ui
│
├── lib/
│   ├── mock/                         # persona·curriculum·features·domains·planner·memory·irt·tutor·classbot 등
│   ├── tokens/                       # index.ts + tier.ts
│   └── utils.ts
│
├── public/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── next.config.ts
├── components.json                   # shadcn 설정
├── Dockerfile
├── CLAUDE.md                         # 도메인 락인 컨벤션
├── AGENTS.md                         # Next.js 버전 경고
└── README.md
```

---

## 8. 패키지 매니저 / 빌드

### 8.1 매니저
- **pnpm** (lockfile: `pnpm-lock.yaml`, workspace 사용)

### 8.2 스크립트
```json
{
  "dev": "next dev -p 3030",
  "build": "next build",
  "start": "next start -p 3030",
  "lint": "eslint",
  "predev": "lsof -ti:3030 | xargs -r kill -9 2>/dev/null || true"
}
```

- 포트: **3030** (3000 충돌 회피)
- predev: 기존 3030 점유 프로세스 자동 종료

### 8.3 검증 명령
```bash
cd web
pnpm exec tsc --noEmit  # 타입 체크
pnpm build              # 라우트 prerender 확인
pnpm lint               # ESLint 통과
```

배포·머지 전 모두 0 errors 필수.

---

## 9. 컨테이너 / 배포

### 9.1 로컬 개발
- `web/Dockerfile`
- 루트 `docker-compose.yml`

### 9.2 배포 (현재 미상세)
- 배포 대상: 미정 (Vercel·자체 인프라 후보)
- 배포 정책: 검증 명령 통과 후 머지

---

## 10. ESLint / TypeScript

### 10.1 ESLint
- 설정: `web/eslint.config.mjs`
- next-eslint config: `eslint-config-next` 16.2.4
- **2026-04-27 Audit 클린**: 0 errors, 0 warnings

### 10.2 TypeScript
- strict 모드
- types: `@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19

---

## 11. 환경 변수 (현재 명세 부재)

⚠️ 환경 변수 정책 별도 문서화 필요. 권장:
- `.env.local` — 개발용 (gitignore)
- `.env.production` — 배포용
- AI 모델 키 (Anthropic, OpenAI) 보관 필요

---

## 12. 개발 환경 권장

### 12.1 IDE
- VS Code 또는 Cursor
- 권장 확장:
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier (project config 따름)

### 12.2 Node.js
- 버전: ^20 (`@types/node` ^20 기준)

### 12.3 패키지 설치
```bash
cd web
pnpm install
pnpm dev   # → http://localhost:3030
```

---

## 13. AI / 외부 서비스 (계획)

| 영역 | 후보 | 용도 |
|------|------|------|
| LLM (T2 Fast) | Claude Haiku, GPT-4o-mini | Q&A·코칭·알림 |
| LLM (T3 Deep) | Claude Sonnet, GPT-4o | 해설·분석·리포트 |
| Embedding (T1) | (TBD, OpenAI text-embedding-3-small 후보) | Scope 체크·이탈 감지 |
| STT | (TBD) | Feynman Challenge 음성 인식 |
| TTS | (TBD) | 봇 보이스, 라이브러리 오디오 |
| OCR | (TBD) | 봇 빌더 교안 업로드 |

⚠️ **현재는 mock 단계**. 실제 API 연동 시 본 spec 갱신 필요.

---

## 14. 데이터 저장 (계획)

⚠️ 현재 백엔드 미구현, mock 데이터로 시연. 운영 시 후보:

| 영역 | 후보 |
|------|------|
| RDB | PostgreSQL (RDS, Supabase) |
| 벡터 DB | pgvector, Pinecone |
| 캐시 | Redis |
| 파일 | S3, Cloudflare R2 |

---

## 15. 모니터링 / 분석 (계획)

| 영역 | 후보 |
|------|------|
| 에러 트래킹 | Sentry |
| 분석 | Mixpanel, PostHog |
| 로그 | CloudWatch, Datadog |
| AI 비용 | LangSmith, 자체 메트릭 |

---

## 16. 배포 정책

### 16.1 머지 기준 (현재 적용)
- `pnpm exec tsc --noEmit` 통과
- `pnpm build` 50개 라우트 prerender 정상
- `pnpm lint` 0 errors / 0 warnings
- 옛 라우트로의 직링 0건 확인 (라우트 변경 시)

### 16.2 라우트 변경 시 안전망
- redirect 폴더 1주~1개월 유지 → 직링 0건 확인 후 삭제
- 외부 북마크는 외부 알림 후 삭제

### 16.3 도메인 boundary 변경
- 사용자 명시 승인 필요 (글로벌 작업)
- `web/CLAUDE.md` 갱신 필수

---

**기준 자료**: 
- `web/package.json`
- `web/CLAUDE.md` (도메인 락인 컨벤션)
- `web/AGENTS.md` (Next.js 버전 주의)
- 옛 `pullim-study-screens/SKILL.md` 5장
