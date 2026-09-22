'use client';

/**
 * 학생 과제 읽기 — 목록과 상세가 같이 쓰는 한 벌. 정본은 pullim-api 다.
 *
 * `GET /classbot/assignments?audience=student` · `GET /classbot/assignments/:id`(문항 포함) —
 * 2026-09-16 계획 §06 R7·R8 · §09 PR 4. 서버의 술어는 「현재 멤버 AND (타겟 없음 OR 본인 타겟)」
 * (pullim-api authz.md §1.5)이라 반 전체에 쏜 과제도 여기로 온다. 남의 과제는 404 다.
 *
 * 종전에는 같은 오리진 `/api/assignments*` 를 개발용 신원 쿠키로 쳤고, 401 이면 화면이 데모 스토어로
 * 갈아탔다. 이제 신원은 OS 세션(`useAuth`)이고 401 은 로그인으로 간다(`lib/api/classbot-client.ts`).
 * `isUnauthenticated` 는 그 리다이렉트가 도는 사이 화면이 오류 카드 대신 로그인 안내를 그리게 남겨 둔 값이다.
 * 데모 폴백(`useMergedAssignments`·`useAssignmentLookup`·`pullim-assignments` persist)은 PR 6 에서 걷었다 —
 * 목록·상세·풀이·결과·대화 **다섯 화면이 이 파일 하나만** 읽는다.
 *
 * queryKey 접두사는 `['student-read', …]` 그대로 둔다 — `useJoinByCode()`·`useSubmitAssignment()`·
 * `useDispatchAssignment()` 가 그 접두사로 무효화하므로, 새 반·새 제출·새 과제가 목록에 바로 따라 들어온다.
 *
 * 화면은 종전 행 모양(`AssignmentReadRow`)을 그대로 읽는다 — 서버 DTO 를 그 모양으로 옮기는 것이
 * 아래 `toAssignmentReadRow` 다. 서버에 **없는 칸**은 이렇게 채운다(줄마다 이유):
 *  - `botId` ← `classId` — bot == class(ADR-063). 화면의 봇 조인 키가 그대로 선다.
 *  - `studentId: null` — 서버는 대상 표(`assignment_targets`)를 학생 응답에 싣지 않는다. 술어는 서버가 집행.
 *  - `completedCount` — 「몇 번까지 풀었나」를 담는 칸은 여전히 정본에 없다(중간 저장·이어서 풀기는 별건 설계).
 *    그래서 진행도가 아니라 **제출 여부의 투영**이다 — 냈으면 `questionCount`, 안 냈거나 모르면 0.
 *  - `recentAccuracy: null` — 정본에 그 개념이 없다.
 *  - `assignedBy: ''` — 교사 표시명이 응답에 없다(계획 §10 해소 5 · pullim-api PR 2 members 조인). 모르는 것을
 *    지어내지 않는다 — 화면이 반 봇 이름을 먼저 쓰고, 그것도 없을 때의 「선생님」은 화면의 폴백이다
 *    (`assignment/page.tsx`).
 *  - `source: 'teacher-assigned'` · `reasonHint: null` · `scopeOverride: null` — 정본에 그 개념이 없다.
 *  - `dDay` 는 서버가 **낼 때 굳힌 정수**다(`due_at` 컬럼이 없어 다시 세지 않는다). `dispatchedAt` 부터 지난 날수를 빼
 *    지금 기준으로 다시 센 뒤(`remainingDDay`) 라벨로 만든다(`lib/assignment-labels.ts` — `parseDDay` 가 읽는 형태).
 *  - `mode`·`difficulty`·`state` 는 서버가 string 으로 열어 둔 칸이다 — 교사가 낼 때 이 앱의 union 값을
 *    보내므로 그대로 좁히고, 낯선 값은 가장 보수적인 쪽(연습·중·todo)으로 접는다.
 *
 * ## 제출 여부는 `state` 가 아니라 본인 제출 세 칸에서 읽는다 (pullim-api #681)
 *
 * `assignments.state` 는 **과제 한 건에 하나뿐인 칸**이고 교사가 낼 때 보낸 값이 그대로 돌아온다 —
 * 이 앱의 배포 폼은 늘 `'todo'` 를 보내므로 그 값은 누가 무엇을 내든 영영 `'todo'` 다. 그래서 그것으로
 * 「냈는가」를 판정하면 **낸 과제가 계속 안 낸 것으로 보인다.** #681 이 요청자 본인의 `submissions` 행에서
 * 오는 `submitted`·`submittedAt`·`scorePercent` 를 목록과 상세 양쪽에 실어 그 자리를 채운다.
 *
 * ⛔ **갈래는 셋이다 — 「모른다」를 「안 냄」으로 접지 마라**
 * (`hooks/api/classroom.ts` `useClassDetail` 머리주석의 「모른다 · 없음 · 이 값」과 같은 규칙):
 *
 * | 서버가 준 것 | 뜻 | 행의 `submitted` |
 * |---|---|---|
 * | 키 자체가 없다(`undefined`) | **모른다** — #681 배포 전 서버다 | `null` |
 * | `null` | **모른다** — 운영자 관점이라 「내가 냈나」가 성립하지 않는다 | `null` |
 * | `false` | **안 냈다** — 서버가 그렇게 말했다 | `false` |
 * | `true` | **냈다** | `true` |
 *
 * 앞의 둘을 한 값(`null`)으로 합치는 것은 **화면이 할 답이 같아서**다 — 둘 다 「이 학생이 냈다고도 안 냈다고도
 * 말할 수 없다」이고, 그래서 **이 FE 를 #681 보다 먼저 머지해도 안전하다**(`classNameOf` 의 `?? card.name`
 * 폴백과 같은 장치다 — 서버가 세 칸을 싣기 시작하면 저절로 맞아진다).
 *
 * ⚠ **다만 「아무것도 안 달라진다」는 아니다.** 옛 서버에서는 모든 행이 `null` 로 떨어지므로, 제출 여부를
 * 읽어서 그리던 것이 **전부 사라진다** — 실제로 없어지는 것 넷:
 *  1. 목록 상단 KPI 바 자체(`assignment/page.tsx` — 「냈어요 / 아직이에요」)
 *  2. 봇 묶음 머리줄의 진척 막대와 `N/N문항`
 *  3. 카드의 진척 막대와 `N/N`(글자 라벨 칩은 남고, 막대가 사라진 만큼 `ml-auto` 로 우측에 붙는다)
 *  4. 문항 수가 0 인 과제의 「완료」 칩 — 종전엔 `0 >= 0` 이 참이라 완료로 섰다(`assignment-state.ts`)
 *
 * **달라지는 것이 「일부러 걷어 낸 것」뿐이라서** 안전한 것이다. 넷 다 근거가 같다 — 그 수·막대·칩이
 * 말하던 「얼마나 했나」를 지금 서버가 말해 주지 않고, 0 을 그려 두면 그게 「안 했다」로 읽힌다.
 * 남는 것(제목·범위·난이도·마감 칩·모드 배지·글자 라벨)은 종전 그대로다.
 *
 * **걷을 조건**: #681 이 prod 까지 가서 모든 응답이 세 칸을 싣게 되면 `classbot-dto.ts` 의 `?` 를 떼고
 * 여기 `?? null` 을 지운다(타입이 남은 자리를 짚어 준다).
 *
 * 문항은 `toStudentQuestion` 이 옮긴다 — 정본 문항에는 **배점·정답·힌트·기준 응답이 없다**(🔒 answerKey 는 서버
 * 전용, 나머지는 칸 자체가 없다). 풀이·대화 화면이 읽는 `AssignmentQuestion` 모양으로 맞추되 그 칸들은 비운다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import type {
  AssignmentReadRow,
  AssignmentsReadResponse,
} from '@/hooks/api/read/types';
import {
  classbotRead,
  isNotFound,
  isUnauthorized,
  retryUnlessClientError,
} from '@/lib/api/classbot-client';
import type {
  AssignmentDetailDto,
  AssignmentQuestionDto,
  AssignmentSummaryDto,
  SubmissionDto,
} from '@/lib/api/classbot-dto';
import { remainingDDay } from '@/lib/assignment-due';
import { dDayLabel, dispatchedAtLabel } from '@/lib/assignment-labels';
import { useAuth } from '@/lib/auth/auth-context';
import type { AssignmentQuestion, QuestionType } from '@/lib/mock';

// 라벨 둘은 `lib/assignment-labels.ts` 로 옮겼다(교사 화면도 읽는다) — 호출부·테스트 경로 유지용 재수출.
export { dDayLabel, dispatchedAtLabel };

/** 상세 한 건 — 목록 행에 문항이 붙는다. 🔒 answerKey 없음. */
export type VisibleAssignmentRow = AssignmentReadRow & {
  questions: AssignmentQuestionDto[];
};

