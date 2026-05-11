# 10. 단계별 개발 로드맵 (WBS / Milestones / Phased Rollout)

## 1. 풀림 3축 단계별 출시 전략

### 1.1 Phase 1: 풀림 스터디 (현재 진행 중)
**기간**: ~2026-Q2  
**목표**: 학생 핵심 흐름 (진단→풀이→해설→정복→갱신) 완성

**범위**:
- ✅ Core 5개 (무한풀기, 인덱스, 오답정복, 튜터, 기억장치) — 통합 후 4개 surface
- ✅ Growth 6개 (모의고사·코치·풀이분석·비주얼·클래스봇·플래너) — 통합 후 5개 surface
- ⬜ Future 3개 (스터디룸, 보이스, 수학랩) — Future 잠금
- ✅ Mock 단계 (실 데이터 없이 mock으로 시연)

### 1.2 Phase 2: 풀림 스튜디오 (계획)
**기간**: 2026-Q3~Q4  
**목표**: AI 콘텐츠 생산 도구 출시 (크리에이터 대상)

**범위**:
- S1. AI 문제 생성 (4가지 방식)
- S2. 문제 등록 (PDF/이미지 OCR)
- S3~6. 학습 자료 제작
- S7. 검증 시스템 (Self-Refine + RLHF)
- S8. 비주얼 스튜디오
- S11. 서술형 + AI 채점

### 1.3 Phase 3: 풀림 스토어 (계획)
**기간**: 2027-Q1~Q2  
**목표**: 마켓플레이스 + 수익 배분 출시

**범위**:
- M1. 마켓플레이스
- M2. AI 큐레이션 검색
- M3. 크리에이터 스토어
- M4. 콘텐츠 스냅샷
- M5. 품질 인증

### 1.4 Phase 4: 3축 통합 플라이휠 (장기)
**기간**: 2027~  
**목표**: 데이터 환류 자동화 + 도메인 확장

---

## 2. 풀림 스터디 진행 상태 (2026-05-06 기준)

### 2.1 학생 기능 (8개 — 14→8 통합 후)

| 기능 | 라우트 | 상태 | 비고 |
|------|--------|------|------|
| 풀림 무한풀기 (섹션) | `/q/infinity` + 5 sub | 🟢 | 홈·풀이·풀림 해설 12섹션·시험 결과·이력 |
| 풀림 비주얼 | `/library` + `[id]` | 🟢 | VLM 카탈로그 + 인터랙티브 시뮬 (math-derivative-sign 동작). 수학랩 흡수 |
| **풀림 분석** (통합·섹션) | `/q/analysis` + 2 sub | 🟢 | **인덱스 + 풀이분석 통합**. 탭 2개 + `/diagnose` + `/history` (locked) |
| **풀림 복습** (통합·섹션) | `/q/review` + 2 sub | 🟢 | **오답정복 + 기억장치 통합**. 탭 2개 + `/conquer` + `/master` (locked) |
| **풀림 AI 대화** (통합) | `/q/talk` | 🟢 | **튜터 + 코치 통합**. 탭 2개. 옛 `/q/tutor`,`/q/coach` → redirect 후 삭제. FAB도 여기로 |
| 풀림 클래스봇 (학생, 섹션) | `/classbot` + 3 sub | 🟢 | 홈 + `/chat` 봇 채팅 + `/replay` 리스트 + `/replay/[id]` 타임라인·트랜스크립트·본인 답변 비교 — **B2B 분리 유지** |
| 풀림 클래스봇 (교사) | `/teacher/classbot` + 6 운영 라우트 | 🟢 | 메인 운영 + `/teacher/{live,quiz,reports,grading,templates,settings}` 6개 락 해제 (2026-04-29). 6KPI·Scope·라이브 피드·다중 봇·6종 리포트·하이브리드 채점·템플릿 마켓·8탭 봇 설정 |
| 봇 빌더 (교사) | `/teacher/builder` | 🟢 | 8단계 위저드(정체성·목소리·교안·수업방식·Scope·평가·안전·배포). StepIndicator 점프 + 임시저장 + Step6 루브릭 합 100% 검증 |
| 플래너 빌더 (학생) | `/planner/builder` | 🟢 | 8단계 위저드(목표·가용시간·과목 가중치·블록 패턴·약점 자동반영·동기 스타일·알림·미리보기·활성화). StepIndicator 재활용 + Step3 가중치 100% 검증 + 일주일 미리보기 |
| 학생 핵심 흐름 click-through | 진단→처방→풀이→해설→정복→갱신 | 🟢 | 진단 완료 화면 + solve 채점 피드백·해설 링크 + 정복 완료 mastery 갱신 시각화 추가. 8단계 dead-end 0건 |
| 풀림 플래너 (섹션) | `/planner` + sub | 🟢 | 홈 · **`/calendar` 통합** (일·주·월 토글 + URL 동기화 `?view=`) · 빌더 · 리포트(locked). 옛 `/day`,`/week`,`/month`는 redirect |

