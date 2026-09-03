'use client';

/**
 * 공유 동의 — 학생이 **자기 것을 내주는** 유일한 입구 (`/api/me/consents`).
 *
 * 이 앱의 다른 훅들과 성질이 하나 다르다: 여기서 나가는 왕복은 **남에게 권한을 만든다.**
 * 그래서 다른 곳에서는 편의였던 것들이 여기서는 규칙이다.
 *
 * ## ⛔ 만료를 클라이언트가 계산하지 않는다 — 지우지 마라
 *
 * 보내는 것은 `{ type, scopeLabel }` **둘뿐**이고, `expiresAt` 은 **서버가 라벨에서 파생**한다
 * (계약 §2 「부여 규칙」 — `계속`→null · `이번 달만`→+30d · `이번 주만`→+7d).
 * 여기서 `Date.now() + 30일` 을 만들어 보내면 **브라우저 시계가 권한 기한이 된다** —
 * 시계를 뒤로 돌린 기기가 만료를 미룬다. 화면에 적히는 날짜는 언제나 **응답이 준 값**이다.
 *
 * 같은 이유로 `parentId` 도 보내지 않는다. 누구에게 주는지는 서버가 `parent_child_links`
 * 에서 읽는다 — 본문으로 받으면 학생이 아무에게나 권한을 줄 수 있다.
 *
 * ## ⛔ 신원이 없으면 서버를 부르지 않는다 — `useCurrentUser().isAuthenticated` 로 갈지 마라
 *
 * 갈래는 `useHasServerIdentity()`(`./self-server`)가 정한다. 이름이 그럴듯한
 * `useCurrentUser().isAuthenticated` 는 **이 질문의 답이 아니다** — 개발용 신원 쿠키에
 * 일부러 `false` 를 주는 값이라 그걸로 잠그면 로컬·dev preview 가 통째로 「신원 없음」이
 * 되고 prod 만 서버를 부르는 정반대 동작이 된다. 그 함정은 이 리포에서 이미 한 번 값을
 * 치렀다. 판정의 근거 주석은 `hooks/api/self-server.ts` 에 길게 적혀 있다.
 *
 * 신원이 없을 때 이 화면은 **데모로 떨어지지 않는다.** 담은 봇(P3)·공부한 날(P4)에는
 * localStorage 갈래가 있지만 동의에는 없어야 한다 — 로컬에만 있는 「동의」는 아무에게도
 * 권한을 주지 않으면서 학생에게는 준 것처럼 보인다. 그건 이 화면이 낼 수 있는 가장 나쁜
 * 거짓말이다. 그래서 신원이 없으면 조회하지 않고, 화면이 그 사실을 그대로 적는다.
 *
 * 오류는 전부 `ApiClientError` 다 — `error.message` 가 이미 우리말이라 그대로 띄우면 된다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiClientError, apiDelete, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import { retryUnlessGuarded, useHasServerIdentity } from '@/hooks/api/self-server';
import type {
  GrantConsentInput,
  GrantConsentResponse,
  MyConsentParent,
  MyConsentRow,
  MyConsentsResponse,
  RevokeConsentResponse,
} from '@/app/api/_lib/contract-types';
/*
  ⚠️ **`import type` 를 값 import 로 바꾸지 마라.** `_lib/consent.ts` 는 `contract-types.ts`
  와 달리 타입만 있는 파일이 아니다 — drizzle 술어와 `@/lib/db/schema` 를 물고 있어서, 값을
  하나라도 가져오면 **ORM 과 스키마가 클라이언트 번들로 딸려 온다.** 타입은 컴파일에서
  지워지므로 안전하다. 그래서 `SCOPE_LABELS`(값)는 안 쓰고 화면이 제 목록을 따로 든다.
*/
import type { ScopeLabel, StudentGrantableType } from '@/app/api/_lib/consent';

/*
  응답 모양은 **서버가 소유한다** — `app/api/_lib/contract-types.ts` 에서 그대로 가져온다.
  여기에 같은 모양을 다시 적어 두면 서버가 칸을 하나 옮겼을 때 타입이 통과해 버리고,
  어긋남은 브라우저에서 `undefined` 로 처음 드러난다. 타입만 쓰는 import 라 서버 모듈이
  클라이언트 번들로 딸려 오지 않는다(`hooks/api/types.ts` 머리주석의 같은 이유).
*/
export type {
  GrantConsentInput,
  GrantConsentResponse,
  MyConsentParent,
  MyConsentRow,
  MyConsentsResponse,
  RevokeConsentResponse,
};

/**
 * 살아 있는 동의 한 칸. 철회·만료된 것은 목록에 오지 않는다.
 *
 * ⚠️ `type` 은 **여섯 중 무엇이든** 올 수 있다 — 조회가 타입으로 거르지 않기 때문이다
 * (계약 타입 `MyConsentRow` 주석). 지금 DB 에는 자기주도 것뿐이지만, 교사·기관 승인 흐름이
 * 행을 넣기 시작하면 이 목록에 섞인다. **그 행들은 이 화면이 켜고 끌 수 있는 것이 아니다**
 * (서버가 학생의 부여·철회를 `self_study_summary` 하나로 막는다). 그래서 이 목록을
 * 「내가 켠 것」으로 곧장 세면 안 되고, 아래 `isStudentGrantable` 로 걸러서 센다.
 */
export type ConsentItem = MyConsentRow;

