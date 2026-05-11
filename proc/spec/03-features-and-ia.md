# 03. 핵심 기능 정의 (FSD / IA / Sitemap)

## 1. MoSCoW 분류

### 1.1 풀림 스터디 14개 기능 (현 구현 도메인)

#### Must — Core 출시 필수 (5개)
| # | 브랜드명 | 영문 코드 | 한 줄 가치 |
|---|---------|--------|----------|
| 1 | **풀림 무한풀기** | Infinity Engine | 내 실력에 딱 맞는 문제가 끊임없이 나온다 |
| 2 | **풀림 인덱스** | Body Scan | 내 학습 체력을 측정하고 처방을 내린다 |
| 3 | **풀림 오답정복** | Conqueror | 틀린 문제가 아니라 틀리는 패턴을 잡는다 |
| 4 | **풀림 튜터** | Socrates | AI 과외 선생님이 질문으로 이끌어준다 |
| 5 | **풀림 기억장치** | Memory Lane | 내가 공부한 모든 것을 AI가 기억한다 |

#### Should — Growth 성장 견인 (6개)
| # | 브랜드명 | 영문 코드 | 한 줄 가치 |
|---|---------|--------|----------|
| 6 | **풀림 모의고사** | Exam Arena | 나만의 맞춤 모의고사를 AI가 출제한다 |
| 7 | **풀림 코치** | Agent Orchestra | 6명의 AI 전문가가 내 학습을 코칭한다 |
| 8 | **풀림 풀이분석** | Process X-Ray | 정답/오답이 아니라 푸는 과정을 분석한다 |
| 9 | **풀림 비주얼** | Visual Lab | 직접 만져보면서 개념을 이해한다 |
| 10 | **풀림 클래스봇** | ClassBot | 교사가 만들고 통제하는 AI 학습 교실 |
| 11 | **풀림 플래너** | Planner | 시험 일정 입력하면 AI가 시간 단위로 계획을 짠다 |

#### Could — Future 비전 (3개)
| # | 브랜드명 | 영문 코드 | 한 줄 가치 |
|---|---------|--------|----------|
| 12 | **풀림 스터디룸** | Study Room | AI가 설계하는 그룹 스터디 |
| 13 | **풀림 보이스** | Voice Mode | 듣고 말하면서 공부한다 |
| 14 | **풀림 수학랩** | Math Lab | 손으로 쓴 풀이를 AI가 읽고 피드백한다 (→ 비주얼에 흡수됨) |

#### Won't (현 단계 제외)
- 풀림 스튜디오 / 풀림 스토어 — 별도 단계 출시 예정 (`coming-soon`)

---

### 1.2 14 → 8 기능 통합 이력 (구현 시 적용된 IA)

성능·인지 부하·핵심 가치 중복 검토 결과 다음과 같이 통합 (현 구현 기준):

| 이전 | 통합 후 | 방식 |
|------|--------|------|
| 풀림 모의고사 (`/q/exam`) | 풀림 무한풀기 시험 모드 | 옵션 토글 |
| 풀림 수학랩 (`/q/mathlab`) | 풀림 비주얼 handwriting 타입 | 도메인 어댑터 |
| 풀림 인덱스 + 풀림 풀이분석 | **풀림 분석** (`/q/analysis`) | 탭 2개 (능력치·과정) |
| 풀림 오답정복 + 풀림 기억장치 | **풀림 복습** (`/q/review`) | 탭 2개 (정복·전체) |
| 풀림 튜터 + 풀림 코치 | **풀림 AI 대화** (`/q/talk`) | 탭 2개 (코치·튜터) |

**통합 후 표면 8개**:
1. 풀림 무한풀기 (시험 모드 포함)
2. 풀림 비주얼 (수학랩 포함)
3. 풀림 분석
4. 풀림 복습
5. 풀림 AI 대화
6. 풀림 클래스봇
7. 풀림 플래너
8. 풀림 스터디룸·보이스 (Future, 잠금 표시)

---

## 2. Sitemap (라우트 매핑)

### 2.1 학생 영역 `(student)`

