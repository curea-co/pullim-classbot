# 12. 학생 과제 풀이 상세 (Student Assignment Solve) — 명세

> **우선순위 #2** · 풀림 클래스봇 추출본 신규 명세
> 권위 문서: `input/docs-archive/07_풀림_클래스봇_핸드오프.md` § 4.1 (빌더 산출물 소비), § 4.4 (라이브), § 4.5 (퀴즈), Flow B/C
> 신규 라우트: `/classbot/assignment`, `/classbot/assignment/[id]`, `/classbot/assignment/[id]/solve`, `/classbot/assignment/[id]/result`
> 의존 mock: `src/lib/mock/classbot.ts` — `Assignment`, `studentAssignments` (3건 기존), `studentAssignmentStats`

---

## 1. AI 명령지침

- **추출본 정책 — 가장 중요**: 기존 `Assignment.solveHref`는 `/q/infinity/solve?...`를 가리키지만 풀림 Q 도메인은 이 저장소에 **존재하지 않음**. 따라서 풀이 워크스페이스를 **클래스봇 도메인 내부**(`/classbot/assignment/[id]/solve`)에서 자급 구현한다. 다른 도메인 라우트로 새 링크를 만들지 않는다.
- `solveHref` 필드는 마이그레이션: 새 라우트 패턴 `/classbot/assignment/[id]/solve?step=N`으로 재작성.
- Scope Guard L1~L5에 따라 풀이 중 봇 응답이 차등 — 시험 모드(`mode === 'exam'` && `scopeOverride === 1`)는 봇 응답 자체 차단.
- "교사가 만든 과제를 학생이 받고 → 풀고 → 채점 허브로 흘러간다"는 [Flow C](#) 의 학생 쪽 절반.

---

## 2. 제품 정의

### 2.1 Problem Statement
교사가 발사한 과제(연습·시험·오답정복)를 학생이 받았지만, 실제로 풀 수 있는 워크스페이스가 없다. 학생 홈에서 `[지금 시작하기]`를 누르면 깨진 링크로 빠지고, 교사·학생 사이의 사이클이 끊긴다.

### 2.2 Product Goal
- **G1**: 학생이 받은 과제를 **클래스봇 내부에서 끝까지** 풀 수 있다 (외부 도메인 의존 0)
- **G2**: 3가지 모드(`practice/exam/wrong-conquest`)별로 봇 거동·UI·Scope가 명확히 다르다
- **G3**: 제출 시 자동으로 [채점 허브](11-grading-hub.md) 큐에 진입 → 교사 검수 사이클로 환류

### 2.3 Persona별 영향

| 페르소나 | 이 기능에서 달라지는 것 |
|---|---|
| **P2 학생** (주) | 홈에서 과제 클릭 → 풀이 → 제출 → 결과 확인까지 끊김 없는 단일 여정 |
| **P1 교사** | 학생 풀이 진행률·정답률이 [교사 클래스봇 페이지](src/app/(teacher)/teacher/classbot/page.tsx)의 "발사한 과제" 섹션에 실시간 갱신 |
| **P3 학부모** | 최종 점수·풀이 시간이 주간 리포트에 환산 |

---

## 3. 핵심 기능 정의

### 3.1 MoSCoW

#### Must
- [M1] 과제 개요 페이지 — 단원·문항 수·난이도·D-day·봇 발송 이유
- [M2] 풀이 워크스페이스 — 단일 페이지에서 문항 N개 순차 풀이 (이전/다음 네비)
- [M3] 모드별 봇 패널 분기:
  - `practice` (Scope L4): 단계별 힌트 5단계
  - `exam` (Scope L1): 봇 패널 자체 잠금 + "시험 종료 후 가능"
  - `wrong-conquest` (Scope L5): 정답·해설·반례 즉시 노출
- [M4] 임시저장 — 풀이 도중 이탈해도 마지막 위치·답안 복원
- [M5] 제출 → 채점 큐 진입 → 결과 페이지 이동

#### Should
- [S1] 풀이 시간 측정 + 문항별 분포 (과정 분석용 메타데이터)
- [S2] 손글씨/이미지 답안 업로드 (스캔 또는 카메라)
- [S3] 진행률 막대 + 남은 시간(시험 모드) 카운트다운
- [S4] 봇 채팅과 동일한 chat-bubble UI 재사용 (`/classbot/chat`)

#### Could
- [C1] 협동 풀이 모드 (스터디룸 연계, v3+)
- [C2] 음성 답안 (TTS 응답 + 학생 발화 STT)

#### Won't
- 봇이 정답을 미리 보여주는 안티패턴 (Scope L5 외)
- 풀이 워크스페이스에서 직접 채점 결과 표시 (반드시 결과 페이지로 분리)

### 3.2 Sitemap

```
/classbot
├─ /classbot/assignment              ← 신규 · 받은 과제 전체 목록 (필터·정렬)
│  ├─ /classbot/assignment/[id]      ← 신규 · 과제 개요·풀이 시작 진입
│  │  ├─ /classbot/assignment/[id]/solve   ← 신규 · 풀이 워크스페이스
│  │  └─ /classbot/assignment/[id]/result  ← 신규 · 제출 결과·봇 피드백
```

**홈과의 관계**: 현재 [classbot/page.tsx](src/app/(student)/classbot/page.tsx)의 `PrimaryAssignmentCard`·`AssignmentRow`·`MyBotsStrip` 그대로 유지. `[지금 시작하기]` CTA만 `solveHref` → 새 라우트로 리다이렉트.

### 3.3 Screen Spec

#### 3.3.1 과제 목록 (`/classbot/assignment`)
| 구성 | 설명 |
|---|---|
| 헤더 | "받은 과제 N건" + 봇별 필터 칩 |
| 필터 | 상태(`todo/in-progress/submitted/overdue`), 모드, 봇 |
| 정렬 | D-day 임박 / 받은 시각 / 정답률 |
| 과제 카드 | 모드 아이콘 · 제목 · 단원 · 진행 N/M · 정답률(있을 시) · 봇 발송자 |
| 봇 처방 강조 | `source === 'bot-prescribed'` 카드는 우상단 ✨ 뱃지 + `reasonHint` 한 줄 |
| 빈 상태 | "선생님이 보낸 과제가 없어요. 라이브 수업이 끝나면 자동으로 처방이 와요." |

#### 3.3.2 과제 개요 (`/classbot/assignment/[id]`)
| 구성 | 설명 |
|---|---|
| 봇 아바타 + 발송자 | "수학이 형 — 오늘 19:50 발사" |
| 헤더 | 모드 뱃지(연습/시험/오답정복) · 제목 · D-day |
| 메타 | 단원 from-to · 문항 수 · 난이도 · 예상 소요 시간 · 성취 코드 |
| 봇 한 마디 | `reasonHint` (bot-prescribed) 또는 교사 메시지 (teacher-assigned) |
| 시험 모드 경고 | `mode === 'exam'`이면 "시작하면 봇 도움 차단 · 일시정지 불가" 경고 모달 |
| CTA | `[지금 시작하기]` (`state === 'todo'`) / `[이어서 풀기]` (`in-progress`) / `[결과 보기]` (`submitted`) |
| 사이드 — 비슷한 과제 | 같은 봇의 과거 과제 추세 (정답률) |

#### 3.3.3 풀이 워크스페이스 (`/classbot/assignment/[id]/solve`)
3-pane (모바일은 step별 swipe + 봇 패널은 시트):

| 영역 | 데스크탑 | 모바일 |
|---|---|---|
| **좌 (문제)** | 문항 N/M · KaTeX · 이미지 | 메인 viewport |
| **중 (답안)** | textarea + 이미지 업로드 · 객관식 라디오 | 풀이 입력 시트 |
| **우 (봇 패널)** | Scope에 따라 5단계 힌트 / 시험 잠금 / 정답·해설 | FAB 버튼 → 모달 |

상단 컨텍스트 바: 모드 · Scope L · 진행 N/M · 남은 시간(시험만) · "임시저장 N초 전" 인디케이터.

하단 액션: `[이전]` `[다음]` `[제출]` (마지막 문항에서만 활성).

#### 3.3.4 결과 페이지 (`/classbot/assignment/[id]/result`)
| 구성 | 설명 |
|---|---|
| 헤더 | "수고했어요 ✨" + 자동 채점 분 / 교사 검수 대기 분 분리 |
| 점수 카드 | 즉시: 객관식·단답 / 보류: 서술형 (교사 검수 후 갱신) |
| 봇 피드백 | "오늘 가장 잘한 점" + "다음에 신경 쓸 점" 2줄 |
| 오답 카드 | 문항별 — 내 답 vs 기준 응답 (Scope L5 자동 노출, 시험은 발표일까지 숨김) |
| 다음 액션 | `[비슷한 패턴 더 풀기]` (오답정복 자동 처방) · `[봇에게 질문]` (`/classbot/chat`) |
| 플라이휠 노트 | "자주 막힌 패턴은 다음 과제에 자동으로 들어가요" |

---

## 4. UX Flow

### 4.1 Flow A1 — 학생 연습 과제 수행 (가장 빈번)
```
1. 학생 홈에 PrimaryAssignmentCard "도함수 활용 마무리" 표시 (D-1)
2. [이어서 풀기] → /classbot/assignment/as_today
3. 개요 확인 → [이어서 풀기]
4. solve 진입 — 9번 문항 (마지막 위치 복원)
5. 풀이 입력 도중 막힘 → 봇 패널 "1단계 힌트" 클릭
6. 단계 1~3 진행 → 답안 작성 → [다음]
7. 마지막 문항에서 [제출]
8. result 페이지: 객관식 즉시 채점 / 서술형 "검수 대기"
9. [봇에게 질문] → /classbot/chat에서 이어 대화
```

### 4.2 Flow A2 — 시험 모드 (Scope L1)
```
1. 5월 학평 모의 과제 D-9 → 학생이 D-day 당일 시작
2. 개요에 빨간 경고: "시험 모드 — 봇 차단 · 일시정지 불가"
3. [시작] 클릭 시 확인 모달 → 동의 후 진입
4. 봇 패널 잠금 + "시험 종료 후 가능"
5. 30문항 60분 카운트다운
6. 시간 종료 또는 [제출] → 채점 큐 진입
7. 결과 페이지: 점수·해설 모두 숨김 → "교사 발표 후 공개"
```

### 4.3 Flow A3 — 봇 처방 오답정복 (Scope L5)
```
1. 봇이 "어제 부호 변화 표 단계에서 5번 중 4번 막혔어요" 처방 (5문항)
2. 학생이 즉시 시작
3. solve에서 봇 패널이 항상 열려있음 — 풀이 직전 "이 패턴은 ~" 미니 설명
4. 풀이 후 즉시 정답 + 반례 노출
5. 제출 → 결과 페이지에서 "패턴 정복률 X%" 표시
6. 학생이 같은 패턴 정복 시 봇 처방 자동 종료
```

### 4.4 Flow A4 — 임시저장·복귀
```
1. solve 진행 중 → 학생이 앱 종료 (기기 잠금 등)
2. 5초마다 localStorage + 30초마다 서버 동기 (state: in-progress 갱신)
3. 학생 홈 재진입 → "이어서 풀기 — 9/20" 표시
4. 클릭 시 마지막 문항·작성 중이던 답안 복원
```

### 4.5 RBAC

| 행위 | Learner | Manager | Owner |
|---|---|---|---|
| 풀이 시작 | ✅ 본인 과제만 | ✅ 학생 대리 풀이 차단 | ✅ 차단 |
| 임시저장 | ✅ | ❌ | ❌ |
| 제출 | ✅ | ❌ | ❌ |
| 결과 열람 | ✅ 본인 | ✅ 본인이 만든 봇 학생 | ✅ 기관 전체 |

---

## 5. 운영 로직

### 5.1 Scope Guard 적용 매트릭스

| 모드 | 기본 Scope | 봇 패널 거동 |
|---|---|---|
| `practice` | L4 | 단계별 힌트(방향→핵심→단서→거의정답→해설), 정답 직답 차단 |
| `exam` | L1 (override) | 봇 응답 자체 차단, 메타데이터만 |
| `wrong-conquest` | L5 | 정답·해설·반례 즉시, 단계 스킵 가능 |

교사가 봇 빌더 § 5 단계에서 시간대별 Scope 자동 스위치 설정 시 그 값을 우선. `scopeOverride`가 있으면 그 값을 우선.

### 5.2 임시저장 규칙
- 클라이언트: `localStorage[assignment-${id}]` — 5초 디바운스
- 서버: 30초 throttle + 페이지 이탈 시 1회 동기
- 충돌 시: 서버 우선 (다중 기기 케이스), 클라이언트 답안 보존 후 사용자 선택

### 5.3 제출 후 사이클
1. 학생 [제출] → `Submission` 생성 (state: `submitted`)
2. 객관식·수치 → T1 즉시 채점 → 자동 승인
3. 서술형 → T2 초안 생성 → [채점 허브 큐](11-grading-hub.md § 5.2) 진입
4. 결과 페이지는 즉시 자동 채점분만 노출, 서술형은 "검수 대기" 상태
5. 교사 승인 후 결과 페이지 자동 갱신 (push 또는 polling)

### 5.4 시험 모드 추가 제약
| 항목 | 제약 |
|---|---|
| 일시정지 | 차단 |
| 이전 문항 이동 | 차단 (선택 가능 토글: 봇 빌더에서 설정) |
| 외부 탭 전환 감지 | 카운트 — 3회 이상 시 교사 알림 |
| 부정행위 키로그 | 수집 안 함 (학생 데이터 최소 수집 원칙 § 2.4) |

### 5.5 검증
| 항목 | 제약 |
|---|---|
| `Submission.answers.length` | `Assignment.questionCount`와 일치해야 제출 가능 (단, 빈 답안은 0점 허용) |
| 시험 모드 이탈 | 3회 초과 시 자동 제출 |
| 결과 페이지 접근 | `state === 'submitted'` 이상 |

---

## 6. ERD 보강

```
Assignment (1) ── (N) Question
Assignment (1) ── (N) Submission ── (1) Student
Submission (1) ── (N) Answer
Submission (1) ── (0,1) GradingItem    // 서술형만
Submission (1) ── (0,N) TimeSegment    // 문항별 풀이 시간

Submission {
  id
  assignment_id
  student_id
  state: 'in-progress' | 'submitted' | 'graded'
  startedAt, submittedAt, gradedAt
  lastPosition: number   // 임시저장 복원용
  tabSwitchCount?: number  // 시험 모드
}

Answer {
  submission_id
  question_id
  type: 'mc' | 'short' | 'essay' | 'numeric'
  raw: string | ImageRef
  autoScore?: number     // T1 즉시 채점
  durationSec: number
}
```

기존 `Assignment` mock의 `completedCount` · `recentAccuracy` 필드는 `Submission`에서 파생되도록 정합. 교사 측 [classbot 페이지](src/app/(teacher)/teacher/classbot/page.tsx)의 `DispatchedAssignments`는 이 집계를 소비.

---

## 7. Seed Data

### 7.1 기존 mock 그대로 활용
3건 (`as_today`, `as_prescription`, `as_exam_prep`) — 3모드 모두 커버.

### 7.2 추가 필요 시드
- 각 Assignment에 `questions: Question[]` 배열 (현재 비어있음) — 모드별 3-5문항씩 시드
- `Submission` 1건 시드 — `as_today`의 in-progress 상태 (`completedCount: 8`과 정합)
- 봇 힌트 5단계 시드 — `practice` 모드 첫 문항에 대해

### 7.3 마이그레이션
- 모든 `solveHref` 값 → `/classbot/assignment/${id}/solve?step=1`로 일괄 치환
- 기존 `pickPrimaryAssignment()` · `studentAssignmentStats` 그대로 사용

---

## 8. 브랜딩 / UX Writing

### 8.1 모드별 톤
- `practice`: 격려·코칭 톤 — "한 번 해보자"
- `exam`: 차분·중립 톤 — "집중하는 시간"
- `wrong-conquest`: 단호·명확 톤 — "이번엔 잡아내자"

### 8.2 마이크로카피

| 상황 | 카피 |
|---|---|
| 시험 모드 시작 경고 | "시작하면 봇이 잠겨요. 시간도 멈출 수 없어요." |
| 임시저장 안내 | "쓰는 동안 자동으로 저장돼요. 마음 편히 풀어요." |
| 봇 1단계 힌트 진입 | "한 줄만 알려줄게. 방향만 잡고 와." |
| 봇 5단계 (해설) | "마지막이야. 다 본 다음에 다시 처음부터 풀어볼래?" |
| 시험 모드 봇 클릭 | "지금은 도와줄 수 없어. 끝나고 다시 와줘." |
| 결과 검수 대기 | "선생님이 곧 봐줄 거예요. 알림으로 알려줄게요." |
| 빈 답안 제출 시도 | "비어있는 문항이 N개 있어요. 그대로 낼까요?" |
| 패턴 정복 완료 | "이 패턴 잡았어요. 봇이 다음 처방을 준비할 거예요." |

---

## 9. 디자인 시스템

### 9.1 컬러 토큰
- 모드 뱃지: `practice → bg-pullim-blue-500`, `exam → bg-pullim-danger`, `wrong-conquest → bg-pullim-warn` (기존 [classbot/page.tsx](src/app/(student)/classbot/page.tsx#L15-L19) `modeMeta` 그대로)
- 봇 패널 잠금 상태: `bg-pullim-slate-900/80` + 자물쇠 아이콘 + `text-pullim-lemon` 안내

### 9.2 컴포넌트
- 재사용: `LiveQuizCard` (단답·객관식), `FlywheelNote`, `PageHeader`, `SectionHeading`, `MyBotsStrip`
- 신규: `AssignmentOverviewHeader`, `SolveWorkspace` (3-pane), `BotHintPanel`, `ExamCountdown`, `ResultBreakdown`

### 9.3 모바일 대응
- 학생 영역은 `(student)` 셸의 `max-w-screen-md` + BottomNav 5탭 규칙. solve 워크스페이스는 모바일을 1순위로 설계 (학생 디바이스 가정).

---

## 10. 기술 스택·라우트

- App Router · `/classbot/assignment/[id]/{,solve,result}/page.tsx`
- KaTeX 렌더링: 기존 라이브러리 (수식 표시)
- 임시저장: `localStorage` + Server Action(또는 API route) throttled
- AI: T2 기본 (힌트 생성), T1 (객관식 즉시 채점), T3은 wrong-conquest의 반례 생성에만
- 채점 큐 연계: 제출 시 `GradingItem` insert + `aiConfidence` 계산

---

## 11. 로드맵

| Phase | 범위 | 검증 기준 |
|---|---|---|
| **P0** (이번) | M1~M5 + Flow A1 / A2 / A3 + 임시저장 + 새 라우트 4개 | 3개 시드 과제 모두 풀고 제출 → 결과 페이지 도달 |
| **P1** | S1~S4 + 결과 페이지 폴링 자동 갱신 + 봇 힌트 5단계 시드 | 서술형 검수 후 결과 갱신, 시험 모드 외부 탭 감지 |
| **P2** | OCR 이미지 답안 · 음성 답안 (`/classbot/chat` 통합) | 손글씨 풀이 1건 종단 |
| **P3** | 협동 풀이 / 스터디룸 연계 (v3+) | — |

---

## 12. 변경 이력

- **2026-05-11**: 초안 생성 — 우선순위 #2. 추출본 정책상 `/q/infinity/solve` 의존 제거, 클래스봇 내부 자급 라우트로 마이그레이션 결정.
