/**
 * 피드백 루프 — 학생이 낸 답이 교사에게 닿는가.
 *
 * ## 2026-09-20 재작성 — 이 스펙이 딛고 서 있던 세계가 은퇴했다
 *
 * 종전 판은 **브라우저 localStorage 가 과제·제출의 정본이던 시절**의 스펙이었다. 그 시절이
 * #350(계획 PR 4)·#352(계획 PR 6)에서 끝났고, 스펙만 남아 여섯 자리가 **거짓**이 돼 있었다.
 * 고친 것과 근거를 한 줄씩 적어 둔다 — 「왜 이렇게 바뀌었나」를 다시 묻지 않게:
 *
 * | 걷어낸 단언 | 왜 거짓인가 |
 * |---|---|
 * | `[data-testid^="progress-as_user_"]` 의 `0/N` → `1/N` | **그 testid 가 앱에 없다.** 「학생 풀이 진행 N/M문항」은 localStorage 제출 기록 합산이라 정본과 함께 걷혔다 — `app/(teacher)/teacher/classbot/page.tsx` 의 `DispatchedAssignments` 머리 주석이 「학생 풀이 진행은 과제 상세(`/submissions`)가 답한다」고 적어 둔 자리다 |
 * | `getByText('방금 제출')` | **그 글자가 앱에 없다.** 위와 같은 자리에서 함께 걷혔다 |
 * | `localStorage['pullim-assignments']` 가 `submissions`·`scorePercent` 를 담을 것 | **뒤집혔다.** 앱은 이제 그 키를 rehydrate 뒤 **지운다**(`lib/store/assignments.ts` 의 `RETIRED_STORAGE_KEY`). 앱의 jest 는 그 키가 `null` 임을 단언한다(`app/(student)/classbot/assignment/__tests__/use-assignment-submit.test.tsx`). 이 스펙만 반대를 요구하고 있었다 |
 * | `as_user_\d+` URL 모양 | 그 접두사는 브라우저가 붙이던 것이고 그 레인이 은퇴했다. **id 는 이제 서버가 준다** — 모양을 알 수 없으므로 가리지 않는다 |
 * | `pullim-class-enrollment` 시딩 | **무효다.** 서버가 401 을 줄 때 그 localStorage 의 데모 방으로 갈아타던 폴백을 걷었다(`components/classbot/home/my-rooms.ts`) |
 * | 낸 뒤 `/teacher/classbot` 에 서고, 거기 `dispatched-row-<id>` 에서 과제 id 를 읽는다 | **도착지와 testid 가 함께 옮겨 갔다** — 같은 `1a14886` 이 바꾼 자리다. 폼은 낸 과제 목록으로 보낸다(`app/(teacher)/teacher/assignment/new/assignment-form.tsx:324` 의 `router.push('/teacher/assignment')`). 되돌려 주는 리다이렉트는 **없다** — 이 앱에는 `middleware.ts` 도 `next.config.ts` 의 `redirects` 도 없다. 그리고 `dispatched-row-<id>` 는 `/teacher/classbot` 에만 있고(`app/(teacher)/teacher/classbot/page.tsx:784`), 도착하는 화면의 줄은 `assignment-row-<id>` 다(`app/(teacher)/teacher/assignment/page.tsx:232` · 제목은 같은 줄 안 `:245`). 그래서 둘 다 그 화면 것으로 고쳤다 |
 *
 * **화면이 깨진 게 아니라 옮겨 간 것이다.** 그래서 스펙을 옮겨 간 자리로 따라 보낸다 —
 * 교사가 학생별 진행을 읽는 곳은 과제 상세(`/teacher/assignment/<id>` 의 `submissions-list`)이고,
 * 학생 점수는 제출 응답을 든 **저장하지 않는** 스토어(`lib/store/submission-result.ts`)다.
 *
 * ## 전제가 더 있다 — 제목만으로는 「과제 내기」가 열리지 않는다
 *
 * `canDispatch` 는 제목만 보지 않는다(`assignment-form.tsx:285`–`:287`):
 * 반 · **과목 · 학년** · 마감과 함께 **문항 차단 사유 없음**(`blockedReason === null`)을 요구한다.
 *
 * ⑴ **문항** — 폼이 처음 세우는 5문항(객관식·객관식·단답·수치·서술 —
 * `question-editor.tsx:126` 의 `createDefaultQuestions`)은 발문이 전부 비어 있어
 * `questionBlockedReason()` 이 그 자리에서 막는다(`assignment-form.tsx:267`
 * 「모든 문항의 발문을 써야 낼 수 있어요」). 발문을 채워도 객관식·단답·수치는 정답이,
 * 서술형은 채점 기준 **둘**이 더 필요하다(`hasGradableAnswer` · `missingRubricNumbers` ·
 * `rubricWeightMismatchNumbers`).
 *
 * ⑵ **과목·학년** — #376 이 더한 관문 둘이다(`subjectValid`·`gradeValid` — `:197`·`:198`).
 * **이 둘은 `blockedReason` 에 들어가지 않는다** — 그래서 문항을 다 채워
 * `dispatch-blocked` 가 사라져도 버튼은 잠긴 채일 수 있다. 자동 채움(봇 → 반)이 비운 반에서
 * 그렇다(`:183`–`:186`).
 *
 * **그래서 #352 뒤로 이 레인은 첫 단계에서 죽어 있었다** — `fillAssignmentTitle` 의 `toPass` 가
 * 「버튼 활성」 증인을 못 보고 15초를 돌다 **이유를 말하지 못한 채** 던진다. 문항과 두 칸을
 * 화면에서 실제로 채우는 `authorDispatchableAssignment`(`helpers.ts`)를 앞에 세워 그 자리를
 * 살린다 — 문항 값과 testid 는 앱의 jest 가 같은 최소치를 채우는 자리에서 그대로 옮겼고
 * (`app/(teacher)/teacher/assignment/new/__tests__/assignment-form.test.tsx:125`–`:137` 의
 * `authorAllDefaults`), 과목·학년은 **비어 있을 때만** 적는다(자동 채움을 덮지 않는다).
 * 없는 전제를 `test.fixme` 로 덮는 대신 **세우는** 쪽을 골랐다 — 그래야 이 스펙이 시드 자료의
 * 질에 매달리지 않는다.
 *
 * ## ⚠ 이 파일은 실제 과제를 **쓴다** — prod 에 대고 돌리지 마라
 *
 * 아래 두 검사는 매번 `PLAYWRIGHT_BASE_URL` 이 가리키는 곳에 과제를 하나씩 내고 **지우지 않는다**
 * (정본에 지우는 문이 없다). 지금 무해한 것은 prod-verify 가 `anon` · `login-student` ·
 * `login-teacher` 세 프로젝트만 부르고 이 파일의 프로젝트(`mixed-role-pending`)는 부르지 않기
 * 때문이다(`.github/workflows/prod-verify.yml:114`·`:124`·`:134`). 그 레인에 이 파일을 올리려면
 * **뒷정리를 먼저 붙여야 한다.**
 *
 * ## 이 파일이 아직 `mixed-role-pending` 인 이유는 그대로다 — 그 레인은 교사 세션뿐이다
 *
 * 한 브라우저에서 교사와 학생을 오가는데 OS 계정은 역할이 고정이라, 역할별 파일로 다시 쓰기
 * 전에는 어느 로그인 레인에서도 절반이 빨개진다. 그 분리는 `playwright.config.ts` 의
 * `MIXED_ROLE_SPECS` TODO(PR 6 e2e 트랙)가 인도한다 — **이 재작성은 그 트랙이 아니다.**
 * 여기서 한 일은 「거짓이 된 단언을 사실로 되돌린 것」까지다.
 *
 * ⚠ 그래서 **아래 학생 절반은 이 레인에서 통과할 수 없다.** `mixed-role-pending` 은 교사
 * storageState 로만 돈다(`playwright.config.ts:130`–`:134`). 교사 세션이 `/classbot/assignment` 로
 * 가면 학생 레이아웃의 RoleGuard 가(`app/(student)/layout.tsx:10` → `role-guard.tsx:88`·`:97`)
 * `homePathForRole('teacher')` = `/teacher` 로 돌려보낸다. 같은 사실을 config 의 TODO 가
 * 「절반이 반드시 빨개진다」로 적어 뒀다. **이 스펙은 그걸 고치지 않는다 — 대신 조용한 초록이
 * 되지 않게만 한다**(아래 [2] 의 URL 못박기).
 *
 * 검증 핵심(지금 사실인 것만):
 *  1. 교사가 낸 과제가 학생 목록에 서고, 학생이 제출하면 그 제출이 **교사 과제 상세**에 선다
 *  2. 결과 화면은 제출 직후 **서버가 센 점수**(또는 서술형 대기)를 그린다
 *  3. 새로고침하면 그 점수는 비고 화면이 **그 사실을 말한다** — 제출의 정본은 서버다
 */

