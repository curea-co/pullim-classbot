import { test, expect } from '@playwright/test';

/**
 * 출시 IA — 신규 사용자 빈 상태 → 참여 코드 등록 플로우 + 교사 핵심 path.
 * (2026-06-24 재작성: 데모 시드 제거로 학생 라이브/스코프 테스트를 등록 플로우로 교체)
 *
 * **홈은 하나다** — 학습 모드로 홈을 가르던 분기는 걷었다(`app/(student)/classbot/page.tsx`).
 * 그래서 아래 「빈 홈」은 「self 모드가 아니라서 보이는 홈」이 아니라 **참여한 방이 없을 때의 홈**이다.
 * 봇 마켓에서 담은 봇은 홈이 아니라 챗·「내가 담은 봇」에서 보인다 — 담기는 반 참여가 아니라서
 * 「참여 중인 클래스」에 오르지 않는다(계약 §1).
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
    await page.getByRole('button', { name: '참여' }).click();

    // 홈에 반영 — 빈 상태 사라지고 참여한 반이 노출 (성공 토스트에도 반 이름이 있어 main 으로 스코프)
    //
    // 반 **이름**(「중2 수학 A반」)으로 잡지 않는다. 홈의 이 자리는 반을 하나씩 늘어놓던 목록에서
    // **한 줄 요약 카드**(`components/classbot/home/joined-classes.tsx`)로 바뀌었고, 반 이름은
    // 이제 그 카드가 데려가는 `/classbot/classroom` 에 있다.
    //
    // 카드가 **말하는 문구**로도 잡지 않는다(「참여 중인 클래스 N곳」). 그건 카드의 표현이라
    // 다듬으면 바뀌는데, 이 스펙은 prod-verify 가 **production 에 대고** 돌리는 것이라
    // 문구 손질 한 번에 main 이 빨개진다. 대신 두 데이터 값으로 잡는다 —
    //  · `김보람 선생님` = `joined-classes.tsx` 의 `lead`. **반이 하나일 때만** 이름이 그대로 찍히고
    //    둘 이상이면 「선생님 N명」이 된다 → 이 한 줄이 「방금 들어간 반 하나」까지 함께 못 박는다.
    //    (그래서 여러 반 테스트에는 이 단언을 재사용하지 마라.)
    //  · `대치프리미엄 수학학원` = `joined-classes-data.ts` 의 `orgOf()` — `enrollment.via` 우선,
    //    없으면 `bot.organization`. MATH-2024 는 둘 다 같은 값이라 가장 덜 흔들린다.
    //
    // 첫 단언에 넉넉한 timeout 을 주는 이유: 익명으로 열면 `/api/me/classrooms` 가 401 이라
    // 홈이 한 RTT 동안 스켈레톤을 그린다(`page.tsx` 의 `roomsLoading` 가드).
    const main = page.getByRole('main');
    await expect(main.getByText('김보람 선생님')).toBeVisible({ timeout: 10_000 });
    await expect(main.getByText('대치프리미엄 수학학원')).toBeVisible();
  });

  /**
   * 봇 마켓 — mock 공식 튜터 3종을 걷어내고 교사가 실제로 공유한 봇 목록으로 갈았다.
   *
   * ⚠ 「마켓에서 봇을 얻는 길이 없다 / 봇을 얻는 길은 참여 코드뿐」이라고 적혀 있던 자리다.
   * **더는 사실이 아니다** — 학생은 마켓에서 봇을 **담을** 수 있고, 담은 봇은 반 봇과 한 목록에서
   * 대화한다(계약 §5). 여기서 담기 버튼을 단언하지 않는 이유는 길이 없어서가 아니라,
   * 이 스펙이 **로그인 없이** 돌아 마켓이 목록 대신 로그인 안내를 그리기 때문이다.
   *
   * 마켓 목록은 **신원이 있어야** 열린다(마켓 계약 §2). 이 스펙은 로그인 없이 도는지라
   * prod 에서는 로그인 안내가 정답이고, 로컬에서 개발용 신원 쿠키를 꽂고 돌리면 목록이나
   * 빈 상태가 나온다. **셋 다 정상**이므로 셋 중 하나면 통과로 둔다 —
   * 여기서 검증하는 것은 「라우트가 서고 마켓 화면이 제 상태 중 하나를 그린다」다.
   *
   * 제목은 `exact` 로 잡는다. 기본 부분일치로 두면 오류 카드 제목
   * 「봇 마켓을 불러오지 못했어요」까지 걸려 strict mode 위반이 난다.
   */
  test('봇 마켓 — 마켓 화면이 제 상태 중 하나를 그린다', async ({ page }) => {
    await page.goto(BASE + '/classbot/discover', { waitUntil: 'networkidle' });

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: '봇 마켓', exact: true })).toBeVisible();
    await expect(
      main
        .getByTestId('marketplace-list')
        .or(main.getByTestId('marketplace-empty'))
        .or(main.getByTestId('marketplace-signin')),
    ).toBeVisible({ timeout: 10_000 });
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
    // 남는 길은 둘 — 그 봇을 고치는 길과 그 봇으로 과제를 내는 길
    for (const label of ['수정하기', '과제 내기']) {
      await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }
    // 걷어낸 셋은 다시 들어오면 안 된다
    for (const label of ['봇 관리', '안전 등급 바꾸기', '학급 관제소']) {
      await expect(menu.getByRole('menuitem', { name: label })).toHaveCount(0);
    }

    // 보류 pane 은 내려갔다
    await expect(page.getByRole('button', { name: '새 퀴즈' })).toHaveCount(0);
    await expect(page.getByText('라이브 시작', { exact: true })).toHaveCount(0);
  });

  test('봇 카드 더보기 → 그 봇의 수정 화면으로, 값이 채워진 채로 열린다', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-ops-card-cb_004').getByRole('button', { name: /더보기/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: '수정하기' }).click();
    await expect(page).toHaveURL(BASE + '/teacher/builder/cb_004');

    // 빈 빌더가 아니라 그 봇의 지금 값 — 이름·과목·학년·붙어 있는 반
    await expect(page.getByRole('heading', { level: 1, name: '국어봇 수정하기' })).toBeVisible();
    const filled = page.getByTestId('summary-row-subject');
    await expect(filled).toContainText('국어');
    await expect(page.getByTestId('summary-row-name')).toContainText('국어봇');
    await expect(page.getByTestId('summary-row-grade')).toContainText('중3');
    await expect(page.getByTestId('summary-row-classes')).toContainText('중3 국어 A반');
  });

  test('봇 카드 더보기 → 과제 내기는 그 봇이 골라진 채로 열린다', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-ops-card-cb_004').getByRole('button', { name: /더보기/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: '과제 내기' }).click();
    await expect(page).toHaveURL(BASE + '/teacher/assignment/new?bot=cb_004');
    // 「발사 봇」이 눌러 온 봇이다 — 종전에는 늘 첫 봇(수학봇)이 골라져 있었다
    await expect(page.getByTestId('bot-select')).toHaveValue('cb_004');
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

  // 봇을 가리키지 못하는 링크(학급 관제소·봇 빌더)는 ?tab= 만 실어 목록으로 온다.
  test('?tab= 를 실은 채 들어오면 고른 봇의 그 탭으로 바로 들어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/bots?tab=drift', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-manage-card-cb_001').getByRole('link').click();
    await expect(page).toHaveURL(BASE + '/teacher/bots/cb_001?tab=drift');
    await expect(page.getByText('이탈 대응 강도')).toBeVisible();
  });

  test('학급 관제소의 「봇 관리」는 이탈 대응을 실은 채 목록으로 온다', async ({ page }) => {
    await page.goto(BASE + '/teacher/monitor', { waitUntil: 'networkidle' });

    await page.getByRole('link', { name: /봇 관리에서 이탈 대응 강도/ }).click();
    await expect(page).toHaveURL(BASE + '/teacher/bots?tab=drift');
  });

  /**
   * 앱 안의 링크는 모두 옮겼지만 옛 주소는 앱 밖에 남는다 — 이 검사가 지키는 것은
   * 링크가 아니라 **주소 호환**이다 (07 § 3 · 03 § 4.4.6). 위 둘과 지키는 것이 다르므로
   * 하나가 다른 하나를 대신하지 않는다.
   */
  test('옛 경로 /teacher/settings 는 탭을 실은 채 목록으로 넘어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/settings', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(BASE + '/teacher/bots');

    await page.goto(BASE + '/teacher/settings?tab=drift', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(BASE + '/teacher/bots?tab=drift');
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
