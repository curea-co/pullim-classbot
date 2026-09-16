import { rmSync } from 'node:fs';
import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE, type E2eRole } from '../../playwright.config';

/**
 * 로그인 레인 셋업 (prod-verify `setup-student` / `setup-teacher` 프로젝트) — 풀림 OS 로그인 라운드트립을
 * 역할별로 **한 번** 돌려 세션을 `storageState` 로 남긴다. `login-<role>` 프로젝트의 스펙들은 그 쿠키로 시작한다.
 * 한 파일에 두 테스트(`[student]` · `[teacher]`)를 두고 프로젝트가 `grep` 으로 제 것을 고른다.
 *
 * 클래스봇은 자체 로그인 화면이 없다(2026-09-15). 로그인은 `${OS_URL}/login?next=<복귀 URL>`
 * 이고, OS 가 성공 시 `.pullim.ai` 에 HttpOnly 세션 쿠키를 심은 뒤 `next` 로 돌려보낸다.
 * `next` 는 cross-host 복귀라 앱 오리진의 **절대 URL** 로 싣는다 — 앱의 `resolveReturnTarget`(B-7)
 * 이 만드는 형태와 같다. OS 쪽 복귀 호스트 허용 목록(B-8)에 앱 호스트가 없으면 여기서 실패한다.
 *
 * 폼 셀렉터의 권위: pullim-fe `apps/web/src/app/login/LoginClient.tsx`
 *  - `<form aria-label="로그인">` 안에 `<label>이메일 <input type=email>` · `<label>비밀번호 <input type=password>`
 *  - 제출 버튼 「로그인」(진행 중엔 「로그인 중…」) · 실패 문구는 `role="alert"`
 *  - `next` 가 있으면 폼보다 먼저 「세션 확인 중…」 프로브가 돈다 → 폼이 **보일 때까지** 기다린다.
 *
 * 필요한 환경변수 — 역할마다 셋. 하나라도 없으면 **실패가 아니라 건너뛴다**(상태 파일은 남기지 않는다):
 *   E2E_OS_URL                 풀림 OS 호스트 (prod-verify 기본값 https://os.pullim.ai)
 *   E2E_OS_STUDENT_EMAIL / E2E_OS_STUDENT_PASSWORD   OS 학생 테스트 계정
 *   E2E_OS_TEACHER_EMAIL / E2E_OS_TEACHER_PASSWORD   OS 교사 테스트 계정
 *
 * 자격증명은 어디에도 남기지 않는다: 로그로 찍지 않고, 실패 메시지에서 지우고(Playwright 원문 포함),
 * 실패 직전 폼의 값을 비운다 — Playwright 가 실패 뒤 남기는 error-context.md 가 모든 input 의 값을
 * 담기 때문이다(실측 2026-09-16). 이 프로젝트는 트레이스·스크린샷도 끈다(playwright.config.ts).
 */

const ROLES: E2eRole[] = ['student', 'teacher'];
/** 역할별 복귀 화면 — RoleGuard 가 제 역할 홈으로 보내는 곳과 같다. */
const HOME_PATH: Record<E2eRole, string> = { student: '/classbot', teacher: '/teacher' };

type Credentials = { osUrl: string; email: string; password: string };

function readCredentials(role: E2eRole): { ok: true; value: Credentials } | { ok: false; missing: string[] } {
  const prefix = `E2E_OS_${role.toUpperCase()}`;
  const names = { osUrl: 'E2E_OS_URL', email: `${prefix}_EMAIL`, password: `${prefix}_PASSWORD` };
  const missing = Object.values(names).filter((name) => !process.env[name]);
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    value: {
      osUrl: process.env[names.osUrl]!.replace(/\/$/, ''),
      email: process.env[names.email]!,
      password: process.env[names.password]!,
    },
  };
}