import { test, expect, type Page } from '@playwright/test';
import { authorDispatchableAssignment, fillAssignmentTitle, solveAllAndSubmit } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

/**
 * 과제 id 를 **가리지 않는** URL 모양. 서버가 주는 id 라 접두사도 자릿수도 알 수 없다 —
 * 종전의 `as_user_\d+` 는 브라우저가 붙이던 모양이었고 그 레인은 은퇴했다.
 *
 * `[^/]+` 가 사 주는 것은 **id 가 한 칸을 넘지 않는다**는 것뿐이다 — `…/assignment/a/b/solve` 처럼
 * 여러 칸이 끼어든 경로는 걸리지 않는다. 뒤는 막아 주지 않는다: 끝 고정이 없어 `…/solve/무언가` 도
 * 그대로 매치한다. 그런 경로가 앱에 없어 그대로 둔다. `RESULT_URL` 은 `$` 로 끝을 막는다.
 */
const SOLVE_URL = /\/classbot\/assignment\/[^/]+\/solve/;
const RESULT_URL = /\/classbot\/assignment\/[^/]+\/result$/;

/**
 * 교사가 낸 과제 하나를 학생이 풀어 제출하기까지 — 두 검사가 같이 쓰는 앞부분.
 *
 * 전제를 못 세우면(반이 없다 · 그 반의 학생이 아니다) **이유를 적고 건너뛴다.** 없는 전제를
 * 실패로 적지 않는 것은 이 리포의 기존 방식이다(`sso-login-roundtrip.spec.ts`, 아래 시드 검사).
 * @param page - 교사·학생 화면을 오가는 페이지
 * @param title - 낼 과제 제목(5~50자). **제목만으로는 「과제 내기」가 열리지 않는다** — 문항까지
 *   채워야 한다(머리주석 「전제가 하나 더 있다」)
 * @returns 서버가 준 과제 id — 뒤이어 교사 상세를 열 때 쓴다
 */
