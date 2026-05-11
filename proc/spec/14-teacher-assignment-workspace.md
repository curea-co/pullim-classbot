# 14. 교사 과제 생성·발사 워크스페이스 (Teacher Assignment Workspace) — 명세

> **우선순위 #1 (P1 차순)** · 풀림 클래스봇 추출본 신규 명세
> 권위 문서: `input/docs-archive/07_풀림_클래스봇_핸드오프.md` § Flow C 1단계 ("교사: 과제 생성 (루브릭 포함)")
> 신규 라우트: `/teacher/assignment/new` · (선택) `/teacher/assignment`
> 의존 mock: `src/lib/mock/classbot.ts` — `Assignment` 타입·`studentAssignments` 시드 3건
> 연결 spec: [11. 채점 허브](11-grading-hub.md) · [12. 학생 과제 풀이](12-student-assignment-solve.md) · [13. 리포트 + 감정 체크인](13-reports-and-emotion-checkin.md)

---

## 1. AI 명령지침

- **본 spec은 E2E 사이클의 진입점이다.** 봇 빌드 → **과제 생성·발사** → 학생 수령 → 풀이 → 제출 → 채점 → 리포트의 첫 단계. 11/12/13이 사이클의 후반부를 채웠다면, 14는 시작점.
- **추출본 정책**: 백엔드 없이 **mock 데이터로 E2E가 시연되어야 한다**. 교사가 발사한 새 과제가 **새로고침 후에도** 학생 화면에 보여야 — `localStorage` 기반 Zustand store로 구현.
- 추출본 정책: 다른 도메인(플래너·Q·라이브러리) 의존 금지.
- 봇 빌더 § 4 단계(수업방식·평가) 산출물을 **소비**한다 — 봇이 가진 기본 루브릭·Scope·톤이 과제 기본값으로 자동 채움.
- **금지**: 학생에게 발사 전 새 과제 노출. 발사 액션(state: `draft → sent`)을 거쳐야 학생 화면 등장.
- **금지**: 과제 정보를 백엔드 가정으로 작성. P0는 클라이언트 store만, v1에서 서버 연결.

---

## 2. 제품 정의

### 2.1 Problem Statement
P0 완료 후 채점-풀이-리포트 사이클은 닫혔지만, **교사가 새 과제를 만드는 진입점이 없다**. `/teacher/classbot` 페이지의 `[+ 새 과제]` 버튼은 빈 핸들러이고, 학생이 받는 과제는 **mock 시드 3건에만 의존**한다. 결과적으로 데모/시연이 "교사가 발사한 것 같은 가짜 데이터"에 머문다.

### 2.2 Product Goal
- **G1**: 교사가 **5분 안에** 1개 과제를 발사할 수 있다 (단일 페이지 5섹션 폼)
- **G2**: 발사한 과제가 **즉시** 학생 홈 PrimaryCard·받은 과제 목록에 자동 반영
- **G3**: E2E 시연 — 봇 빌드부터 학부모 리포트까지 **mock으로 끝에서 끝까지 돌아간다**
- **G4**: 봇 빌더 § 4·6 산출물(수업방식·루브릭) 자동 흡수로 입력 부담 1/3

### 2.3 Persona

| 페르소나 | 이 기능에서 무엇이 달라지나 |
|---|---|
| **P1 교사** (주) | 매 수업 후 5분 발사가 일상화 — "오늘 어려웠던 단원 5문항" 즉시 처방 |
| **P2 학생** | 받는 과제가 mock이 아니라 "방금 선생님이 보낸 것"으로 인식됨 (홈 알림 + 뱃지) |
| **P3 학부모** | 자녀가 실제 받은 과제 진행률이 주간 리포트에 반영 |

---

## 3. 핵심 기능 정의

### 3.1 MoSCoW

#### Must (이번 P0)
- [M1] 단일 페이지 5섹션 폼 — 정체성·문항·대상·일정·발사
- [M2] 봇 선택 시 빌더 § 4·6 산출물 자동 흡수 (수업방식 → 기본 mode, 루브릭 → 기본 채점 기준)
- [M3] 모드별 분기 UI:
  - `practice`: 봇 힌트 단계 설정
  - `exam`: 시험 모드 토글 + 시간 제한 + Scope L1 자동 override 안내
  - `wrong-conquest`: 봇이 감지한 학생 오답 패턴 자동 제안 (시드)
