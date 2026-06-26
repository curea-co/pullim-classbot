import type { StudentEnrollment } from '@/lib/mock/classbot';

/**
 * 참여 코드 → 교사 클래스 매핑 (mock).
 * 실제로는 BE가 코드/링크/QR을 enrollment로 해석한다. 데모에서는 소수의 고정 코드만 인정.
 * assignedBy는 대응 봇(classBots)의 teacherName과 일치시킨다.
 */
const CODE_MAP: Record<string, StudentEnrollment> = {
  'MATH-2024': {
    botId: 'cb_001',
    classroomId: 'cr_math_a',
    classroomLabel: '고2 미적분 A반',
    assignedBy: '김수학 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 수학학원',
  },
  'ENG-2024': {
    botId: 'cb_002',
    classroomId: 'cr_eng_a',
    classroomLabel: '수능 영어 독해반',
    assignedBy: '박영어 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 영어학원',
  },
  'SCI-2024': {
    botId: 'cb_003',
    classroomId: 'cr_sci_a',
    classroomLabel: '통합과학 심화반',
    assignedBy: '정과학 선생님',
    assignedAt: '2026-06-24 09:00',
    via: '대치프리미엄 과학학원',
  },
};

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * 코드를 enrollment로 해석. 알 수 없으면 null.
 * 새 객체를 반환해 store 변경이 원본 map을 오염시키지 않도록 한다.
 */
export function resolveClassCode(code: string): StudentEnrollment | null {
  const hit = CODE_MAP[normalize(code)];
  return hit ? { ...hit } : null;
}

/** 데모용 — 인정되는 참여 코드 목록 (안내·문서용). */
export const DEMO_CLASS_CODES = Object.keys(CODE_MAP);