async function dispatchSolveAndSubmit(page: Page, title: string): Promise<string> {
  // [1] 교사: 과제 내기
  await page.goto(BASE + '/teacher/assignment/new', { waitUntil: 'networkidle' });

  /*
    반 조회가 **정착할 때까지** 기다린 뒤에 본다. `class-select` 는 조회 중에도 서 있으므로
    (「반을 불러오는 중…」 한 줄 — `assignment-form.tsx:401`) 그것이 있다는 사실은 정착이 아니다.
    정착의 증인은 셋이다: 반이 있으면 select 의 `disabled` 가 풀리고
    (`assignment-form.tsx:395` — `disabled={classes.length === 0}`), 없으면 `rooms-empty`(`:370`),
    못 읽으면 `rooms-error`(`:361`) 가 선다. **갓 띄운 페이지에서는 셋이 배타적이다** — 캐시가
    없어 `isError` 면 `classes` 도 비고, 그래서 select 는 잠긴 채다(strict mode 에 안 걸린다).
    셋 다 React Query 가 답한 뒤에야 갈리는데
    하이드레이션은 `networkidle` 뒤에 오므로(`fillAssignmentTitle` 머리주석의 #294 실측),
    기다리지 않고 `isVisible()` 로 물으면 **언제나 「없다」** 가 돌아온다.
  */
  await expect(
    page
      .getByTestId('rooms-empty')
      .or(page.getByTestId('rooms-error'))
      .or(page.locator('[data-testid="class-select"]:not([disabled])')),
  ).toBeVisible({ timeout: 15_000 });

  // 반이 없거나 못 읽으면 낼 곳이 없어 폼 전체가 뜻을 잃는다 — 그때 폼은 「아직 운영하는 반이
  // 없어요」/「반을 불러오지 못했어요」로 선다. 위에서 정착을 기다렸으므로 여기 답은 사실이다.
  const noRooms =
    (await page.getByTestId('rooms-empty').count()) > 0
    || (await page.getByTestId('rooms-error').count()) > 0;
  test.skip(noRooms, '이 계정에는 과제를 낼 반이 없다 — 반이 있어야 「과제 내기」가 열린다');

  // 문항 다섯과, 자동 채움이 비운 과목·학년을 먼저 채운다 — 넷 다 「과제 내기」를 막는 관문이다
  // (머리주석 「전제가 더 있다」 ⑴·⑵). 과목·학년은 비어 있을 때만 적는다.
  await authorDispatchableAssignment(page);

  // 하이드레이션 경합 — 근거는 `fillAssignmentTitle` 머리주석. 그 헬퍼가 「과제 내기」
  // 버튼의 활성까지 확인하고 돌아오므로 여기서 따로 못박지 않는다.
  await fillAssignmentTitle(page, title);
  await page.getByTestId('dispatch-btn').click();
  // 낸 뒤 서는 화면은 **낸 과제 목록**이다(`assignment-form.tsx:324`) — 위 표 여섯째 줄.
  await expect(page).toHaveURL(BASE + '/teacher/assignment');

  // 낸 과제의 id 는 **서버가 준다.** 도착한 화면의 줄 testid(`assignment-row-<id>`)에서 읽는다.
  // 첫 줄을 그냥 집지 않고 **제목으로 좁히는** 이유: 계정에 이미 낸 과제가 있으면 정렬이
  // 어떻든 방금 낸 것을 집는다는 보장이 없다. 제목은 그 줄 안에 있다(`page.tsx:245`).
  const row = page.locator('[data-testid^="assignment-row-"]').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  const rowTestId = await row.getAttribute('data-testid');
  const assignmentId = (rowTestId ?? '').replace('assignment-row-', '');
  expect(assignmentId, '「낸 과제」 줄에서 과제 id 를 읽지 못했다').not.toBe('');

  // [2] 학생: 받은 과제 목록 → 그 과제 → 풀이 → 제출
  await page.goto(BASE + '/classbot/assignment', { waitUntil: 'networkidle' });

  // **먼저 목록 화면이 섰는지 본다.** 아래 skip 이 「없다」를 근거로 건너뛰는데, 화면이 아예 안
  // 서도 「없다」가 되기 때문이다 — 그러면 고장이 조용한 skip 으로 둔갑한다(fail-open).
  // 선 모양은 둘뿐이다: 과제 카드가 있거나, `EmptyState` 한 장(빈 상태·로그인 게이트·오류)이거나.
  await expect(
    page.locator('a[href^="/classbot/assignment/"], [data-testid="empty-state"]').first(),
  ).toBeVisible({ timeout: 10_000 });

  /*
    그 둘만으로는 **fail-open 이 닫히지 않는다.** 위 선택자는 「어느 화면인가」를 묻지 않는데,
    교사 세션은 여기 못 들어온다 — RoleGuard 가 `/teacher` 로 돌려보내고
    (`app/(student)/layout.tsx:10` → `role-guard.tsx:88`·`:97`), 그 화면은 「먼저 볼 학생」 자리에
    `EmptyState` 를 **조건 없이** 그린다(`app/(teacher)/teacher/page.tsx:127`). 그러면 위 단언이
    통과하고 아래 skip 이 「받은 과제에 없다」로 초록이 된다 — 돌려보내진 것을 「과제가 없다」로
    읽는 자리다. 이 파일의 유일한 레인이 교사 세션이라(머리주석 마지막 ⚠) 남의 일도 아니다.

    그래서 **어느 화면에 서 있는지 못박는다.** 위 대기보다 **뒤**에 두는 것이 중요하다:
    돌려보내기는 하이드레이션 뒤의 `router.replace` 라, 도착 직후에는 URL 이 아직
    `/classbot/assignment` 이다. 먼저 물으면 그 순간의 참을 보고 통과해 버린다.
  */
  await expect(page).toHaveURL(/\/classbot\/assignment$/);

  const card = page.locator(`a[href="/classbot/assignment/${assignmentId}"]`);
  // 서버의 술어는 「현재 멤버 AND (타겟 없음 OR 본인 타겟)」이라(pullim-api authz.md §1.5)
  // 낸 반의 학생이 아니면 목록에 아예 오지 않는다 — 그것도 전제를 못 세운 것이다.
  test.skip(
    (await card.count()) === 0,
    '방금 낸 과제가 이 계정의 「받은 과제」에 없다 — 낸 반에 참여한 학생이어야 한다',
  );
  await card.first().click();

  await page.getByTestId('assignment-start-cta').click();
  await page.waitForURL(SOLVE_URL);

  // 모든 문항을 통과해서 제출 (경합 근거는 `solveAllAndSubmit` 머리주석)
  await solveAllAndSubmit(page);
  await page.waitForURL(RESULT_URL, { timeout: 10_000 });

  return assignmentId;
}