```
/                              ← 학생 홈 (대시보드)
│
├─ /q                          ← Q 도메인 허브
│  ├─ /q/onboarding            ← Q 첫 진입 온보딩
│  │
│  ├─ /q/infinity              ← 풀림 무한풀기 홈
│  │  ├─ /q/infinity/onboarding ← 무한풀기 온보딩
│  │  ├─ /q/infinity/solve     ← 풀이 워크스페이스 (3-pane)
│  │  ├─ /q/infinity/explain   ← 풀림 해설 인덱스
│  │  ├─ /q/infinity/explain/[sku] ← SKU별 해설 12-섹션
│  │  ├─ /q/infinity/exam-result ← 시험 결과
│  │  └─ /q/infinity/history   ← 풀이 이력
│  │
│  ├─ /q/talk                  ← 풀림 AI 대화 (튜터+코치 통합, 단일 페이지)
│  │  └─ /q/talk/onboarding    ← 대화 온보딩
│  │
│  ├─ /q/analysis              ← 풀림 분석 (인덱스+풀이분석 통합 허브)
│  │  ├─ /q/analysis/onboarding ← 분석 온보딩
│  │  ├─ /q/analysis/ability   ← 능력치 (θ) — 별도 sub-route
│  │  ├─ /q/analysis/process   ← 과정 (메타인지) — 별도 sub-route
│  │  └─ /q/analysis/diagnose  ← 진단 (15문 적응형 IRT)
│  │
│  └─ /q/review                ← 풀림 복습 (오답정복+기억장치 통합)
│     ├─ /q/review/onboarding  ← 복습 온보딩
│     └─ /q/review/conquer     ← 정복 세트
│     (/q/review/master, /q/review/all은 미구현 — 사이드바 잠금 표시만)
│
├─ /planner                    ← 풀림 플래너 홈
│  ├─ /planner/onboarding      ← 플래너 온보딩
│  ├─ /planner/calendar?view=  ← 통합 캘린더 (일·주·월 토글)
│  ├─ /planner/builder         ← 8단계 위저드
│  ├─ /planner/reports         ← 리포트
│  ├─ /planner/day             ← redirect → /planner/calendar (안전망)
│  ├─ /planner/week            ← redirect → /planner/calendar?view=week
│  └─ /planner/month           ← redirect → /planner/calendar?view=month
│
├─ /classbot                   ← 풀림 클래스봇 (학생) 홈
│  ├─ /classbot/onboarding     ← 클래스봇 온보딩
│  ├─ /classbot/discover       ← 클래스봇 발견 (참여 가능 봇 탐색)
│  ├─ /classbot/chat           ← 봇 채팅
│  ├─ /classbot/replay         ← 리플레이 리스트
│  └─ /classbot/replay/[id]    ← 타임라인 + 트랜스크립트 + 본인 답변 비교
│
├─ /library                    ← 풀림 라이브러리 홈 (4종 생성기 입구)
│  ├─ /library/[id]            ← 자료실 카드 상세
│  ├─ /library/storage         ← 내 자료실 (그리드/목록 토글)
│  ├─ /library/create/[type]   ← 생성기 (image|short|audio|card)
│  ├─ /library/visual          ← 스튜디오 VLM 카탈로그
│  ├─ /library/visual/[id]     ← VLM 인터랙티브 시뮬 (math-derivative-sign 등)
│  └─ /library/visual/onboarding ← 비주얼 온보딩
│
├─ /studio                     ← 풀림 스튜디오 entry (Phase 2 미구현, 안내 페이지)
├─ /store                      ← 풀림 스토어 entry (Phase 3 미구현, 안내 페이지)
│
├─ /room                       ← 풀림 스터디룸 (Future, locked)
├─ /voice                      ← 풀림 보이스 (Future, locked)
│
└─ /me                         ← 내 정보
```

### 2.2 교사 영역 `(teacher)`

```
/teacher                       ← 교사 홈 (대시보드)
├─ /teacher/classbot           ← 클래스봇 운영 메인
├─ /teacher/builder            ← 봇 빌더 8단계 위저드
│
├─ /teacher/live               ← 라이브 모니터링
├─ /teacher/quiz               ← 퀴즈 운영
├─ /teacher/reports            ← 리포트 (6종)
├─ /teacher/grading            ← 하이브리드 채점
├─ /teacher/templates          ← 템플릿 마켓
├─ /teacher/settings           ← 8탭 봇 설정
│
├─ /teacher/replay             ← 교사용 리플레이 리스트
└─ /teacher/replay/[id]        ← 교사용 리플레이 상세
```

