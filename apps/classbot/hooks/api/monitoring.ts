'use client';

/**
 * 교사 모니터링 훅 — 멤버 대화 열람 · 위험 신호 · 확인. **셋 다 pullim-api 정본**(ADR-092 PR 3 · FE PR 7).
 *
 *  - `useClassSignals` — `GET /classes/:classId/signals`. 반 전체의 학생별 집계(`summary`) + 최근 신호(`signals` ·
 *    기본 50). 대화 탭 왼쪽 목록과 관제소 표가 읽는다.
 *  - `useStudentSignals` — 같은 문에 `?studentId=&limit=200`. 한 학생의 기록 옆에 붙일 신호 전부 — 반 전체 응답은 상한에
 *    잘려 옛 신호가 빠질 수 있어 학생을 고르면 따로 읽는다.
 *  - `useMemberChat` — `GET /classes/:classId/chat?studentId=&limit=100`(A′ operator read). 판정 순서는 없는 반 404 →
 *    남의 반 403 → 비멤버 404. 반 머리(`useOperatorClass`)가 앞의 둘을 이미 갈라 말하므로 이 훅의 404 는 「이 반 학생이
 *    아니다」로 읽는다.
 *  - `useAckSignal` — `PATCH /signals/:id/ack`. **낙관적**이다 — 누르는 즉시 캐시에서 확인 처리하고 실패하면 되돌린다.
 *    서버는 멱등 200(이미 확인된 신호도 같은 본문)이라 두 번 눌러도 해가 없다. 없는 신호·남의 반 신호는 둘 다 404 다.
 *
 * 인가 SoT 는 pullim-api `authz.md § 1.5 (A′)` — 반 운영자만이다. 학생 화면에는 「선생님이 이 대화를 볼 수 있어요」가
 * 먼저 떠 있다(FE PR 5a).
 *
 * 신원·캐시 규약: 세션 복원 전(`isReady=false`)에는 묻지 않고, 사용자 id 를 queryKey 꼬리에 둔다. 오류는 `ApiError`
 * 이고 401 은 `lib/api/classbot-client.ts` 가 로그인으로 보낸다. 목 폴백은 없다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classbotRead, classbotWrite, retryUnlessClientError } from '@/lib/api/classbot-client';
import type { ClassSignalsDto, MemberMessageDto, RiskSignalDto } from '@/lib/api/classbot-dto';
import { useAuth } from '@/lib/auth/auth-context';
import { ackSignalInView } from '@/lib/risk-signals';

/** 한 학생 신호 목록 상한 — DTO 최대(200). 한 학생이 이보다 많으면 오래된 것부터 잘린다. */
export const STUDENT_SIGNALS_LIMIT = 200;
/** 교사 열람 기록 상한 — DTO 최대(100 turn). 더 옛 기록은 이 화면 밖이다. */
export const MEMBER_CHAT_LIMIT = 100;

/**
 * 쿼리 키 — 신호 키는 **접두사 `['class-signals', classId]`** 를 공유한다. 확인(ack)이 반 전체·학생 하나 캐시를
 * 한 번에 갱신·무효화하는 자리라 접두사가 곧 계약이다. 신원 id 는 꼬리에 붙는다.
 */
export const monitoringKeys = {
  signalsPrefix: (classId: string) => ['class-signals', classId] as const,
  classSignals: (classId: string) => ['class-signals', classId, 'all'] as const,
  studentSignals: (classId: string, studentId: string) =>
    ['class-signals', classId, 'student', studentId] as const,
  memberChat: (classId: string, studentId: string) => ['member-chat', classId, studentId] as const,
};

/**
 * `GET /classbot/classes/:classId/signals` — 반의 학생별 집계 + 최근 신호.
 * @param classId - 반 id. 비어 있으면 묻지 않는다.
 */
