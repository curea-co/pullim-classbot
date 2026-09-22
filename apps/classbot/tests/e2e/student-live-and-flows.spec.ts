import { test, expect } from '@playwright/test';

/**
 * 출시 IA — 신규 사용자 빈 상태 → 참여 코드 등록 플로우 + 교사 핵심 path.
 * (2026-06-24 재작성: 데모 시드 제거로 학생 라이브/스코프 테스트를 등록 플로우로 교체)
 *
 * **홈은 하나다** — 학습 모드로 홈을 가르던 분기는 걷었다(`app/(student)/classbot/page.tsx`).
 * 그래서 아래 「빈 홈」은 「self 모드가 아니라서 보이는 홈」이 아니라 **참여한 방이 없을 때의 홈**이다.
 * 담기는 반 참여가 아니라서(계약 §1) **담은 봇이 있어도 이 빈 홈은 그대로 참여 코드 hero** 다 —
 * 「참여 중인 클래스」에 오르지 않는다. 다만 그 hero 를 막다른 길로 두지 않으려고, 담은 봇이
 * 있으면 같은 화면 아래에 그 봇들이 함께 보이고 hero 에 「봇 마켓」 출구가 나란히 선다.
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('신규 사용자 빈 상태 → 참여 코드 등록 (출시 IA)', () => {
  test('빈 홈 — 교사 수업 hero + 진행 안내 + 과제 빈 상태', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    await expect(page.getByText('교사 수업', { exact: true })).toBeVisible();
    await expect(page.getByText('교사 수업은 이렇게 진행돼요')).toBeVisible();
    await expect(page.getByText('아직 받은 과제가 없어요')).toBeVisible();
  });

  /**
   * 참여로 가는 문 — 홈이 선 갈래에 맞는 입구가 있고, 눌렀으면 결과가 보인다.
   *
   * ⚠ 종전에는 `MATH-2024` 를 넣고 **참여가 된다는 전제** 위에서 홈 카드를 단언했다. 그 코드는
   * 정본에 없다 — 서버가 404·401 을 주면 옛 목 표로 한 번 더 풀어 성공처럼 보이던 폴백을 걷었고
   * (`components/classbot/home/join-code-form.tsx` 의 「실패는 실패로 보인다」), 남은 길은
   * 정본 `POST /classbot/enrollments` 하나다. 전제가 거짓이면 그 아래 단언은 아무것도 증명하지
   * 못하므로 **실제로 확인하던 것만** 남긴다.
   *
   * ## 홈에 늘 있는 것은 코드 입력칸이 아니라 **링크**다
   *
   * 홈은 참여한 반 수로 갈린다(`app/(student)/classbot/page.tsx`):
   *
   * | 반 | 화면 | 참여로 가는 문 |
   * |---|---|---|
   * | 0곳 | `TeacherClassHome` — 참여 코드 hero | 그 hero 의 입력칸(`teacher-class-hero.tsx`) |
   * | 1곳 이상 | 히어로·패널 + `JoinedClasses` | 「내 수업방」 링크 — 코드 입력칸은 그 끝(`classroom/page.tsx`)에 있다 |
   *
   * 반이 있는 홈에는 **입력칸이 아예 없다.** `joined-classes.tsx` 머리주석의 「상시 참여 입구」도
   * 입력칸이 아니라 그 **링크**를 가리킨다 — 「입력칸이 hero 에만 있으면 반이 하나 생긴 순간
   * 사라져」가 그 링크가 있는 이유다. 그래서 계정 상태를 전제하지 않고 **둘 중 하나**를 본다.
   *
   * 들어간 반 카드를 **반 이름·선생님 같은 데이터 값으로 잡지 않는 것**도 그래서다 — 이 레인에서는
   * 그 카드가 설 수도, 안 설 수도 있다. 카드가 섰을 때 **무엇을 말하는가**(반 이름을 그대로
   * 늘어놓는다)는 실제로 도는 jest 가 지킨다:
   * `components/classbot/home/__tests__/joined-classes-data.test.ts`.
   *
   * 옛 단언의 `대치프리미엄 수학학원`은 되살리지 마라 — 정본 봇 카드에 소속 칸이 없어 홈에서
   * 학원·학교 축 자체가 사라졌다.
   *
   * 넉넉한 timeout 을 주는 이유: 홈이 한 RTT 동안 스켈레톤을 그린다(`page.tsx` 의 `roomsLoading` 가드).
   */
  test('참여로 가는 문 — 반이 없으면 코드 입력칸, 있으면 「내 수업방」', async ({ page }) => {
    await page.goto(BASE + '/classbot', { waitUntil: 'networkidle' });

    const codeInput = page.getByLabel('참여 코드 입력');
    const joined = page.getByTestId('joined-classes');

    // 홈이 섰다 — 위 표의 두 갈래는 배타적이라 strict mode 에 걸리지 않는다.
    await expect(codeInput.or(joined)).toBeVisible({ timeout: 10_000 });

    // 반이 있는 계정이면 여기서 끝이다 — 그 홈에 코드 입력칸은 없고, 문은 이 링크다.
    if ((await codeInput.count()) === 0) {
      await expect(joined).toBeVisible();
      return;
    }

    // 반 0곳 갈래 — 실제 코드 모양(`AB3K9M`)으로 눌러 본다. 어떤 반에 든다고 단정하지 않는다.
    await codeInput.fill('AB3K9M');
    await page.getByRole('button', { name: '참여' }).click();

    // 결과가 **보인다**는 것까지가 이 스펙이다(「실패는 실패로 보인다」).
    // 문구 여섯 갈래의 출처는 `hooks/api/classroom.ts` 의 `joinFailureMessage`.
    // 토스트로 스코프하는 까닭: 「로그인이 필요해요」는 `components/features/auth/role-guard.tsx` 의
    // 로그인 게이트 카드 제목과 **같은 글자**라, 스코프가 없으면 인증 게이트가 이 단언을 대신
    // 만족시킨다. `joinFailureMessage` 는 sonner `toast.error` 로만 나간다(`join-code-form.tsx`).
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast).toContainText(
      /없는 코드예요|닫힌 코드예요|이미 들어와 있는 반이에요|이 반에는 들어갈 수 없어요|로그인이 필요해요|참여하지 못했어요/,
    );
  });

  /**
   * 봇 마켓 — mock 공식 튜터 3종을 걷어내고 교사가 실제로 공유한 봇 목록으로 갈았다.
   *
   * ⚠ 「마켓에서 봇을 얻는 길이 없다 / 봇을 얻는 길은 참여 코드뿐」이라고 적혀 있던 자리다.
   * **더는 사실이 아니다** — 학생은 마켓에서 봇을 **담을** 수 있고, 담은 봇은 반 봇과 한 목록에서
   * 대화한다(계약 §5). 여기서 담기 버튼을 단언하지 않는 이유는 길이 없어서가 아니라,
   * 배포본에서 마켓이 목록 대신 「아직 준비 중」 안내를 그리기 때문이다.
   *
   * 마켓 목록을 여는 신원을 **배포본에서는 세울 수 없다.** 같은 오리진 route handler 가
   * 답하는데 그 핸들러에 OS 세션을 풀 열쇠가 없고(`lib/current-user.ts`), 개발 신원 쿠키는
   * 로컬 호스트에서만 열린다(`lib/dev-identity.ts`). 그래서 **로그인해도 401 이고**,
   * 그 자리에 뜨는 것은 로그인 안내가 아니라 준비 중 안내다(`marketplace-signin` —
   * 이름은 로그인 안내이던 시절의 것이다). 로컬에서 개발용 신원 쿠키를 꽂고 돌리면 목록이나
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

  /**
   * 빈 상태 상자는 **제 칸의 폭을 쓴다.**
   *
   * 봇 대화·학습 기록의 빈 상태는 `flex items-center justify-center` 래퍼 안에 있어
   * flex 아이템이 글자 폭으로 줄어 있었다 — 같은 `EmptyState` 인데 봇 마켓(블록으로 놓여
   * 제 폭을 쓴다)보다 눈에 띄게 좁았다. 고장이 아니라 **조용히 좁아지는** 종류라 눈으로
   * 볼 때까지 아무도 몰랐고, 단위 테스트(jsdom)는 폭을 재지 못한다. 그래서 여기서 잡는다.
   *
   * 재는 기준은 **제 부모** 폭이다. 본문(`main`) 폭과 대면 본문 좌우 패딩(24px씩)이 비율에
   * 섞여 좁은 화면에서 기준이 흔들린다 — 375px 에서 327/375 = 0.87 이라 「제 폭을 쓰는」
   * 상자가 거짓으로 걸린다. 부모 대비면 화면 폭과 무관하게 줄었을 때만 떨어진다
   * (실제로 줄었을 때 0.31 까지 내려가는 것을 되돌려 확인했다).
   *
   * 상자를 `data-testid` 로 잡는다. `section.border-dashed` 같은 클래스로 잡으면 색·테두리만
   * 손봐도 prod-verify 가 빨개진다.
   *
   * 화면마다 따로 도는 이유: 한 test 에 묶으면 첫 화면에서 던지고 나머지 둘은 재지도 못한다.
   */
  for (const { path, name } of [
    { path: '/classbot/discover', name: '봇 마켓' },
    { path: '/classbot/chat', name: '봇 대화' },
    { path: '/classbot/me/progress', name: '학습 기록' },
  ]) {
    test(`빈 상태 상자 — ${name} 는 제 칸의 폭을 쓴다`, async ({ page }) => {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });

      const boxes = page.getByTestId('empty-state');
      // 신원에 따라 목록이 차 있을 수 있다(이 스펙은 익명으로 돌지만 로컬에서는 개발용 신원
      // 쿠키를 꽂고 돌리기도 한다 — 위 「마켓 화면이 제 상태 중 하나를」 주석과 같은 사정).
      // 그때는 잴 상자가 없다. 없는 것을 실패로 적지 않는다.
      await page.waitForLoadState('networkidle');
      test.skip((await boxes.count()) === 0, `${path} — 이 신원에서는 빈 상태가 아니다`);

      const box = boxes.first();
      await expect(box).toBeVisible({ timeout: 10_000 });

      const ratio = await box.evaluate((el) => {
        const parent = el.parentElement;
        if (!parent) return 0;
        return el.getBoundingClientRect().width / parent.getBoundingClientRect().width;
      });

      expect(ratio, `${path} — 빈 상태 상자가 제 칸을 못 쓰고 글자 폭으로 줄었다`).toBeGreaterThan(0.95);
    });
  }

  test('legacy /classbot/live/[botId] → chat 리다이렉트', async ({ page }) => {
    await page.goto(BASE + '/classbot/live/cb_001', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/classbot\/chat\?bot=cb_001/);
  });
});

