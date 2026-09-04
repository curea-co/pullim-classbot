# 05. 운영 로직 및 비즈니스 정책 (Business Rules / Validation / ERD)

## 1. 핵심 비즈니스 규칙

### 1.1 점진적 강화 모듈형 아키텍처
- 각 기능은 **독립 동작**, Core 기능과 연결 시 **자동 강화**
- 플러그인 슬롯 시스템:
  - `connected`: 직접 호출
  - `fallback`: 자체 LLM
  - `disabled`: 비활성
- 도메인 어댑터로 중등/자격증/기업교육 등 확장 시 코드 변경 0줄

### 1.2 콘텐츠 1st 의존
- 모든 학습 콘텐츠는 3-Depth 교육과정 분류와 연결
- 분류 없는 콘텐츠는 게시 불가

### 1.3 비용 효율 60/30 룰
- 전체 AI 요청의 60% 이상이 T1+T2(저비용)로 처리
- 사용자당 월 AI 비용 ≤ 구독료의 30%

---

## 2. ClassBot Scope Guard (5단계)

학생 메시지가 들어올 때 봇이 **얼마나 답할지** 통제하는 핵심 룰.

| Level | 명칭 | 허용 | 차단 | 시나리오 |
|-------|------|------|------|---------|
| **L1** | 블록 | metadata만 | 모든 응답 | 중간/기말 시험 중 |
| **L2** | 경고 | 질문 수신 | 정답·풀이·힌트 | 쪽지시험 |
| **L3** | 개념 | 개념·정의·예시 | 풀이 절차 | 일반 수업 중 |
| **L4** | 단계 | 풀이 방향 제시 | 최종 답 | 숙제 지원 |
| **L5** | 답 | 모든 응답 허용 | — | 복습·오답 정복 |

### 적용 위치
- **클래스봇**: 교사가 시간대별로 L1~L5 스케줄 설정
- **풀림 무한풀기 솔브**: 학생 기본 L3, 시험 모드 L1
- **풀림 복습**: L5 (답·해설 전체 노출)

### 룰 강제
- T1 임베딩으로 학생 메시지 의도 분류 → 현재 Scope에 부합하지 않으면 차단
- 차단 시 "이 시간엔 ○○만 도와줄 수 있어요" 메시지

---

## 3. 이탈 감지 시스템 (ClassBot)

| 유형 | 감지 방법 | 대응 | 알림 |
|------|---------|------|------|
| 주제이탈 | T1 임베딩 유사도 < 0.6 | 자동 리다이렉트 | 누적 3회 시 |
| 답베끼기 | T1 패턴("답 알려줘") + T2 의도분류 | 사고유도 강제전환 | 즉시 |
| 부적절질문 | T1 유해키워드 + T2 맥락분류 | 즉시 차단 | 즉시 |
| 장시간무활동 | T1 타이머 (기본 5분) | 넛지 메시지 | 10분 초과 시 |
| 반복우회시도 | T1 동일의도 3회+ | 세션 일시정지 | 즉시 |
| 무의미입력 | T1 길이/엔트로피 + T2 보조 | 경고 메시지 | 3회 누적 시 |

### 대응 강도 (교사 설정)
- 관대 / 보통 / 엄격 — 감지 임계치·차단 강도 조정

---

## 4. Planner CSP 제약조건

플래너가 시간 블록을 자동 배치할 때 만족해야 하는 8개 제약:

```
C1: 어려운 과목(θ 낮음) → 집중력 높은 시간대 배치
C2: 같은 과목 연속 최대 90분 (인지 부하 상한)
C3: 과목 전환 시 5분 전환 블록(휴식) 삽입
C4: 하루 시작 = 복습 / 마무리 = 정리
C5: 주 1회 이상 모의고사 (시험 2주 전부터)
C6: 취약 과목 시간 비율 가중 배분 (거리 비례)
C7: 하루 총 학습 시간 ≤ 사용자 가용시간
C8: 취약보강 블록 → 해당 과목 문제풀이 블록 직후 배치
```

