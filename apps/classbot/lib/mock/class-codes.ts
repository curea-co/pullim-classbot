import type { StudentEnrollment } from '@/lib/mock/classbot';

/**
 * 참여 코드 → 교사 클래스 매핑 (mock).
 *
 * 화면은 더 이상 이 표로 코드를 풀지 않는다 — 참여는 pullim-api 정본(`POST /classbot/enrollments`,
 * `hooks/api/classroom.ts`) 하나다(2026-09-16 계획 PR 4). 종전의 `resolveClassCode`(스토어 `join` 이 쓰던
 * 해석기)는 호출부가 사라져 함께 걷었다. 남은 쓰임은 로컬 DB 시드(`scripts/seed.ts` — `join_codes` 표의
 * 실전판)와 문서용 코드 목록뿐이다.
 * assignedBy는 대응 봇(classBots)의 teacherName과 일치시킨다.
 */
export const CODE_MAP: Record<string, StudentEnrollment> = {
  'MATH-2024': {
    botId: 'cb_001',
    classroomId: 'cr_math_a',
    classroomLabel: '중2 수학 A반',
    assignedBy: '김보람 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 수학학원',
  },
  'ENG-2024': {
    botId: 'cb_002',
    classroomId: 'cr_eng_a',
    classroomLabel: '중3 영어 읽기반',
    assignedBy: '박서윤 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 영어학원',
  },
  'SCI-2024': {
    botId: 'cb_003',
    classroomId: 'cr_sci_a',
    classroomLabel: '통합과학 심화반',
    assignedBy: '정민호 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 과학학원',
  },
};

/** 데모용 — 인정되는 참여 코드 목록 (안내·문서용). */
export const DEMO_CLASS_CODES = Object.keys(CODE_MAP);