/**
 * 기획 보류 — 즉석 퀴즈 내기 모달(F4, B8 / SCR-C-20) 검증이 여기 있었다.
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
    // 나가는 길은 둘 — 그 봇을 고치는 길과 그 봇으로 과제를 내는 길.
    // 「봇 삭제」는 나가는 길이 아니라 여기서 끝나는 일이라 같은 메뉴 아래쪽에 따로 선다.
    for (const label of ['수정하기', '과제 내기', '봇 삭제']) {
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

  // 삭제는 되돌릴 수 없는 일이라 반드시 한 번 되묻는다. 「그만두기」로 빠져나오면 그 봇은 그대로다.
  test('봇 카드 더보기 → 봇 삭제는 먼저 되묻는다', async ({ page }) => {
    await page.goto(BASE + '/teacher/classbot', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-ops-card-cb_004').getByRole('button', { name: /더보기/ }).click();
    await page.getByRole('menu').getByRole('menuitem', { name: '봇 삭제' }).click();

    const dialog = page.getByTestId('bot-delete-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'alertdialog');
    await expect(dialog).toContainText('봇을 삭제하면 해당 학생은 봇을 이용할 수 없어요.');

    await dialog.getByRole('button', { name: '그만두기' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('bot-ops-card-cb_004')).toBeVisible();
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
    // 폼의 봇 자리(지금 이름은 「수업방」)가 눌러 온 봇이다 — 종전에는 늘 첫 봇(수학봇)이 골라져 있었다
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

  // 봇을 가리키지 못하는 링크는 ?tab= 만 실어 목록으로 온다 — 봇은 교사가 고르고 탭만 이어 붙인다.
  // 종전엔 셋이었다(학생 목록·학생 상세·봇 빌더). 앞 둘은 학급의 봇 id 를 모르는 목 명단 위에 서 있어
  // 결함 03-③ 이 그 화면들과 함께 걷었고, 지금 남은 발신자는 **봇 빌더**(`build-yards.tsx`) 하나다
  // — 아직 봇을 만들기 전이라 가리킬 봇이 없다. (`/teacher/settings` 는 링크가 아니라 redirect 다.)
  test('?tab= 를 실은 채 들어오면 고른 봇의 그 탭으로 바로 들어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/bots?tab=drift', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-manage-card-cb_001').getByRole('link').click();
    await expect(page).toHaveURL(BASE + '/teacher/bots/cb_001?tab=drift');
    await expect(page.getByText('이탈 대응 강도')).toBeVisible();
  });

  /*
   * 「학생 목록의 「봇 관리」는 이탈 대응을 실은 채 목록으로 온다」는 **2026-09-18 에 걷혔다.**
   *
   * 그 링크는 원래 학급 관제소에 달려 있었고, 계획 PR 7 이 관제소를 정본 신호 표로 바꾸며 목 명단
   * (`monitor-roster.tsx`)과 함께 학생 목록(`/teacher/students`)으로 옮겨 갔다. 결함 03-③ 이 그 목
   * 명단을 걷으면서 **그 링크를 내는 자리가 앱 전체에서 0 이 됐다** — 지어낸 학생 스무 명의 이탈
   * 합계를 근거로 달려 있던 링크였다. 없는 링크를 지키는 검사를 남겨 두지 않는다.
   *
   * 이 검사가 지키던 것(「`?tab=` 이 봇을 고르는 단계까지 살아서 넘어간다」)은 **바로 위 검사가
   * 그대로 지킨다** — 거기는 `?tab=drift` 를 실은 채 목록으로 들어가 카드를 눌러 상세까지 간다.
   * 여기는 그 앞 한 칸(보내는 쪽)만 더 보던 것이고, 그 보내는 쪽이 사라졌다.
   */

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

