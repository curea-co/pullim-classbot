# 06. 콘텐츠 데이터셋 (Seed Data / Content Samples)

## 1. 개요

이 문서는 풀림 프로젝트의 **초기 시드 데이터**와 **Mock 페르소나**를 정의한다. 실제 운영 데이터가 아니라, 시연·개발·테스트에 사용하는 표준 데이터셋이다.

Mock 데이터 구현 위치: `web/lib/mock/`.

---

## 2. Mock 페르소나

전 페이지에서 일관되게 사용하는 표준 페르소나. 2026-04-27 Audit에서 일관성 통과.

### 2.1 학생 페르소나

| 이름 | 학년 | 특성 | 사용처 |
|------|------|------|------|
| **김수학** | 고2 | 수학 약점, θ 0.30 → 0.42 (모의고사 후) | Q 풀이 메인 데모, 분석 |
| **수학이 형** | 재수 | 시간 관리 핵심, 모의고사 시뮬 | 시험 모드, 모의고사 분석 |
| **서연** | 고2-A반 | 클래스봇 그룹 학생 1 | 클래스봇 라이브 모니터링 |
| **하윤** | 고2-A반 | 클래스봇 그룹 학생 2, 이탈 감지 사례 | 클래스봇 이탈 시나리오 |
| **도현** | 고2-A반 | 클래스봇 그룹 학생 3, 우수 사례 | 클래스봇 우수 학생 사례 |

### 2.2 교사 페르소나

| 이름 | 역할 | 특성 |
|------|------|------|
| **박선생** | 학원 강사 | 클래스봇 6개 운영, 봇 빌더 메인 사용자 |
| **이원장** | 학원 원장 (Owner) | 다중 클래스 통계 |

### 2.3 학부모 페르소나

| 이름 | 자녀 | 특성 |
|------|------|------|
| **김수학 어머니** | 김수학 | 주간 리포트 열람, 자녀 승인 후 |

### 2.4 학급

| 이름 | 구성 | 사용처 |
|------|------|------|
| **고2-A반** | 서연·하윤·도현 외 12명 | 클래스봇 라이브 모니터링 메인 데모 |

---

## 3. CUREA DEEP 3-Depth 교육과정 (시드)

### 3.1 분류 체계 구조

```
대단원 (Subject Level)
└─ 중단원 (Unit Level)
   └─ 소단원 (AchievementStandard Level)
      └─ 성취기준 코드 (예: 수학Ⅰ-삼각함수-사인법칙)
```

### 3.2 시드 데이터 (수학 일부 예시)

```yaml
- subject: 수학Ⅰ
  units:
    - name: 삼각함수
      standards:
        - code: 수학I-삼각함수-사인법칙
          description: 사인법칙을 이해하고 활용한다
        - code: 수학I-삼각함수-코사인법칙
          description: 코사인법칙을 이해하고 활용한다
    - name: 지수와 로그
      standards:
        - code: 수학I-지수로그-지수함수
        - code: 수학I-지수로그-로그함수

- subject: 수학Ⅱ
  units:
    - name: 미분
      standards:
        - code: 수학II-미분-도함수
        - code: 수학II-미분-도함수응용
    - name: 적분
      standards:
        - code: 수학II-적분-부정적분
        - code: 수학II-적분-정적분
```

전체 시드는 `web/lib/mock/curriculum.ts`에 정의.

---

## 4. 문항 시드 (Problem Seed)

### 4.1 표준 문항 메타데이터

```yaml
- id: prob-math-derivative-001
  subject: 수학II
  unit: 미분
  standard: 수학II-미분-도함수응용
  difficulty: 0.45      # IRT b 파라미터
  discrimination: 1.2   # IRT a 파라미터
  guessing: 0.20        # IRT c 파라미터
  type: 객관식
  answer: 3
  metadata:
    source: 2025-6월모평
    출제의도: 도함수의 부호 변화로 함수 증감 판정
    경계조건: 필수
```

### 4.2 ExplainContent 12-섹션 구조

각 문항은 12-섹션 해설 블롭과 1:1 매핑:
- Section 1~12 (`03-features-and-ia.md` 4.5장 참조)
- 시드 데모는 김수학의 오답 2건에 대해 풀-12섹션 작성

---

## 5. 라이브러리 시드 (LibraryMedia)

### 5.1 학생 자료실 (mock)

```yaml
- id: lib-img-001
  kind: image
  title: 사인법칙 3가지 증명
  prompt: 사인법칙을 다이어그램으로 표현
  style: 다이어그램
  ratio: 16:9
  owner: 김수학
  created_at: 2026-04-15

- id: lib-short-002
  kind: short
  title: 조건부확률 핵심 30초
  prompt: 조건부확률 정의·예시 30초 영상
  presenter: 여자_밝은톤
  caption: true
  duration: 30s
  owner: 서연
```

### 5.2 스튜디오 VLM 카탈로그 (mock)

| ID | 이름 | 타입 | 인터랙션 |
|----|------|------|--------|
| vlm-001 | 도함수 부호 변화 | simulation | 슬라이더 a, b → 그래프·부호표 실시간 |
| vlm-002 | 사인법칙 증명 | animation | 단계별 애니메이션 + 일시정지 |
| vlm-003 | math-handwriting-recog | simulation | 손글씨 풀이 입력 → AI 인식 + 피드백 |

전체 카탈로그: `web/lib/mock/visual.ts`.

---

## 6. ClassBot 시드 (mock)

### 6.1 표준 봇

