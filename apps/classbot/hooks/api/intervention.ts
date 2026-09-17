'use client';

/**
 * 교사 개입 훅 — 발송(교사) · 인박스(학생) · 읽음 · 모두 읽음. **넷 다 pullim-api 정본**이다
 * (`api.md § 3.7` · `authz.md § 1.5 (A)·(B)` · 2026-09-16 완성 설계 § 8 계획 PR 5c).
 *
 *  - `useSendInterventions` — `POST /classes/:classId/interventions`. (A) L4 operator 소유권 — 남의 반 403 ·
 *    없는 반 404 · 대상이 그 반의 활성 멤버가 아니거나 연계 과제가 다른 반이면 400. 본문은 늘 `{ events: [...] }`.
 *  - `useMyInterventions` — `GET /interventions?audience=student`. (B) 수신 본인 — 서버가 `student_id==sub` 로만
 *    고르므로 **학생 id 를 화면이 실어 보내지 않는다.** 포커스 때와 60초마다 다시 읽고(아래 `INBOX_POLL_MS`),
 *    그 타이머는 `poll` 을 켠 **주인 하나**만 건다. raw `UseQueryResult` 대신 `InterventionInbox` 를 돌려주는
 *    이유는 그 타입 주석에 있다 — **비로그인이 「영영 기다림」으로 새는 자리**다.
 *  - `useMarkInterventionRead` / `useMarkAllInterventionsRead` — `PATCH …/:id/read` · `PATCH …/read-all`. 둘 다
 *    **낙관적**이다 — 누르는 즉시 캐시에서 읽음 처리하고 실패하면 되돌린다. 단건은 멱등(이미 읽음이면 200 no-op).
 *
 * **종전 자리**: 이 넷은 `lib/store/interventions.ts`(zustand + `pullim-interventions` localStorage persist)가
 * 브라우저 안에서 흉내 내던 것이다. 교사가 쓰고 학생이 **같은 브라우저에서** 읽어야 도착하는 구조라, 이 PR 이
 * 스토어와 로컬 `send()` 를 걷고 서버 인박스 하나로 모았다.
 *
 * 신원·캐시 규약은 이 리포의 다른 정본 훅과 같다 — 세션 복원 전(`isReady=false`)에는 묻지 않고, 사용자 id 를
 * queryKey 꼬리에 둔다. 오류는 `ApiError` 이고 401 은 `lib/api/classbot-client.ts` 가 로그인으로 보낸다.
 * 목 폴백은 없다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import {
  classbotRead,
  classbotWrite,
  isUnauthorized,
  retryUnlessClientError,
  statusOf,
} from '@/lib/api/classbot-client';
import type {
  InterventionDto,
  InterventionEventBody,
  MarkAllReadDto,
  SendInterventionsBody,
} from '@/lib/api/classbot-dto';
import { useAuth } from '@/lib/auth/auth-context';
import { markAllReadInInbox, markReadInInbox, sortedInbox, unreadCount } from '@/lib/interventions';

/**
 * 인박스 되읽기 주기 — 60초. 알림은 「지금 왔나」가 전부라 창이 열려 있는 동안 스스로 새로고침해야 한다.
 * 더 짧게 하면 수업 한 시간에 요청이 수백 건이 되고, 더 길면 선생님이 보낸 뒤 학생이 한참 못 본다.
 */
export const INBOX_POLL_MS = 60_000;

/**
 * 쿼리 키 — 인박스는 하나뿐이라 접두사가 곧 그 캐시다. 신원 id 는 꼬리에 붙는다(계정을 바꾸면 캐시가 갈린다).
 */
export const interventionKeys = {
  inboxPrefix: ['intervention-inbox'] as const,
  inbox: (userId: string | null) => ['intervention-inbox', userId] as const,
};

/** 발송 입력 — 반 하나에 이벤트 여럿. */
export interface SendInterventionsInput {
  classId: string;
  events: InterventionEventBody[];
}

/**
 * `POST /classbot/classes/:classId/interventions` — 개입 발송(201 · 만들어진 개입 목록).
 *
 * ⚠ **bulk 는 원자적이다.** 서버가 대상 멤버십·연계 과제를 **한 트랜잭션 안에서** 검사하므로 이벤트 하나가
 * 400 이면 **전부 롤백**된다(`intervention.service.ts` `send`). 그래서 여러 학생에게 보내는 자리
 * (과제 상세 「미제출 학생에게 리마인드」)는 이 훅을 **학생마다 한 번씩** 부른다 — 한 명이 반을 나갔다고
 * 나머지가 다 같이 실패하면 교사가 누구에게 갔는지 알 수 없다.
 *
 * @returns mutation. 보낸 개입은 학생의 인박스로 가므로 교사 캐시에 넣을 것은 없다.
 */
