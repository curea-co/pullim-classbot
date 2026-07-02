# BE API 설계 — M2 개정 (join_codes · 코드 참여)

> **원본**: `proc/spec/2026-05-18_be-api-design.md` (read-only 권위 — 본 문서가 개정 레이어).
> **근거**: 실출시 로드맵 `proc/plan/2026-07-02_real-launch-roadmap.md` M2 — 학생 코드 참여(mock `class-codes.ts`)의 실전화.

## 1. 엔티티 추가 — `join_codes` (25번째 테이블)

| # | 테이블 | PK | 핵심 컬럼 | 비고 |
|---|---|---|---|---|
| 25 | `join_codes` | `code` text | `bot_id`, `classroom_id`, `teacher_id`(nullable) | 학생 코드 참여 진입점. 마이그레이션 0001 |

**소유권 무결성 — 정확한 보장 범위:**
- `teacher_id` 가 **채워진** 코드에 한해, `(bot_id, teacher_id)`·`(classroom_id, teacher_id)` 복합 FK(부모 `(id, teacher_id)` unique 참조)가 "봇과 반이 같은 교사 소유"를 DB 로 강제한다 — 오소유 조합은 INSERT 불가(로컬 실증).
- `teacher_id = NULL` 행은 복합 FK 를 우회한다(MATCH SIMPLE). NULL 은 **교사 user 삭제 시 ON UPDATE CASCADE 로만 도달하는 ownerless 상태**가 의도이며(부모 SET NULL 정책 정합 — 삭제 비차단), **발급 경로는 항상 non-null** 이어야 한다: `POST /api/bots/{id}/join-codes` 가 요청 교사의 소유권을 검증하고 `teacher_id` 를 필수 기록한다. 직접 DB 접근 외에는 NULL 신규 발급 경로가 없다.

## 2. 엔드포인트 추가 (§4.2 확장)

| Method · Path | 의미 | Phase |
|---|---|---|
| `POST /api/enrollments` | **학생 코드 참여** — body `{code}` → join_codes 해석 → enrollment 생성 (mock `resolveClassCode` 의 실전판) | 🟢 M2 |
| `POST /api/bots/{id}/join-codes` | 참여 코드 발급 — 요청 교사 == 봇·반 소유 교사 검증, `teacher_id` 필수 기록 | 🟡 M2 |

기존 `POST /api/classrooms/{id}/enrollments`(교사 직접 배정)는 그대로 유효 — 코드 참여는 학생 셀프 진입점으로 병존한다.