```yaml
- id: bot-math-2nd-A
  name: 수학Ⅰ 도우미 봇
  teacher: 박선생
  subject: 수학Ⅰ
  grade: 고2
  scope_profile:
    default: L3
    schedule:
      - days: [Mon, Wed, Fri]
        time: 19:00-21:00
        scope: L3  # 일반 수업
      - days: [Tue]
        time: 14:00-15:00
        scope: L1  # 쪽지시험
  classroom: 고2-A반
  enrolled_students: [서연, 하윤, 도현, ...]
```

### 6.2 라이브 세션 시드 데모 데이터

```yaml
- lesson_id: lesson-001
  bot: bot-math-2nd-A
  date: 2026-04-29
  duration: 90min
  events:
    - timestamp: 19:05
      student: 서연
      type: bot_question
      content: 사인법칙이 뭐예요?
    - timestamp: 19:08
      student: 하윤
      type: drift_detected
      detail: 주제이탈 (3회 연속) → 자동 리다이렉트
    - timestamp: 19:15
      student: 도현
      type: emotion_checkin
      emoji: 😊
```

---

## 7. Planner 시드 (mock)

### 7.1 표준 플래너

```yaml
- planner_id: planner-001
  student: 김수학
  d_day: 2026-11-13   # 수능 D-day
  subjects:
    - name: 수학
      weight: 0.40
      θ: 0.35
    - name: 영어
      weight: 0.25
      θ: 0.55
    - name: 국어
      weight: 0.25
      θ: 0.50
    - name: 탐구
      weight: 0.10
      θ: 0.45
  available_hours_per_day:
    Mon: 4h
    Tue: 4h
    ...
  motivation_style: 친구톤
```

### 7.2 표준 블록 시드

```yaml
- block_id: b3
  planner: planner-001
  date: 2026-04-30
  start_time: 19:00
  duration: 40min
  type: 문제풀이
  subject: 수학
  unit: 미적분
  standard: 수학II-미분-도함수응용
  difficulty: 0.45
  engine: deliberate-practice
  status: pending
  problems: [prob-math-derivative-001, prob-math-derivative-002, ...]
```

---

## 8. IRT θ 스냅샷 시드

```yaml
- student: 김수학
  snapshots:
    - date: 2026-04-01
      subject: 수학II
      unit: 미분
      θ: 0.30
    - date: 2026-04-15
      subject: 수학II
      unit: 미분
      θ: 0.35
    - date: 2026-04-30
      subject: 수학II
      unit: 미분
      θ: 0.42
```

전체: `web/lib/mock/irt.ts`.

---

## 9. 망각곡선 시드 (mock)

```yaml
- student: 김수학
  cards:
    - card_id: card-001
      problem: prob-math-derivative-001
      box: 1
      created_at: 2026-04-29
      next_review_at: 2026-04-30
      streak: 0
    - card_id: card-002
      problem: prob-math-derivative-002
      box: 2
      next_review_at: 2026-05-02
      streak: 1
```

전체: `web/lib/mock/memory.ts`.

---

## 10. 데이터 분류 체계 / 기본값

### 10.1 enum 정의 (web/lib/mock/types.ts 권장)

```typescript
type Grade = '고1' | '고2' | '고3' | '재수생'
type Subject = '국어' | '수학' | '영어' | '탐구' | '한국사'
type ScopeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
type EngineType = 'spaced-repetition' | 'interleaving' | 'cognitive-load' 
                | 'pomodoro' | 'active-recall' | 'deliberate-practice' | 'zeigarnik'
type BlockType = '개념학습' | '문제풀이' | '복습' | '모의고사' | '취약보강' | '휴식'
type AITier = 'T1' | 'T2' | 'T3'
type Role = 'owner' | 'manager' | 'assistant' | 'learner'
type LeitnerBox = 1 | 2 | 3 | 4 | 5
type EmotionEmoji = '😊' | '😐' | '😔' | '😤' | '🥱'
```

### 10.2 기본값
- **학년**: 고2 (가장 일반적)
- **Scope**: L3 (일반 수업·풀이)
- **블록 길이**: 40분 (Pomodoro 변형, 25분+5분+10분)
- **하루 학습**: 4시간 (학생 평균 가용시간)
- **AI Tier**: T2 (균형)

---

## 11. 시드 데이터 참조 경로

| 영역 | 위치 |
|------|------|
| 페르소나 | `web/lib/mock/persona.ts` |
| 교육과정 (3-Depth) | `web/lib/mock/curriculum.ts` |
| 14 기능 메타 | `web/lib/mock/features.ts` |
| 도메인 메타 | `web/lib/mock/domains.ts` |
| 플래너 | `web/lib/mock/planner.ts` |
| 기억장치 (망각곡선) | `web/lib/mock/memory.ts` |
| IRT θ | `web/lib/mock/irt.ts` |
| 무한풀기 | `web/lib/mock/infinity.ts` |
| 코치 (6 에이전트) | `web/lib/mock/coach.ts` |
| 튜터 (5단계 힌트) | `web/lib/mock/tutor.ts` |
| 오답정복 | `web/lib/mock/conqueror.ts` |
| 풀이분석 | `web/lib/mock/xray.ts` |
| 클래스봇 | `web/lib/mock/classbot.ts` |
| 비주얼 (VLM) | `web/lib/mock/visual.ts` |
| **Phase 1 통합 mock** | `web/lib/mock/phase1.ts` — 진단 세션 메타 + 정복 세트 + 봇 채팅 데이터 |
| 진입점 | `web/lib/mock/index.ts` |

### 시드 갱신 규칙
- **mock 변경은 도메인 락인 안에서**만 (다른 도메인 mock은 read-only)
- `lib/mock/{features,domains}.ts` 변경은 글로벌 작업으로 분리
- 데이터 무결성: 페르소나·페르소나간 관계는 전 페이지에서 일관

---

**기준 문서**: `web/lib/mock/*` 실제 구현 + STATUS.md (Mock 페르소나 일관성 검증 통과 기록).