- [M4] **클라이언트 store** (Zustand + localStorage) — 발사한 과제가 새로고침 후에도 학생 화면에 보존
- [M5] 학생 측 자동 반영 — `/classbot` 홈·`/classbot/assignment` 목록·BottomNav 뱃지
- [M6] 발사 직후 토스트 + 학생 화면 미리보기 모달 (교사가 "어떻게 보이는지" 즉시 확인)

#### Should (v1)
- [S1] 예약 발사 — 특정 시각에 자동 발사 (수업 시작 시간 등)
- [S2] 봇 처방 자동 생성 — 학생 오답 패턴 N개 누적 시 봇이 자동 draft 생성
- [S3] 다중 발사 — 같은 과제를 여러 반에 동시 발사
- [S4] 과제 템플릿 — 자주 쓰는 형식 저장·복제
- [S5] 통합 과제 목록 — `/teacher/assignment` (다중 봇 운영 시 모든 과제 한눈에)

#### Could (v2)
- [C1] AI 자동 문항 추천 — RAG 인덱스에서 학생 수준 맞춤 문항 자동 선정
- [C2] 루브릭 사전 편집 — 발사 전 항목별 가중치 조정 (현재는 봇 기본값)
- [C3] 구글 클래스룸 동기 — 과제 양방향 동기

#### Won't (현 단계 제외)
- 발사 후 수정 — 학생이 받은 후 수정 시 혼란. 회수·재발사 패턴으로만.
- 학생이 직접 만든 과제 (`source: 'self'`) — v3+ 자율 학습 영역

### 3.2 Sitemap

```
교사 영역
/teacher
├─ /teacher/assignment/new           ← 신규 · 과제 생성·발사 워크스페이스
└─ /teacher/assignment               ← 신규 (v1) · 통합 과제 목록 — P0 제외
```

**진입점**:
- [/teacher/classbot](src/app/(teacher)/teacher/classbot/page.tsx) "발사한 과제" 섹션의 `[+ 새 과제]` CTA → 빈 핸들러 해제
- [/teacher](src/app/(teacher)/teacher/page.tsx) 빠른 액션 영역 — "즉석 퀴즈 쏘기"와 별개로 "과제 발사" 추가
- 봇 빌더 8단계 완료 후 "테스트 발사" 선택지

### 3.3 Screen Spec

#### 3.3.1 과제 생성·발사 워크스페이스 (`/teacher/assignment/new`)

단일 페이지 + sticky bottom 액션 바. 모바일 대응은 v1 (교사 데스크탑 우선).

| 섹션 | 구성 | 자동 채움 |
|---|---|---|
| **① 정체성** | 봇 선택(드롭다운) · 제목 · 모드(practice/exam/wrong-conquest) · 난이도(하/중/상) | 봇 선택 시 학년·과목 자동 |
| **② 문항** | 단원 from-to · 문항 수 · 자동 생성 / 수동 선택 토글 · (수동 시) 문항 추가 모달 | 빌더 § 3 교안 RAG 범위에서 단원 자동 |
| **③ 대상** | 학생 명단 (체크박스) · "전체 선택" · 선택 N명 표시 | 봇 선택 시 enrolled 학생 자동 체크 |
| **④ 일정** | 마감일 (D-day picker) · 즉시 발사 / 예약 발사 (v1) · 봇 한 마디 (선택, 200자) | "내일 22:00" 기본 채움 |
| **⑤ 발사** | 미리보기 (학생 시점 카드) · 최종 검토 체크리스트 · `[발사]` 버튼 | — |

**시험 모드 추가 섹션** (`mode === 'exam'`일 때만 노출):
- 시간 제한 (분)
- 외부 탭 카운트 정책 (3회 초과 시 자동 제출 / 카운트만)
- Scope override = L1 안내 ("발사 후 봇이 잠겨요")
- 이전 문항 이동 허용 토글

**상단 컨텍스트 바**:
- 좌: `[← 취소]` (변경 사항 있으면 확인 모달)
- 중: "새 과제 — {봇 이름}"
- 우: 임시 저장 인디케이터 ("방금 전 저장됨")

**Sticky bottom 액션 바**:
- 좌: 입력 진행도 (5섹션 중 N완료)
- 중: `[미리보기]` (학생 시점 모달)
- 우: `[임시 저장]` (draft 유지) / `[발사 →]` (모든 필수 통과 시 활성)

