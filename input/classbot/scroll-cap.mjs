import { chromium } from 'playwright';

const OUT = '/tmp/pullim-audit/classbot';
const URL = 'https://pullim-classbot.vercel.app/classbot';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Find scrollable element inside main
  const info = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('main, [class*="main" i], [class*="content" i], [class*="scroll" i]'));
    return all.slice(0, 20).map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
        scrollH: el.scrollHeight,
        overflow: cs.overflowY,
      };
    });
  });
  console.log(JSON.stringify(info, null, 2));

  // Scroll the largest scrollable
  const scrolled = await page.evaluate(() => {
    let best = null;
    let bestExcess = 0;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
        const excess = el.scrollHeight - el.clientHeight;
        if (excess > bestExcess) { bestExcess = excess; best = el; }
      }
    });
    if (best) {
      best.scrollTop = best.scrollHeight * 0.5;
      return { found: true, scrollH: best.scrollHeight, clientH: best.clientHeight, tag: best.tagName, cls: (best.className||'').toString().slice(0,100) };
    }
    return { found: false };
  });
  console.log('Scrolled:', JSON.stringify(scrolled));

  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/desktop-scrolled-50.png` });

  await page.evaluate(() => {
    let best = null; let bestExcess = 0;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50) {
        const excess = el.scrollHeight - el.clientHeight;
        if (excess > bestExcess) { bestExcess = excess; best = el; }
      }
    });
    if (best) best.scrollTop = best.scrollHeight;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/desktop-scrolled-end.png` });

  // Try clicking other nav items
  const navItems = ['받은 과제', '봇 대화', '내 웰빙', '리플레이', '소개하기'];
  for (const label of navItems) {
    try {
      const link = page.getByText(label, { exact: true }).first();
      await link.scrollIntoViewIfNeeded({ timeout: 2000 });
      await link.click({ timeout: 2000 });
      await page.waitForTimeout(1200);
      const safe = label.replace(/\s+/g, '-');
      await page.screenshot({ path: `${OUT}/desktop-nav-${safe}.png` });
      console.log('captured', label);
    } catch (e) {
      console.log('skip', label, String(e).slice(0,80));
    }
  }

  // Mobile too
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mctx.newPage();
  await mpage.goto(URL, { waitUntil: 'networkidle' });
  await mpage.waitForTimeout(1500);
  // Mobile bottom nav probably
  for (const label of ['과제', '대화', '웰빙', '리플레이']) {
    try {
      const el = mpage.getByText(label, { exact: true }).first();
      await el.click({ timeout: 2000 });
      await mpage.waitForTimeout(1000);
      await mpage.screenshot({ path: `${OUT}/mobile-tab-${label}.png` });
      console.log('mobile cap', label);
    } catch (e) { console.log('mobile skip', label); }
  }

  await browser.close();
})();