### 7대 교육학 엔진 (블록 단위 자동 적용)
1. **Spaced Repetition** (망각곡선): 어제 오답 → 오늘·3일·7일·30일
2. **Interleaving** (섞기): 수학·영어·국어 40분 간격 교차
3. **Cognitive Load** (인지부하): 개념 40분 → 10분 쉬고 문제
4. **Pomodoro** (분할): 25분 집중 + 5분 회복
5. **Active Recall** (시험효과): 읽기 대신 말·쓰기 우선
6. **Deliberate Practice** (약점훈련): θ 낮은 유형에 시간 가중
7. **Zeigarnik** (미완성기억): 의도적 중단으로 동기 유지

---

## 5. 적응형 리밸런서 (Planner)

매일 23:59 자동 실행. 다음 신호로 다음날 일정 재조정:

| 신호 | 임계 | 대응 |
|------|------|------|
| 실행률 낮음 | <70% | 미완료 블록 이월 + 잔여 일정 압축 |
| 정답률 급상승 | +15% | 해당 과목 시간 축소, 약한 과목으로 재배분 |
| 정답률 급하락 | -15% | 난이도 하향 + 개념학습 블록 추가 |
| 시험 임박 | D-day ≤ 7 | 모의고사 빈도 증가 + 취약 집중 |
| 시험 매우 임박 | D-day ≤ 3 | 총정리 모드 (취약 단원만) |
| 컨디션 트리거 | 학생 수동 | 당일 블록 난이도 ±20% |

---

## 6. Leitner 5-Box (Q 복습)

| BOX | 다음 복습 | 진급 조건 |
|-----|---------|---------|
| 1 | 1일 후 | 정답 1회 |
| 2 | 3일 후 | 정답 1회 |
| 3 | 7일 후 | 정답 1회 |
| 4 | 14일 후 | 정답 1회 |
| 5 | 30일 후 | 정답 3회 연속 → "마스터" |

### 강등 룰
오답 시 BOX 1로 즉시 강등 (단, BOX 5에서 오답 시 BOX 3로 — 너무 가혹하지 않게).

---

## 7. RBAC (역할별 권한 매트릭스)

### 7.1 4 역할 정의

| 역할 | 코드 | 설명 |
|------|------|------|
| 관리자 | owner | 기관 소유자 (원장, 교감) |
| 운영자 | manager | 교사, 강사, 과외선생 |
| 보조자 | assistant | 보조교사, 학부모 |
| 학습자 | learner | 학생 |

### 7.2 도메인별 행위 매트릭스

#### ClassBot
| 행위 | Owner | Manager | Assistant | Learner |
|------|------|--------|---------|--------|
| 봇 생성·설정 | ✓ | ✓ | ✗ | ✗ |
| 학생 관리 | ✓ | ✓ | 조회만 | ✗ |
| 리포트 열람 | 전체 | 자기 봇 | 조회 | 자신만 |
| 봇 상호작용 | ✗ | 테스트 | ✗ | ✓ |
| 라이브 모니터링 | ✓ | ✓ | 조회 | ✗ |

#### Planner
| 행위 | Owner | Manager | Assistant | Learner |
|------|------|--------|---------|--------|
| 자기 플래너 생성·수정 | ✓ | ✓ | ✗ | ✓ |
| 관리 학생 플래너 | ✓ | ✓ | 수정 요청(48h 자동승인) | ✗ |
| 리포트 열람 | 전체 | 관리 학생 | 관리 학생 | 자신만 |

#### Q (무한풀기)
| 행위 | Owner | Manager | Assistant | Learner |
|------|------|--------|---------|--------|
| 풀이·오답 | ✗ | ✗ | ✗ | ✓ (자신만) |
| 스코프 선택 | ✗ | ✗ | ✗ | L1~L5 직접 |
| 자기 만든 문항 분석 | ✓ | ✓ (자신 것) | ✗ | ✗ |
| 자녀 θ 추세·에러패턴 | ✗ | ✗ | ✓ (자녀 승인 필요) | ✗ |

---

## 8. ERD / 데이터 모델

### 8.1 핵심 엔티티 그룹