**메모**: 6 운영 라우트(live·quiz·reports·grading·templates·settings)는 의도적으로 `/teacher/*` 직속에 위치 (classbot 하위 아님). 교사가 다중 봇·다중 학급을 동시 운영할 때 운영 도구를 분리된 entry로 노출.

### 2.3 영역 분리 원칙

- 학생 — `app/(student)/*` (`AppShell role="student"`, `max-w-screen-md`, BottomNav 5탭)
- 교사 — `app/(teacher)/*` (`AppShell role="teacher"`, `w-full` 와이드, 데스크탑 우선)
- 학부모 — `/parent/*` (현재 미구현, 향후 분리)
- 관리자 — `/admin/*` (현재 미구현, 향후 분리)

---

## 3. IA (Information Architecture)

### 3.1 사이드바 구조 (학생, 사용 흐름별)

```
오늘     (2): 대시보드 · 풀림 플래너 ▾
학습     (2): 풀림 무한풀기 ▾ · 풀림 비주얼
[복습]   (1): 풀림 복습 ▾                    ← 1항목 그룹은 라벨 숨김
[분석]   (1): 풀림 분석 ▾                    ← 1항목 그룹은 라벨 숨김
AI 코칭  (2): 풀림 AI 대화 · 풀림 클래스봇 ▾
준비 중  (2): 풀림 스터디룸 🔒 · 풀림 보이스 🔒
[계정]   (1): 내 정보                        ← 1항목 그룹은 라벨 숨김
```

### 3.2 BottomNav (학생 모바일, 5탭)

| 탭 | 라벨 | 매칭 라우트 |
|---|------|----------|
| 1 | 홈 | `/` |
| 2 | 학습 | `/q/*` |
| 3 | 플래너 | `/planner/*` |
| 4 | 클래스봇 | `/classbot/*` |
| 5 | 내 정보 | `/me` |

### 3.3 GNB (Global Nav Bar) — AppHeader

- 좌: 풀림 로고 + 검색 (Cmd+K)
- 중: 컨텍스트 (수업 LIVE 중 표시·D-day·플래너 활성 블록)
- 우: 알림·역할 스위처(학생/교사 토글)·사용자 메뉴

### 3.4 Breadcrumb 자동 생성

`components/shell/nav-config.ts`의 그룹/항목/섹션 구조에서 파생:
- 예: `풀림 스터디 > 풀림 플래너 > 일간 캘린더`
- 페이지가 자체 Breadcrumb을 만들지 말 것

### 3.5 섹션(Contextual Sidebar) 패턴

복잡한 기능은 sub-route를 가진 "섹션"으로 등록 — 진입 시 사이드바가 swap.

**섹션 정의 예시** (`nav-config.ts`):
```ts
export const plannerSection: NavSubItem[] = [
  { href: '/planner',         label: '홈' },
  { href: '/planner/calendar', label: '캘린더' },
  { href: '/planner/builder',  label: '빌더' },
];
```

**동작**:
- `/planner/*` 진입 시 사이드바가 plannerSection 전용으로 swap
- 사이드바 상단에 "← 전체 기능" 복귀 링크 + 섹션 헤더 (아이콘+이름)
- breadcrumb 자동 3-단계

**섹션으로 만들기 좋은 기능**:
- 풀림 플래너 (홈·캘린더·빌더·리포트) ✅
- 풀림 클래스봇 (학생/교사 각각)
- 풀림 무한풀기 (홈·풀이·해설·시험·이력)
- 풀림 AI 대화 (코치 6 에이전트별 입구)

**단일 페이지로 충분한 기능**: 분석 (탭만으로 정보 밀도 OK), 비주얼 (단일 카탈로그+상세).

---

## 4. Screen Spec (화면별 구성요소)

### 4.1 풀림 플래너

#### 홈 (`/planner`) — NEXT BLOCK 히어로 중심
| 구성 | 설명 |
|------|------|
| 인사말 | 시간대별 인사 + 오늘 블록 수 |
| **NEXT BLOCK 히어로 카드** | 다음 블록 제목 + 남은 시간 + CTA `[지금 시작하기]` |
| 오늘의 미니 타임라인 | 7블록 (과목색 + 이모지 + 레이블, 예: "✏️ 문제풀이") |
| 주간 그래프 | θ 추세 라인 + 학습 시간 막대 |
| 달성률·스트릭 | 🔥 연속 학습 일수 |