#### 3.3.2 학생 시점 미리보기 모달
- 학생 홈 `PrimaryAssignmentCard`와 동일 디자인
- 모드별 색상·뱃지 그대로
- 시험 모드일 경우 경고 카드도 미리보기

---

## 4. UX Flow

### 4.1 Flow A1 — 수업 후 즉시 발사 (가장 빈번)
```
1. 19:50 수업 종료 → 교사 /teacher/classbot
2. "발사한 과제" 섹션 [+ 새 과제] 클릭
3. /teacher/assignment/new 진입 → "수학이 형" 자동 선택
4. ① 정체성: 제목 "도함수 활용 복습", 모드 practice, 난이도 중
5. ② 문항: 단원 "극값~변곡점", 자동 생성 N=10
6. ③ 대상: 18명 전체 (자동 체크됨)
7. ④ 일정: 내일 22:00 (자동 채움)
8. ⑤ 미리보기 → 카드 확인 → [발사]
9. 토스트 "18명에게 발사했어요" + 자동 /teacher/classbot 복귀
10. "발사한 과제" 섹션에 새 행 등장
```

### 4.2 Flow A2 — 봇 처방 자동 생성 시연 (v1, P0는 mock 트리거)
```
1. 학생 도현 오답 누적 3건 (mock 시드)
2. 시스템 자동 — `source: 'bot-prescribed'` draft 생성
3. 교사 홈 알림 "수학이 형이 도현이를 위해 새 과제를 준비했어요"
4. 교사 검토 → 한 줄 추가 또는 그대로 [발사]
5. 학생 도현 홈에만 노출 (대상 = 1명)
```

### 4.3 Flow A3 — 시험 모드 발사 (Scope L1 강제)
```
1. /teacher/assignment/new → 모드 'exam' 선택
2. 시험 모드 섹션 자동 펼침 — 60분 / 외부 탭 3회 / Scope L1 안내
3. ② 문항: 30문항 수동 선택 (자동 생성 + 직접 추가)
4. ④ 일정: 5/18 19:00 (예약 발사)
5. [발사] → 5/18 19:00에 자동 등장 안내 토스트
6. 학생: 5/18 19:00 도달 시 홈에 시험 카드 등장 (mock — P0는 즉시 발사만, 예약은 v1)
```

### 4.4 Flow A4 — 다중 봇 운영 (v1)
```
1. 김수학 선생님 → 봇 3개 운영 ("수학이 형", "영어 누나", "과학 쌤")
2. /teacher/assignment 통합 목록에서 봇별 발사 이력 확인
3. 같은 과제를 영어 누나·수학이 형에서 동시 발사 (S3 다중 발사)
```

### 4.5 RBAC

| 행위 | Owner | Manager | Assistant | Learner |
|---|---|---|---|---|
| 워크스페이스 진입 | ✅ 기관 전체 | ✅ 본인 봇 | ❌ | ❌ |
| 발사 | ✅ | ✅ | ❌ | ❌ |
| 봇 처방 자동 draft 승인 | ✅ | ✅ | ❌ | ❌ |
| 미리보기 | ✅ | ✅ | ✅ 조회 | ❌ |

---

## 5. 운영 로직 (Business Rules)

### 5.1 발사 전 검증
| 항목 | 제약 | 위반 시 |
|---|---|---|
| 봇 | 1개 필수 | `[발사]` 비활성 |
| 제목 | 5~50자 | 인라인 에러 |
| 문항 수 | 1 ≤ N ≤ 50 | 시험은 60까지 |
| 대상 학생 | 1명 이상 | `[발사]` 비활성 |
| 마감일 | 미래 (즉시 발사는 +1시간 이상) | 자동 보정 안내 |
| 시험 모드 시간 제한 | 10 ≤ N ≤ 180분 | 인라인 에러 |

### 5.2 Scope override 정책
- `mode === 'exam'` → `scopeOverride = 1` 자동 강제, 사용자 변경 불가
- `mode === 'wrong-conquest'` → `scopeOverride = 5` 기본값, 교사 조정 가능
- `mode === 'practice'` → 봇의 기본 Scope 사용 (보통 L4), 교사 조정 가능

### 5.3 상태 전이
```
draft ──[임시 저장]──> draft (계속 편집 가능)
draft ──[발사]──> sent (학생 가시 즉시) ──학생 시작──> in-progress ──제출──> submitted
sent ──[회수] (v2)──> withdrawn (학생 화면에서 사라짐)
```