### 2.2 통합 이력
| 이전 | 통합 후 | 방식 |
|------|--------|------|
| 풀림 모의고사 (`/q/exam`) | 풀림 무한풀기 시험 모드 | 옵션 토글 |
| 풀림 수학랩 (`/q/mathlab`) | 풀림 비주얼 handwriting 타입 | 도메인 어댑터 |
| 풀림 인덱스 + 풀림 풀이분석 | 풀림 분석 (`/q/analysis`) | 탭 2개 (능력치·과정) |
| 풀림 오답정복 + 풀림 기억장치 | 풀림 복습 (`/q/review`) | 탭 2개 (정복·전체) |
| 풀림 튜터 + 풀림 코치 | 풀림 AI 대화 (`/q/talk`) | 탭 2개 (코치·튜터) |

### 2.3 사이드바 구조
```
오늘    (2): 대시보드 · 풀림 플래너 ▾
학습    (2): 풀림 무한풀기 ▾ · 풀림 비주얼
[복습 라벨 숨김] (1): 풀림 복습 ▾
[분석 라벨 숨김] (1): 풀림 분석 ▾
AI 코칭  (2): 풀림 AI 대화 · 풀림 클래스봇 ▾
준비 중  (2): 풀림 스터디룸 🔒 · 풀림 보이스 🔒
[계정 라벨 숨김] (1): 내 정보
```
1항목 그룹은 라벨 표시 안 함 → 노이즈 ↓.

### 2.4 Future (3개)
| 기능 | 라우트 | 상태 | 비고 |
|------|--------|------|------|
| 풀림 스터디룸 | `/room` | ⬜ | 사이드바 잠금 표시 |
| 풀림 보이스 | `/voice` | ⬜ | 사이드바 잠금 표시 |
| ~~풀림 수학랩~~ | ~~`/q/mathlab`~~ | 🟢 흡수 | 풀림 비주얼의 handwriting 타입 어댑터로 통합 |

---

## 3. 검증 기준 (Audit) — 2026-04-27 통과

종합 감사 7개 축 모두 클린:

- ✅ `pnpm lint` (0 errors, 0 warnings) — react/no-unescaped-entities 16건, react-hooks/static-components 3건, set-state-in-effect 1건, unused imports 22건 모두 정리
- ✅ `pnpm build` 50개 라우트 prerender 정상 (옛 redirect 6개 폴더 삭제 후)
- ✅ BottomNav `/q/tutor`,`/q/coach` → `/q/talk` 통합 (matchPrefix)
- ✅ "Visual Lab" 영문 코드명 노출 제거 → "풀림 비주얼"
- ✅ 옛 라우트 직링 11건 → 새 라우트 (`/q/index`→`/q/analysis`, `/q/conqueror`→`/q/review/wrong`, `/q/memory`→`/q/review`, `/q/tutor`→`/q/talk/tutor`)
- ✅ 옛 기능명("인덱스", "오답정복", "기억장치", "수학랩", "풀림 코치") 학생 UI 잔재 일괄 → 새 이름("분석", "복습 정복", "복습", "수학 필기 인식", "풀림 AI 대화 코치 모드")
- ✅ 옛 라우트 redirect 폴더 6개 삭제 — `/q/index`, `/q/conqueror`(+conquer/master), `/q/memory`, `/q/xray`, `/q/tutor`, `/q/coach` (내부 직링 0건 확인 후 외부 북마크 안전망 제거)
- ✅ `mathlab` Future 카드 제거 — features.ts에서 풀림 수학랩 항목 삭제 (비주얼에 흡수). 학생 대시보드 "준비 중"은 이제 `room` + `voice` 2개만
- ✅ Mock 페르소나(김수학·수학이 형·서연/하윤/도현·고2-A반) 전 페이지 일관

### 3.1 Audit 정정 사항
- audit이 dead로 분류한 mock export 4개 (`countByBox`, `pickAgentForQuestion`, `demoReplies`, `forgettingCurve`)는 실제로는 `LeitnerBoxes`/`CoachChat`/`ForgettingCurveChart` 컴포넌트에서 모두 사용 중 — false positive. 정리 불필요.

---

## 4. 공용 / 인프라 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Next.js 스캐폴딩 | 🟢 | `web/` — Next 16.2.4 + React 19 + Tailwind 4 + Turbopack |
| shadcn/ui 설치 | 🟢 | `@base-ui/react` 기반 (shadcn 4.x). 14개 base 컴포넌트 + lucide/recharts/zustand/tanstack-query/katex |
| 디자인 토큰 이식 | 🟢 | `globals.css` CSS 변수 + `lib/tokens/index.ts` (런타임). 풀림 블루·슬레이트·시맨틱·IRT·히트맵 + 3-Tier AI 메타 |
| primitives 포팅 | 🟢 | shadcn 컴포넌트로 대체 (Button/Card/Badge/Progress 등). 풀림 로고만 별도 (`components/brand/logo.tsx`) |
| 통합 shell (학생/교사 공용) | 🟢 | `components/shell/app-shell.tsx` + AppHeader(GNB·검색·D-day/LIVE·알림) + AppSidebar(역할별·축약/전체) + MobileDrawer + BottomNav(학생만) + Breadcrumb |
| `/` 학생 홈 대시보드 | 🟢 | 인사 + 오늘 블록 hero + 약점 카드 + 14기능 그리드 + 플라이휠 안내 |
| 기능 catch-all (Coming Soon) | 🟢 | `app/(student)/q/[slug]/page.tsx` — 미구현 14개 기능 라우트 안내 |
| `/me` 자리잡이 | 🟢 | Coming Soon |
| Mock 데이터 (IRT θ, 3-Depth, 망각곡선) | 🟢 | `lib/mock/` — persona, curriculum, features, planner, memory, irt |