```
┌─ User 레이어
│  ├─ Student (id, θ_profile, emotion_history)
│  ├─ Teacher (id, role, created_bots)
│  ├─ Parent (id, child_list, permissions)
│  └─ Creator (Teacher의 일부, studio_profile)
│
├─ Learning 레이어
│  ├─ Planner (1) ── (N) Block (type, difficulty, engine, status)
│  │            └─ (N) BlockEvent (start·pause·resume·end·interruption)
│  ├─ Attempt (Student, Problem, answer, correct, θ_before/after)
│  ├─ LeitnerCard (Student, Problem, box:1-5, next_review_at, streak)
│  └─ MockSession (Exam, Student, score, omr_json, proctor_events)
│
├─ Content 레이어
│  ├─ Problem (SKU, subject, unit, θ, metadata)
│  │        └─ ExplainContent (12-섹션 블롭)
│  ├─ LibraryMedia (kind:image|short|audio|card, owner, status)
│  ├─ VLM (StudioVisual, type:simulation|graph|animation)
│  └─ Asset (교안·이미지·음성, embedded in ClassBot/Block)
│
├─ Classroom 레이어
│  ├─ ClassBot (Teacher, subject, ScopeProfile, name)
│  │          ├─ (N) Lesson (date, duration)
│  │          │        └─ (N) LessonEvent (type:quiz_answer|bot_question|emotion|...)
│  │          └─ (1) Replay (video|audio|transcript timeline)
│  ├─ Classroom (Organization, Teacher, Enrollment[Student])
│  └─ Assignment (ClassBot 또는 Planner 발행)
│
├─ Feedback 레이어
│  ├─ WellbeingIndex (Student, date, score: 0-100)
│  ├─ EmotionCheckIn (Student, timestamp, emoji: 😊😐😔😤🥱)
│  ├─ Submission (Student, Assignment, answer, GradingDraft → FinalGrade)
│  └─ GradingDraft (AI initial, rubric_score, teacher_correction)
│
├─ Analytics 레이어
│  ├─ ThetaSnapshot (Student, subject, unit, date, θ_value)
│  ├─ ErrorPatternOccurrence (Student, Attempt, pattern_code, confidence)
│  ├─ ForgettingCurve (Student, personalized_params)
│  └─ Report (Student, type:daily|weekly|monthly, kpi[])
│
└─ Commerce 레이어 (Future)
   ├─ Store Product (ContentPack, price, creator_share)
   ├─ Purchase (Student, Product, date, license_type)
   ├─ Subscription (Student, type:monthly|annual, active_until)
   └─ StoreSnapshot (Product, timestamp, immutable copy)
```

### 8.2 주요 관계

```
Organization (1) ── (N) Classroom (1) ── (N) Enrollment (N) ── (1) Student
Organization (1) ── (N) Teacher
Teacher (1) ── (N) ClassBot
ClassBot (1) ── (N) Lesson (1) ── (N) LessonEvent
Lesson (1) ── (1) Replay (1) ── (N) Segment
ClassBot (1) ── (N) Asset
ClassBot (1) ── (1) ScopeProfile
Student (1) ── (N) Submission (1) ── (N) GradingDraft (1) ── (1) FinalGrade
Student (1) ── (N) EmotionCheckIn
Student (1) ── (N) WellbeingIndex (일별)
Parent (N) ── (N) Student
Student (1) ── (N) Attempt (N) ── (1) Problem
Attempt (1) ── (1) ThetaSnapshot
Attempt (1) ── (N) ErrorPatternOccurrence
```

### 8.3 인덱스 전략 (권장)
- `Attempt` — `(student_id, timestamp DESC)` — 최근 풀이 조회
- `LeitnerCard` — `(student_id, next_review_at ASC)` — 오늘 due 카드
- `Problem` — `(unit, difficulty)` — 적응형 출제
- `LessonEvent` — `(lesson_id, timestamp)` — 라이브 피드
- `ThetaSnapshot` — `(student_id, subject, date DESC)` — 추세 차트

---

## 9. AI 호출 지점 ↔ Tier 매핑

### 9.1 ClassBot
| 기능 | T1 | T2 | T3 | 비용/요청 |
|------|----|----|-------|---------|
| Scope Guard 범위 체크 | ✓ | — | — | ₩0 |
| 이탈 감지 | ✓ | — | — | ₩0 |
| 의도 분류 | ✓ | — | — | ₩0 |
| 단순 Q&A | — | ✓ | — | ₩5~15 |
| 풀이 코칭 | — | ✓ | — | ₩15~30 |
| 문제 생성 | — | — | ✓ | ₩50~200 |
| 패턴 분석 | — | — | ✓ | ₩100~300 |
| 수업 종료 리포트 | — | ✓ (Batch) | — | ₩10~20 |
| 주간 개인 리포트 | — | — | ✓ (Batch) | ₩50~100 |
| 번아웃 조기경보 | ✓ | ✓ | — | ₩5~10 |

