import { type Page, expect } from '@playwright/test';

/**
 * 학생 홈(`/classbot`)이 **정착해서 서는지**만 확인한다. **반에 들어가지는 않는다** — 이름만 옛것이다.
 *
 * ## 걷어낸 것 — `MATH-2024`
 *
 * 종전에는 참여 코드 칸에 `MATH-2024` 를 넣고 「참여」를 눌렀다. 그 코드는 옛 mock 표
 * (`lib/mock/class-codes.ts`)의 것이고 **정본(`POST /classbot/enrollments`)에는 없다 — 404**
 * (실측 2026-09-18 dev). 계획 PR 8 이 그 코드를 풀어 주던 같은 오리진 route handler 와 mock 폴백을
 * 함께 걷었기 때문이다(`components/classbot/home/join-code-form.tsx` 머리주석).
 *
 * **그 두 줄이 이 레인에서 무엇을 했는지는 관측된 바 없다 — 레인이 아직 한 번도 돌지 않았다.**
 * 두 레인 워크플로는 `dev` 에만 있고(`origin/main` 의 `.github/workflows/prod-verify.yml:93` 은
 * 프로젝트 구분 없는 단일 `bun x playwright test` 한 줄이다), `login-student` 스텝은
 * `prod-verify.yml:118` 의 `if: env.HAS_E2E_STUDENT == 'true'` 에 걸려 있는데 그 값(`:64`)이 보는
 * `E2E_OS_STUDENT_EMAIL`·`_PASSWORD` 가 **이 리포에 없다**(`gh secret list`, 2026-09-18:
 * `REVIEW_BOT_APP_ID`·`REVIEW_BOT_PRIVATE_KEY` 둘뿐). 검증한 바가 없으니 남길 이유도 없다.
 *
 * ## 남긴 것 — 홈은 둘 중 하나로 선다
 *
 * 정착한 학생 홈의 모양은 **둘뿐**이고 `useMyRooms()` 의 반 수가 가른다
 * (`app/(student)/classbot/page.tsx:71`·`:107`):
 *
 * | 반 | 화면 | 잡는 글자 |
 * |---|---|---|
 * | 0곳 | `TeacherClassHome` — 참여 코드 hero | 「아직 받은 과제가 없어요」(`components/classbot/teacher-class-home.tsx:48`) |
 * | 1곳 이상 | 히어로·패널 + `JoinedClasses` | 「참여 중인 클래스」(`components/classbot/home/joined-classes.tsx:48` — `:34` 가 0곳이면 null) |
 *
 * **어느 쪽이든 홈이 선 것이고, 둘 다 아니면 안 선 것이다**(조회 실패는 `page.tsx:96` 의 오류
 * 갈래라 둘 다 안 나온다). 그래서 계정 상태를 전제하지 않고 둘 중 하나만 본다 —
 * `public-and-gates.spec.ts` 가 코어 화면을 「셋 중 하나」로 보는 것과 같은 결이다.
 *
 * ## ⚠ 이 헬퍼는 「봇이 있다」를 보장하지 않는다 — 그리고 레인 안에서 요구가 갈린다
 *
 * 호출하는 대화 스펙들은 봇을 전제하는데 그 전제를 **세울 수단이 지금은 없다**(참여 코드가 정본에서
 * 404 이므로). 게다가 **같은 `login-student` 레인**이 한 계정에 서로 반대를 요구한다:
 *
 *  - `chat-greeting-by-bot.spec.ts:17` — 봇이 **하나도 없을 것**(「아직 대화할 봇이 없어요」.
 *    그건 홈이 아니라 **챗 화면**의 글자다 — `app/(student)/classbot/chat/page.tsx:289`).
 *  - 같은 파일 `:38` 부터 · `chat-quick-prompts-by-bot` · `chat-scroll-and-input` — 봇이 **있을 것**.
 *
 * 챗의 반 봇은 홈과 **같은 `useMyRooms()`** 에서 온다(`lib/store/mode-bots.ts`) — 한 계정이 둘을
 * 동시에 만족할 수 없다. **시크릿을 붙이는 PR 이 그 결정을 해야 한다**: 계정을 둘로 가르든(빈 계정 /
 * 반 있는 계정), 스펙을 상태별로 다시 쓰든(`playwright.config.ts` 의 `MIXED_ROLE_SPECS` TODO).
 * 이 헬퍼는 그 결정을 앞질러 한쪽을 못 박지 않으려고 **계정 상태를 전제하지 않는다.**
 *
 * 이름을 `joinDemoClass` 로 남겨 둔 것은 세 스펙의 호출 일곱 자리를 건드리지 않으려는 것뿐이다 —
 * 위 결정이 날 때 이름도 함께 고친다.
 * @param page - 학생 세션(`login-student` 레인)의 페이지
 */
