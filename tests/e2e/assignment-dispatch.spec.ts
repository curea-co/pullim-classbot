/**
 * E2E — 과제 발사 → 학생 수령 → 풀이 → 결과 사이클 (spec 14 § 12, plan 1~5단계).
 *
 * 검증 핵심:
 * 1. 교사가 발사한 새 과제가 학생 홈에 즉시 등장
 * 2. localStorage persist — 새로고침 후에도 보존
 * 3. 풀이 워크스페이스 진입 가능
 * 4. 제출 → 결과 페이지 도달
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('과제 발사 → 학생 수령 → 풀이 → 결과 E2E', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 초기화 — 깨끗한 상태로 시작
    await page.goto(BASE + '/teacher');
    await page.evaluate(() => {
      window.localStorage.removeItem('pullim-assignments');
    });
  });

  test('교사가 새 과제 발사 → 학생이 받음 → 풀이 → 결과', async ({ page }) => {
    // [1] 교사 진입 — /teacher/classbot
    await page.goto(BASE + '/teacher/classbot');
    await expect(page.getByTestId('new-assignment-cta')).toBeVisible();

    // [2] [+ 새 과제] 클릭 → 워크스페이스 진입
    await page.getByTestId('new-assignment-cta').click();
    await expect(page).toHaveURL(BASE + '/teacher/assignment/new');

    // [3] 폼 입력 — 봇 자동 채움(cb_001) + 제목 + 모드 + 단원·문항·대상·일정
    await expect(page.getByTestId('bot-select')).toHaveValue('cb_001');
    await page.getByTestId('title-input').fill('E2E 테스트 과제 — 도함수 마무리');
    await page.getByTestId('mode-practice').click();

    // [4] 발사 버튼 활성 확인 → 발사
    const dispatchBtn = page.getByTestId('dispatch-btn');
    await expect(dispatchBtn).toBeEnabled();
    await dispatchBtn.click();

    // [5] 발사 후 /teacher/classbot로 리다이렉트
    await expect(page).toHaveURL(BASE + '/teacher/classbot');

    // localStorage 확인 — store에 저장됨
    const stored = await page.evaluate(() => window.localStorage.getItem('pullim-assignments'));
    expect(stored).toBeTruthy();
    expect(stored).toContain('E2E 테스트 과제');

    // [6] 학생 홈 진입 — /classbot → PrimaryCard에 새 과제 표시
    await page.goto(BASE + '/classbot');
    await expect(page.getByText('E2E 테스트 과제 — 도함수 마무리')).toBeVisible();

    // [7] 받은 과제 목록 — /classbot/assignment
    await page.goto(BASE + '/classbot/assignment');
    await expect(page.getByText('E2E 테스트 과제 — 도함수 마무리')).toBeVisible();

    // [8] 과제 카드 Link 클릭 → 개요 페이지 (href로 직접 매칭)
    const overviewLink = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await overviewLink.click();
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+$/);
    await expect(page.getByTestId('assignment-start-cta')).toBeVisible();

    // [9] 지금 시작하기 → 풀이 워크스페이스
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/solve/);

    // [10] 풀이 워크스페이스 — 문항 노출 확인 (fallback 시드 사용 시 cb_001의 q_today_1)
    await expect(page.getByText(/극댓값|도함수|f\(x\)|x³/).first()).toBeVisible({ timeout: 10000 });

    // [11] 모든 문항을 차례로 통과해서 마지막 단계 도달 → 제출 → 결과 페이지
    for (let i = 0; i < 10; i++) {
      const submitBtn = page.getByRole('button', { name: /제출/ });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /다음/ });
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      } else {
        break;
      }
    }

    // 결과 페이지 도달 확인 (Next.js route announcer와 구분 — heading role 사용)
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/result/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '수고했어요' })).toBeVisible();
  });

  test('localStorage 새로고침 영속성 — 발사 후 새 탭에서도 보임', async ({ page, context }) => {
    // 과제 발사
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('영속성 테스트 과제');
    await page.getByTestId('dispatch-btn').click();
    await expect(page).toHaveURL(BASE + '/teacher/classbot');

    // 새 탭(같은 context = localStorage 공유)에서 학생 홈
    const studentPage = await context.newPage();
    await studentPage.goto(BASE + '/classbot');
    await expect(studentPage.getByText('영속성 테스트 과제')).toBeVisible();
  });

  test('검증 — 제목 5자 미만이면 발사 비활성', async ({ page }) => {
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('짧');
    await expect(page.getByTestId('dispatch-btn')).toBeDisabled();

    await page.getByTestId('title-input').fill('충분히 긴 제목');
    await expect(page.getByTestId('dispatch-btn')).toBeEnabled();
  });

  test('시험 모드 선택 시 시험 모드 섹션 노출', async ({ page }) => {
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('시험 모드 발사 테스트');
    await page.getByTestId('mode-exam').click();

    // Scope L1 자동 안내 노출
    await expect(page.getByText(/Scope L1 자동/)).toBeVisible();
    await expect(page.getByText(/시험 모드 설정/)).toBeVisible();
  });
});