const MODES = ['practice', 'exam', 'wrong-conquest'] as const satisfies readonly AssignmentReadRow['mode'][];
const DIFFICULTIES = ['하', '중', '상'] as const satisfies readonly AssignmentReadRow['difficulty'][];
const STATES = ['todo', 'in-progress', 'submitted', 'overdue'] as const satisfies readonly AssignmentReadRow['state'][];
const QUESTION_TYPES = ['mc', 'short', 'essay', 'numeric'] as const satisfies readonly QuestionType[];

/** 서버가 string 으로 준 값을 화면 union 으로 좁힌다 — 목록에 없으면 폴백. 캐스팅 없이 `find` 로. */
function narrow<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((v) => v === raw) ?? fallback;
}

/**
 * 정본 문항 → 풀이·대화 화면이 읽는 `AssignmentQuestion`.
 *
 * `order` 는 정렬한 자리(1부터)로 다시 매긴다 — 서버 값은 0부터고 화면은 「n번」으로 부른다. `options` 는 blob 이라
 * 문자열만 남긴다(교사가 이 앱에서 낸 값은 문자열 배열이다). **`points: 0` 은 「모른다」다** — 정본에 배점 칸이
 * 없고, 학생 화면은 배점을 그리지 않는다. 힌트·기준 응답·정답도 없다 — 힌트 패널은 「힌트 없이 풀어봐요」로 선다.
 * @param dto - 정본 문항
 * @param assignmentId - 소속 과제
 * @param order - 정렬한 자리(1-based)
 */
