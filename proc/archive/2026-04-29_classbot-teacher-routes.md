# 2026-04-29 풀림 클래스봇 교사 운영 6라우트 락 해제

## 목표
풀림 클래스봇 교사 영역의 6개 운영 라우트를 락 해제하고, 8탭 봇 설정·하이브리드 채점·템플릿 마켓을 가동 상태로 전환.

## 작업 항목
- [x] `/teacher/classbot/live` 락 해제 — 라이브 모니터링 (6 KPI 카드 + 학생 패널 + 봇 피드)
- [x] `/teacher/classbot/quiz` 락 해제 — 퀴즈 운영
- [x] `/teacher/classbot/reports` 락 해제 — 6종 리포트 (수업 종료·주간·월간 등)
- [x] `/teacher/classbot/grading` 락 해제 — 하이브리드 채점 (AI 초안 + 교사 수정)
- [x] `/teacher/classbot/templates` 락 해제 — 템플릿 마켓
- [x] `/teacher/classbot/settings` 락 해제 — 8탭 봇 설정
- [x] 다중 봇 동시 운영 검증
- [x] Scope 시간대별 스케줄 검증 (L1~L5 동적 전환)
- [x] 학부모 자동 주간 리포트 흐름 (mock)

## 비고
- B2B 분리 유지: 학생 클래스봇(`/classbot/*`)과 교사 클래스봇(`/teacher/classbot/*`) 라우트·컴포넌트 분리
- 학생 페이지의 콘텐츠 폭은 `max-w-screen-md`, 교사는 `w-full` (와이드)
