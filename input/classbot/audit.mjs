import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/tmp/pullim-audit/classbot';
const URL = 'https://pullim-classbot.vercel.app/classbot';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  const results = {};

  for (const vp of viewports) {
    console.log(`--- ${vp.name} ---`);
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      userAgent: vp.name === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);

    // Full-page screenshot
    await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });
    // Above-the-fold
    await page.screenshot({ path: `${OUT}/${vp.name}-fold.png`, fullPage: false });

    // Scroll & capture middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.4));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.name}-mid.png`, fullPage: false });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${vp.name}-bottom.png`, fullPage: false });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    // Collect design info
    const info = await page.evaluate(() => {
      const body = document.body;
      const cs = getComputedStyle(body);
      const all = Array.from(document.querySelectorAll('*'));

      // Collect colors used
      const colorSet = new Map();
      const bgSet = new Map();
      const fontFamilies = new Set();
      const fontSizes = new Map();
      const fontWeights = new Map();
      const borderRadii = new Map();
      const shadows = new Map();
      const spacings = new Map();

      all.forEach((el) => {
        if (!el.getBoundingClientRect) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const s = getComputedStyle(el);
        if (s.color && s.color !== 'rgba(0, 0, 0, 0)') colorSet.set(s.color, (colorSet.get(s.color) || 0) + 1);
        if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgSet.set(s.backgroundColor, (bgSet.get(s.backgroundColor) || 0) + 1);
        if (s.fontFamily) fontFamilies.add(s.fontFamily);
        if (s.fontSize) fontSizes.set(s.fontSize, (fontSizes.get(s.fontSize) || 0) + 1);
        if (s.fontWeight) fontWeights.set(s.fontWeight, (fontWeights.get(s.fontWeight) || 0) + 1);
        if (s.borderRadius && s.borderRadius !== '0px') borderRadii.set(s.borderRadius, (borderRadii.get(s.borderRadius) || 0) + 1);
        if (s.boxShadow && s.boxShadow !== 'none') shadows.set(s.boxShadow, (shadows.get(s.boxShadow) || 0) + 1);
        if (s.padding && s.padding !== '0px') spacings.set(s.padding, (spacings.get(s.padding) || 0) + 1);
      });

      const sortMap = (m, n = 15) =>
        Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

      // Text content samples
      const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
        .slice(0, 30)
        .map((h) => ({ tag: h.tagName, text: h.innerText.trim().slice(0, 200), fontSize: getComputedStyle(h).fontSize, fontWeight: getComputedStyle(h).fontWeight }));

      const buttons = Array.from(document.querySelectorAll('button, a[role="button"], .btn, [class*="button" i]'))
        .slice(0, 20)
        .map((b) => ({
          text: b.innerText.trim().slice(0, 80),
          bg: getComputedStyle(b).backgroundColor,
          color: getComputedStyle(b).color,
          padding: getComputedStyle(b).padding,
          borderRadius: getComputedStyle(b).borderRadius,
          fontSize: getComputedStyle(b).fontSize,
        }));

      const inputs = Array.from(document.querySelectorAll('input, textarea')).map((i) => ({
        type: i.type || i.tagName,
        placeholder: i.placeholder || '',
        ariaLabel: i.getAttribute('aria-label') || '',
      }));

      const links = Array.from(document.querySelectorAll('nav a, header a')).slice(0, 30).map((a) => ({
        text: a.innerText.trim().slice(0, 60),
        href: a.getAttribute('href'),
      }));

      const lang = document.documentElement.lang;
      const title = document.title;
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content');

      // Accessibility checks
      const imgs = Array.from(document.querySelectorAll('img'));
      const imgsNoAlt = imgs.filter((i) => !i.alt).length;
      const skipLink = !!document.querySelector('a[href^="#"][class*="skip" i], a[href*="main"][class*="skip" i]');
      const focusables = document.querySelectorAll('a, button, input, textarea, select, [tabindex]').length;

      // Section structure
      const sections = Array.from(document.querySelectorAll('section, [class*="section" i]')).slice(0, 20).map((s) => {
        const h = s.querySelector('h1,h2,h3');
        return {
          heading: h ? h.innerText.trim().slice(0, 120) : '(no heading)',
          height: Math.round(s.getBoundingClientRect().height),
        };
      });

      return {
        lang,
        title,
        desc,
        bodyFont: cs.fontFamily,
        bodyBg: cs.backgroundColor,
        bodyColor: cs.color,
        colors: sortMap(colorSet),
        backgrounds: sortMap(bgSet),
        fontFamilies: Array.from(fontFamilies),
        fontSizes: sortMap(fontSizes, 20),
        fontWeights: sortMap(fontWeights),
        borderRadii: sortMap(borderRadii),
        shadows: sortMap(shadows, 10),
        spacings: sortMap(spacings, 20),
        headings,
        buttons,
        inputs,
        links,
        imgCount: imgs.length,
        imgsNoAlt,
        focusables,
        sections,
        scrollHeight: document.documentElement.scrollHeight,
        viewportH: window.innerHeight,
        viewportW: window.innerWidth,
      };
    });

    results[vp.name] = info;
    await ctx.close();
  }

  fs.writeFileSync(`${OUT}/raw.json`, JSON.stringify(results, null, 2));
  console.log('saved raw.json');
  await browser.close();
})();
