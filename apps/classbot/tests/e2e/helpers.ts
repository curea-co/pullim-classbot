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
