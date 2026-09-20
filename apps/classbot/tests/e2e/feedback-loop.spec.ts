/**
 * 피드백 루프 — 학생이 낸 답이 교사에게 닿는가.
 *
 * ## 2026-09-20 재작성 — 이 스펙이 딛고 서 있던 세계가 은퇴했다
 *
 * 종전 판은 **브라우저 localStorage 가 과제·제출의 정본이던 시절**의 스펙이었다. 그 시절이
 * #350(계획 PR 4)·#352(계획 PR 6)에서 끝났고, 스펙만 남아 다섯 자리가 **거짓**이 돼 있었다.
 * 고친 것과 근거를 한 줄씩 적어 둔다 — 「왜 이렇게 바뀌었나」를 다시 묻지 않게:
 *
 * | 걷어낸 단언 | 왜 거짓인가 |
 * |---|---|
 * | `[data-testid^="progress-as_user_"]` 의 `0/N` → `1/N` | **그 testid 가 앱에 없다.** 「학생 풀이 진행 N/M문항」은 localStorage 제출 기록 합산이라 정본과 함께 걷혔다 — `app/(teacher)/teacher/classbot/page.tsx` 의 `DispatchedAssignments` 머리 주석이 「학생 풀이 진행은 과제 상세(`/submissions`)가 답한다」고 적어 둔 자리다 |
 * | `getByText('방금 제출')` | **그 글자가 앱에 없다.** 위와 같은 자리에서 함께 걷혔다 |
 * | `localStorage['pullim-assignments']` 가 `submissions`·`scorePercent` 를 담을 것 | **뒤집혔다.** 앱은 이제 그 키를 rehydrate 뒤 **지운다**(`lib/store/assignments.ts` 의 `RETIRED_STORAGE_KEY`). 앱의 jest 는 그 키가 `null` 임을 단언한다(`app/(student)/classbot/assignment/__tests__/use-assignment-submit.test.tsx`). 이 스펙만 반대를 요구하고 있었다 |
 * | `as_user_\d+` URL 모양 | 그 접두사는 브라우저가 붙이던 것이고 그 레인이 은퇴했다. **id 는 이제 서버가 준다** — 모양을 알 수 없으므로 가리지 않는다 |
 * | `pullim-class-enrollment` 시딩 | **무효다.** 서버가 401 을 줄 때 그 localStorage 의 데모 방으로 갈아타던 폴백을 걷었다(`components/classbot/home/my-rooms.ts`) |
 *
 * **화면이 깨진 게 아니라 옮겨 간 것이다.** 그래서 스펙을 옮겨 간 자리로 따라 보낸다 —
 * 교사가 학생별 진행을 읽는 곳은 과제 상세(`/teacher/assignment/<id>` 의 `submissions-list`)이고,
 * 학생 점수는 제출 응답을 든 **저장하지 않는** 스토어(`lib/store/submission-result.ts`)다.
 *
 * ## 이 파일이 아직 `mixed-role-pending` 인 이유는 그대로다
 *
 * 한 브라우저에서 교사와 학생을 오가는데 OS 계정은 역할이 고정이라, 역할별 파일로 다시 쓰기
 * 전에는 어느 로그인 레인에서도 절반이 빨개진다. 그 분리는 `playwright.config.ts` 의
 * `MIXED_ROLE_SPECS` TODO(PR 6 e2e 트랙)가 인도한다 — **이 재작성은 그 트랙이 아니다.**
 * 여기서 한 일은 「거짓이 된 단언을 사실로 되돌린 것」까지다.
 *
 * 검증 핵심(지금 사실인 것만):
 *  1. 교사가 낸 과제가 학생 목록에 서고, 학생이 제출하면 그 제출이 **교사 과제 상세**에 선다
 *  2. 결과 화면은 제출 직후 **서버가 센 점수**(또는 서술형 대기)를 그린다
 *  3. 새로고침하면 그 점수는 비고 화면이 **그 사실을 말한다** — 제출의 정본은 서버다
 */

import { test, expect, type Page } from '@playwright/test';
import { fillAssignmentTitle, solveAllAndSubmit } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

/**
 * 과제 id 를 **가리지 않는** URL 모양. 서버가 주는 id 라 접두사도 자릿수도 알 수 없다 —
 * 종전의 `as_user_\d+` 는 브라우저가 붙이던 모양이었고 그 레인은 은퇴했다.
 * `[^/]+` 로 한 칸만 집어 `…/solve/무언가` 같은 다른 경로까지 걸리지 않게 한다.
 */
