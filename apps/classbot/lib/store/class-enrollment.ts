/**
 * 교사 클래스 참여(enrollment) 상태 — 참여 코드로 join, 나가기로 leave.
 * localStorage persist로 세션 간 유지. self-learning 스토어 패턴을 그대로 따른다.
 *
 * 출시 기준 mock `studentEnrollments`는 빈 배열이므로, 학생의 교사 배정은 이 스토어가 권위.
 * `getMyBots()`(static)의 reactive 대체로 `useMyClassBots()`를 쓴다.
 *
 * Ph7(`USE_REAL_CORE_BE`): 쓰기(join)는 `joinClass()` 가 BE `POST /api/enrollments` 로
 * 보내고, 읽기(`useMyClassBots`)는 `GET /api/bots?role=student` 를 스토어로 동기화한다 —
 * "BE 가 진실, 스토어는 캐시" 최소 배선. 플래그 OFF/BE 실패 시 기존 mock 경로 그대로.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError } from '@pullim-classbot/api-client';
import { classBots, type ClassBot, type StudentEnrollment } from '@/lib/mock/classbot';
import { resolveClassCode } from '@/lib/mock/class-codes';
import { USE_REAL_CORE_BE } from '@/lib/features';
import {
  domainFetch,
  studentRequestIdentity,
  useStudentSyncUserId,
  type RequestIdentity,
} from '@/lib/api/domain-fetch';

export type JoinResult =
  | { ok: true; enrollment: StudentEnrollment }
  | { ok: false; error: string };

/** 무효 코드 에러 카피 — mock/BE(404) 공용. */
const INVALID_CODE_ERROR =
  '참여할 수 없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.';

/** 일반 join 실패 카피 — BE 4xx(401/403 등, 404 제외) 거부용. */
const JOIN_FAILED_ERROR = '클래스 참여에 실패했어요. 잠시 후 다시 시도해 주세요.';

interface ClassEnrollmentStore {
  enrollments: StudentEnrollment[];
  /** 참여 코드로 join. 유효하면 enrollment 추가(중복 무시), 아니면 error. */
  join: (code: string) => JoinResult;
  /** 클래스 나가기 — botId의 enrollment 제거. */
  leave: (botId: string) => void;
}

export const useClassEnrollmentStore = create<ClassEnrollmentStore>()(
  persist(
    (set, get) => ({
      enrollments: [],
      join: (code) => {
        const enrollment = resolveClassCode(code);
        if (!enrollment) {
          return {
            ok: false,
            error: INVALID_CODE_ERROR,
          };
        }
        const already = get().enrollments.some((e) => e.botId === enrollment.botId);
        if (!already) {
          set((s) => ({ enrollments: [enrollment, ...s.enrollments] }));
        }
        return { ok: true, enrollment };
      },
      leave: (botId) =>
        set((s) => ({ enrollments: s.enrollments.filter((e) => e.botId !== botId) })),
    }),
    { name: 'pullim-class-enrollment' },
  ),
);

/* ─────────────────────────────────────────────────────────────
 * Ph7 — BE 배선 (USE_REAL_CORE_BE ON 일 때만 동작)
 * ───────────────────────────────────────────────────────────── */

/**
 * 참여 코드 join — 플래그 스위치 진입점 (컴포넌트는 이것만 호출).
 *
 * OFF: 기존 스토어 join(mock resolveClassCode) 그대로.
 * ON : `POST /api/enrollments` — 201/200 응답 enrollment(StudentEnrollment 1:1)를
 *      스토어에도 반영해 기존 파생 로직(useMyClassBots 등)을 유지한다.
 *      **BE 의 거부(4xx)는 실패로 전파한다** — 404(무효 코드)는 기존 에러 카피,
 *      401/403 등은 일반 실패 카피. mock join 폴백(graceful degrade)은
 *      **네트워크 실패/5xx(BE 다운)** 에만 좁혀 적용한다 — BE 가 명시적으로 거부한
 *      join 을 mock 성공으로 가장하지 않는다 (Codex #196 R3 ①).
 * @param code - 참여 코드
 * @returns JoinResult (기존 계약 그대로)
 */
export async function joinClass(code: string): Promise<JoinResult> {
  if (!USE_REAL_CORE_BE) {
    return useClassEnrollmentStore.getState().join(code);
  }
  try {
    const enrollment = await domainFetch<StudentEnrollment>('/enrollments', {
      method: 'POST',
      body: { code },
      // 인증이면 Bearer 전용(데모 명의 미전달 — 오귀속 차단), 미인증만 데모 키.
      demoUserId: studentRequestIdentity().demoUserId,
    });
    useClassEnrollmentStore.setState((s) => {
      const already = s.enrollments.some((e) => e.botId === enrollment.botId);
      return {
        enrollments: already
          ? s.enrollments.map((e) => (e.botId === enrollment.botId ? enrollment : e))
          : [enrollment, ...s.enrollments],
      };
    });
    return { ok: true, enrollment };
  } catch (e) {
    // 4xx = BE 의 명시적 거부 — mock 폴백 없이 실패로 전파.
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return {
        ok: false,
        error: e.status === 404 ? INVALID_CODE_ERROR : JOIN_FAILED_ERROR,
      };
    }
    // 네트워크 실패/5xx — BE 다운이 UX 를 깨지 않게 mock join 으로 degrade.
    console.warn('[class-enrollment] BE 코드 참여 실패 — mock 폴백:', e);
    return useClassEnrollmentStore.getState().join(code);
  }
}

