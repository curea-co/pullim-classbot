/**
 * 교사 개입(intervention) 스토어 — spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §3.
 *
 * 교사 표면(리마인드·코멘트·재발사·위기 응원)이 이벤트를 **쓰고**, 학생 벨 인박스·배지·
 * 결과 "선생님 한마디"는 전부 이 스토어를 **읽는** 단방향 흐름. localStorage persist —
 * 기존 스토어 문법(assignments·class-enrollment)과 동일. 소비 컴포넌트는 `useStoresHydrated` 게이트.
 *
 * Ph7(`USE_REAL_CORE_BE`): 쓰기(send/markRead/markAllRead)는 스토어 선반영 후 BE 로
 * 전송(낙관적 — 실패 시 콘솔 경고 + 로컬 유지), 읽기(useMyInterventions/useUnreadCount)는
 * `GET /api/interventions?audience=student` 를 스토어 캐시로 병합한다.
 * 플래그 OFF 면 기존 mock/localStorage 동작 100% 불변.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCurrentUser, resolveRosterMe } from '@/lib/current-user';
import { USE_REAL_CORE_BE } from '@/lib/features';
import {
  domainFetch, getAuthUserSnapshot, studentRequestIdentity, teacherRequestIdentity,
  toDomainUserId, fromDomainUserId, useStudentSyncUserId, type RequestIdentity,
} from '@/lib/api/domain-fetch';

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
      send: (input) => {
        const localId = `iv_${Date.now()}_${seq++}`;
        set((s) => ({
          events: [
            ...s.events,
            {
              ...input,
              id: localId,
              createdAt: new Date().toISOString(),
              readAt: null,
            },
          ],
        }));
        // Ph7 — 낙관적 선반영 후 BE 전송 (실패 시 경고 + 로컬 유지, M2 단방향 신뢰)
        if (USE_REAL_CORE_BE) void sendToBackend(input, localId);
      },
      markRead: (id) => {
        set((s) => ({
          events: s.events.map((e) =>
            e.id === id && e.readAt === null ? { ...e, readAt: new Date().toISOString() } : e,
          ),
        }));
        if (USE_REAL_CORE_BE) void markReadOnBackend(id);
      },
      markAllRead: (studentId) => {
        set((s) => ({
          events: s.events.map((e) =>
            e.studentId === studentId && e.readAt === null
              ? { ...e, readAt: new Date().toISOString() }
              : e,
          ),
        }));
        if (USE_REAL_CORE_BE) void markAllReadOnBackend(studentId);
      },
    }),
    { name: 'pullim-interventions' },
  ),
);

/* ─────────────────────────────────────────────────────────────
 * Ph7 — BE 배선 (USE_REAL_CORE_BE ON 일 때만 동작)
 * ───────────────────────────────────────────────────────────── */

