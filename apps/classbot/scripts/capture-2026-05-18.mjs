/**
 * 2026-05-18 — 풀림 클래스봇 전체 화면 캡처 (역 분석 deck용).
 *
 * 학생 13장 + 교사 6장 + 인터랙션 상태 추가 = ~20장.
 *
 * 실행: bun scripts/capture-2026-05-18.mjs
 * 환경변수: CAPTURE_BASE (기본: production URL)
 */

import { chromium } from 'playwright';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const BASE = process.env.CAPTURE_BASE ?? 'https://pullim-classbot.vercel.app';
const OUT_DIR = path.resolve(process.cwd(), 'output/screen-captures/2026-05-18');
const VIEWPORT = { width: 414, height: 896 }; // iPhone 12 Pro 기준

const targets = [
  // ── 학생 13장 ───────────────────────────────
  { file: '01-student-home.png', label: '학생 홈 — 내 클래스봇 리스트', go: '/classbot' },
  { file: '02-student-chat-cb001.png', label: 'chat — cb_001 수학이 형 (친근 톤 기본)', go: '/classbot/chat' },
  {
    file: '03-student-chat-cb005.png',
    label: 'chat — cb_005 사회 코치 (열정 톤, 5번째 봇)',
    go: '/classbot/chat',
    after: async (page) => {
      await page.getByRole('button', { name: /사회 코치/ }).click();
      await page.waitForTimeout(500);
    },
  },
  {
    file: '04-student-chat-cb005-reply.png',
    label: 'chat — cb_005 시사 이슈 quickPrompt 클릭 → 열정 톤 reply',
    go: '/classbot/chat',
    after: async (page) => {
      await page.getByRole('button', { name: /사회 코치/ }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: '시사 이슈 어떻게 분석해요?' }).click();
      await page.waitForTimeout(600);
    },
  },
  { file: '05-student-discover.png', label: '봇 탐색 (discover)', go: '/classbot/discover' },
  { file: '06-student-replay-list.png', label: '리플레이 목록', go: '/classbot/replay' },
  { file: '07-student-replay-detail.png', label: '리플레이 상세 (rp_001)', go: '/classbot/replay/rp_001' },
  { file: '08-student-assignment-list.png', label: '과제 리스트', go: '/classbot/assignment' },
  { file: '09-student-wellness-hub.png', label: '웰빙 허브', go: '/classbot/wellness' },
  { file: '10-student-wellness-checkin-initial.png', label: 'wellness check-in (mood 미선택)', go: '/classbot/wellness/check-in' },
  {
    file: '11-student-wellness-checkin-dual-thumb.png',
    label: 'wellness check-in — mood "좋아" 선택 → dual-thumb 강도 범위 노출',
    go: '/classbot/wellness/check-in',
    after: async (page) => {
      await page.getByRole('radio', { name: /좋아/ }).click();
      await page.waitForSelector('[data-testid="intensity-range-block"]');
    },
  },
  { file: '12-student-me-report.png', label: '내 리포트', go: '/classbot/me/report' },
  { file: '13-student-onboarding.png', label: '온보딩', go: '/classbot/onboarding' },

  // ── 교사 6장 ───────────────────────────────
  { file: '14-teacher-home.png', label: '교사 홈', go: '/teacher' },
  { file: '15-teacher-classbot.png', label: '교사 — 내 클래스봇 (라이브 수업 진행)', go: '/teacher/classbot' },
  { file: '16-teacher-builder.png', label: '교사 — 봇 빌더', go: '/teacher/builder' },
  { file: '17-teacher-assignment-new-practice.png', label: '과제 발사 폼 (연습 모드 기본)', go: '/teacher/assignment/new' },
  {
    file: '18-teacher-assignment-new-exam.png',
    label: '과제 발사 폼 (시험 모드 — danger thumb slider)',
    go: '/teacher/assignment/new',
    after: async (page) => {
      await page.getByTestId('mode-exam').click();
      await page.waitForTimeout(300);
    },
  },

  // ── 2026-05-18 신규 6장 (9-플로우 갭 해소) ───────────
  {
    file: '19-student-live-session.png',
    label: '학생 라이브 세션 화면 (F1 신규)',
    go: '/classbot/live/cb_001',
    after: async (page) => { await page.waitForTimeout(800); },
  },
  {
    file: '20-teacher-replay-list.png',
    label: '교사 — 리플레이 큐 (F2 신규)',
    go: '/teacher/replay',
  },
  {
    file: '21-teacher-replay-review.png',
    label: '교사 — 리플레이 검수 (rp_005, B9)',
    go: '/teacher/replay/rp_005',
  },
  {
    file: '22-teacher-quiz-launch-modal.png',
    label: '교사 — 즉석 퀴즈 발사 모달 (F4)',
    go: '/teacher/classbot',
    after: async (page) => {
      await page.getByRole('button', { name: '새 퀴즈' }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    file: '23-teacher-crisis-modal.png',
    label: '교사 — 위기 학생 상세 모달 (F5)',
    go: '/teacher',
    after: async (page) => {
      await page.getByRole('button', { name: /도현/ }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    file: '24-student-chat-scope-chip.png',
    label: '학생 chat — scope chip + 시간대별 안내 (B4)',
    go: '/classbot/chat',
    after: async (page) => {
      await page.getByText(/지금 봇 범위/).click();
      await page.waitForTimeout(300);
    },
  },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const t of targets) {
    try {
      console.log(`→ ${t.file}  ${t.label}`);
      await page.goto(BASE + t.go, { waitUntil: 'networkidle' });
      if (t.after) await t.after(page);
      await page.screenshot({
        path: path.join(OUT_DIR, t.file),
        fullPage: true,
      });
    } catch (e) {
      console.error(`  ⚠️ FAIL ${t.file}: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n✅ ${targets.length}장 캡처 시도 완료 — ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