export function toStudentQuestion(
  dto: AssignmentQuestionDto,
  assignmentId: string,
  order: number,
): AssignmentQuestion {
  const type = narrow(dto.type, QUESTION_TYPES, 'short');
  const options = Array.isArray(dto.options)
    ? dto.options.filter((o): o is string => typeof o === 'string')
    : [];
  return {
    id: dto.id,
    assignmentId,
    order,
    type,
    prompt: dto.prompt,
    points: 0,
    ...(type === 'mc' && options.length > 0 ? { options } : {}),
  };
}

/**
 * 상세 한 건의 문항 전부 — 서버 순서(`order`)로 정렬해 1번부터 매긴다.
 * @param row - `useVisibleAssignment` 가 준 행
 */
export function studentQuestionsOf(row: VisibleAssignmentRow): AssignmentQuestion[] {
  return [...row.questions]
    .sort((a, b) => a.order - b.order)
    .map((q, i) => toStudentQuestion(q, row.id, i + 1));
}

/**
 * 정본 요약 DTO → 화면 행. 서버에 없는 칸의 채움 규칙은 파일 머리주석.
 * @param dto - `AssignmentSummaryResponseDto` 한 행
 * @param now - 기준 시각(D-day 를 지금 기준으로 다시 세는 데 쓴다 · 테스트 주입용)
 * @returns 목록 카드·상세가 읽는 행
 */
