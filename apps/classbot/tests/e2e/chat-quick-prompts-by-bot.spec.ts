import { test, expect, type Locator } from '@playwright/test';
import { joinDemoClass } from './helpers';

/**
 * 인라인 퀴즈의 답 제출 버튼.
 *
 * **보이는 글자는 「제출」이지만 접근성 이름은 그게 아니다.** 화면이 문항을 실은
 * `aria-label`(`「<문항>」 답 제출하기`)을 달고 있어서(chat `page.tsx`) role 조회의 이름은
 * 그쪽이 이긴다 — 그래서 `{ name: '제출', exact: true }` 는 **아무것도 못 찾는다.**
 * prod-verify 의 이 파일 두 건이 그 모습이었다(실측 접근성 트리:
 * `button "「y = 2x − 3 의 그래프의 기울기는?」 답 제출하기" [disabled]: 제출`).
 *
 * 화면 쪽이 옳다 — 「보이는 글자는 명사 두 어절이고, 잃은 뜻은 `aria-label` 이 든다」가
 * 규약(07 § 6.6)이고, 한 화면에 퀴즈가 여러 개일 때 「제출」 하나로는 무엇을 내는 버튼인지
 * 스크린리더가 가릴 수 없다. 「제출」은 `aria-label` 안에 그대로 들어 있어 WCAG 2.5.3
 * (Label in Name)도 지킨다. 그러니 **스펙이 접근성 이름을 따라간다.**
 * @param chat - 챗 스크롤 영역(`[data-slot="chat-scroll"]`) 로케이터
 * @returns 그 영역 안의 답 제출 버튼
 */
function quizSubmit(chat: Locator): Locator {
  return chat.getByRole('button', { name: /답 제출하기/ });
}

/**
 * 봇 주도 가이드 수업 — 흐름칩 + 힌트 사다리 + 오답 처방 (출시 빈 상태 기준 재작성).
 *
 * 신규 사용자는 참여 코드로 교사 클래스에 들어간 뒤 챗에서 가이드 수업을 진행한다.
 * 흐름칩(개념→예제→퀴즈)이 서로 다른 리치 답변을 만들고, 인라인 퀴즈는
 * 단계적 힌트 + 오답 처방을 제공한다.
 */
test.describe('가이드 수업 흐름칩 (참여 후)', () => {
  test('흐름칩 노출 + 칩별 답변(개념/예제/퀴즈)', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '예제 풀어줘' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();

    // 개념 더보기 → 개념 카드(「자세히 보기 →」는 챗 버블 전용 문구)
    await page.getByRole('button', { name: '개념 더보기' }).click();
    await expect(chat.getByRole('button', { name: '자세히 보기 — 학습 팁·예제 문항' })).toBeVisible({ timeout: 3000 });

    // 예제 풀어줘 → 예제 fading 카드(B3: 점감 스캐폴딩 리드 문구)
    await page.getByRole('button', { name: '예제 풀어줘' }).click();
    await expect(chat.getByText(/직접 채워봐/)).toBeVisible({ timeout: 3000 });

    // 퀴즈 내줘 → 인라인 퀴즈
    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(quizSubmit(chat)).toBeVisible({ timeout: 3000 });
  });

  test('인라인 퀴즈 — 힌트 사다리 + 오답 처방', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(quizSubmit(chat)).toBeVisible({ timeout: 3000 });

    // 단계적 힌트 — 최소 1개 공개
    await chat.getByRole('button', { name: '힌트 보기', exact: true }).click();
    await expect(chat.getByText(/힌트 1 ·/)).toBeVisible();

    // 참여 클래스 봇 cb_001(수학봇 → 일차함수의 그래프 리치 수업) — 정답은 ①('2'), ②('−3')는 오답.
    // 오답(②) 제출 → distractor 처방(y절편) + 처방 버튼(다시 풀기·개념)
    await chat.getByRole('radio').nth(1).click();
    await quizSubmit(chat).click();

    // 오답 블록이 떴고(`아쉽지만 다시 볼까요?`), 그 안의 처방이 **헷갈린 개념을 이름으로 짚는다.**
    // 개념 이름만으로(`/y절편/`) 잡으면 안 된다 — 같은 화면의 오른쪽 학습 가이드가 그 개념을
    // 카드·진도로 여러 번 말하므로 strict mode 위반이 난다(실측 6곳). 그래서 처방 문장
    // (`classbot-lesson.ts` 의 `optionFeedback[1]`) 쪽으로 좁힌다.
    await expect(chat.getByText('아쉽지만 다시 볼까요?')).toBeVisible({ timeout: 2000 });
    await expect(chat.getByText(/y절편이야\. 기울기는/)).toBeVisible();
    await expect(chat.getByRole('button', { name: /다시 풀기/ })).toBeVisible();
    await expect(chat.getByRole('button', { name: /개념 다시 보기/ })).toBeVisible();
  });
});
