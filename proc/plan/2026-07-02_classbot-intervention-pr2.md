# 교사 개입 루프 PR-2 계획 — 제출 현황 시트 + 코멘트 작성 + 오답 재발사

> spec: `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §4 (comment·requiz 쓰기 표면). PR-1(#184) 후속. TDD.

**Interfaces (근거):**
- `dispatch(a: UserAssignment)` + `nextAssignmentId()` — `lib/store/assignments.ts` (발사 폼 `buildAssignment` 패턴 준용)
- 문항: `getQuestionsForAssignment(assignment)` — 새 과제는 mode 별 시드 fallback. 오답 판정은 `computeMockScore` 규약(mc: `answers[q.id] !== String(q.answerIndex)`, short/essay: 3자 미만)
- 제출/대상: `Submission{assignmentId, studentId, answers, scorePercent}`, eligible = `targetStudentIds`(빈=전체 roster) — PR-1 리마인드와 동일 스코프
- 개입 이벤트: `useInterventionStore.send` (comment·requiz)

### Task 1: `components/classbot/submission-status-sheet.tsx`
- `SubmissionStatusPanel({ assignment })` (테스트 대상 내용부) + `SubmissionStatusSheet`(트리거 [제출 현황] + Sheet 래퍼, mobile-drawer 의 Sheet 패턴)
- 학생 목록: eligible roster 행 = 이름 + 제출(score% chip)/미제출. 제출자 행 [코멘트] 토글 → textarea + [보내기] → comment 이벤트
- 오답 섹션: 문항별 오답률(제출자 기준) 내림차순, `REQUIZ_WRONG_THRESHOLD(40%)` 이상 문항 존재 시 [오답 문항 N개 재발사] → `복습: {제목}` 과제 dispatch(mode `wrong-conquest`, 대상 = 해당 문항 오답 제출자) + 대상별 requiz 이벤트
- RTL: 제출/미제출 행, 코멘트 발신, 재발사(새 과제 + 이벤트 + 대상 스코프)
### Task 2: `DispatchedRow` 배선 — 리마인드 버튼 옆 [제출 현황] (testid 불변)
### Task 3: 통합 검증 — jest/typecheck/lint/design gates + e2e 무파손 + 브라우저 루프 확인

**Constraints:** PR-1 과 동일(blue/slate·44px·focus-visible·hydration-safe·testid 불변).