export function toAssignmentReadRow(dto: AssignmentSummaryDto, now: number = Date.now()): AssignmentReadRow {
  // 키가 없으면(`undefined`) 운영자 관점의 `null` 과 같은 답 — 「모른다」다. 머리주석의 표가 권위.
  const submitted = dto.submitted ?? null;
  return {
    id: dto.id,
    botId: dto.classId,
    studentId: null,
    title: dto.title,
    scope: dto.scope,
    subject: dto.subject,
    grade: dto.grade,
    chapterFrom: dto.chapterFrom ?? '',
    chapterTo: dto.chapterTo ?? '',
    achievementCodes: dto.achievementCodes ?? [],
    questionCount: dto.questionCount,
    difficulty: narrow(dto.difficulty, DIFFICULTIES, '중'),
    mode: narrow(dto.mode, MODES, 'practice'),
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '',
    assignedAtLabel: dispatchedAtLabel(dto.dispatchedAt),
    dueLabel: dto.dueLabel,
    dDay: dDayLabel(remainingDDay(dto.dDay, dto.dispatchedAt, now)),
    // 진행도가 아니라 제출 여부의 투영이다(머리주석) — 「모른다」는 0 쪽으로 둔다. 0 이 「안 냈다」를 뜻하지는
    // 않는다: 카드가 「완료」를 말할지 말지는 `submitted` 가 정한다(`lib/tokens/assignment-state.ts`).
    completedCount: submitted === true ? dto.questionCount : 0,
    recentAccuracy: null,
    submitted,
    submittedAt: dto.submittedAt ?? null,
    scorePercent: dto.scorePercent ?? null,
    state: narrow(dto.state, STATES, 'todo'),
    reasonHint: null,
    solveHref: `/classbot/assignment/${dto.id}/solve?step=1`,
  };
}

/**
 * 정본 상세 DTO → 화면 행 + 문항.
 * @param dto - `AssignmentDetailResponseDto`
 * @param now - 기준 시각(테스트 주입용)
 * @returns 상세가 읽는 행
 */
export function toVisibleAssignmentRow(dto: AssignmentDetailDto, now: number = Date.now()): VisibleAssignmentRow {
  return { ...toAssignmentReadRow(dto, now), questions: dto.questions };
}

/**
 * 「내 제출」에 대해 화면이 말할 수 있는 것 — **세 갈래다.** 둘(`냈다`/`안 냈다`)로 접으면 못 읽은 것을
 * 「안 냈다」로 단언하게 된다.
 */
export type MySubmissionView =
  /** 모른다 — 이 서버가 아직 본인 제출 칸을 안 싣거나(#681 전), 운영자 관점이라 그 개념이 없다. */
  | { kind: 'unknown' }
  /** 서버가 「안 냈다」고 말했다. */
  | { kind: 'not-submitted' }
  /** 냈다. `scorePercent` 의 `0` 은 0점이고 `null` 은 「점수가 아직 없다」(미채점)다. */
  | { kind: 'submitted'; scorePercent: number | null; submittedAt: string | null; gradedAt: string | null };

/**
 * 과제 한 건에 대한 내 제출 상태 — 서버 행과 이 세션의 제출 응답을 합쳐 위 셋 중 하나로 답한다.
 *
 * 세션 응답(`lib/store/submission-result.ts` · 방금 낸 것)이 있으면 그게 가장 최신이라 먼저다 —
 * 목록 캐시가 아직 옛 행을 들고 있어도 방금 낸 사실은 확실하다. 없으면 서버 행이 답하고, 서버가
 * 모르면 **모른다로 남긴다.**
 * @param row - 목록·상세가 준 행
 * @param submission - 이 세션에서 방금 낸 제출 응답(없으면 undefined)
 * @returns 화면이 그릴 세 갈래 중 하나
 */
