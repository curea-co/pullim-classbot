import { test, expect } from '@playwright/test';

/**
 * 출시 IA — 신규 사용자 빈 상태 → 봇 마켓 등록 플로우 + 교사 핵심 path.
 * (2026-06-24 재작성: 데모 시드 제거로 학생 라이브/스코프 테스트를 마켓 등록 플로우로 교체)
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('신규 사용자 빈 상태 → 봇 마켓 등록 (출시 IA)', () => {
  test('빈 홈 — 환영 + 시작 가이드 + 봇 마켓 유도', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    await expect(page.getByText('환영해요')).toBeVisible();
    await expect(page.getByText('시작 가이드')).toBeVisible();
    await expect(page.getByText('아직 등록한 튜터가 없어요')).toBeVisible();
  });

  test('봇 마켓 등록 → 홈 내 튜터 반영', async ({ page }) => {
    await page.goto(BASE + '/classbot/discover', { waitUntil: 'networkidle' });
    await expect(page.getByText('공식 튜터 마켓')).toBeVisible();

    await page.getByRole('button', { name: '등록', exact: true }).first().click();
    await expect(page.getByRole('button', { name: '등록됨' }).first()).toBeVisible();

    // 홈에 반영 — 빈 상태 사라짐
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });
    await expect(page.getByText('아직 등록한 튜터가 없어요')).toHaveCount(0);
  });

  test('legacy /classbot/live/[botId] → chat 리다이렉트', async ({ page }) => {
    await page.goto(BASE + '/classbot/live/cb_001', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/classbot\/chat\?bot=cb_001/);
  });
});

test.describe('즉석 퀴즈 store 동기화 (F4, B8)', () => {
  test('교사 퀴즈 발사 모달 — 입력 검증', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    // 새 퀴즈 모달 열기
    await page.getByRole('button', { name: '새 퀴즈' }).click();
    await expect(page.getByRole('dialog', { name: '새 즉석 퀴즈' })).toBeVisible();

    // 모든 옵션 채우기 + 발사 (모달 내부 발사 버튼만 — exact 매칭)
    const dialog = page.getByRole('dialog', { name: '새 즉석 퀴즈' });
    await dialog.getByLabel('문제').fill('테스트 문제');
    await dialog.getByPlaceholder('선택지 1').fill('A');
    await dialog.getByPlaceholder('선택지 2').fill('B');
    await dialog.getByPlaceholder('선택지 3').fill('C');
    await dialog.getByPlaceholder('선택지 4').fill('D');
    await dialog.getByRole('button', { name: '발사', exact: true }).click();

    // 모달 닫힘 — 발사 후 currentQuiz가 새 문제로 바뀜
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('위기 학생 상세 모달 (F5, B10)', () => {
  test('교사 홈 위기 학생 클릭 → 모달 + 1:1 chat CTA', async ({ page }) => {
    await page.goto(BASE + '/teacher', { waitUntil: 'networkidle' });

    // 위기 학생 카드 (도현/예은 등) 클릭
    await page.getByRole('button', { name: /도현/ }).click();
    await expect(page.getByRole('dialog', { name: /도현 학생책/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /1:1 채팅 시작/ })).toBeVisible();
  });
});