### 9.2 Planner
| 기능 | Tier | 시점 |
|------|------|------|
| 진단 (미니 10문) | T2 | 플래너 생성 시 |
| 스케줄 생성 (CSP) | T2 | 입력 완료 후 |
| 제약 검증 | T1 | 매 생성 시 |
| 알림 메시지 | T2 | 리밸런서 실행 시 |
| 콘텐츠 fallback | T2 | 슬롯 미연결 블록 |
| 정보 리포트 | T3 (Batch) | 야간 배치 |

### 9.3 Q (무한풀기)
| 기능 | Tier | 호출 조건 |
|------|------|---------|
| 풀림 해설 12-섹션 | T2~T3 | 문제 풀이 후 |
| 4-Path Solution Spine | T3 | 해설 열람 시 |
| Error Anatomy | T2 | 학생 풀이 분석 |
| AI 코치 힌트 (5단계) | T2 | 힌트 요청 |
| Feynman Challenge STT | T2 | 마이크 녹음 제출 |
| 패턴 분석·태깅 | T3 | 오답 모음 후 배치 |
| 학생 데이터 → Studio 환류 | T3 (Batch) | 야간 배치 |

---

## 10. Validation Rules (입력값 제약)

### 10.1 클래스봇 빌더
| 항목 | 제약 |
|------|------|
| 봇 이름 | 1~30자 |
| 과목 | 사전 정의 enum |
| 학년 | 고1~고3, 재수생 — ⚠️ 빌더 UI 는 초5~고1 을 노출한다. 어느 쪽이 맞는지는 제품 타깃 정의(`02-product-definition.md` 타깃 사용자 · `06-content-data.md` `Grade` 타입)와 함께 정해야 하는 **별도 합의 대상**이다 |
| 교안 업로드 | PDF/이미지, 50MB 이하 |
| Scope 시간대 | 24시간 cron 패턴 유효성 |
| 루브릭 | 항목 합 = 100% (Step6 강제 검증) |

> **이 표는 지금 `dev` 에서 확인할 수 있는 제약만 둔다.** 봇 빌더 재편(`03 § 4.3`)이 바꾸는 규칙 —— 이름을 비워도 됨 · 과목이 유일한 필수 항목 · 빌더에서 루브릭과 시간대 스위치가 빠짐 —— 은 **구현이 들어올 때 이 표를 함께 고친다.** 검증 규칙 자리에 아직 확인할 수 없는 규칙을 미리 박으면 읽는 사람이 확정된 제약으로 오해한다. 설계는 `03 § 4.3` 이 갖는다.

### 10.2 플래너 빌더
| 항목 | 제약 |
|------|------|
| D-day | 미래 날짜만 |
| 과목 가중치 | 합 = 100% (Step3 강제 검증) |
| 가용 시간 | 요일별 ≥ 0분, ≤ 24시간 |
| 동기 스타일 | 사전 정의 enum (스파르타·친구톤·정석) |

### 10.3 Q 풀이
| 항목 | 제약 |
|------|------|
| 답안 입력 | 객관식 1~5, 주관식 텍스트 ≤ 1000자 |
| 풀이 노트 | KaTeX 수식 지원, 이미지 ≤ 10MB |
| Feynman 녹음 | 30초~3분, 음성 파일 ≤ 50MB |

---

## 11. 인증 / 보안 (Auth / ACL)

### 11.1 세션
- Next.js 15+ App Router 기반
- **JWT access/refresh 세션** — 자체 구현(이메일/비밀번호). auth PR #88/#89(2026-06-02)로 인도. 서명 매 요청 검증, refresh 회전 + 로그아웃 블랙리스트(Postgres `auth_revoked_tokens`). 상세: [`2026-05-18_be-api-design.md` §6.1](2026-05-18_be-api-design.md). 공개 가입은 서버 할당 role(student/teacher)만 — admin 부여 불가.
- **개발 전용 신원 폴백(2026-09-03)** — JWT 발급처(NestJS)가 로컬에 없어 `JWT_SECRET` 도 없는 동안,
  `/api/*` 를 실제 DB 로 확인할 수 없었다. 그래서 `pullim_dev_identity` 쿠키를 **JWT 검증이 실패한
  뒤에만** 폴백으로 읽는다. **인증이 아니다** — 서버가 이 쿠키에 주는 것은 `isAuthenticated` 가
  아니라 `isIdentified`(그 사용자 **명의로** 처리해도 되는가)이고, 라우트 가드가 보는 값이 그쪽이다.
  경계 셋: ① prod 호스트(`classbot.pullim.ai`)에서는 **읽지 않는다** ② allowlist 밖 id 는 무시
  ③ 유효한 JWT 가 있으면 JWT 가 이긴다. 정식 오픈 전 제거하며, 절차는 `lib/dev-identity.ts`
  머리주석에 있다.

