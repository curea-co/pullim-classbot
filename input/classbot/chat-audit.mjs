import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/tmp/pullim-audit/classbot';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://pullim-classbot.vercel.app/classbot/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/desktop-chat.png` });

  // Try focusing input and screenshot suggestion chips
  const info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input,textarea')).map(i => ({
      type: i.type || i.tagName,
      placeholder: i.placeholder || '',
      ariaLabel: i.getAttribute('aria-label') || '',
      visible: !!i.offsetParent,
    }));
    const chips = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim().length > 2 && b.innerText.includes('?')).slice(0, 10).map(b => b.innerText.trim());
    const messages = Array.from(document.querySelectorAll('[class*="message" i], [class*="bubble" i], article, [role="article"]')).slice(0, 10).map(m => m.innerText.trim().slice(0, 200));
    return { inputs, chips, messages };
  });
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();
