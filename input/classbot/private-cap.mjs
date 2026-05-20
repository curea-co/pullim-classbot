import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/tmp/pullim-audit/classbot/private';
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch();
  // ===== DESKTOP =====
  const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const pageD = await ctxD.newPage();

  log('[D] /classbot/chat');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot/chat', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1500);
  await pageD.screenshot({ path: `${OUT}/D-chat-default.png` });

  // bot switcher chips at top — collect their bounding boxes
  const chipsInfo = await pageD.evaluate(() => {
    const all = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.replace(/\s+/g,' ').trim().slice(0,40),
      rect: b.getBoundingClientRect(),
      cls: b.className,
    }));
    const tops = all.filter(x => x.rect.top < 200 && x.rect.top > 60 && x.text.length>1).slice(0,8);
    return tops;
  });
  fs.writeFileSync(`${OUT}/D-top-chips.json`, JSON.stringify(chipsInfo, null, 2));
  log('[D] top chips:', chipsInfo.map(c=>c.text));

  // try to click "영어 누나"
  const englishBtn = pageD.locator('button:has-text("영어 누나")').first();
  if (await englishBtn.count()) {
    await englishBtn.click();
    await pageD.waitForTimeout(800);
    await pageD.screenshot({ path: `${OUT}/D-bot-english.png` });
    log('[D] switched to 영어 누나');
  }

  // back to 수학이 형
  const mathBtn = pageD.locator('button:has-text("수학이 형")').first();
  if (await mathBtn.count()) {
    await mathBtn.click();
    await pageD.waitForTimeout(800);
    await pageD.screenshot({ path: `${OUT}/D-bot-math.png` });
  }

  // attempt to type into input
  const inputs = await pageD.$$('input, textarea, [contenteditable="true"]');
  log('[D] input count:', inputs.length);
  let typed = false;
  for (const el of inputs) {
    const box = await el.boundingBox();
    if (!box) continue;
    if (box.y > pageD.viewportSize().height * 0.6 && box.width > 200) {
      await el.focus();
      await el.type('적분 어떻게 시작해?', { delay: 30 });
      await pageD.waitForTimeout(500);
      await pageD.screenshot({ path: `${OUT}/D-input-filled.png` });
      typed = true;
      break;
    }
  }
  if (!typed) log('[D] no input found at bottom');

  // quick chip click — find a button with '?'
  const quickChips = await pageD.$$eval('button', bs =>
    bs.filter(b => /\?/.test(b.innerText) && b.innerText.length < 30 && b.getBoundingClientRect().top > 400)
      .map(b => b.innerText.replace(/\s+/g,' ').trim())
  );
  log('[D] quick chips:', quickChips);
  fs.writeFileSync(`${OUT}/D-quick-chips.json`, JSON.stringify(quickChips, null, 2));

  // measure bot meta card height vs message area
  const layout = await pageD.evaluate(() => {
    const root = document.body;
    const text = root.innerText;
    const out = {};
    // find the dark "수학이 형 — 김수학 선생님의 디지털 분신" card area
    const headerLike = Array.from(document.querySelectorAll('*')).find(e => /김수학 선생님의 디지털 분신/.test(e.innerText||'') && e.children.length < 30);
    if (headerLike) {
      // climb up to a card
      let p = headerLike;
      while (p && p.parentElement && p.getBoundingClientRect().height < 120) p = p.parentElement;
      const r = p.getBoundingClientRect();
      out.botMetaCard = { x:r.x, y:r.y, w:r.width, h:r.height };
    }
    // input area
    const inp = document.querySelector('input, textarea');
    if (inp) {
      const r = inp.getBoundingClientRect();
      out.input = { x:r.x, y:r.y, w:r.width, h:r.height };
    }
    out.viewport = { w: window.innerWidth, h: window.innerHeight };
    return out;
  });
  fs.writeFileSync(`${OUT}/D-layout.json`, JSON.stringify(layout, null, 2));
  log('[D] layout:', layout);

  // ===== MOBILE =====
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
  const pageM = await ctxM.newPage();
  log('[M] /classbot/chat');
  await pageM.goto('https://pullim-classbot.vercel.app/classbot/chat', { waitUntil: 'networkidle' });
  await pageM.waitForTimeout(1500);
  await pageM.screenshot({ path: `${OUT}/M-chat-default.png`, fullPage: false });
  await pageM.screenshot({ path: `${OUT}/M-chat-full.png`, fullPage: true });

  // bot meta card on mobile — measure height
  const mobileLayout = await pageM.evaluate(() => {
    const out = {};
    const headerLike = Array.from(document.querySelectorAll('*')).find(e => /김수학 선생님의 디지털 분신/.test(e.innerText||'') && e.children.length < 30);
    if (headerLike) {
      let p = headerLike;
      while (p && p.parentElement && p.getBoundingClientRect().height < 160) p = p.parentElement;
      const r = p.getBoundingClientRect();
      out.botMetaCard = { x:r.x, y:r.y, w:r.width, h:r.height };
    }
    // first user/bot bubble
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => /\?/.test(b.innerText) && b.innerText.length<30);
    out.quickChips = buttons.map(b => { const r = b.getBoundingClientRect(); return { text:b.innerText.trim().slice(0,40), x:r.x, y:r.y, w:r.width, h:r.height };});
    out.viewport = { w: window.innerWidth, h: window.innerHeight };
    return out;
  });
  fs.writeFileSync(`${OUT}/M-layout.json`, JSON.stringify(mobileLayout, null, 2));
  log('[M] layout:', mobileLayout);

  // simulate input focus + keyboard area by resizing viewport
  try {
    const inputM = await pageM.$('input, textarea');
    if (inputM) {
      await inputM.scrollIntoViewIfNeeded();
      await inputM.focus();
      await pageM.waitForTimeout(500);
      await pageM.screenshot({ path: `${OUT}/M-input-focus.png` });
      // simulate keyboard: shrink viewport
      await pageM.setViewportSize({ width: 390, height: 460 });
      await pageM.waitForTimeout(400);
      await pageM.screenshot({ path: `${OUT}/M-keyboard-open.png`, fullPage: false });
      await pageM.setViewportSize({ width: 390, height: 844 });
    }
  } catch(e) { log('[M] input focus failed:', e.message); }

  // home page (4 blocks)
  log('[M] /classbot');
  await pageM.goto('https://pullim-classbot.vercel.app/classbot', { waitUntil: 'networkidle' });
  await pageM.waitForTimeout(1200);
  await pageM.screenshot({ path: `${OUT}/M-home-full.png`, fullPage: true });

  log('[D] /classbot');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1200);
  await pageD.screenshot({ path: `${OUT}/D-home-full.png`, fullPage: true });

  // assignment
  log('[D] /classbot/assignment');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot/assignment', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1000);
  await pageD.screenshot({ path: `${OUT}/D-assignment.png`, fullPage: true });

  // wellness
  log('[D] /classbot/wellness');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot/wellness', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1000);
  await pageD.screenshot({ path: `${OUT}/D-wellness.png`, fullPage: true });

  // replay hover state attempt
  log('[D] /classbot/replay');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot/replay', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1000);
  await pageD.screenshot({ path: `${OUT}/D-replay.png`, fullPage: true });
  // try hover on first card
  try {
    const card = await pageD.$('text=도함수');
    if (card) {
      await card.hover();
      await pageD.waitForTimeout(400);
      await pageD.screenshot({ path: `${OUT}/D-replay-hover.png` });
    }
  } catch(e){}

  // onboarding
  log('[D] /classbot/onboarding');
  await pageD.goto('https://pullim-classbot.vercel.app/classbot/onboarding', { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(1000);
  await pageD.screenshot({ path: `${OUT}/D-onboarding.png`, fullPage: true });

  await browser.close();
  log('done');
})();
