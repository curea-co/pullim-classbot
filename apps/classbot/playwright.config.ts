import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — E2E 시연 검증용.
 * dev 서버는 이미 외부에서 띄워둔 상태로 가정 (port 3032).
 *
 * 프로젝트 여섯 = 두 레인 + 보류 하나 (2026-09-16, 완성 계획 §10 해소 1):
 *  - `anon`          : 로그인 없이 돈다 — `public-and-gates.spec.ts` 하나. 공개 화면이 열리는지,
 *                      코어 화면이 「OS 로그인 / 로그인 게이트 / 셸」 셋 중 하나로 서는지만 본다.
 *  - `setup-student` / `setup-teacher`
 *                    : `auth.setup.ts` — 풀림 OS 로그인 라운드트립을 역할별로 한 번 돌려 세션을 STORAGE_STATE 에 남긴다.
 *                      OS 계정은 가입 때 역할이 고정되므로 학생·교사 계정이 따로 있어야 한다.
 *                      시크릿(E2E_OS_URL · E2E_OS_<ROLE>_EMAIL · E2E_OS_<ROLE>_PASSWORD)이 없으면 상태를 남기지 않고 건너뛴다.
 *  - `login-student` / `login-teacher`
 *                    : 한 역할의 화면만 밟는 스펙을 첫 화면의 역할로 나눠, 제 setup 뒤에 그 세션으로 돈다.
 *  - `mixed-role-pending`
 *                    : 한 파일에서 교사·학생 화면을 다 밟는 스펙 다섯. **prod-verify 는 이 프로젝트를 부르지 않는다**
 *                      (워크플로가 `--project=login-student` · `--project=login-teacher` 만 명시한다). 아래 TODO 참조.
 *
 *  `bun x playwright test --project=anon` 은 단독으로 돈다. `--project=login-<role>` 은 의존인 `setup-<role>` 을 함께 돈다.
 *  ⚠ 시크릿 없이 `--project=login-<role>` 을 돌리는 것은 **지원하지 않는다** — setup 이 건너뛰며 상태 파일을
 *  남기지 않으므로 그 프로젝트의 스펙은 storageState 부재(ENOENT)로 멎는다. 익명으로 조용히 도는 길은 없다.
 *  prod-verify 는 역할별 시크릿 쌍이 없으면 그 레인 스텝 자체를 건너뛴다.
 */

export type E2eRole = 'student' | 'teacher';

/** 로그인 레인이 쓰는 역할별 OS 세션(storageState). `.gitignore` 대상 — 절대 커밋하지 않는다. */
export const STORAGE_STATE: Record<E2eRole, string> = {
  student: path.join(__dirname, 'tests/e2e/.auth/student.json'),
  teacher: path.join(__dirname, 'tests/e2e/.auth/teacher.json'),
};

const desktop = devices['Desktop Chrome'];

/**
 * 로그인 레인은 트레이스를 남기지 않는다 — 이 리포는 공개라 실패 시 올라가는 test-results/ 를
 * 누구나 내려받을 수 있는데, 트레이스의 네트워크 기록엔 요청 헤더(= 테스트 계정 세션 쿠키)가
 * 그대로 담긴다. 대신 실패 스크린샷을 남긴다. 익명 레인엔 세션이 없어 기본(트레이스)을 유지한다.
 */
const loginLaneUse = { trace: 'off', screenshot: 'only-on-failure' } as const;

/**
 * setup 은 스크린샷도 끈다 — 실패 시점의 화면이 OS 로그인 폼이라 계정 이메일이 찍힌다.
 * (Playwright 가 실패 시 함께 남기는 error-context.md 는 모든 input 의 값을 담으므로 워크플로의
 *  업로드 path 에서 제외하고, auth.setup.ts 가 실패 직전 폼의 자격증명을 지운다.)
 */
const setupUse = { trace: 'off', screenshot: 'off' } as const;

/**
 * 익명 레인 스펙 — 로그인 없이 도는 것들.
 *  - `public-and-gates`: 공개 화면이 열리고 코어 화면이 셋 중 하나로 서는지.
 *  - `prod-origins`: 정본 API 가 이 화면의 오리진을 CORS 로 허용하는지. 그 값은 코드가 아니라
 *    ECS 태스크 정의 env 에 살아 리뷰가 닿지 않고, 빠져도 서버 로그에 안 남는다(스펙 머리주석).
 */