/**
 * 학생이 **스스로 켜고 끌 수 있는** 종류. 지금은 하나뿐이다 — 동의는 타입별로 쪼갠다(계약 §0).
 *
 * 서버의 `STUDENT_GRANTABLE_TYPES` 에 **매여 있다.** 여기 글자를 손으로 적어 두면 서버가
 * 이름을 바꿨을 때 화면은 조용히 통과하고 부여 요청만 400 으로 되돌아온다.
 */
export type ConsentType = StudentGrantableType;

/**
 * 범위 — 학생이 고르는 **라벨**이다. 날짜가 아니다.
 *
 * 서버의 `SCOPE_LABELS` 에 매여 있다(`expiryFor` 가 이 라벨에서 만료를 짓는다). 값을 여기
 * 다시 적지 않는 이유가 그거다 — 세 글자가 어긋나면 서버가 모르는 라벨이 되어 400 이 된다.
 * 라벨마다 붙는 설명 문구는 화면 카피라 고르기 판이 따로 든다(`share-item.tsx`).
 */
export type ConsentScopeLabel = ScopeLabel;

/**
 * 이 행이 학생이 켜고 끌 수 있는 것인가 — 목록에서 **남의 인가 모델 위의 동의**를 가른다.
 *
 * 서버가 `isStudentGrantableType` 으로 부여·철회를 막는 그 경계를, 화면에서는 「내가 준
 * 것으로 세도 되는가」에 쓴다. 이 술어 없이 `consents.length` 를 세면 교사 승인으로 생긴
 * 주간 리포트 동의 하나가 프로필에 「보여드리는 중」으로 뜨는데, 정작 공유 화면에는 켜진
 * 줄이 하나도 없다 — 학생이 끄러 와서 끌 것을 못 찾는다.
 * @param row - 서버가 준 동의 한 줄
 * @returns 이 화면이 책임지는 종류면 true
 */
export function isStudentGrantable(row: ConsentItem): boolean {
  return STUDENT_GRANTABLE_TYPES.includes(row.type as StudentGrantableType);
}

/** 학생이 켜고 끌 수 있는 종류 전부 — 서버 목록을 화면 쪽에 그대로 옮겨 둔 것. */
const STUDENT_GRANTABLE_TYPES: readonly ConsentType[] = ['self_study_summary'];

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙는다 — 역할 전환으로 신원이 바뀌면 캐시가 갈린다
 * (선례: `hooks/api/classroom.ts`). 안 넣으면 서연이 준 동의가 민준 화면에 남는다.
 */
export const consentKeys = {
  mine: ['my-consents'] as const,
};

/**
 * `GET /api/me/consents` — 내가 지금 주고 있는 것.
 *
 * 신원이 없으면 **요청을 내보내지 않는다**(`enabled`). 그 상태에는 로컬 정본이 없어서
 * 화면이 「지금은 공유를 켤 수 없어요」를 그린다 — 빈 목록으로 그리지 않는다.
 * @returns react-query 결과(`data.parent` · `data.consents`)
 */
export function useMyConsents(): UseQueryResult<MyConsentsResponse, ApiClientError> {
  const userId = useCurrentUserId();
  const hasServerIdentity = useHasServerIdentity();

  return useQuery<MyConsentsResponse, ApiClientError>({
    queryKey: [...consentKeys.mine, userId],
    queryFn: () => apiGet<MyConsentsResponse>('/api/me/consents'),
    enabled: hasServerIdentity,
    retry: retryUnlessGuarded,
  });
}

/**
 * `POST /api/me/consents` — 보여드리기 시작.
 *
 * 멱등이다(계약 §2) — 이미 살아 있는 동의가 있으면 새 행이 아니라 **범위가 갱신**된다.
 * 그래서 화면은 「이미 켜져 있나」를 먼저 묻지 않고 그냥 보낸다.
 * @returns mutation. 성공하면 동의 목록을 다시 읽는다.
 */
export function useGrantConsent(): UseMutationResult<
  GrantConsentResponse,
  ApiClientError,
  GrantConsentInput
> {
  const queryClient = useQueryClient();
  return useMutation<GrantConsentResponse, ApiClientError, GrantConsentInput>({
    mutationFn: (input) => apiPost<GrantConsentResponse>('/api/me/consents', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consentKeys.mine });
    },
  });
}

/**
 * `DELETE /api/me/consents/[type]` — 그만 보여드리기.
 *
 * 서버는 행을 **지우지 않고** `revoked_at` 을 찍는다(계약 §1 — 이 표는 감사 기록이다).
 * 그래서 이 훅의 성공은 「없어졌다」가 아니라 「오늘부로 끊겼다」는 뜻이고, 화면의 문구도
 * 그렇게 적혀 있어야 한다. 이미 보여드린 것은 되돌아오지 않는다.
 *
 * `revoked:false` 는 **실패가 아니다** — 거둘 게 없었다는 뜻이라 화면은 성공과 똑같이
 * 다룬다(부르는 쪽의 뜻은 「이건 공유되지 않아야 한다」이고 그건 이미 이뤄져 있다).
 * @returns mutation. 성공하면 동의 목록을 다시 읽는다.
 */
export function useRevokeConsent(): UseMutationResult<
  RevokeConsentResponse,
  ApiClientError,
  { type: ConsentType }
> {
  const queryClient = useQueryClient();
  return useMutation<RevokeConsentResponse, ApiClientError, { type: ConsentType }>({
    mutationFn: ({ type }) =>
      apiDelete<RevokeConsentResponse>(`/api/me/consents/${encodeURIComponent(type)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: consentKeys.mine });
    },
  });
}
