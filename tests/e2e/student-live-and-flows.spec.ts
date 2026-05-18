import { test, expect } from '@playwright/test';

/**
 * 2026-05-18 플로우 감사 후속 회귀 — 9 플로우 갭 해소 후 핵심 path.
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('학생 라이브 진입점 + 라이브 세션 화면 (F1)', () => {
  test('학생 홈 LIVE 카드 → /classbot/live/cb_001 진입 + 4영역 렌더', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    // LIVE 진입 CTA 카드 visible
    const liveCta = page.getByRole('link', { name: /수학이 형 라이브/ });
    await expect(liveCta).toBeVisible();
    await liveCta.click();

    await expect(page).toHaveURL(/\/classbot\/live\/cb_001/);

    // 4영역 — 헤더 / 슬라이드 / transcript / 학생 질문 / 퀴즈
    await expect(page.getByText('도함수의 활용 — 극값과 변곡점')).toBeVisible();
    await expect(page.getByText('실시간 자막')).toBeVisible();
    await expect(page.getByText('선생님에게 질문')).toBeVisible();
    await expect(page.getByText('지금 즉석 퀴즈')).toBeVisible();
  });

  test('학생 질문 submit → pending 상태 → shared/hidden 시뮬레이션', async ({ page }) => {
    await page.goto(BASE + '/classbot/live/cb_001', { waitUntil: 'networkidle' });

    const input = page.getByLabel('질문 입력');
    await input.fill('극값이 변곡점이 될 수도 있나요?');
    await page.getByRole('button', { name: /질문 보내기/ }).click();

    // pending 상태 표시
    await expect(page.getByText(/교사 검토 중/)).toBeVisible();
  });
});

test.describe('교사 리플레이 라우트 + 검수 발송 (F2, B9)', () => {
  test('/teacher/replay 목록 + 검수 대기 카드 → 상세 진입', async ({ page }) => {
    await page.goto(BASE + '/teacher/replay', { waitUntil: 'networkidle' });

    await expect(page.getByText('수업 리플레이')).toBeVisible();
    // rp_005 review status
    await page.getByRole('link', { name: /평균값 정리/ }).click();
    await expect(page).toHaveURL(/\/teacher\/replay\/rp_005/);
    await expect(page.getByText('핵심 메시지 검수')).toBeVisible();
    await expect(page.getByRole('button', { name: /승인.*학생 발송/ })).toBeVisible();
  });
});

test.describe('즉석 퀴즈 store 동기화 (F4, B8)', () => {
  test('교사 퀴즈 발사 모달 — 입력 검증 + 학생 LiveQuizCard 갱신 잠재성', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    // 새 퀴즈 모달 열기
    await page.getByRole('button', { name: '새 퀴즈' }).click();
    await expect(page.getByRole('dialog', { name: '새 즉석 퀴즈' })).toBeVisible();

    // 모든 옵션 채우기 + 발사
    await page.getByLabel('문제').fill('테스트 문제');
    await page.getByPlaceholder('선택지 1').fill('A');
    await page.getByPlaceholder('선택지 2').fill('B');
    await page.getByPlaceholder('선택지 3').fill('C');
    await page.getByPlaceholder('선택지 4').fill('D');
    await page.getByRole('button', { name: /발사/ }).click();

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

test.describe('학생 chat scope chip + 자동 스위치 안내 (B4)', () => {
  test('chat 헤더에 scope details disclosure', async ({ page }) => {
    await page.goto(BASE + '/classbot/chat', { waitUntil: 'networkidle' });

    // details summary "지금 봇 범위:"
    await expect(page.getByText(/지금 봇 범위/)).toBeVisible();
  });
});