/*
 * F5·B10 「교사 홈 「먼저 볼 학생」 → 학생 상세」는 **2026-09-18 에 걷혔다.**
 *
 * 이 검사가 지키던 것은 「홈에서 학생 하나로 들어갈 길이 있고 그 화면이 제 내용을 그리는가」였는데,
 * 홈의 그 표가 지어낸 학생 다섯(`pickAttentionStudents`)을 그리고 있었다. 고를 근거(대화·막힌 개념·
 * 도달 기록)를 읽는 문이 정본에 없어 표를 빈 상태로 바꿨고, 그러면서 **홈에서 학생으로 들어가는 길이
 * 없어졌다.** 없는 길을 지키는 검사를 남겨 두지 않는다.
 *
 * **그 「별건」이 같은 날 왔다(결함 03-③).** 학생 상세(`/teacher/students/[id]`) 라우트는 남아 있지만
 * 목은 함께 걷혔다 — 지어낸 학생 스무 명 위에 서던 패널 넷은 파일째 사라졌고, 그 주소는 이제
 * 「이 주소로는 학생 기록을 읽어 올 수 없어요」만 말한다(정본 대화 문은 반 id 가 있어야 열린다).
 * 라우트를 남긴 것은 레일이 `matchPrefix` 로 그 경로를 학급 관제소 소속이라 못박고 있고,
 * 밖에 남은 주소가 Next 기본 404 로 떨어지지 않게 하려는 것뿐이다.
 *
 * 홈에서 그 길이 다시 나는 날은 정본에 그 문이 열리는 날이고, 그때 이 자리에 같은 모양으로 되살린다.
 */