/** BE 개입 한 행 — `InterventionResponseDto` (camelCase 1:1, 시각은 ISO-8601). */
interface BackendInterventionRow {
  id: string;
  type: InterventionType;
  botId: string;
  studentId: string;
  assignmentId: string | null;
  message: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * BE 행 → 스토어 이벤트.
 * 수신자 키 역변환(student_001→s1)은 **미인증 데모 읽기에서만** 적용한다 — 인증
 * 사용자 행의 raw user id 를 roster 키로 붕괴시키지 않는다 (Codex #196 R2 ②).
 */
function toEvent(row: BackendInterventionRow, mapToRosterKeys: boolean): InterventionEvent {
  return {
    id: row.id,
    type: row.type,
    botId: row.botId,
    studentId: mapToRosterKeys ? fromDomainUserId(row.studentId) : row.studentId,
    ...(row.assignmentId ? { assignmentId: row.assignmentId } : {}),
    message: row.message,
    createdAt: row.createdAt,
    readAt: row.readAt,
  };
}

/**
 * 교사 발신 → `POST /api/interventions` (bulk `{ events: [...] }` 계약).
 * 성공 시 낙관 이벤트를 서버 생성 행(id/createdAt)으로 재키잉 — 이후 markRead 가
 * BE 와 같은 id 를 쓰게 한다. 실패 시 콘솔 경고 + 로컬 유지 (graceful degrade).
 */
async function sendToBackend(input: InterventionInput, localId: string): Promise<void> {
  const body = {
    events: [
      {
        type: input.type,
        botId: input.botId,
        studentId: toDomainUserId(input.studentId),
        ...(input.assignmentId ? { assignmentId: input.assignmentId } : {}),
        message: input.message ?? '',
      },
    ],
  };
  const identity = teacherRequestIdentity();
  try {
    const res = await domainFetch<{ interventions: BackendInterventionRow[] }>('/interventions', {
      method: 'POST',
      body,
      // 인증이면 Bearer 전용(데모 명의 미전달 — 오귀속 차단), 미인증만 데모 교사 키.
      demoUserId: identity.demoUserId,
    });
    const created = res.interventions[0];
    if (created) {
      useInterventionStore.setState((s) => ({
        events: s.events.map((e) =>
          e.id === localId ? toEvent(created, !identity.isAuthenticated) : e,
        ),
      }));
    }
  } catch (e) {
    console.warn('[interventions] BE 개입 발신 실패 — 로컬 유지:', e);
  }
}

/** 읽음 처리 → `PATCH /api/interventions/:id/read`. 실패 시 경고 + 로컬 유지. */
async function markReadOnBackend(id: string): Promise<void> {
  try {
    await domainFetch<unknown>(`/interventions/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      demoUserId: studentRequestIdentity().demoUserId,
    });
  } catch (e) {
    console.warn('[interventions] BE 읽음 처리 실패 — 로컬 유지:', e);
  }
}

/** 전체 읽음 → `PATCH /api/interventions/read-all` (요청 학생 스코프, 멱등). */
async function markAllReadOnBackend(studentId: string): Promise<void> {
  try {
    await domainFetch<unknown>('/interventions/read-all', {
      method: 'PATCH',
      // 인증이면 Bearer 신원(데모 명의 미전달), 미인증만 인자 roster 키를 seed 변환.
      demoUserId: getAuthUserSnapshot() ? undefined : toDomainUserId(studentId),
    });
  } catch (e) {
    console.warn('[interventions] BE 전체 읽음 처리 실패 — 로컬 유지:', e);
  }
}

// 사용자당 1회 fetch 단일 비행 — 벨/배지 등 여러 마운트에서 중복 요청하지 않고,
// 로그아웃/재로그인·사용자 전환 시(resolved user id 변경) 재동기화한다 (Codex #196 R2 ③).
let backendInterventionSync: {
  key: string;
  promise: Promise<InterventionEvent[] | null>;
} | null = null;

/** 테스트 전용 — 단일 비행 캐시 리셋. */
export function resetBackendInterventionSyncForTests(): void {
  backendInterventionSync = null;
}

async function fetchBackendInterventions(
  identity: RequestIdentity,
): Promise<InterventionEvent[] | null> {
  try {
    const res = await domainFetch<{ interventions: BackendInterventionRow[] }>(
      '/interventions?audience=student',
      { demoUserId: identity.demoUserId },
    );
    return res.interventions.map((row) => toEvent(row, !identity.isAuthenticated));
  } catch (e) {
    console.warn('[interventions] BE 인박스 동기화 실패 — 로컬 유지:', e);
    return null;
  }
}

/**
 * 플래그 ON 읽기 동기화 — 학생 인박스를 스토어 캐시에 병합한다.
 * 같은 id 는 로컬 행 유지(낙관 readAt 보존), BE-only 행은 추가 후 createdAt 순 정렬.
 * 플래그 OFF 면 완전 no-op.
 */
function useBackendInterventionSync(): void {
  // 토큰 변경(사용자 전환)에 반응 — 같은 마운트에서도 effect 재실행 (Codex #196 R3 ②).
  const syncUserId = useStudentSyncUserId();
  useEffect(() => {
    if (!USE_REAL_CORE_BE) return;
    let cancelled = false;
    const identity = studentRequestIdentity();
    if (backendInterventionSync?.key !== identity.userId) {
      backendInterventionSync = {
        key: identity.userId,
        promise: fetchBackendInterventions(identity),
      };
    }
    void backendInterventionSync.promise.then((rows) => {
      if (cancelled || !rows) return;
      useInterventionStore.setState((s) => {
        const localIds = new Set(s.events.map((e) => e.id));
        const merged = [...s.events, ...rows.filter((r) => !localIds.has(r.id))];
        merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return { events: merged };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [syncUserId]);
}

/** 내 개입 이벤트 — 최신순 (reactive). */
export function useMyInterventions(studentId: string): InterventionEvent[] {
  useBackendInterventionSync(); // Ph7 — 플래그 OFF 면 no-op
  const events = useInterventionStore((s) => s.events);
  return events.filter((e) => e.studentId === studentId).slice().reverse();
}

/** 미읽음 수 — 벨 배지용 (reactive). */
export function useUnreadCount(studentId: string): number {
  useBackendInterventionSync(); // Ph7 — 벨 배지도 BE 인박스와 동기화
  return useInterventionStore(
    (s) => s.events.filter((e) => e.studentId === studentId && e.readAt === null).length,
  );
}

/** 해당 과제·학생의 교사 코멘트 최신 1건 — 결과 페이지 "선생님 한마디" (reactive). */
export function useAssignmentComment(
  assignmentId: string,
  studentId: string,
): InterventionEvent | null {
  useBackendInterventionSync(); // Ph7 — 결과 페이지 직링크 진입에서도 인박스 동기화 (Codex #196 R1)
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
 * 개입 수신자 id — **읽기(벨·코멘트)와 쓰기(리마인드가 저장하는 roster id)가 같은 도메인 학생 키**
 * 를 쓰도록 roster 브리지(resolveRosterMe)로 해석한다. 제출/결과(useStudentSubmission)와 동일 조인 규약.
 * 인증 사용자 raw id 를 쓰면 쓰기 측(s1..)과 영원히 매칭되지 않아 알림이 도착하지 않는다(Codex #184 R3 —
 * "mock 단계라면 읽기/쓰기 모두 동일한 도메인 학생 키" 허용안 채택). UUID↔roster 실신원 매핑은
 * auth 통합(Phase β/SSO) 소관 — 이 훅이 그때의 단일 교체 지점이다.
 *
 * Ph7(`USE_REAL_CORE_BE` ON) + 인증: BE 가 JWT 신원(raw user id) 행을 반환하므로
 * roster 브리지로 붕괴시키지 않고 raw id 를 그대로 쓴다 (Codex #196 R2 ②).
 * 플래그 OFF 는 기존 mock 규약(브리지) 그대로 — 회귀 0.
 */
export function useInterventionRecipientId(): string {
  const { id, isAuthenticated } = useCurrentUser();
  if (USE_REAL_CORE_BE && isAuthenticated) return id;
  return resolveRosterMe(id).id;
}
