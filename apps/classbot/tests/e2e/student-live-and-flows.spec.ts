import { test, expect } from '@playwright/test';

/**
 * 출시 IA — 신규 사용자 빈 상태 → 참여 코드 등록 플로우 + 교사 핵심 path.
 * (2026-06-24 재작성: 데모 시드 제거로 학생 라이브/스코프 테스트를 등록 플로우로 교체)
 * (2026-08-20 재작성: 자기주도 모드 보류로 학생 홈이 교사 수업 모드 고정 → 참여 코드 플로우로 교체)
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('신규 사용자 빈 상태 → 참여 코드 등록 (출시 IA)', () => {
  test('빈 홈 — 교사 수업 hero + 진행 안내 + 과제 빈 상태', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    await expect(page.getByText('교사 수업', { exact: true })).toBeVisible();
    await expect(page.getByText('교사 수업은 이렇게 진행돼요')).toBeVisible();
    await expect(page.getByText('아직 받은 과제가 없어요')).toBeVisible();
  });

  test('참여 코드 등록 → 홈 참여 클래스 반영', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    await page.getByLabel('참여 코드 입력').fill('MATH-2024');
    await page.getByRole('button', { name: '참여하기' }).click();

    // 홈에 반영 — 빈 상태 사라지고 참여 중인 클래스 노출 (성공 토스트에도 반 이름이 있어 main 으로 스코프)
    const main = page.getByRole('main');
    await expect(main.getByText('참여 중인 클래스')).toBeVisible({ timeout: 10_000 });
    await expect(main.getByText('중2 수학 A반 · 김보람 선생님')).toBeVisible();
  });

  // 봇 마켓은 기획 보류로 nav 진입점만 내렸다 — 라우트·등록 동작 자체는 살아 있어야 한다.
  test('봇 마켓 — 진입점 비노출이어도 URL 직접 진입 시 등록 동작 유지', async ({ page }) => {
    await page.goto(BASE + '/classbot/discover', { waitUntil: 'networkidle' });
    await expect(page.getByText('공식 튜터 마켓')).toBeVisible();

    await page.getByRole('button', { name: '등록', exact: true }).first().click();
    await expect(page.getByRole('button', { name: '등록됨' }).first()).toBeVisible();
  });

  test('legacy /classbot/live/[botId] → chat 리다이렉트', async ({ page }) => {
    await page.goto(BASE + '/classbot/live/cb_001', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/classbot\/chat\?bot=cb_001/);
  });
});

/**
 * 기획 보류 — 즉석 퀴즈 발사 모달(F4, B8 / SCR-C-20) 검증이 여기 있었다.
 * 운영 메인에서 퀴즈 pane 을 내리면서 같은 화면의 봇 운영 목록 검증으로 갈아끼웠다. 재개 시 되살린다.
 */
test.describe('클래스봇 운영 메인 — 봇 운영 목록 (SCR-C-17)', () => {
  test('봇 카드 — 학급 배정·안전 등급 배지가 보이고 동선은 더보기 안에 있다', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    const card = page.getByTestId('bot-ops-card-cb_001');
    await expect(card).toBeVisible();
    // 어느 학급에 붙어 있나
    await expect(card.getByText('중2 수학 A반')).toBeVisible();
    // 안전 등급은 읽기 전용 배지 하나 — 설명문·변경 링크는 카드에서 걷어냈다
    await expect(card.getByText('L3', { exact: true })).toBeVisible();
    // 카드 바닥 링크 묶음은 없앴다 — 나가는 길은 전부 더보기 안
    await expect(card.getByRole('link')).toHaveCount(0);
    await card.getByRole('button', { name: /더보기/ }).click();
    const menu = page.getByRole('menu');
    for (const label of ['봇 손보기', '봇 관리', '안전 등급 바꾸기', '과제 내기', '학급 관제소']) {
      await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }

    // 보류 pane 은 내려갔다
    await expect(page.getByRole('button', { name: '새 퀴즈' })).toHaveCount(0);
    await expect(page.getByText('라이브 시작', { exact: true })).toHaveCount(0);
  });

  test('봇 카드 더보기 → 학급 관제소로 나간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-ops-card-cb_001').getByRole('button', { name: /더보기/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: '학급 관제소' }).click();
    await expect(page).toHaveURL(BASE + '/teacher/monitor');
  });
});

test.describe('봇 관리 — 봇 목록 → 봇별 설정 (SCR-C-25)', () => {
  test('목록의 봇을 누르면 그 봇의 설정으로 들어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/bots', { waitUntil: 'networkidle' });

    const card = page.getByTestId('bot-manage-card-cb_001');
    await expect(card).toBeVisible();
    // 목록이 읽어주는 것 — 정체와 지금 규칙. 운영 사실(인원·낸 과제)은 운영 화면 몫이라 여기 없다.
    await expect(card.getByText('수학봇')).toBeVisible();
    await expect(card.getByText('L3', { exact: true })).toBeVisible();

    await card.getByRole('link').click();
    await expect(page).toHaveURL(BASE + '/teacher/bots/cb_001');
    await expect(page.getByRole('heading', { level: 1, name: '수학봇 운영 규칙' })).toBeVisible();
    await expect(page.getByText('안전 등급 시간대 스케줄')).toBeVisible();
  });

  test('옛 경로 /teacher/settings 는 탭을 실은 채 목록으로 넘어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/settings?tab=drift', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(BASE + '/teacher/bots?tab=drift');

    // 고른 봇의 「이탈 대응」으로 바로 들어간다
    await page.getByTestId('bot-manage-card-cb_001').getByRole('link').click();
    await expect(page).toHaveURL(BASE + '/teacher/bots/cb_001?tab=drift');
    await expect(page.getByText('이탈 대응 강도')).toBeVisible();
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