`Assignment.state`는 학생 시점이고, 본 워크스페이스는 별도 발사 상태(`dispatchStatus: 'draft' | 'sent' | 'scheduled'`)를 갖는다.

### 5.4 자동 채움 매트릭스

| 필드 | 자동 채움 소스 |
|---|---|
| `subject`, `grade` | 선택한 봇의 `subject`, `grade` |
| `assignedBy` | 봇의 `name` |
| `assignedAt` | 발사 시각 (`new Date()` → "오늘 HH:MM") |
| `chapterFrom`, `chapterTo` | 봇 빌더 § 3 RAG 인덱스에서 선택 (P0 시드는 cb_001 기준 "미적분 III") |
| `achievementCodes` | 단원 선택에서 자동 (mock 매핑) |
| `solveHref` | `/classbot/assignment/${id}/solve?step=1` (spec 12 § 1) |
| `state` | 생성 직후 `'todo'` (학생 시점) |

### 5.5 클라이언트 Store 정책 (E2E mock 시연 핵심)
- Zustand store (`lib/store/assignments.ts`) + `persist` 미들웨어 → `localStorage['pullim-assignments']`
- 학생 측 `studentAssignments` 소비 함수가 **mock 시드 + store 추가분**을 합쳐 반환
- 키 충돌 회피: 새 과제 id는 `as_user_${timestamp}` 형식
- 발사 후 store 변경 → React 컴포넌트 자동 리렌더
- 새로고침 시 localStorage에서 복원 → 시연 일관성 유지

### 5.6 검증 시나리오 자동 흐름 (E2E)
| 단계 | 트리거 | 결과 |
|---|---|---|
| 1 | 교사가 [발사] 클릭 | store에 push + 토스트 |
| 2 | 학생 `/classbot` 새로고침 | `getMyAssignments()`가 합쳐 반환 → Primary에 새 과제 |
| 3 | 학생 풀이 완료·제출 | 결과 페이지 도달, `completedCount` 증가 (store 갱신 — P0는 mock) |
| 4 | 교사 `/teacher/grading` | 새 채점 항목 자동 진입 (P0는 시드 6건 + 신규는 v1) |
| 5 | 교사 승인 후 `/teacher/reports` | KPI에 점수 반영 (v1) |

---

## 6. ERD 보강

```
Assignment {
  // (기존 spec 12 필드 유지)
  + dispatchStatus: 'draft' | 'sent' | 'scheduled' | 'withdrawn'
  + scheduledAt?: ISO8601           // 예약 발사 (v1)
  + targetStudentIds: string[]      // 대상 학생 (전체 vs 일부)
  + createdBy: teacher_id
  + createdAt: ISO8601
  + dispatchedAt?: ISO8601
}

AssignmentDraft {
  // 임시 저장본 — 별도 entity로 둘지 Assignment의 state로 표현할지
  // P0는 Assignment.dispatchStatus = 'draft'로 단일 entity 유지
}
```

ERD 위치:
```
Teacher (1) ── (N) Assignment ──[targetStudentIds]── (N) Student
ClassBot (1) ── (N) Assignment
Assignment (1) ── (N) Submission        (spec 12)
Submission (1) ── (0,1) GradingItem     (spec 11)
```

---

## 7. Seed Data

### 7.1 기존 mock 그대로 활용
- `studentAssignments` 3건 (as_today, as_prescription, as_exam_prep) — 시연용 초기 상태
- `classBots` 3건 — 봇 드롭다운 옵션
- `classRoster` 18명 — 대상 학생 체크박스

### 7.2 추가 필요 시드
- 봇 처방 자동 생성 시연용 — 도현(s4) 오답 패턴 누적 mock + 시스템 알림 1건
- 단원 트리 mock — `cb_001` 봇의 RAG 인덱스에서 선택 가능한 단원 목록 (미적분 II~III, 5단원 정도)
- 문항 풀 mock — `assignmentQuestions`의 시드 13건을 단원별로 분류 (자동 생성 시 풀에서 N개 추출)

### 7.3 E2E 시연 케이스
- **케이스 1 (호제목)**: "도함수 활용 마무리 2탄" — practice·10문항·반 전체·내일 22:00
- **케이스 2 (시험)**: "중간고사 모의" — exam·30문항·60분·반 전체·5/18 19:00 예약
- **케이스 3 (봇 처방)**: "부호 변화 재학습 5문항" — wrong-conquest·도현 1명·오늘 안에