export function useSendInterventions(): UseMutationResult<
  InterventionDto[],
  ApiError,
  SendInterventionsInput
> {
  return useMutation<InterventionDto[], ApiError, SendInterventionsInput>({
    mutationFn: async ({ classId, events }) =>
      (
        await classbotWrite<InterventionDto[]>(
          `/classes/${encodeURIComponent(classId)}/interventions`,
          { events } satisfies SendInterventionsBody,
        )
      ).body,
  });
}

/**
 * 인박스 읽기 결과 — **raw `UseQueryResult` 를 그대로 내보내지 않는다.**
 *
 * `enabled:false`(비로그인·세션 복원 전)인 쿼리는 react-query v5 에서 `status:'pending'` · `fetchStatus:'idle'` 이라
 * `isPending` 이 **영영 true** 다. 그걸 그대로 읽으면 익명 방문자의 벨이 「불러오는 중」에서 멈춘다 —
 * `/classbot/onboarding` 은 공개 경로라(`lib/auth/public-paths.ts`) 비로그인으로도 학생 셸이 서고 헤더 벨이 걸린다.
 * 그래서 「비로그인」을 **제 갈래로** 내보내고, 목록은 모를 때 빈 배열로 준다(펼쳐도 안전하다).
 * 같은 모양을 `hooks/api/read/use-student-reads.ts` 의 `StudentReadResult` 가 이미 쓴다.
 */
export interface InterventionInbox {
  /** 최신순 목록 — 아직 모르면 빈 배열. */
  items: InterventionDto[];
  /** 안 읽은 수. */
  unread: number;
  /** 세션 복원 중이거나, 로그인된 채로 읽는 중. */
  isLoading: boolean;
  /** 비로그인(또는 401) — 에러 카드가 아니라 **로그인 안내**다(memory: 로그인 게이트 화면의 401). */
  isSignedOut: boolean;
  /** 그 밖의 실패(5xx·네트워크). */
  isError: boolean;
}

/**
 * `GET /classbot/interventions?audience=student` — 내 인박스(미읽음 포함 · 최신순).
 *
 * `staleTime: 0` 과 `refetchOnWindowFocus` 를 여기서만 켠다 — 전역 기본값은 30초 신선·포커스 되읽기 끔
 * (`components/providers/query-provider.tsx`)이라 그대로 두면 탭을 돌아와도 옛 배지를 본다.
 *
 * **60초 타이머는 주인 하나만 건다(`poll`).** `refetchInterval` 은 **옵저버마다** 타이머를 세우므로, 이 훅을
 * 부르는 자리마다 켜 두면 벨·인박스·결과 카드가 각자 다른 시각에 타이머를 잡아 60초에 요청이 여러 번 난다.
 * 주인은 헤더 벨이고(늘 떠 있다), 나머지는 같은 캐시를 구독만 한다.
 * @param poll - 되읽기 타이머를 이 옵저버가 걸지. @default false
 * @returns 목록·미읽음 수와 갈라진 상태 넷
 */
export function useMyInterventions({ poll = false }: { poll?: boolean } = {}): InterventionInbox {
  const { user, isReady } = useAuth();
  const isSignedIn = isReady && user !== null;

  const query = useQuery<InterventionDto[], ApiError>({
    queryKey: interventionKeys.inbox(user?.id ?? null),
    queryFn: () => classbotRead<InterventionDto[]>('/interventions?audience=student'),
    enabled: isSignedIn,
    retry: retryUnlessClientError,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: poll ? INBOX_POLL_MS : false,
  });

  const signedOut = (isReady && user === null) || isUnauthorized(query.error);
  const items = query.data ? sortedInbox(query.data) : [];
  return {
    items,
    unread: unreadCount(items),
    isLoading: !isReady || (isSignedIn && query.isPending),
    isSignedOut: signedOut,
    isError: query.isError && !signedOut,
  };
}

/** 되돌리기용 — 낙관 갱신 전의 인박스 스냅샷(키 → 본문). */
interface InboxContext {
  snapshot: [readonly unknown[], InterventionDto[] | undefined][];
}

/**
 * 낙관 갱신 공통 — 인박스 캐시 전부에 `apply` 를 걸고 스냅샷을 돌려준다. 신원 꼬리가 여럿일 수 있어
 * (같은 브라우저에서 계정을 바꾼 적이 있으면) 접두사로 훑는다.
 */