export function useClassSignals(classId: string | null | undefined): UseQueryResult<ClassSignalsDto, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<ClassSignalsDto, ApiError>({
    queryKey: [...monitoringKeys.classSignals(classId ?? ''), user?.id ?? null],
    queryFn: () => classbotRead<ClassSignalsDto>(`/classes/${encodeURIComponent(classId ?? '')}/signals`),
    enabled: isReady && user !== null && Boolean(classId),
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/classes/:classId/signals?studentId=&limit=200` — 한 학생의 신호 전부(집계도 그 학생만).
 * @param classId - 반 id
 * @param studentId - 학생 sub. 비어 있으면 묻지 않는다.
 */
export function useStudentSignals(
  classId: string,
  studentId: string | null | undefined,
): UseQueryResult<ClassSignalsDto, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<ClassSignalsDto, ApiError>({
    queryKey: [...monitoringKeys.studentSignals(classId, studentId ?? ''), user?.id ?? null],
    queryFn: () =>
      classbotRead<ClassSignalsDto>(
        `/classes/${encodeURIComponent(classId)}/signals?studentId=${encodeURIComponent(studentId ?? '')}&limit=${STUDENT_SIGNALS_LIMIT}`,
      ),
    enabled: isReady && user !== null && Boolean(classId) && Boolean(studentId),
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/classes/:classId/chat?studentId=&limit=100` — 교사가 읽는 한 학생의 대화(시간순 · 미완결 turn 포함).
 * @param classId - 반 id
 * @param studentId - 학생 sub. 비어 있으면 묻지 않는다.
 */
export function useMemberChat(
  classId: string,
  studentId: string | null | undefined,
): UseQueryResult<MemberMessageDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<MemberMessageDto[], ApiError>({
    queryKey: [...monitoringKeys.memberChat(classId, studentId ?? ''), user?.id ?? null],
    queryFn: () =>
      classbotRead<MemberMessageDto[]>(
        `/classes/${encodeURIComponent(classId)}/chat?studentId=${encodeURIComponent(studentId ?? '')}&limit=${MEMBER_CHAT_LIMIT}`,
      ),
    enabled: isReady && user !== null && Boolean(classId) && Boolean(studentId),
    retry: retryUnlessClientError,
  });
}

/** 되돌리기용 — 낙관적 갱신 전의 캐시 스냅샷(키 → 본문). */
interface AckContext {
  snapshot: [readonly unknown[], ClassSignalsDto | undefined][];
}

/**
 * `PATCH /classbot/signals/:id/ack` — 「확인함」. 본문 없음, 응답은 그 신호 한 건(확인 시각·확인자 채워진 상태).
 *
 * 낙관적 갱신: `onMutate` 에서 이 반의 신호 캐시 전부(반 전체·학생별)에 `ackSignalInView` 를 적용하고 스냅샷을 남긴다.
 * 실패(`onError`)면 스냅샷으로 되돌리고, 끝나면(`onSettled`) 서버 값으로 다시 읽는다 — 확인 시각·확인자는 서버가 정한
 * 값이 정본이라 낙관값(지금 시각·내 id)은 그때 덮인다. 변수에 `studentId` 를 함께 싣는 이유: 반 전체 캐시의 `signals[]`
 * 는 상한(50)에 잘려 그 신호가 없을 수 있는데, 그래도 그 학생의 `unacked` 배지는 바로 내려가야 해서다.
 * @param classId - 신호가 속한 반 — 어느 캐시를 갱신할지 정한다
 * @returns mutation — 변수는 `{ signalId, studentId }`
 */
export interface AckSignalInput {
  signalId: string;
  /** 그 신호의 학생 — 반 전체 캐시에 신호가 없어도 집계를 내리는 열쇠. */
  studentId: string;
}

export function useAckSignal(classId: string): UseMutationResult<RiskSignalDto, ApiError, AckSignalInput, AckContext> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const prefix = monitoringKeys.signalsPrefix(classId);
  return useMutation<RiskSignalDto, ApiError, AckSignalInput, AckContext>({
    mutationFn: async ({ signalId }) =>
      (await classbotWrite<RiskSignalDto>(`/signals/${encodeURIComponent(signalId)}/ack`, undefined, 'PATCH')).body,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: prefix });
      const snapshot = queryClient.getQueriesData<ClassSignalsDto>({ queryKey: prefix });
      const ackedAt = new Date().toISOString();
      queryClient.setQueriesData<ClassSignalsDto>({ queryKey: prefix }, (old) =>
        old ? ackSignalInView(old, input, user?.id ?? null, ackedAt) : old,
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: prefix });
    },
  });
}
