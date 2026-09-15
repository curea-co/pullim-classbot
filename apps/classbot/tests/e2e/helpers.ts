import { type Page, expect } from '@playwright/test';

/**
 * 신규 사용자는 참여한 클래스가 없다(빈 상태).
 * 챗·과제 등 surface 를 검증하려면 먼저 참여 코드로 교사 클래스에 들어간다.
 * (class-enrollment 스토어 → localStorage 'pullim-class-enrollment' 에 지속)
 *
 * ⚠ 「봇을 얻는 길은 참여 코드뿐」은 더 이상 사실이 아니다 — 학생은 봇 마켓에서 봇을 **담을** 수도
 * 있고, 담은 봇은 반 봇과 **한 목록**에서 대화한다(`lib/store/mode-bots.ts`). 이 헬퍼가 참여 코드를
 * 쓰는 이유는 그것이 유일한 길이라서가 아니라, **로그인 없이 도는 이 스펙들이 쓸 수 있는 길**이라서다 —
 * 마켓 목록·담기는 신원을 요구한다(마켓 계약 §2).
 *
 * 데모 유효 코드: MATH-2024(cb_001) / ENG-2024(cb_002) / SCI-2024(cb_003) — `lib/mock/class-codes.ts`
 */
export async function joinDemoClass(page: Page, code = 'MATH-2024'): Promise<void> {
  await page.goto('/classbot', { waitUntil: 'networkidle' });
  await page.getByLabel('참여 코드 입력').fill(code);
  await page.getByRole('button', { name: '참여' }).click();
  // 참여 반영 — 홈이 참여 중인 클래스 목록을 가진 교사수업 홈으로 전환된다
  await expect(page.getByText('참여 중인 클래스')).toBeVisible({ timeout: 10_000 });
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