### 11.2 라우트 보호
- `(student)/*` — Learner 권한 필수
- `(teacher)/*` — Manager/Owner 권한 필수
- `/parent/*` — 자녀 매칭(`parent_child_links`) 검증 + **자녀 동의**(§ 11.4). 2026-09-04 구현,
  단 실제 로그인 학부모는 아직 진입 불가([03 § 2.3](03-features-and-ia.md))

### 11.3 데이터 접근
- Student는 자신 데이터만 read/write
- Teacher는 자신이 만든 자원만 write, 학생 데이터는 read (집계)
- Parent는 자녀 매핑 + 자녀 승인 후 read만

### 11.4 학부모 열람 동의 (`consent_logs`) — 2026-09-04

학부모의 개인 열람은 **「승인 후」** 다([04 UC-T1 7단계](04-ux-flow.md) · [13 § 4.6](13-reports-and-emotion-checkin.md)).
승인 주체는 **무엇을 보느냐로 갈린다**:

| 축 (`consent_logs.type`) | 무엇이 나가나 | 승인 주체 |
|---|---|---|
| `weekly_report` · `monthly_report` | 주간·월간 리포트 | 교사·기관 (리포트 승인 워크플로 — [13 § 5.3·5.4](13-reports-and-emotion-checkin.md)) |
| `weak_nodes` | 약점 단원 | 교사·기관 |
| `emotion_share` | 감정 평균 (민감) | 교사·기관 · **다른 동의에 딸려 나가지 않는다** |
| `realtime_alert` | 학습 시작·완료 알림 | 교사·기관 |
| `self_study_summary` | 스스로 담은 봇 · 공부한 날 · 연속일수 | **학생 본인** — 자기주도에는 승인할 교사가 구조적으로 없다 |
| `class_assignment_summary` | 참여한 반 · 받은 과제 현황 (답안·점수 제외) | **학생 본인** |

**규칙 넷** (구현: `app/api/parent/*` · `app/api/me/consents/*`):

1. **동의는 조회 조건 안에 있다** — 읽고 나서 거르지 않는다. 미동의 자녀의 데이터는 **애초에
   읽지 않는다**(읽어 놓고 안 보내는 것과 다르다 — 로그·에러·타이밍 어디로도 새지 않는다).
2. **부모는 「미동의」와 「활동 없음」을 구별할 수 없다.** 구별되면 그 차이 자체가 정보가 되어
   동의 없이 아이의 활동 유무를 추론할 수 있다. 화면 문구도 어느 쪽인지 말하지 않는다.
   단 **자녀 목록(이름·관계) 자체는 가리지 않는다** — 링크가 이미 말하는 사실이고, 가리면
   「이어진 자녀가 없다」와 구분이 사라진다.
3. **철회는 행 삭제도 `expires_at = now()` 도 아니다** — `revoked_at` 이 따로 있다(감사 기록).
   살아 있는 동의 = `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`.
   **철회해도 이미 본 것은 되돌릴 수 없다** — 학생 화면이 그 사실을 그대로 말한다.
4. **열람 기록은 없다** — 부모가 언제 봤는지 학생에게 알려주지 않고, 그 테이블을 만들지도 않는다.
   학생이 「보면 알겠지」로 기대하기 쉬운 자리라 화면에 명시한다.

### 11.4 API 호출 비용 통제
- 사용자별 일/월 호출 한도 (T1 무제한, T2 1000회/일, T3 100회/일 — 권장)
- 한도 초과 시 graceful degradation (T3 → T2 fallback 또는 다음날 대기)

---

**기준 문서**: `input/docs-archive/05_~09_*.md` 핸드오프 문서 + `input/docs-archive/00_풀림_기능기획_Skill.md`.