---

## 5. 다음 마일스톤 (제안)

### 5.1 Phase 1.5 (Mock → 실 백엔드 연동)
- ⬜ Auth 시스템 (NextAuth or 자체)
- ⬜ DB 스키마 마이그레이션 (PostgreSQL + Prisma)
- ⬜ AI API 실제 연동 (Anthropic/OpenAI)
- ⬜ Socket.IO 라이브 모니터링 실 연결
- ⬜ 환경 변수 정책 문서화

### 5.2 Phase 2 준비 (스튜디오)
- ⬜ 스튜디오 spec 작성 (`proc/spec/`에 11번부터 추가 또는 별도 디렉토리)
- ⬜ 스튜디오 라우트 (`/studio/*`) 스캐폴딩
- ⬜ 콘텐츠 생성 → 스토어 → 스터디 데이터 흐름 설계

### 5.3 운영 안정화
- ⬜ 에러 트래킹 (Sentry)
- ⬜ 분석 (Mixpanel/PostHog)
- ⬜ AI 비용 메트릭

---

## 6. WBS (작업 분해 구조)

### 6.1 Phase 1 작업 분해 (이미 완료된 부분 포함)

```
Phase 1: 풀림 스터디
├─ 1.1 인프라 (🟢)
│  ├─ Next.js 16 스캐폴딩
│  ├─ Tailwind 4 + shadcn/ui 4 셋업
│  ├─ 디자인 토큰 이식
│  └─ 통합 shell 구축
├─ 1.2 도메인 IA (🟢)
│  ├─ 14→8 통합 결정
│  ├─ 라우트 매핑 확정
│  ├─ nav-config.ts 작성
│  └─ Breadcrumb 자동 생성
├─ 1.3 학생 핵심 흐름 (🟢)
│  ├─ 풀림 분석 (진단·능력치·과정)
│  ├─ 풀림 무한풀기 (홈·풀이·해설·시험·이력)
│  ├─ 풀림 복습 (Leitner 5-box, 망각곡선)
│  ├─ 풀림 AI 대화 (코치·튜터)
│  └─ 풀림 플래너 (홈·캘린더·빌더·리포트)
├─ 1.4 클래스봇 (🟢)
│  ├─ 학생 홈·채팅·리플레이
│  ├─ 교사 6 운영 라우트
│  └─ 봇 빌더 8단계
├─ 1.5 라이브러리 (🟢)
│  ├─ 4종 생성기
│  ├─ 자료실 관리
│  └─ VLM 카탈로그
├─ 1.6 Audit (🟢 2026-04-27)
│  ├─ 라우트 redirect 안전망
│  ├─ 옛 라우트 직링 0건
│  ├─ 옛 기능명 잔재 0건
│  ├─ Mock 페르소나 일관성
│  └─ lint·build·typecheck 모두 클린
└─ 1.7 Spec 마이그레이션 (🟢 2026-05-06)
   ├─ proc/spec/ 10개 문서 생성
   ├─ proc/plan/ 작업 이력 백필
   ├─ input/ 원천 자료 보존
   └─ pullim-study-screens 스킬 폐기
```

### 6.2 다음 작업 (제안)
세부는 `proc/plan/`에 일자별로 누적.

---

## 7. 리스크 / 의존성

### 7.1 기술 리스크
- **Next.js 16 학습 곡선** — 학습 컷오프 이후 버전, AGENTS.md 경고 준수 필수
- **AI 비용 폭주** — T1+T2 비율 60%↑ 유지가 핵심
- **실시간 통신** — Socket.IO 미구현, 클래스봇 라이브 시 부하 검증 필요

### 7.2 비즈니스 리스크
- **3-Depth DB 구축 비용** — 한국 교육과정 데이터 정합 작업 시간
- **크리에이터 모집** — 스튜디오 출시 시 콘텐츠 수급 (계약·인센티브)
- **B2B 도입 타이밍** — 학교·학원 영업 사이클

### 7.3 운영 리스크
- **데이터 분리** — RBAC·접근 제어 구현 디테일
- **학습 데이터 프라이버시** — 학부모 동의·자녀 승인 워크플로

---

**기준 자료**: 옛 `STATUS.md` 전문 + 마스터 문서 Phase 정의 + Audit 통과 기록.
