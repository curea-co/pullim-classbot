/**
 * 교사 개입(intervention) 스토어 — spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §3.
 *
 * 교사 표면(리마인드·코멘트·재발사·위기 응원)이 이벤트를 **쓰고**, 학생 벨 인박스·배지·
 * 결과 "선생님 한마디"는 전부 이 스토어를 **읽는** 단방향 흐름. localStorage persist —
 * 기존 스토어 문법(assignments·class-enrollment)과 동일. 소비 컴포넌트는 `useStoresHydrated` 게이트.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCurrentUser, resolveRosterMe } from '@/lib/current-user';

export type InterventionType = 'remind' | 'requiz' | 'comment' | 'crisis';

export interface InterventionEvent {
  id: string;
  type: InterventionType;
  /** 클래스(봇) 스코프 — enrollment 스코프와 동일 문법 */
  botId: string;
  /** 수신 학생 (roster id — 제출/결과와 동일 조인 키) */
  studentId: string;
  /** remind/comment 는 대상 과제, requiz 는 새로 발사된 과제 id */
  assignmentId?: string;
  /** 인박스에 그대로 표시할 문구 — 발신 시점에 완성해 저장(조인 불필요) */
  message?: string;
  createdAt: string;
  readAt: string | null;
}

export type InterventionInput = Omit<InterventionEvent, 'id' | 'createdAt' | 'readAt'>;

interface InterventionStore {
  events: InterventionEvent[];
  /** 이벤트 1건 발신 — 다건(리마인드 등)은 학생별로 반복 호출 */
  send: (input: InterventionInput) => void;
  markRead: (id: string) => void;
  markAllRead: (studentId: string) => void;
}

let seq = 0;

export const useInterventionStore = create<InterventionStore>()(
  persist(
    (set) => ({
      events: [],
      send: (input) =>
        set((s) => ({
          events: [
            ...s.events,
            {
              ...input,
              id: `iv_${Date.now()}_${seq++}`,
              createdAt: new Date().toISOString(),
              readAt: null,
            },
          ],
        })),
      markRead: (id) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === id && e.readAt === null ? { ...e, readAt: new Date().toISOString() } : e,
          ),
        })),
      markAllRead: (studentId) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.studentId === studentId && e.readAt === null
              ? { ...e, readAt: new Date().toISOString() }
              : e,
          ),
        })),
    }),
    { name: 'pullim-interventions' },
  ),
);

/** 내 개입 이벤트 — 최신순 (reactive). */
export function useMyInterventions(studentId: string): InterventionEvent[] {
  const events = useInterventionStore((s) => s.events);
  return events.filter((e) => e.studentId === studentId).slice().reverse();
}

/** 미읽음 수 — 벨 배지용 (reactive). */
export function useUnreadCount(studentId: string): number {
  return useInterventionStore(
    (s) => s.events.filter((e) => e.studentId === studentId && e.readAt === null).length,
  );
}

/** 해당 과제·학생의 교사 코멘트 최신 1건 — 결과 페이지 "선생님 한마디" (reactive). */
export function useAssignmentComment(
  assignmentId: string,
  studentId: string,
): InterventionEvent | null {
  const events = useInterventionStore((s) => s.events);
  const comments = events.filter(
    (e) => e.type === 'comment' && e.assignmentId === assignmentId && e.studentId === studentId,
  );
  return comments.length > 0 ? comments[comments.length - 1] : null;
}

/**
 * 과제별 remind 수신 학생 집합 — **학생 단위** 중복 발송 방지 (reactive).
 * 과제 단위 영구 차단이 아니라, 이미 받은 학생만 제외하고 새로 미제출이 된 학생에게는
 * 재발송할 수 있어야 한다 (Codex #184 R2).
 */
export function useRemindedStudentIds(assignmentId: string): Set<string> {
  const events = useInterventionStore((s) => s.events);
  return new Set(
    events
      .filter((e) => e.type === 'remind' && e.assignmentId === assignmentId)
      .map((e) => e.studentId),
  );
}

/**
 * 개입 수신자 id — 미인증 데모는 roster 폴백(서연 s1, 제출/결과와 동일 조인 키),
 * **인증 사용자는 본인 id 그대로**(roster 매핑이 없어도 폴백하지 않아 남의 알림을 보지 않는다).
 * (Codex #184 R2)
 */
export function useInterventionRecipientId(): string {
  const { id, isAuthenticated } = useCurrentUser();
  return isAuthenticated ? id : resolveRosterMe(id).id;
}