function optimisticInbox(
  queryClient: ReturnType<typeof useQueryClient>,
  apply: (items: InterventionDto[]) => InterventionDto[],
): Promise<InboxContext> {
  const prefix = interventionKeys.inboxPrefix;
  return queryClient.cancelQueries({ queryKey: prefix }).then(() => {
    const snapshot = queryClient.getQueriesData<InterventionDto[]>({ queryKey: prefix });
    queryClient.setQueriesData<InterventionDto[]>({ queryKey: prefix }, (old) =>
      old ? apply(old) : old,
    );
    return { snapshot };
  });
}

/** 되돌리기 — 낙관 갱신이 실패했을 때 스냅샷을 그대로 복구한다. */
function restoreInbox(
  queryClient: ReturnType<typeof useQueryClient>,
  context: InboxContext | undefined,
): void {
  for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
}

/**
 * `PATCH /classbot/interventions/:id/read` — 한 건 읽음(수신 본인 · 멱등 200).
 * 타인 개입 403 · 없는 개입 404 — 둘 다 되돌린 뒤 서버 값으로 다시 읽는다.
 * @returns mutation — 변수는 개입 id
 */
export function useMarkInterventionRead(): UseMutationResult<
  InterventionDto,
  ApiError,
  string,
  InboxContext
> {
  const queryClient = useQueryClient();
  return useMutation<InterventionDto, ApiError, string, InboxContext>({
    mutationFn: async (id) =>
      (await classbotWrite<InterventionDto>(`/interventions/${encodeURIComponent(id)}/read`, undefined, 'PATCH'))
        .body,
    onMutate: (id) => {
      const readAt = new Date().toISOString();
      return optimisticInbox(queryClient, (items) => markReadInInbox(items, id, readAt));
    },
    onError: (_error, _id, context) => restoreInbox(queryClient, context),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: interventionKeys.inboxPrefix });
    },
  });
}

/**
 * `PATCH /classbot/interventions/read-all` — 내 미읽음 전부 읽음(200 `{ updated }`).
 * @returns mutation — 변수 없음
 */
export function useMarkAllInterventionsRead(): UseMutationResult<
  MarkAllReadDto,
  ApiError,
  void,
  InboxContext
> {
  const queryClient = useQueryClient();
  return useMutation<MarkAllReadDto, ApiError, void, InboxContext>({
    mutationFn: async () =>
      (await classbotWrite<MarkAllReadDto>('/interventions/read-all', undefined, 'PATCH')).body,
    onMutate: () => {
      const readAt = new Date().toISOString();
      return optimisticInbox(queryClient, (items) => markAllReadInInbox(items, readAt));
    },
    onError: (_error, _vars, context) => restoreInbox(queryClient, context),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: interventionKeys.inboxPrefix });
    },
  });
}

/**
 * 발송 실패 → 교사가 읽는 한 줄. 서버가 가른 뜻을 뭉개지 않는다(`authz.md § 1.5 (A)`).
 *  - **400** 은 이 문에서 뜻이 여럿이다 — 대상이 이 반의 활성 멤버가 아니거나, 고른 과제가 다른 반 것이거나,
 *    문구가 비었거나. 교사가 그 자리에서 할 수 있는 확인을 먼저 말한다.
 *  - **401** 은 여기 오기 전에 로그인으로 갔다(`classbotWrite`) — 리다이렉트가 도는 사이 토스트가 뜰 수 있어 둔다.
 * @param error - `useSendInterventions` 가 던진 오류
 * @returns 토스트·폼 아래 한 줄
 */
export function sendInterventionFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 400:
      return '보내지 못했어요. 학생이 아직 이 반에 있는지, 고른 과제가 이 반 과제인지 확인해 주세요.';
    case 401:
      return '로그인이 필요해요.';
    case 403:
      return '이 반의 운영 교사만 보낼 수 있어요.';
    case 404:
      return '반을 찾을 수 없어요.';
    default:
      return '보내지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

/**
 * 읽음 실패 → 학생이 읽는 한 줄. 화면은 이미 낙관적으로 되돌아간 뒤다.
 * @param error - 읽음 mutation 이 던진 오류
 * @returns 토스트 한 줄
 */
export function markReadFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 401:
      return '로그인이 필요해요.';
    case 403:
    case 404:
      return '이 알림은 더 이상 없어요.';
    default:
      return '읽음으로 바꾸지 못했어요. 잠시 후 다시 해 주세요.';
  }
}