for (const role of ROLES) {
  setup(`[${role}] 풀림 OS 로그인 라운드트립 → 세션을 storageState 로 남긴다`, async ({ page, baseURL }) => {
    const statePath = STORAGE_STATE[role];
    const creds = readCredentials(role);
    if (!creds.ok) {
      // 상태 파일을 남기지 않는다(지난 실행의 세션도 지운다). 그래서 `login-<role>` 은 storageState 부재(ENOENT)로
      // **크게** 멎는다 — 시크릿 없이 로그인 레인을 익명으로 돌리는 길은 두지 않는다.
      // prod-verify 는 역할의 시크릿 쌍이 없으면 그 레인 스텝 자체를 건너뛰므로 여기에 닿지 않는다.
      rmSync(statePath, { force: true });
      setup.skip(true, `${creds.missing.join(', ')} 미설정 — ${role} 로그인 레인은 돌지 않는다`);
      return;
    }
    const { osUrl, email, password } = creds.value;
    const appOrigin = new URL(baseURL!).origin;
    const next = `${appOrigin}${HOME_PATH[role]}`;

    const form = page.getByRole('form', { name: '로그인' });
    const emailField = form.getByLabel('이메일', { exact: true });
    const passwordField = form.getByLabel('비밀번호', { exact: true });
    // OS 로그인 화면엔 글자 없는 `role=alert`(토스트 자리)가 늘 하나 있어(실측 2026-09-16) 글자 있는 것만 본다.
    const loginAlert = page.getByRole('alert').filter({ hasText: /\S/ }).first();
    /** 실패 메시지에서 자격증명을 지운다 — Playwright 원문 메시지가 값을 실어도 그대로 나가지 않게. */
    const sanitize = (text: string) => text.split(password).join('<password>').split(email).join('<email>');

    try {
      await page.goto(`${osUrl}/login?next=${encodeURIComponent(next)}`);

      // `next` 가 있으면 LoginClient 는 먼저 세션 복구 프로브(「세션 확인 중…」)를 돌리고, 세션이 없을 때
      // 폼을 보여준다. 프로브가 끝나기 전에 fill 하면 폼이 없어 실패하므로 폼이 보일 때까지 기다린다.
      await expect(form, 'OS 로그인 폼이 뜨지 않았다 — E2E_OS_URL 이 OS 호스트인지 확인').toBeVisible({
        timeout: 20_000,
      });
      await emailField.fill(email);
      await passwordField.fill(password);
      await form.getByRole('button', { name: '로그인', exact: true }).click();

      // 성공이면 OS 가 `window.location.assign(next)` 로 앱에 돌려보낸다. 실패면 폼 아래 `role=alert` 에
      // 문구가 뜬다 — 둘을 경주시켜 거절은 30초를 기다리지 않고 바로 그 문구로 실패한다.
      const landed = page
        .waitForURL((url) => url.origin === appOrigin, { timeout: 30_000 })
        .then(() => 'landed' as const);
      const rejected = loginAlert.waitFor({ timeout: 30_000 }).then(() => 'rejected' as const);
      const outcome = await Promise.race([landed, rejected]).catch(() => 'timeout' as const);
      // 진 쪽의 타임아웃·페이지 종료 거부가 미처리 거부로 남지 않게 한다.
      landed.catch(() => {});
      rejected.catch(() => {});

      if (outcome !== 'landed') {
        // 문구가 있으면 자격증명 쪽, 문구 없이 OS 에 머물면 복귀 호스트 허용 목록(B-8) 쪽이다.
        const alerts = await loginAlert.allInnerTexts().catch(() => [] as string[]);
        throw new Error(
          `OS 로그인 뒤 앱(${appOrigin})으로 돌아오지 못했다 — 현재 ${page.url()}` +
            (alerts.length > 0 ? ` · 로그인 화면 문구: 「${alerts.join(' / ')}」` : '') +
            ` — ${role} 자격증명이나 OS 의 복귀 호스트 허용 목록(B-8)을 확인한다.`,
        );
      }
    } catch (error) {
      // 실패 시점의 DOM 에서 자격증명을 지운다 — 아직 OS 폼에 있으면 바로 비워지고, 이미 떠났으면 짧게 포기한다.
      // **차례로** 지운다: Playwright 의 빈 fill 은 「포커스된 요소를 전체 선택 → Delete」라서 둘을 동시에 걸면
      // 뒤의 fill 이 포커스를 가져가 Delete 가 그쪽에만 두 번 떨어진다(실측 2026-09-16: 이메일만 비고 비밀번호가 남았다).
      await passwordField.fill('', { timeout: 2_000 }).catch(() => {});
      await emailField.fill('', { timeout: 2_000 }).catch(() => {});
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[${role}] OS 로그인 셋업 실패: ${sanitize(message)}`);
    }

    expect(new URL(page.url()).origin, '복귀 도착지가 앱 오리진이 아니다').toBe(appOrigin);
    // 세션이 실제로 심겼는지의 최소 증인 — 쿠키가 하나도 없으면 로그인 레인은 익명과 다를 게 없다.
    // 쿠키 이름·도메인은 환경마다 달라 여기서 고정하지 않는다. 세션이 살았는지는 뒤따르는 스펙이 본다.
    const cookies = await page.context().cookies();
    expect(cookies.length, '로그인 뒤 컨텍스트에 쿠키가 하나도 없다').toBeGreaterThan(0);

    await page.context().storageState({ path: statePath });
  });
}