/** BE `GET /api/bots?role=student` 한 행 — 소비하는 필드만 (EnrolledBotRow 부분집합). */
interface EnrolledBotResponseRow {
  id: string;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  via: string;
}

// 사용자당 1회 fetch 단일 비행 — 소비 훅이 여러 곳에 마운트돼도 중복 요청하지 않고,
// 로그아웃/재로그인·사용자 전환 시(resolved user id 변경) 재동기화한다 (Codex #196 R2 ③).
let backendEnrollmentSync: {
  key: string;
  promise: Promise<StudentEnrollment[] | null>;
} | null = null;

/** 테스트 전용 — 단일 비행 캐시 리셋. */
export function resetBackendEnrollmentSyncForTests(): void {
  backendEnrollmentSync = null;
}

async function fetchBackendEnrollments(
  identity: RequestIdentity,
): Promise<StudentEnrollment[] | null> {
  try {
    const res = await domainFetch<{ bots: EnrolledBotResponseRow[] }>('/bots?role=student', {
      demoUserId: identity.demoUserId,
    });
    return res.bots.map((row) => ({
      botId: row.id,
      classroomId: row.classroomId,
      classroomLabel: row.classroomLabel,
      assignedBy: row.assignedBy,
      // 읽기 행(EnrolledBotRow)에는 assignedAt 이 없다 — UI 미소비 필드라 빈 값.
      assignedAt: '',
      via: row.via,
    }));
  } catch (e) {
    console.warn('[class-enrollment] BE 봇 목록 동기화 실패 — 로컬 유지:', e);
    return null;
  }
}

/**
 * 플래그 ON 읽기 동기화 — BE enrollment 를 스토어 캐시에 병합한다.
 * 같은 botId 는 BE 행이 진실, BE 에 없는 로컬 행은 유지(graceful — 쓰기 실패분 보존).
 * 플래그 OFF 면 완전 no-op.
 */
function useBackendEnrollmentSync(): void {
  // 토큰 변경(사용자 전환)에 반응 — 같은 마운트에서도 effect 재실행 (Codex #196 R3 ②).
  const syncUserId = useStudentSyncUserId();
  useEffect(() => {
    if (!USE_REAL_CORE_BE) return;
    let cancelled = false;
    const identity = studentRequestIdentity();
    if (backendEnrollmentSync?.key !== identity.userId) {
      backendEnrollmentSync = {
        key: identity.userId,
        promise: fetchBackendEnrollments(identity),
      };
    }
    void backendEnrollmentSync.promise.then((rows) => {
      if (cancelled || !rows) return;
      useClassEnrollmentStore.setState((s) => ({
        enrollments: [
          ...s.enrollments.filter((e) => !rows.some((r) => r.botId === e.botId)),
          ...rows,
        ],
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [syncUserId]);
}

/** 참여 중인 enrollment 목록 (reactive). */
export function useClassEnrollments(): StudentEnrollment[] {
  return useClassEnrollmentStore((s) => s.enrollments);
}

/** enrollment[] → classBots 카탈로그 브릿지 (순수). */
/**
 * ⚠ M2 경계 (Codex #196 R4 — 의도된 한계): 봇 **카탈로그**(이름·성격·커리큘럼)는 여전히
 * mock `classBots` 가 권위다 — M2 는 봇 생성 API 를 배선하지 않으므로 BE 에는 시드(=mock)
 * 밖의 봇이 존재할 수 없다. 봇 카탈로그의 BE 이관은 M3(봇 빌더 실전화)와 함께.
 */
function bridge(
  enrollments: StudentEnrollment[],
): { bot: ClassBot; enrollment: StudentEnrollment }[] {
  return enrollments
    .map((enrollment) => {
      const bot = classBots.find((b) => b.id === enrollment.botId);
      return bot ? { bot, enrollment } : null;
    })
    .filter((x): x is { bot: ClassBot; enrollment: StudentEnrollment } => x !== null);
}

/**
 * enrollment → classBots 카탈로그 브릿지 (reactive).
 * 정적 `getMyBots()`의 store 기반 대체 — join/leave 시 소비 컴포넌트가 re-render된다.
 */
export function useMyClassBots(): { bot: ClassBot; enrollment: StudentEnrollment }[] {
  useBackendEnrollmentSync(); // Ph7 — 플래그 OFF 면 no-op
  const enrollments = useClassEnrollmentStore((s) => s.enrollments);
  return bridge(enrollments);
}