---

## 8. 브랜딩 / UX Writing

### 8.1 톤
- "**발사**"라는 단어 톤 유지 — 현재 코드 `DispatchedAssignments` 컴포넌트에서 사용 중. 짧고 능동적.
- 학생 측 통보는 부드럽게 — "선생님이 새 과제를 보냈어요" (가벼운 무게)
- 시험 모드는 차분하게 — "시험 과제예요. 시작하면 멈출 수 없어요"

### 8.2 마이크로카피

| 상황 | 카피 |
|---|---|
| 워크스페이스 헤더 | "새 과제 만들기" |
| 봇 선택 안내 | "어느 봇으로 발사할까요?" |
| 자동 채움 안내 | "{봇 이름}의 수업 방식·루브릭이 기본값으로 들어왔어요." |
| 문항 자동 생성 | "{단원}에서 {N}문항을 추천했어요. 마음에 안 들면 다시 뽑을 수 있어요." |
| 대상 학생 전체 선택 | "{N}명 전체에게 보낼게요." |
| 시험 모드 토글 시 | "시험 모드 — 봇이 자동으로 잠기고 시간 제한이 걸려요." |
| 미리보기 모달 헤더 | "학생들에게 이렇게 보여요" |
| 발사 직전 확인 | "{N}명에게 지금 보낼게요. 발사 후엔 수정할 수 없어요." |
| 발사 성공 토스트 | "{봇 이름}이 {N}명에게 보냈어요." |
| 임시 저장 | "임시 저장했어요. 언제든 이어서 만들 수 있어요." |
| 검증 실패 | "{필드}를 마저 채워주세요." |
| 학생 홈 새 과제 알림 | "선생님이 새 과제를 보냈어요. 마감 D-{N}" |

### 8.3 금지어
- "출제" → "발사" (시험·수능 어휘 회피, 가벼운 톤 유지)
- "배포" → "발사" 또는 "보냈어요" (B2B 톤 회피)
- "강제 종료" (시험 외부 탭 자동 제출) → "자동 제출" (중립)

---

## 9. 디자인 시스템

### 9.1 컬러 토큰
- 모드 뱃지: 기존 `modeMeta` 그대로 — practice `bg-pullim-blue-500`, exam `bg-pullim-danger`, wrong-conquest `bg-pullim-warn`
- 섹션 헤더: `text-pullim-blue-600` eyebrow + `font-mono text-[10px] tracking-wider uppercase`
- 시험 모드 경고 영역: `bg-pullim-danger-bg border-pullim-danger/30`

### 9.2 컴포넌트
- **재사용**:
  - `PageHeader` · `SectionHeading` · `FlywheelNote`
  - 봇 빌더의 `step-content` 패턴 일부 (섹션 카드 레이아웃)
  - `BotHintPanel` 잠금 UI (시험 모드 안내 미리보기)
- **신규**:
  - `AssignmentForm` (5섹션 폼 컨테이너)
  - `BotSelectField` (드롭다운 + 봇 미리보기)
  - `QuestionPicker` (자동/수동 토글 + 모달)
  - `StudentTargetPicker` (체크박스 그리드)
  - `DueDatePicker` (D-day 직관 picker)
  - `StudentPreviewModal` (학생 시점 카드 렌더)
  - `DispatchToast` (발사 성공 토스트)

### 9.3 레이아웃
- 데스크탑 우선 — `/teacher/*` 와이드 규칙
- 메인 영역 `max-w-3xl` 가로 정렬 (5섹션 폼 가독성)
- sticky bottom 액션 바 — 화면 하단 고정, 진행도 + 미리보기 + 발사

---

## 10. 기술 스택·라우트

### 10.1 라우트
- `src/app/(teacher)/teacher/assignment/new/page.tsx` — 메인 워크스페이스 (client component)
- `src/app/(teacher)/teacher/assignment/page.tsx` — 통합 목록 (v1)

### 10.2 상태 관리
- **Zustand store**: `src/lib/store/assignments.ts`
  ```ts
  type AssignmentStore = {
    drafts: Assignment[]      // 임시 저장
    dispatched: Assignment[]  // 발사된 과제
    addDraft, updateDraft, dispatch, withdraw
  }
  ```
- `persist` 미들웨어 → `localStorage['pullim-assignments']`
- 학생 측 `getMyAssignments()` 헬퍼 — mock 시드 + store dispatched 합산