test.describe('피드백 루프 — 제출 ↔ 교사 제출 현황', () => {
  /*
    한 검사가 교사 출제(문항 다섯 채우기 포함) → 학생 풀이 → 제출 → 교사 상세까지 밟는다.
    헬퍼들의 내부 대기만 더해도 기본 30초(`playwright.config.ts:84`)를 넘어서, 느린 러너에서는
    이름 없는 Playwright 타임아웃이 먼저 와 `helpers.ts` 가 애써 남기는 진단 문구를 버린다.
    같은 이유로 세워 둔 90초 선례가 setup 프로젝트에 있다(`playwright.config.ts:102`–`:115`).
    config 를 건드리지 않고 이 describe 에만 준다.
  */
  test.describe.configure({ timeout: 90_000 });

  test('학생 제출 → 결과에 서버 점수 → 교사 과제 상세의 제출 현황에 선다', async ({ page }) => {
    const assignmentId = await dispatchSolveAndSubmit(page, '피드백 루프 검증 과제');

    // 제출 **직후**에는 세션 스토어에 결과가 있다 — 자동 채점이면 점수(`result-score`),
    // 서술형이 섞였으면 「선생님 채점 기다리는 중」(`result-ungraded`)이다.
    //
    // ⚠ 여기서 `result-missing` 을 같이 받아 주면 안 된다. 그건 **새로고침 뒤**의 모습이고
    // (아래 검사가 그쪽을 본다), 받아 주는 순간 제출 응답이 스토어에 아예 기록되지 않아도
    // 이 단언이 통과한다 — 「깨진 것도 통과하는 선택자」가 되는 자리다.
    //
    // ⚠ 그리고 이 셋은 **`exam` 모드에는 아예 없다** — 결과 화면이 「결과는 선생님 발표 후
    // 공개돼요」 한 장으로 갈린다(`app/(student)/classbot/assignment/[id]/result/page.tsx:85`–`:95`).
    // 여기서 안전한 까닭은 폼의 기본 모드가 `practice` 이고(`assignment-form.tsx:136`) 이 스펙이
    // 모드를 건드리지 않기 때문이다 — 모드를 고르는 줄을 넣는 날 이 단언도 함께 갈라야 한다.
    await expect(
      page.getByTestId('result-score').or(page.getByTestId('result-ungraded')),
    ).toBeVisible({ timeout: 10_000 });

    // [3] 교사: 학생별 진행을 읽는 곳은 이제 과제 상세다(위 표 첫 줄).
    // 제출 현황은 `GET /classbot/assignments/:id/submissions` 를 읽는다 — 줄이 하나라도 서면
    // 학생의 제출이 서버까지 갔다는 뜻이다. 빈 상태(「아직 낸 학생이 없어요」)면 못 간 것이다.
    await page.goto(`${BASE}/teacher/assignment/${assignmentId}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('submissions-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid^="submission-row-"]').first()).toBeVisible();
  });

  /**
   * 새로고침 — 점수는 **이 세션 안에서만** 살고, 낸 답은 서버에 남는다.
   *
   * 종전에는 `localStorage['pullim-assignments']` 가 `submissions`·`scorePercent` 를 담고 있기를
   * 단언했다. 지금은 **그 반대가 계약이다.** `lib/store/submission-result.ts` 는 저장하지 않는
   * 스토어이고(「제출의 정본은 서버이고, 이 브라우저에 사본을 남기면 다른 기기와 어긋난 채로
   * 오래 산다」), 결과 화면은 새로고침하면 `result-missing` 으로 그 사실을 말한다 —
   * 「점수는 제출하고 바로 그때만 여기서 보여요. 낸 답은 선생님께 가 있어요.」
   *
   * 그래서 이 검사는 **브라우저에 사본을 다시 남기는 회귀를 잡는다.** 누가 제출 결과를 persist 로
   * 되돌리면 새로고침 뒤에도 점수가 남아 `result-missing` 이 서지 않는다.
   */
  test('새로고침 — 점수는 세션 안에서만 살고 화면이 그 사실을 말한다', async ({ page }) => {
    await dispatchSolveAndSubmit(page, '세션 점수 검증 과제');

    await expect(
      page.getByTestId('result-score').or(page.getByTestId('result-ungraded')),
    ).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: 'networkidle' });

    // 같은 결과 화면인데 점수 칸만 바뀐다 — 과제 자체는 서버에서 다시 읽어 오므로 404 가 아니다.
    await expect(page).toHaveURL(RESULT_URL);
    await expect(page.getByTestId('result-missing')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('result-score')).toHaveCount(0);
  });

  /**
   * 학생이 **만들지 않은** 과제도 같은 흐름을 타는가 — 시드 과제(`as_today`) 경로.
   *
   * ⚠ 이 시드는 지금 **없다.** 2026-06-24 출시 빈 상태 정리(`0540828`)가
   * `studentAssignments` 를 빈 배열로 만들었고(「출시: 데모 과제 시드 제거(신규 빈 상태)」),
   * 그래서 `/classbot/assignment/as_today` 는 「과제를 찾을 수 없어요」를 그린다. 되살리면
   * 출시 빈 상태 IA 가 깨진다 — `student-live-and-flows.spec.ts` 의 「빈 홈 … 과제 빈 상태」가
   * 그것을 지킨다.
   *
   * 그래도 **끄지 않는다.** 종전에는 본문 전체가 `if (await startCta.isVisible())` 로
   * 감싸여 있어서, 시드가 사라진 뒤로 이 검사는 **0 assertion 으로 초록**이었다 — 없는 것을
   * 지키는 척하는 검사다. 대신 시드가 없는 것을 **런타임에 못 박고 건너뛴다**
   * (`sso-login-roundtrip.spec.ts` 와 같은 꼴 — 전제가 없으면 이유를 적고 skip).
   *
   * 그래서 이 검사는 **스스로 되살아난다**: 학생이 만들지 않은 과제가 다시 생기는 날
   * (시드가 돌아오거나 서버가 그런 과제를 내려주는 날) 아래 가드가 풀리고 종단 검증이 그대로 돈다.
   *
   * 끝의 단언을 `localStorage['pullim-assignments']` 에서 **결과 화면의 점수 칸**으로 옮겼다 —
   * 그 키는 은퇴했고(위 표), 이 검사가 원래 지키려던 것(「풀이가 끝까지 가서 기록으로 남는가」)은
   * 결과 화면이 답한다.
   */
  test('학생이 만들지 않은 과제도 풀이 → 결과까지 간다', async ({ page }) => {
    await page.goto(BASE + '/classbot/assignment/as_today', { waitUntil: 'networkidle' });

    const startCta = page.getByTestId('assignment-start-cta');
    const seeded = await startCta.isVisible().catch(() => false);
    test.skip(
      !seeded,
      '시드 과제 as_today 가 없다 — 2026-06-24 출시 빈 상태 정리로 studentAssignments=[]. '
      + '시드나 서버 과제가 생기면 이 검사는 스스로 다시 돈다.',
    );

    await startCta.click();
    await page.waitForURL(SOLVE_URL);
    await solveAllAndSubmit(page);
    await page.waitForURL(RESULT_URL, { timeout: 10_000 });

    await expect(
      page.getByTestId('result-score').or(page.getByTestId('result-ungraded')),
    ).toBeVisible({ timeout: 10_000 });
  });
});
