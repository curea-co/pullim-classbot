import { type Page, expect } from '@playwright/test';

/**
 * 신규 사용자는 참여한 클래스가 없다(빈 상태).
 * 학생 모드는 `class`(교사 수업) 고정이므로 — 자기주도 모드 보류, `lib/store/student-mode.ts` —
 * 챗·과제 등 surface 를 검증하려면 먼저 참여 코드로 교사 클래스에 들어간다.
 * (class-enrollment 스토어 → localStorage 'pullim-class-enrollment' 에 지속)
 *
 * 데모 유효 코드: MATH-2024(cb_001) / ENG-2024(cb_002) / SCI-2024(cb_003) — `lib/mock/class-codes.ts`
 */
export async function joinDemoClass(page: Page, code = 'MATH-2024'): Promise<void> {
  await page.goto('/classbot', { waitUntil: 'networkidle' });
  await page.getByLabel('참여 코드 입력').fill(code);
  await page.getByRole('button', { name: '참여하기' }).click();
  // 참여 반영 — 홈이 참여 중인 클래스 목록을 가진 교사수업 홈으로 전환된다
  await expect(page.getByText('참여 중인 클래스')).toBeVisible({ timeout: 10_000 });
}