export function mySubmissionOf(
  row: Pick<AssignmentReadRow, 'submitted' | 'submittedAt' | 'scorePercent'>,
  submission?: SubmissionDto,
): MySubmissionView {
  if (submission) {
    return {
      kind: 'submitted',
      scorePercent: submission.scorePercent,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    };
  }
  if (row.submitted === true) {
    // 서버 행에는 채점 시각 칸이 없다 — 지어내지 않고 제출 시각만 말한다.
    return { kind: 'submitted', scorePercent: row.scorePercent, submittedAt: row.submittedAt, gradedAt: null };
  }
  if (row.submitted === false) return { kind: 'not-submitted' };
  return { kind: 'unknown' };
}

/** 목록 읽기 결과 — 인증 게이트가 반영된 모양(`StudentReadResult` 와 같은 계약). */
export interface VisibleAssignmentsResult {
  data: AssignmentsReadResponse | undefined;
  isLoading: boolean;
  /** 401 — 로그인으로 가는 중이다. 호출부는 오류 카드 대신 게이트를 그린다. */
  isUnauthenticated: boolean;
  isError: boolean;
  refetch: UseQueryResult<AssignmentsReadResponse>['refetch'];
}

/**
 * `GET /classbot/assignments?audience=student` — 내가 볼 수 있는 과제 전부.
 *
 * 세션 복원 전과 비로그인(리다이렉트 중)에는 묻지 않는다 — 그동안은 `isLoading` 이다.
 * 빈 상태를 먼저 그리고 나중에 목록이 나타나는 깜빡임을 막는다.
 * @returns 과제 목록과 상태
 */
export function useVisibleAssignments(): VisibleAssignmentsResult {
  const { user, isReady } = useAuth();
  const query = useQuery<AssignmentsReadResponse, ApiError>({
    queryKey: ['student-read', 'assignments', user?.id ?? null],
    queryFn: async () => {
      const rows = await classbotRead<AssignmentSummaryDto[]>('/assignments?audience=student');
      // `.map(toAssignmentReadRow)` 로 넘기면 안 된다 — 두 번째 인자 `now` 자리에 배열 인덱스(0,1,…)가 들어가
      // 모든 행의 D-day 가 1970 년 기준으로 세어진다(테스트가 「D-20715」로 잡았다). 한 번 잰 `now` 를 명시해 넘긴다.
      const now = Date.now();
      return { assignments: rows.map((row) => toAssignmentReadRow(row, now)) };
    },
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });

  const unauthenticated = isUnauthorized(query.error);
  return {
    data: query.data,
    isLoading: query.isPending,
    isUnauthenticated: unauthenticated,
    isError: query.isError && !unauthenticated,
    refetch: query.refetch,
  };
}

/** 단건 읽기 결과 — 404(없음)를 따로 알려 준다. */
export interface VisibleAssignmentResult {
  data: VisibleAssignmentRow | undefined;
  isLoading: boolean;
  isUnauthenticated: boolean;
  /** 404 — 내가 볼 수 있는 과제 중에 그 id 가 없다(남의 반 과제도 여기다). */
  isNotFound: boolean;
  isError: boolean;
  refetch: UseQueryResult<VisibleAssignmentRow>['refetch'];
}

/**
 * `GET /classbot/assignments/:id` — 과제 단건(문항 포함). 목록과 **같은 술어**를 쓴다.
 * @param id - 과제 id
 * @returns 과제 한 건과 상태
 */
export function useVisibleAssignment(id: string): VisibleAssignmentResult {
  const { user, isReady } = useAuth();
  const query = useQuery<VisibleAssignmentRow, ApiError>({
    queryKey: ['student-read', 'assignment', id, user?.id ?? null],
    queryFn: async () =>
      toVisibleAssignmentRow(
        await classbotRead<AssignmentDetailDto>(`/assignments/${encodeURIComponent(id)}`),
      ),
    enabled: isReady && user !== null && Boolean(id),
    retry: retryUnlessClientError,
  });

  const unauthenticated = isUnauthorized(query.error);
  const notFound = isNotFound(query.error);
  return {
    data: query.data,
    isLoading: query.isPending,
    isUnauthenticated: unauthenticated,
    isNotFound: notFound,
    isError: query.isError && !unauthenticated && !notFound,
    refetch: query.refetch,
  };
}