const SOLVE_URL = /\/classbot\/assignment\/[^/]+\/solve/;
const RESULT_URL = /\/classbot\/assignment\/[^/]+\/result$/;

/**
 * 교사가 낸 과제 하나를 학생이 풀어 제출하기까지 — 두 검사가 같이 쓰는 앞부분.
 *
 * 전제를 못 세우면(반이 없다 · 그 반의 학생이 아니다) **이유를 적고 건너뛴다.** 없는 전제를
 * 실패로 적지 않는 것은 이 리포의 기존 방식이다(`sso-login-roundtrip.spec.ts`, 아래 시드 검사).
 * @param page - 교사·학생 화면을 오가는 페이지
 * @param title - 낼 과제 제목(5자 이상이어야 「과제 내기」가 열린다)
 * @returns 서버가 준 과제 id — 뒤이어 교사 상세를 열 때 쓴다
 */
async function dispatchSolveAndSubmit(page: Page, title: string): Promise<string> {
  // [1] 교사: 과제 내기
  await page.goto(BASE + '/teacher/assignment/new', { waitUntil: 'networkidle' });

  // 반이 없거나 못 읽으면 낼 곳이 없어 폼 전체가 뜻을 잃는다 — 그때 폼은 「아직 운영하는 반이
  // 없어요」/「반을 불러오지 못했어요」로 선다(`assignment-form.tsx` 의 `rooms-empty`·`rooms-error`).
  const noRooms = await page
    .getByTestId('rooms-empty')
    .or(page.getByTestId('rooms-error'))
    .isVisible()
    .catch(() => false);
  test.skip(noRooms, '이 계정에는 과제를 낼 반이 없다 — 반이 있어야 「과제 내기」가 열린다');

  // 하이드레이션 경합 — 근거는 `fillAssignmentTitle` 머리주석. 그 헬퍼가 「과제 내기」
  // 버튼의 활성까지 확인하고 돌아오므로 여기서 따로 못박지 않는다.
  await fillAssignmentTitle(page, title);
  await page.getByTestId('dispatch-btn').click();
  await expect(page).toHaveURL(BASE + '/teacher/classbot');

  // 낸 과제의 id 는 **서버가 준다.** 「낸 과제」 줄의 testid(`dispatched-row-<id>`)에서 읽는다.
  // 첫 줄을 그냥 집지 않고 **제목으로 좁히는** 이유: 계정에 이미 낸 과제가 있으면 정렬이
  // 어떻든 방금 낸 것을 집는다는 보장이 없다.
  const row = page.locator('[data-testid^="dispatched-row-"]').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  const rowTestId = await row.getAttribute('data-testid');
  const assignmentId = (rowTestId ?? '').replace('dispatched-row-', '');
  expect(assignmentId, '「낸 과제」 줄에서 과제 id 를 읽지 못했다').not.toBe('');

  // [2] 학생: 받은 과제 목록 → 그 과제 → 풀이 → 제출
  await page.goto(BASE + '/classbot/assignment', { waitUntil: 'networkidle' });

  // **먼저 목록 화면이 섰는지 본다.** 아래 skip 이 「없다」를 근거로 건너뛰는데, 화면이 아예 안
  // 서도 「없다」가 되기 때문이다 — 그러면 고장이 조용한 skip 으로 둔갑한다(fail-open).
  // 선 모양은 둘뿐이다: 과제 카드가 있거나, `EmptyState` 한 장(빈 상태·로그인 게이트·오류)이거나.
  await expect(
    page.locator('a[href^="/classbot/assignment/"], [data-testid="empty-state"]').first(),
  ).toBeVisible({ timeout: 10_000 });

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
  test('학생 제출 → 결과에 서버 점수 → 교사 과제 상세의 제출 현황에 선다', async ({ page }) => {
    const assignmentId = await dispatchSolveAndSubmit(page, '피드백 루프 검증 과제');

    // 제출 **직후**에는 세션 스토어에 결과가 있다 — 자동 채점이면 점수(`result-score`),
    // 서술형이 섞였으면 「선생님 채점 기다리는 중」(`result-ungraded`)이다.
    //
    // ⚠ 여기서 `result-missing` 을 같이 받아 주면 안 된다. 그건 **새로고침 뒤**의 모습이고
    // (아래 검사가 그쪽을 본다), 받아 주는 순간 제출 응답이 스토어에 아예 기록되지 않아도
    // 이 단언이 통과한다 — 「깨진 것도 통과하는 선택자」가 되는 자리다.
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