const ANON_SPECS = [
  /public-and-gates\.spec\.ts$/,
  /prod-origins\.spec\.ts$/,
];
const SETUP_FILE = /auth\.setup\.ts$/;

/** 첫 화면이 학생 라우트(`/classbot/*`)인 스펙 — 학생 계정 세션으로 돈다. */
const STUDENT_SPECS = [
  /chat-greeting-by-bot\.spec\.ts$/,
  /chat-quick-prompts-by-bot\.spec\.ts$/,
  /chat-scroll-and-input\.spec\.ts$/,
  /sso-login-roundtrip\.spec\.ts$/,
  /wellness-intensity-range\.spec\.ts$/,
];
/**
 * TODO(PR 6 e2e 트랙): 한 파일에서 교사·학생 화면을 **다 밟는** 스펙 다섯. 한 브라우저에서 교사↔학생을
 * 오가거나(assignment-dispatch · feedback-loop) 두 역할의 화면을 한 파일에 담는다(color-palette ·
 * mobile-and-focus · student-live-and-flows). 익명 데모에서는 통과하지만, 역할이 고정된 OS 계정 세션에서는
 * RoleGuard 가 다른 역할의 화면에서 제 홈으로 돌려보내므로 **절반이 반드시 빨개진다** — 교사 시크릿이 등록되는
 * 순간 `login-teacher` 를 붉게 만들 파일들이다. 그래서 `mixed-role-pending` 으로 떼어 두고 prod-verify 가
 * 부르지 않게 했다. 로컬에서는 `--project=mixed-role-pending` 으로 그대로 돌릴 수 있다(교사 세션).
 * PR 6 e2e 트랙에서 역할별 파일로 다시 쓰고, 그때 이 목록이 비면 프로젝트를 걷는다.
 */
const MIXED_ROLE_SPECS = [
  /assignment-dispatch\.spec\.ts$/,
  /color-palette\.spec\.ts$/,
  /feedback-loop\.spec\.ts$/,
  /mobile-and-focus\.spec\.ts$/,
  /student-live-and-flows\.spec\.ts$/,
];
// 교사 프로젝트 = 위 넷(익명·setup·학생·혼합)을 뺀 나머지 — 지금은 slider-variants 하나다.
// 새 스펙 파일은 기본으로 교사 프로젝트에 떨어진다 — 학생 화면이면 STUDENT_SPECS 에, 두 역할을 다 밟으면
// MIXED_ROLE_SPECS 에 올린다.

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'anon',
      testMatch: ANON_SPECS,
      use: { ...desktop },
    },
    // 로그인 라운드트립은 두 호스트를 오간다(OS 프로브 → 폼 → 복귀). 기본 30초에 두면 안의 대기(폼 20초 +
    // 복귀 30초)와 같은 순간에 끊겨 「왜 못 돌아왔는지」를 못 남긴다 — 실측(2026-09-16): 잘못된 자격증명에서
    // OS 의 alert 가 떠 있었는데도 테스트 타임아웃이 먼저 와 진단 문구가 비었다. 그래서 90초.
    {
      name: 'setup-student',
      testMatch: SETUP_FILE,
      grep: /\[student\]/,
      timeout: 90_000,
      use: { ...desktop, ...setupUse },
    },
    {
      name: 'setup-teacher',
      testMatch: SETUP_FILE,
      grep: /\[teacher\]/,
      timeout: 90_000,
      use: { ...desktop, ...setupUse },
    },
    {
      name: 'login-student',
      testMatch: STUDENT_SPECS,
      dependencies: ['setup-student'],
      use: { ...desktop, storageState: STORAGE_STATE.student, ...loginLaneUse },
    },
    {
      name: 'login-teacher',
      testIgnore: [...ANON_SPECS, SETUP_FILE, ...STUDENT_SPECS, ...MIXED_ROLE_SPECS],
      dependencies: ['setup-teacher'],
      use: { ...desktop, storageState: STORAGE_STATE.teacher, ...loginLaneUse },
    },
    // prod-verify 가 부르지 않는 보류 프로젝트 — 위 MIXED_ROLE_SPECS 의 TODO 참조. 로컬 실행용으로 남긴다.
    {
      name: 'mixed-role-pending',
      testMatch: MIXED_ROLE_SPECS,
      dependencies: ['setup-teacher'],
      use: { ...desktop, storageState: STORAGE_STATE.teacher, ...loginLaneUse },
    },
  ],
});
