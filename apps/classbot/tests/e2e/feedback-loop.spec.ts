/**
 * 피드백 루프 — 학생 제출 → 교사 진행률 실시간 반영.
 *
 * 검증 핵심:
 *  1. 새 과제 내기 → 학생 풀이 → 제출 → 교사 화면 진행률 1+ 증가
 *  2. 결과 페이지에 store 기반 점수(% 표기) 표시
 *  3. 새로고침 후에도 submission 유지 (localStorage persist)
 *  4. 라이브 인디케이터 — 최근 30초 내 "방금 제출" 뱃지
 */

import { test, expect } from '@playwright/test';
import { fillAssignmentTitle, solveAllAndSubmit } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('피드백 루프 — 제출 ↔ 교사 진행률', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 초기화
    await page.goto(BASE + '/teacher');
    await page.evaluate(() => {
      // TODO(PR 6 e2e 트랙): `pullim-assignments` persist 는 은퇴했다(FE PR 6 — 제출은 `POST /classbot/assignments/:id/submit`,
      // 교사 진행률은 `GET …/submissions`). 이 스펙은 로그인 픽스처 + 실API 시드로 다시 쓴다(계획 §08 PR 6).
      window.localStorage.removeItem('pullim-assignments');
      // 학생 데모 과제 목록은 참여(enrollment) 클래스로 스코프된다(class-enrollment 스토어, assignment/page.tsx).
      // 과제를 내는 봇 cb_001 의 클래스(class-codes.ts MATH-2024)에 미리 참여시켜야 내기→학생 목록 노출이 동작한다.
      window.localStorage.setItem(
        'pullim-class-enrollment',
        JSON.stringify({
          state: {
            enrollments: [
              {
                botId: 'cb_001',
                classroomId: 'cr_math_a',
                classroomLabel: '중2 수학 A반',
                assignedBy: '김보람 선생님',
                assignedAt: '2026-06-24 09:00',
                via: '대치프리미엄 수학학원',
              },
            ],
          },
          version: 0,
        }),
      );
    });
  });

  test('학생 제출 → 교사 화면 진행률 +1 + 라이브 뱃지', async ({ page }) => {
    // [1] 교사: 과제 내기
    await page.goto(BASE + '/teacher/assignment/new');
    // 하이드레이션 경합 — 근거는 `fillAssignmentTitle` 머리주석. 그 헬퍼가 「과제 내기」
    // 버튼의 활성까지 확인하고 돌아오므로 여기서 따로 못박지 않는다.
    await fillAssignmentTitle(page, '피드백 루프 검증 과제');
    await page.getByTestId('dispatch-btn').click();
    await expect(page).toHaveURL(BASE + '/teacher/classbot');

    // 낸 직후 진행률은 0/N
    // 학생 진입은 동일 컨텍스트의 다른 탭으로
    const initialRowProgress = await page
      .locator('[data-testid^="progress-as_user_"]')
      .first()
      .textContent();
    expect(initialRowProgress).toMatch(/^0\/\d+$/);

    // [2] 학생: 풀이 → 제출
    await page.goto(BASE + '/classbot/assignment');
    const overviewLink = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await overviewLink.click();
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/solve/);

    // 모든 문항을 통과해서 제출 (경합 근거는 `solveAllAndSubmit` 머리주석)
    await solveAllAndSubmit(page);

    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/result/, { timeout: 10000 });
    // 결과 페이지에 점수 표시 (mock)
    await expect(page.getByTestId('result-score')).toBeVisible();

    // [3] 교사 화면 다시 방문 → 진행률 1+ 증가 + "방금 제출" 뱃지
    await page.goto(BASE + '/teacher/classbot');
    const updatedRowProgress = await page
      .locator('[data-testid^="progress-as_user_"]')
      .first()
      .textContent();
    expect(updatedRowProgress).toMatch(/^1\/\d+$/);
    await expect(page.getByText('방금 제출').first()).toBeVisible();
  });

  test('새로고침 영속성 — submission 도 localStorage 에 persist', async ({ page }) => {
    // 과제 내기 + 제출
    await page.goto(BASE + '/teacher/assignment/new');
    await fillAssignmentTitle(page, '영속성 검증 과제');
    await page.getByTestId('dispatch-btn').click();

    await page.goto(BASE + '/classbot/assignment');
    const link = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await link.click();
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/solve/);
    await solveAllAndSubmit(page);
    await page.waitForURL(/\/result/);

    // TODO(PR 6 e2e 트랙): 제출은 서버에 산다 — 새로고침 뒤 확인할 곳은 localStorage 가 아니라 교사 상세의 제출 현황이다.
    await page.reload();
    const stored = await page.evaluate(() => window.localStorage.getItem('pullim-assignments'));
    expect(stored).toBeTruthy();
    expect(stored).toContain('submissions');
    expect(stored).toMatch(/scorePercent/);
  });

  /**
   * 학생이 **만들지 않은** 과제도 같은 스토어에 쌓이는가 — 시드 과제(`as_today`) 경로.
   *
   * ⚠ 이 시드는 지금 **없다.** 2026-06-24 출시 빈 상태 정리(`0540828`)가
   * `studentAssignments` 를 빈 배열로 만들었고(「출시: 데모 과제 시드 제거(신규 빈 상태)」),
   * 그래서 `/classbot/assignment/as_today` 는 「과제를 찾을 수 없어요」를 그린다
   * (실서비스 실측 2026-09-14 — `assignment-start-cta` 가 없다). 되살리면 출시 빈 상태 IA 가
   * 깨진다 — `student-live-and-flows.spec.ts` 의 「빈 홈 … 과제 빈 상태」가 그것을 지킨다.
   *
   * 그래도 **끄지 않는다.** 종전에는 본문 전체가 `if (await startCta.isVisible())` 로
   * 감싸여 있어서, 시드가 사라진 뒤로 이 검사는 **0 assertion 으로 초록**이었다 — 없는 것을
   * 지키는 척하는 검사다. 대신 시드가 없는 것을 **런타임에 못 박고 건너뛴다**
   * (`sso-login-roundtrip.spec.ts` 와 같은 꼴 — 전제가 없으면 이유를 적고 skip).
   *
   * 그래서 이 검사는 **스스로 되살아난다**: 학생이 만들지 않은 과제가 다시 생기는 날
   * (시드가 돌아오거나, 배포에 DB 가 붙어 서버가 과제를 내려주는 날) 아래 가드가 풀리고
   * 종단 검증이 그대로 돈다. 아무도 `skip` 을 걷는 것을 기억하지 않아도 된다.
   *
   * 교사가 낸 과제 경로의 같은 누적은 위 두 검사가 이미 못 박는다.
   */
  test('시드 과제 풀이 시에도 store 진행률 누적', async ({ page }) => {
    await page.goto(BASE + '/classbot/assignment/as_today', { waitUntil: 'networkidle' });

    const startCta = page.getByTestId('assignment-start-cta');
    const seeded = await startCta.isVisible().catch(() => false);
    test.skip(
      !seeded,
      '시드 과제 as_today 가 없다 — 2026-06-24 출시 빈 상태 정리로 studentAssignments=[]. '
      + '시드나 서버 과제가 생기면 이 검사는 스스로 다시 돈다.',
    );

    await startCta.click();
    await page.waitForURL(/\/solve/);
    await solveAllAndSubmit(page);
    await page.waitForURL(/\/result/, { timeout: 10000 });

    // TODO(PR 6 e2e 트랙): `as_today` 시드 과제와 로컬 submission 기록은 둘 다 걷혔다 — 실API 시드 과제로 다시 쓴다.
    const stored = await page.evaluate(() => window.localStorage.getItem('pullim-assignments'));
    expect(stored).toContain('as_today');
  });
});
