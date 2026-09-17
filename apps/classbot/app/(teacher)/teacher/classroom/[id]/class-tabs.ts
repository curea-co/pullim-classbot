import { ClipboardList, MessageSquare, type LucideIcon } from 'lucide-react';

/**
 * 반 상세 탭 등록부 — 서버(`page.tsx` 가 `?tab=` 을 읽는다)와 클라이언트(`class-detail.tsx` 가 그린다)가 같은 목록을 본다.
 * 그래서 `'use client'` 가 없다 — 클라이언트 모듈의 함수는 서버 컴포넌트가 부를 수 없다.
 *
 * 탭 넷(명단 · 봇 · 과제 · 대화 — 완성 설계 § 6.2) 중 여기 있는 것이 지금 화면에 있는 전부다. **없는 탭을 「준비 중」으로
 * 세우지 않는다.** 명단·봇은 계획 PR 5b 가 줄을 더한다 — 줄 하나가 등록이다.
 *
 * 탭은 **URL 이 정한다**(`?tab=`). 로컬 `Tabs` 프리미티브(상태 기반) 대신 링크로 두는 이유는 관제소가 「이 반 대화 탭,
 * 이 학생」으로 곧장 보내야 해서다(`/teacher/classroom/[id]?tab=chat&student=`). 첫 탭은 `?tab=` 없이 연다.
 */
export const CLASS_TABS = [
  { id: 'assignments', label: '과제', icon: ClipboardList },
  { id: 'chat', label: '대화', icon: MessageSquare },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

export type ClassTabId = (typeof CLASS_TABS)[number]['id'];

export const DEFAULT_CLASS_TAB: ClassTabId = 'assignments';

export function isClassTabId(value: string | undefined): value is ClassTabId {
  return CLASS_TABS.some((t) => t.id === value);
}

/**
 * 탭으로 가는 주소 — 첫 탭은 `?tab=` 을 붙이지 않는다(카드의 「자세히」가 그 주소다).
 * @param classId - 반 id
 * @param tab - 탭 id
 * @param studentId - 대화 탭에서 미리 고를 학생(관제소가 실어 보낸다)
 */
export function classTabHref(classId: string, tab: ClassTabId, studentId?: string | null): string {
  const base = `/teacher/classroom/${encodeURIComponent(classId)}`;
  if (tab === DEFAULT_CLASS_TAB) return base;
  const params = new URLSearchParams({ tab });
  if (studentId) params.set('student', studentId);
  return `${base}?${params.toString()}`;
}