export async function joinDemoClass(page: Page): Promise<void> {
  await page.goto('/classbot', { waitUntil: 'networkidle' });
  // 홈은 한 RTT 동안 스켈레톤(`page.tsx:92`)을 그린다 — `toBeVisible` 이 그동안 다시 본다.
  // 두 글자는 배타적이라(위 표) strict mode 에 걸리지 않는다.
  await expect(
    page.getByText('참여 중인 클래스').or(page.getByText('아직 받은 과제가 없어요')),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * 과제 출제 화면(`/teacher/assignment/new`)의 제목을 **React 가 받을 때까지** 넣는다.
 *
 * `page.goto` 뒤 곧바로 `fill` 하면 React 가 붙기 전에 닿은 값이 **지워진다** — 제어
 * 컴포넌트라 하이드레이션 직후 `value=''` 로 다시 그려지기 때문이다. 그러면 `titleValid` 가
 * 거짓이라 「과제 내기」 버튼이 계속 disabled 이고, 뒤따르는 클릭이 30초를 기다리다 죽는다.
 * `goto` 의 기본 `load` 를 기다려도 부족하다 — **하이드레이션은 그 뒤에 온다.**
 * 실서비스 실측(#294): `domcontentloaded` 직후 fill → 값이 빈 문자열 · 버튼 disabled /
 * `load`·`networkidle` 이후 → 값이 남는다. 러너가 느린 날만 지는 **경합**이라, prod-verify 가
 * 3주째 성공·실패를 오갔다.
 *
 * ⚠ **`toHaveValue` 만으로는 못 막는다.** `toPass` 는 블록이 **던질 때만** 다시 돈다. 그런데
 * 하이드레이션 전 SSR input 에도 `fill` 은 먹고 바로 뒤 `toHaveValue` 도 통과한다 — 블록이
 * 첫 바퀴에 성공해 버리고, 그 **뒤에** React 가 붙어 값을 비우면 다시 돌 기회가 없다.
 * #294 가 그 형태였고, 경합이 좁아졌을 뿐 닫히지는 않았다.
 *
 * 그래서 같은 블록에서 **React 상태가 그 값을 받았다는 증인**까지 확인한다 — 「과제 내기」
 * 버튼의 활성이 그 증인이다(`canDispatch` ← `titleValid` ← React 상태). DOM 에 값이 있는데
 * 버튼이 잠겨 있으면 그것은 **아직 React 가 안 붙은 것**이므로, 블록이 던지고 다시 넣는다.
 *
 * 증인을 헬퍼 안에 둔 덕에 실패 메시지도 제 이름을 갖는다 — 없으면 「클릭 타임아웃」으로만
 * 보여 네 검증(`titleValid`·`targetValid`·`dueValid`·문항 수) 중 무엇이 막았는지 로그에
 * 남지 않는다. 같은 자리가 스펙 파일 셋에 다섯 벌 있어서 여기 한 곳으로 모았다.
 * @param page - 출제 화면이 열려 있는 페이지
 * @param title - 넣을 과제 제목 (5자 이상이어야 「과제 내기」 버튼이 열린다)
 */
export async function fillAssignmentTitle(page: Page, title: string): Promise<void> {
  await expect(async () => {
    await page.getByTestId('title-input').fill(title);
    await expect(page.getByTestId('title-input')).toHaveValue(title);
    await expect(page.getByTestId('dispatch-btn')).toBeEnabled();
  }).toPass({ timeout: 15_000 });
}

/**
 * 풀이 워크스페이스에서 마지막 문항까지 넘긴 뒤 제출한다.
 *
 * ⚠ 옛 형태(스펙 파일 둘에 네 벌 복사돼 있던 15줄 루프)는 **경합이었다.**
 * `waitForURL(/\/solve/)` 는 URL 이 바뀐 순간 풀리는데, 하단 액션 바(「이전 / 다음·제출」)는
 * 클라이언트 컴포넌트라 **그 뒤에** 그려진다. `isVisible()` 은 기다리지 않으므로 두 버튼이
 * 아직 없으면 **둘 다 false** 가 되고, 옛 루프는 `else break` 로 첫 바퀴에 빠져나갔다.
 * 그러면 제출을 못 한 채 다음 줄의 `waitForURL(/\/result/)` 가 타임아웃으로 죽는다.
 * 실서비스 실측: `solve?step=1` 도착 직후 첫 바퀴가 「제출=false · 다음=false」 → 즉시 break →
 * 최종 URL 이 여전히 `solve?step=1`(진행도 1/5). prod-verify 의 `feedback-loop` 두 건이 그 모습이었다.
 *
 * 그래서 **매 바퀴 정착을 먼저 기다린다** — 둘 중 하나가 보일 때까지. 문항 전환 직후에도
 * 한 프레임 비는 순간이 있어서 루프 밖이 아니라 **안**에 둔다.
 * @param page - 풀이 워크스페이스(`/classbot/assignment/<id>/solve`)가 열려 있는 페이지
 * @param maxSteps - 안전 상한. 이 안에 제출에 닿지 못하면 던진다
 */
export async function solveAllAndSubmit(page: Page, maxSteps = 15): Promise<void> {
  // 하단 액션 바의 두 버튼 — 마지막 문항에서만 「제출」이고 그 전까지는 「다음」이다.
  // `exact` 로 잡는다: 느슨하게 두면 봇 패널·힌트 버튼의 글자까지 걸려 strict mode 위반이 난다.
  const submit = page.getByRole('button', { name: '제출', exact: true });
  const next = page.getByRole('button', { name: '다음', exact: true });

  for (let step = 0; step < maxSteps; step++) {
    await expect(submit.or(next)).toBeVisible({ timeout: 15_000 });
    if (await submit.isVisible()) {
      await submit.click();
      return;
    }
    await next.click();
  }
  throw new Error(`문항을 ${maxSteps}번 넘겼는데 제출 버튼에 닿지 못했다`);
}
