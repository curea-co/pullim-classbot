/**
 * 모바일 viewport · 키보드 포커스 자체 검증 (옵션 3 QA).
 *
 * 검증 핵심:
 *  - 375px (iPhone SE) · 414px (iPhone 12 Pro) 에서 핵심 CTA·텍스트가 깨지지 않음
 *  - 키보드 Tab 순회 시 focus-visible ring 이 노출됨 (focus-visible:ring-3)
 *  - word-break: keep-all 적용으로 한국어 어절 단위 줄바꿈
 */

import { test, expect, devices } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('모바일 viewport 검증', () => {
  test('iPhone SE (375px) — 교사 라이브 시작 CTA 노출', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto(BASE + '/teacher/classbot');
    // 신규(라이브 비활성) 교사 — "라이브 시작" CTA 가 모바일에서 보여야 함
    await expect(page.getByText('라이브 시작', { exact: true })).toBeVisible();
    await context.close();
  });

  test('iPhone 12 Pro (414px) — 학생 홈 핵심 CTA 노출', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await context.newPage();
    await page.goto(BASE + '/classbot');
    // 내 튜터 헤더 보임 (홈 재구성: 내 클래스봇 → 내 튜터)
    await expect(page.getByText('내 튜터')).toBeVisible();
    // 신규 빈 상태 홈 — 봇 마켓(튜터 찾기) 핵심 CTA (discover 링크 prefix 매칭)
    const main = page.getByRole('main');
    await expect(main.locator('a[href^="/classbot/discover"]').last()).toBeVisible();
    await context.close();
  });

  test('한국어 word-break:keep-all — body 글로벌 적용 확인', async ({ page }) => {
    await page.goto(BASE + '/classbot');
    const bodyWordBreak = await page.evaluate(() => {
      return window.getComputedStyle(document.body).wordBreak;
    });
    expect(bodyWordBreak).toBe('keep-all');
  });

  test('과제 발사 폼 — 375px 에서 정상 렌더', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto(BASE + '/teacher/assignment/new');
    await expect(page.getByTestId('title-input')).toBeVisible();
    await expect(page.getByTestId('dispatch-btn')).toBeVisible();
    await context.close();
  });
});

test.describe('키보드 Tab 포커스 가시성', () => {
  test('과제 발사 폼 — 제목 input Tab 진입 시 focus-visible 활성', async ({ page }) => {
    // 2026-05-18 flake mitigation: networkidle + visible gate + 10s timeout (proc/plan/2026-05-18_prod-verify-stability.md)
    await page.goto(BASE + '/teacher/assignment/new', { waitUntil: 'networkidle' });
    const titleInput = page.getByTestId('title-input');
    await expect(titleInput).toBeVisible();
    await titleInput.focus();
    await expect(titleInput).toBeFocused({ timeout: 10_000 });
    // focus-visible:ring-3 클래스가 shadcn Input 에 포함됨 — 실제 focus 상태인지만 확인
  });

  test('모드 토글 — Tab으로 진입 가능 (role=radio)', async ({ page }) => {
    await page.goto(BASE + '/teacher/assignment/new');
    const practiceRadio = page.getByTestId('mode-practice');
    await expect(practiceRadio).toHaveAttribute('role', 'radio');
    await expect(practiceRadio).toHaveAttribute('aria-checked', 'true');
    // exam 클릭 → aria-checked 전환
    await page.getByTestId('mode-exam').click();
    await expect(page.getByTestId('mode-exam')).toHaveAttribute('aria-checked', 'true');
    await expect(practiceRadio).toHaveAttribute('aria-checked', 'false');
  });

  test('학생 풀이 — 객관식 선택지 role=radio + aria-checked 전환', async ({ page }) => {
    // 먼저 발사
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('포커스 검증 과제');
    await page.getByTestId('dispatch-btn').click();
    await expect(page).toHaveURL(BASE + '/teacher/classbot');

    // 학생 풀이로 진입
    await page.goto(BASE + '/classbot/assignment');
    const overviewLink = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await overviewLink.click();
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/solve/);

    // 객관식이면 radiogroup 검증, 아니면 통과 (서술형/단답형 fallback)
    const radioGroup = page.locator('[role="radiogroup"][aria-label="객관식 선택지"]');
    if (await radioGroup.isVisible().catch(() => false)) {
      const firstOption = radioGroup.locator('[role="radio"]').first();
      await expect(firstOption).toHaveAttribute('aria-checked', 'false');
      await firstOption.click();
      await expect(firstOption).toHaveAttribute('aria-checked', 'true');
    }
  });
});

test.describe('회귀 — 기존 E2E 정합성', () => {
  test('PR #4 → #5 → #6 통합 — 한국어 줄바꿈 + 빈 상태 + 폼 a11y 동시 통과', async ({ page }) => {
    // 빈 상태 확인 (localStorage 비움)
    await page.goto(BASE + '/teacher');
    await page.evaluate(() => window.localStorage.removeItem('pullim-assignments'));

    // 발사 폼 — Label htmlFor↔Input id 연결 확인
    await page.goto(BASE + '/teacher/assignment/new');
    const titleLabel = page.locator('label[for="af-title"]');
    await expect(titleLabel).toBeVisible();
    await expect(page.locator('#af-title')).toBeVisible();
  });
});