### 10.3 새 패키지
- 없음 — `zustand`는 이미 `package.json` dependency.

### 10.4 라우팅 통합
- `nav-config.ts`: 신규 라우트 등록은 P0 범위 아님 (워크스페이스는 진입점에서만 접근 — 사이드바 직속 X)
- `/teacher/classbot` 페이지의 `[+ 새 과제]` 버튼이 메인 진입점

---

## 11. 로드맵 (Phase)

| Phase | 범위 | 검증 기준 |
|---|---|---|
| **P0** (이번) | M1~M6 + Flow A1 + A3 즉시 발사 + Zustand store + 학생 측 자동 반영 | E2E 시연 — 새 과제 발사 → 새로고침 → 학생 홈에 등장 → 풀이 → 제출 → 채점 큐 진입 |
| **P1** | S1 예약 발사 + S2 봇 처방 자동 draft + S5 통합 과제 목록 + `/teacher/assignment` | 도현 시나리오에서 봇이 자동 처방 draft 생성 → 교사 승인 → 발사 |
| **P2** | S3 다중 발사 + S4 템플릿 + C1 AI 자동 문항 추천 | 다중 반 운영 교사가 1과제 → 3반 동시 발사 |
| **P3** | C3 구글 클래스룸 동기 + 회수·재발사 (v2) | 외부 시스템 양방향 동기 |

---

## 12. E2E 시연 시나리오 (검증 핵심)

본 spec의 성공 정의 — 다음 시나리오가 mock으로 끝까지 돌아가야 한다.

### 시나리오 E2E: 김수학 선생님의 수업 후 발사

```
[1] 봇 빌드 (이미 시드)
  - 김수학 → /teacher/builder → cb_001 "수학이 형" (기존 봇)
  - 시드 데이터로 이미 운영 중인 봇 사용

[2] 과제 생성·발사 (✨ 본 spec)
  - /teacher/classbot → [+ 새 과제]
  - /teacher/assignment/new 진입
  - 봇: 수학이 형 (자동) → 학년·과목 자동
  - 제목: "도함수 활용 마무리 2탄"
  - 모드: practice / 난이도: 중
  - 단원: 미적분 III · 극값~변곡점 / 문항: 10 자동
  - 대상: 반 전체 18명 (자동 체크)
  - 일정: 내일 22:00 (자동) / 봇 한 마디: "어제 부호 변화에서 막혔던 사람들 다시 짚자"
  - 미리보기 확인 → [발사]
  - store에 push + 토스트 "수학이 형이 18명에게 보냈어요"

[3] 학생 수령 (spec 12)
  - 서연 → /classbot 새로고침
  - PrimaryAssignmentCard에 "도함수 활용 마무리 2탄" D-1 등장
  - reasonHint("어제 부호 변화에서 막혔던...") 표시

[4] 풀이 (spec 12)
  - [이어서 풀기] → /classbot/assignment/as_user_xxx/solve
  - 10문항 풀이 → [제출]
  - /classbot/assignment/as_user_xxx/result 도달
  - 자동 채점 즉시 + 서술형 "검수 대기"

[5] 채점 (spec 11)
  - 김수학 → /teacher/grading
  - 새 채점 항목(서연·민준·...) 큐 진입 (v1 — P0는 기존 시드만)
  - 루브릭 슬라이더 조정 → [수정 후 승인]
  - 변경률 누적 미터 갱신

[6] 리포트 (spec 13)
  - /teacher/reports → 학부모 주간 리포트에 점수·정답률 반영
  - 카카오 BIZ 미리보기 → [발송 승인] (mock log)

[7] 학생 환류 (spec 12)
  - 서연 결과 페이지 폴링 → 서술형 점수 갱신
  - 봇 자동 처방 — 자주 막힌 패턴 "부호 변화" 5문항 (S2 v1)
```

**P0 시연 시 한계**:
- 단계 5(채점 큐 신규 진입), 6(점수 자동 반영), 7(폴링·자동 처방) — v1에서 백엔드 연결로 완성
- P0는 단계 1~4가 mock으로 끊김 없이 시연되는 것이 핵심

---

## 13. 변경 이력

- **2026-05-11**: 초안 생성 — 풀림 클래스봇 추출본 E2E 진입점 명세 신설. 권위 문서 Flow C 1단계의 구체화. spec 11/12/13과 함께 사이클 완성.