#### 캘린더 (`/planner/calendar`)
- **일간** (`?view=day`): 24시간 원형 시계 (현재 시각 바늘, 중심 허브에 D-day/달성률/총시간)
- **주간** (`?view=week`): 7열 × 24시간 그리드
- **월간** (`?view=month`): 월력 + 일별 블록수 히트맵

#### 빌더 (`/planner/builder`) — 8단계 위저드
1. 목표 (시험·D-day)
2. 가용 시간 (요일별 시간대)
3. 과목 가중치 (합 100% 검증)
4. 블록 패턴 (Pomodoro/딥워크/하이브리드)
5. 약점 자동 반영
6. 동기 스타일 (스파르타/친구톤/정석)
7. 알림 (시간·강도)
8. 미리보기·활성화 (일주일 미리보기)

특수: StepIndicator 점프 + 임시저장.

### 4.2 풀림 클래스봇 — 교사 메인 (`/teacher/classbot`)

| 구성 | 설명 |
|------|------|
| 수업 헤더 | 제목 + 참여자/이탈감지 상태 |
| 전체 현황 | 참여율(%), 평균 질문 수, 평균 사고 깊이 |
| 이탈 로그 | 시간:학생명:이벤트 (실시간) |
| 학생별 패널 | 이름/상태/질문수/사고깊이점수 |
| 액션 바 | 전체 공지 / 개별 메시지 / 모드 변경(L1~L5) / 세션 종료·일시정지 |
| 우측 패널 | 학생 봇 상호작용 피드 (실시간) |

### 4.3 봇 빌더 (`/teacher/builder`) — 8단계 위저드
1. 정체성 (이름·과목·학년·캐릭터 톤)
2. 목소리 (TTS 보이스 선택)
3. 교안 (PDF/이미지 OCR + 임베딩, 또는 스토어 교재 연결)
4. 수업방식 (사고유도/가이드/직접답변/시험)
5. **Scope** (L1~L5 + 시간대별 스케줄)
6. **평가** (루브릭, 합 100% 검증)
7. 안전 (이탈 대응 강도: 관대/보통/엄격)
8. 배포 (코드/링크/QR)

특수: StepIndicator 점프 + 임시저장 + Step6 루브릭 합 100% 검증.

### 4.4 풀림 무한풀기 — 솔브 (`/q/infinity/solve`)

3-pane 워크스페이스:
- **좌**: 문제 (KaTeX 수식 렌더)
- **중**: 풀이 노트 (학생 입력)
- **우**: AI 코치 패널 (5단계 힌트, Scope L3 기본)

상단 컨텍스트 바: 과목·단원·출처(📅 플래너 등)·진행률.

### 4.5 풀림 해설 12-섹션 (`/q/infinity/explain`)

| # | 섹션 | 역할 |
|---|------|------|
| 1 | Hero Recap | 내 답 vs 정답 비교 |
| 2 | Prologue | 교육적 존재 이유 (단원 위치·출제 의도) |
| 3 | **4-Path Solution Spine** ★ | 4개 독립 풀이 경로 (정석/기하직관/좌표/심화) |
| 4 | Textbook Root Graph | 중·고 교과 DAG 시각화 |
| 5 | Error Anatomy | 내 풀이 vs 정답 풀이 비교 + annotation |
| 6 | 100명의 선택 | 선지 선택률 + 함정 분석 |
| 7 | Visual Canvas | 인터랙티브 SVG (슬라이더·버튼) |
| 8 | Pattern Family | 같은 패턴 8개 친척 문제 |
| 9 | Feynman Challenge | 2분 마이크 녹음 + AI STT 평가 |
| 10 | Teacher Voices | 같은 해설 3톤 (정석/친구/스파르타) |
| 11 | History+Real-World | 개념의 역사 + 응용 사례 |
| 12 | Memory Anchor | 한 줄 암기문 + Leitner 자동 설정 |

### 4.6 풀림 복습 (`/q/review`)
- **메인 페이지**: 오답정복 + 망각곡선 통합 뷰 (Leitner 5-Box + due 카드)
- 정복 세트 진입: `/q/review/conquer`
- 미구현 (사이드바 잠금만 표시): 마스터 졸업 카드 모음, 전체 기억 뷰 분리

