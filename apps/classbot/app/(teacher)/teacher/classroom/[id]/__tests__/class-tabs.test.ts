/**
 * 반 상세 탭 등록부(`../class-tabs.ts`) — 서버(`page.tsx` 의 `?tab=`)와 클라이언트가 같은 목록·같은 주소 규칙을 본다.
 * 못박는 것: 탭 넷과 순서 · 모르는 `?tab=` 은 첫 탭 · 첫 탭 주소에는 `?tab=` 이 없고 나머지는 붙는 것 · 관제소가 싣는 `?student=`.
 */
import { CLASS_TABS, DEFAULT_CLASS_TAB, classTabHref, isClassTabId } from '../class-tabs';

it('탭은 명단 · 봇 · 과제 · 대화 순이고 첫 탭은 명단이다', () => {
  expect(CLASS_TABS.map((t) => t.id)).toEqual(['members', 'bot', 'assignments', 'chat']);
  expect(CLASS_TABS.map((t) => t.label)).toEqual(['명단', '봇', '과제', '대화']);
  expect(DEFAULT_CLASS_TAB).toBe('members');
});

it('아는 탭만 탭이다 — 모르는 값·빈 값은 아니다', () => {
  expect(isClassTabId('bot')).toBe(true);
  expect(isClassTabId('assignments')).toBe(true);
  expect(isClassTabId('chat')).toBe(true);
  expect(isClassTabId('signals')).toBe(false);
  expect(isClassTabId('')).toBe(false);
  expect(isClassTabId(undefined)).toBe(false);
});

it('첫 탭 주소에는 ?tab= 이 없고, 나머지는 붙는다 — 반 id 는 인코딩한다', () => {
  expect(classTabHref('cls_1', 'members')).toBe('/teacher/classroom/cls_1');
  expect(classTabHref('cls_1', 'bot')).toBe('/teacher/classroom/cls_1?tab=bot');
  expect(classTabHref('cls_1', 'assignments')).toBe('/teacher/classroom/cls_1?tab=assignments');
  expect(classTabHref('cls_1', 'chat')).toBe('/teacher/classroom/cls_1?tab=chat');
  expect(classTabHref('a b', 'bot')).toBe('/teacher/classroom/a%20b?tab=bot');
});

it('학생 id 를 실으면 ?student= 이 뒤에 붙는다(관제소 → 대화 탭) — 첫 탭에는 붙지 않는다', () => {
  expect(classTabHref('cls_1', 'chat', 'stu_1')).toBe('/teacher/classroom/cls_1?tab=chat&student=stu_1');
  expect(classTabHref('cls_1', 'members', 'stu_1')).toBe('/teacher/classroom/cls_1');
});
