# 교사 개입 루프 (Teacher Intervention Loop) 설계

> **상태**: 사용자 승인(2026-07-02). mock-first, FE-only.
> **문제**: 발사→제출→진행률까지는 있지만 그 다음 교사 액션이 비어 있다 — 발사 후 교사가 할 일이 없음.
> **권위 맥락**: 07 핸드오프(교사-학생 루프), 05 수업방(위기학생 개입 흐름).

## 1. 범위 (사용자 확정)

| 액션 | 설명 |
|---|---|
| **remind** | 미제출 학생에게 리마인드 — 진행률 테이블에서 한 번에 발송 |
| **comment** | 제출 결과에 교사 한줄 코멘트(칭찬·격려) — 학생 결과 페이지에 표시 |
| **requiz** | 오답률 높은 문항만 골라 복습 과제로 재발사 — 기존 발사 파이프라인 재사용 |
| **crisis** | 기존 위기학생 모달에서 응원 메시지 발송 |

**수신 표면**: 헤더 벨(현재 `준비 중` 비활성)을 실제 **알림 인박스**로 활성화 — 4종 개입이 한 곳에 쌓이고 미읽음 배지 카운트. ⚠️ 공유 셸(`app-header`) 터치 — 사용자 선택으로 승인됨, diff 최소 유지.

## 2. 아키텍처 — 단일 개입 스토어 (접근 A, 사용자 확정)

교사 표면 4곳이 이벤트를 **쓰고**, 학생 인박스·배지·결과 코멘트 카드는 전부 같은 스토어를 **읽는** 단방향 흐름. 기존 문법(zustand persist + 파생 셀렉터 + hydration 게이트 + per-user 필터)을 그대로 따른다.

```
교사: [리마인드]/[코멘트]/[재발사]/[응원] ──send()──▶ pullim-interventions (persist)
                                                        │
학생: 벨 배지(unread) ◀── useUnreadCount ───────────────┤
      인박스 목록     ◀── useMyInterventions ───────────┤
      결과 "선생님 한마디" ◀── useAssignmentComment ─────┘
```

## 3. 도메인 모델

```ts
export type InterventionType = 'remind' | 'requiz' | 'comment' | 'crisis';

export interface InterventionEvent {
  id: string;                 // iv_<epoch>_<seq>
  type: InterventionType;
  botId: string;              // 클래스(봇) 스코프 — enrollment 스코프와 동일 문법
  studentId: string;          // 수신 학생
  assignmentId?: string;      // remind/comment 는 대상 과제, requiz 는 새로 발사된 과제 id
  message?: string;           // comment·crisis 문구. remind 는 기본 문구 사용
  createdAt: string;          // ISO
  readAt: string | null;
}
```

**스토어** `useInterventionStore` — persist key `pullim-interventions`, state `{ events: InterventionEvent[] }`:
- `send(input: Omit<InterventionEvent,'id'|'createdAt'|'readAt'>)` — 다건은 반복 호출(리마인드는 학생별 1건)
- `markRead(id)` / `markAllRead(studentId)`

**셀렉터** (hydration 게이트는 소비 컴포넌트에서 `useStoresHydrated`):
- `useMyInterventions(studentId): InterventionEvent[]` — 최신순
- `useUnreadCount(studentId): number`
- `useAssignmentComment(assignmentId, studentId): InterventionEvent | null` — comment 최신 1건

## 4. 교사 쓰기 표면

| 액션 | 위치 | 동작 |
|---|---|---|
| remind | 진행률 테이블 과제 행 | [미제출 N명 리마인드] — 미제출자 = roster(botId) − 제출자(submissions). 학생별 remind 이벤트. 발송 후 버튼은 "리마인드 보냄"으로 비활성(같은 과제 중복 발송 방지 — 이벤트 존재로 파생) |
| comment | 과제 행 → **제출 현황 시트**(PR-2 신규) | 제출 학생 행 [코멘트] 입력 → comment 이벤트 |
| requiz | 제출 현황 시트 하단 (PR-2) | 문항별 오답률(submissions 답안 파생) → [오답 문항 재발사] = 기존 발사 파이프라인으로 "복습: {제목}" 과제 생성 + 대상 학생들에게 requiz 이벤트 |
| crisis | 기존 위기학생 모달 (PR-3) | [응원 메시지 보내기] — 문구 입력 → crisis 이벤트 |

## 5. 학생 읽기 표면

- **헤더 벨(인박스)**: 미읽음 수 배지(숫자+색 — 색 단독 신호 금지) + 드롭다운 목록. 항목 = 타입 아이콘 + 문구 + 상대시각 + 딥링크(remind→`/classbot/assignment/{id}`, comment→`…/result`, requiz→새 과제, crisis→`/classbot/chat`). 클릭 시 `markRead`. 비어 있으면 "새 알림이 없어요". 미인증 데모 = `student_001` 수신(기존 데모 폴백 문법).
- **결과 페이지**: `useAssignmentComment` 있으면 "선생님 한마디" 카드(blue 톤).

## 6. 계약·품질 (classbot 불변 규칙)

- 팔레트: blue/slate 토큰만(+위기·마감 danger). 새 gradient/opacity-blend 금지, raw hex 금지(design gate).
- 44px 터치, `focus-visible:ring-2 ring-pullim-blue-400`, 배지 aria-label("읽지 않은 알림 N개").
- hydration-safe: 벨 배지·인박스·리마인드 버튼 상태는 스토어 hydration 후에만 렌더.
- i18n/Sentry/외부 DS 금지, 한글 하드코딩 OK.
- prod-verify 39 spec 무파손 — 특히 `progress-as_user_*`·헤더 셀렉터 유지.

## 7. PR 분할 (Codex 수렴 — 작게 3개, 모두 base dev)

1. **PR-1**: 스토어(+단위 테스트) + 벨 인박스 활성화 + 결과 코멘트 카드 + 진행률 리마인드 버튼 — remind 루프 1개가 끝까지 동작.
2. **PR-2**: 제출 현황 시트 + comment 작성 + requiz 재발사.
3. **PR-3**: 위기 모달 crisis 후속 액션.

## 8. 테스트 전략

- 스토어: send/markRead/셀렉터 단위 테스트(`lib/store/__tests__`).
- RTL: 인박스(빈/목록/읽음), 결과 코멘트 카드, 리마인드 버튼(발송→비활성).
- e2e(검토): 리마인드 루프 1개 — 교사 발사→학생 미제출→리마인드→학생 벨 배지 확인.

## 범위 외 (후속)

실 BE 영속(Phase β), 푸시/이메일 알림, 교사별 발신자 identity 구분, 알림 보관/페이지네이션.
