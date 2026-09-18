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
    // 첫 단언에 넉넉한 timeout 을 주는 이유: 홈이 한 RTT 동안 스켈레톤을 그린다
    // (`page.tsx` 의 `roomsLoading` 가드).
    // TODO(e2e 트랙): 여기 적힌 `/api/me/classrooms` 401 은 계획 PR 8 이 그 라우트를 걷으며
    // 사라졌다 — 지금 홈이 기다리는 것은 정본 `GET /classbot/bots?role=student` 다.
    // 이 스펙은 `mixed-role-pending` 이라 다시 쓰지 않고 사실만 적어 둔다.
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

  // 봇을 가리키지 못하는 링크(학생 목록·학생 상세·봇 빌더)는 ?tab= 만 실어 목록으로 온다.
  test('?tab= 를 실은 채 들어오면 고른 봇의 그 탭으로 바로 들어간다', async ({ page }) => {
    await page.goto(BASE + '/teacher/bots?tab=drift', { waitUntil: 'networkidle' });

    await page.getByTestId('bot-manage-card-cb_001').getByRole('link').click();
    await expect(page).toHaveURL(BASE + '/teacher/bots/cb_001?tab=drift');
    await expect(page.getByText('이탈 대응 강도')).toBeVisible();
  });

  // 이 링크는 학급 관제소에 달려 있었다 — 계획 PR 7 이 관제소를 정본 신호 표로 바꾸며 목 명단(`monitor-roster.tsx`)이
  // 학생 목록(`/teacher/students`)으로 옮겨 갔고, 링크도 그 명단 아래에 그대로 산다.
  test('학생 목록의 「봇 관리」는 이탈 대응을 실은 채 목록으로 온다', async ({ page }) => {
    await page.goto(BASE + '/teacher/students', { waitUntil: 'networkidle' });

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

/**
 * F5·B10 — 교사가 홈에서 **먼저 볼 학생**을 골라 그 학생 하나로 들어간다.
 *
 * ⚠ 이 자리는 **카드 + 모달이 아니다.** 예전에는 위기 학생 카드를 누르면 「〈이름〉 학생책」
 * 모달이 떴고(`components/classbot/crisis-intervention-panel.tsx`), 그 모달 안에
 * 「1:1 채팅 시작」 버튼이 있었다. 교사 관제 재설계(#219)와 「남은 학생 명단 둘도 표로」(#265)가
 * 그 카드를 **표**로 갈았다 — 줄 전체가 학생 상세(`/teacher/students/<id>?from=home`)로 가는
 * 링크이고, 모달은 없다. 그 컴포넌트는 어느 화면에도 마운트되지 않은 채 남아 있다가 **FE PR 5c 가 지웠다** —
 * 안에 있던 「응원 한마디」 폼이 은퇴한 로컬 개입 스토어(`lib/store/interventions.ts`)의 `send()` 위에 서 있었고,
 * `crisis` 개입은 이제 위험 신호에서 **서버가 자동으로 만든다**(`proc/spec/05 § 3`).
 *
 * 그래서 **표를 지키는 쪽으로 다시 쓴다.** 학생 이름(`도현`)으로 잡던 것도 걷었다 —
 * 홈이 보여 주는 몇 줄은 `pickAttentionStudents` 가 골라 주는 것이라 **특정 이름이 그 안에
 * 있다는 보장이 없다**(실측: 지금은 권태민·장현우·남유하·배서진·윤시우다). 이 검사가 지키는 것은
 * 「누가 뜨는가」가 아니라 **「홈에서 학생 하나로 들어갈 길이 있고 그 화면이 제 내용을 그리는가」**다.
 *
 * 「1:1 채팅 시작」은 되살리지 않는다 — 그 CTA 는 홈에서 사라졌고, 위기 대응 동선은 명세상
 * 리포트 상세의 위기 신호 패널(`teacher/reports/[id]` — 「1:1 상담 (v2)」 · 「Wee센터 연결 (v2)」)이
 * 맡는다(13 § 5 · 07 § 6.6.2). 그 둘은 **준비 중 자리표시라 disabled** 이므로 「눌러서 들어간다」를
 * 여기서 검증할 수 있는 것이 없다.
 */
test.describe('교사 홈 「먼저 볼 학생」 → 학생 상세 (F5, B10)', () => {
  test('표의 학생 이름을 누르면 그 학생 상세로 가고, 돌아갈 곳이 교사 홈이다', async ({ page }) => {
    await page.goto(BASE + '/teacher', { waitUntil: 'networkidle' });

    const roster = page.getByRole('table', { name: '먼저 볼 학생' });
    await expect(roster).toBeVisible();

    // 줄의 이름 링크 하나 — `?from=home` 이 붙어 있어야 상세의 뒤로 가기가 관제소로 튀지 않는다
    // (`attention-roster.tsx` 의 `href`, `students/[id]/entry-source.ts`).
    const firstStudent = roster.getByRole('link').first();
    const href = (await firstStudent.getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/teacher\/students\/\w+\?from=home$/);

    const name = (await firstStudent.textContent())?.trim() ?? '';
    expect(name.length).toBeGreaterThan(0);

    await firstStudent.click();
    await expect(page).toHaveURL(BASE + href);

    // 상세가 세 가지를 답한다 — 누구인가(헤더) · 어디서 막혔나 · 어떤 대화를 했나 (spec 11 § 3.3.3)
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /막힌 지점/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '대화 기록', exact: true })).toBeVisible();

    // 들어온 곳으로 돌아가는 길
    await expect(page.getByRole('link', { name: /교사 홈/ })).toBeVisible();
  });
});