### 4.7 풀림 분석 (`/q/analysis`)
- **허브 페이지**: 분석 카테고리 진입점
- **`/q/analysis/ability`**: θ 레이더 차트 + 단원별 히트맵 (능력치)
- **`/q/analysis/process`**: 메타인지 점수 + 풀이 시간 분포 (과정)
- **`/q/analysis/diagnose`**: 15문 적응형 IRT 진단

### 4.8 풀림 AI 대화 (`/q/talk`)
- **단일 페이지**에서 **코치**(6 에이전트) + **튜터**(5단계 힌트) 모두 노출
  - 코치 6 에이전트: 학습 매니저 / 문제해결사 / 오답박사 / 시험전략가 / 멘탈코치 / 플래너
  - 튜터 5단계: 방향→핵심→단서→거의정답→해설

### 4.9 풀림 라이브러리 (`/library`)

홈은 4종 생성기 + 내 자료실 + VLM 카탈로그의 entry. 각 영역은 별도 sub-route로 분리:

| 라우트 | 구성 |
|------|------|
| `/library` | 홈 (4종 생성기 입구 + 자료실 미리보기 + VLM 추천) |
| `/library/[id]` | 자료실 카드 상세 (이미지·쇼츠·오디오·카드) |
| `/library/storage` | 내 자료실 — 그리드/목록 토글, 종류·소유자·정렬 필터 |
| `/library/create/[type]` | 생성기 — `type`은 `image|short|audio|card` |
| `/library/visual` | 스튜디오 VLM 카탈로그 (인터랙티브 시뮬) |
| `/library/visual/[id]` | VLM 상세 (math-derivative-sign 등) |
| `/library/visual/onboarding` | 비주얼 첫 진입 안내 |

상세 페이지 공통: 슬라이더·버튼으로 직관 강화 + CTA `[Q에서 풀어보기]` `[오답 복습 저장]` `[코치에게 질문]`.

### 4.10 도메인별 온보딩 페이지 (공통 패턴)

각 주요 도메인은 첫 진입 시 안내용 `onboarding` 라우트를 가진다 (학생이 처음 진입할 때만 표시):

| 라우트 | 도메인 |
|------|------|
| `/q/onboarding` | Q 허브 |
| `/q/infinity/onboarding` | 풀림 무한풀기 |
| `/q/analysis/onboarding` | 풀림 분석 |
| `/q/review/onboarding` | 풀림 복습 |
| `/q/talk/onboarding` | 풀림 AI 대화 |
| `/planner/onboarding` | 풀림 플래너 |
| `/classbot/onboarding` | 풀림 클래스봇 (학생) |
| `/library/visual/onboarding` | 풀림 비주얼 |

**역할**: 각 도메인의 핵심 가치·사용법·플라이휠 연결 지점을 3초~30초 내에 학생에게 전달. 한번 진입한 후엔 자동 스킵 (또는 사용자 선택).

---

## 5. RBAC (역할별 접근/행위 매트릭스)

### 5.1 4개 역할

| 역할 | 코드 | 설명 |
|------|------|------|
| 관리자 | owner | 기관 소유자 (원장, 교감) |
| 운영자 | manager | 교사, 강사, 과외선생 |
| 보조자 | assistant | 보조교사, 학부모 |
| 학습자 | learner | 학생 |

### 5.2 도메인별 RBAC

상세는 [05-business-rules.md](05-business-rules.md) 5장 참조.

요약:
- **클래스봇**: Owner=전체 / Manager=봇 생성·운영 / Assistant=조회·간단피드백 / Learner=상호작용·자신 리포트
- **플래너**: Learner=자기 플래너만 / Manager=관리 학생 플래너 가능 / Assistant=수정 요청(48h 자동승인) + 리포트 열람만
- **Q (무한풀기)**: Learner=자기 풀이만 / Manager=자기가 만든 문항 분석 / Parent=자녀 θ·에러패턴 (자녀 승인)

---

**기준 문서**: `input/docs-archive/03_풀림_스터디_마스터.md` + 옛 `pullim-study-screens/SKILL.md` 3·5장 + `web/CLAUDE.md` 1장 + `STATUS.md` 통합 이력.
