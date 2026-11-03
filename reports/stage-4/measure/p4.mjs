// Phase 4 self-test. node p4.mjs <baseUrl> <outDir>   env: CHROME_PATH, HEADLESS=0 (real hover:fine pointer)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headless = process.env.HEADLESS !== '0';
const ARGS = ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'];
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless, args: ARGS });
const R = { browser: await browser.version(), base: BASE };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name), captureBeyondViewport: false });

async function open(vp, opts = {}, b = browser) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(vp);
  if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const reqs = [];
  p.on('request', (r) => reqs.push(r.url()));
  const errors = [];
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE + (opts.path ?? '/'), { waitUntil: 'networkidle2', timeout: 60000 });
  return { ctx, p, reqs, errors };
}
const rail = (p) => p.evaluate(() => {
  const el = document.querySelector('[data-work-rail]');
  const [prev, next] = document.querySelectorAll('.rail-btn');
  return { x: Math.round(el.scrollLeft), max: el.scrollWidth - el.clientWidth, y: Math.round(scrollY),
    prevDisabled: prev.disabled, nextDisabled: next.disabled, url: location.pathname };
});
const toWork = async (p) => {
  for (let i = 0; i < 3; i++) { await p.evaluate(() => document.getElementById('work').scrollIntoView({ block: 'center' })); await sleep(500); }
};
const railBox = (p) => p.evaluate(() => { const r = document.querySelector('[data-work-rail]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });

// 1. Touch: vertical swipe scrolls the page, horizontal swipe moves the rail; no tilt / scan.
{
  const { ctx, p } = await open({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await toWork(p);
  const s = await p.createCDPSession();
  // Real touch events (CDP Input.dispatchTouchEvent), so touch-action and pointer handling both apply.
  const swipe = async (x, y, dx, dy) => {
    await s.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 15; i++) { await s.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 15, y: y + (dy * i) / 15 }] }); await sleep(16); }
    await s.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(800);
  };
  const b = await railBox(p);
  const t0 = await rail(p);
  await swipe(b.x + b.w / 2, b.y + b.h / 2, 0, -300);
  const t1 = await rail(p);
  await toWork(p); // bring the rail back to the middle before the horizontal swipe
  const t1b = await rail(p);
  const b2 = await railBox(p);
  await swipe(b2.x + b2.w * 0.8, b2.y + b2.h / 2, -220, 0);
  const t2 = await rail(p);
  const fx = await p.evaluate(() => { const c = document.querySelector('[data-work-card]'); return { tiltAttr: c.hasAttribute('data-tilt'), hoverFine: matchMedia('(hover: hover) and (pointer: fine)').matches, touchAction: getComputedStyle(document.querySelector('[data-work-rail]')).touchAction }; });
  R.touch = { before: t0, afterVerticalSwipe: t1, afterHorizontalSwipe: t2, pageScrolledBy: t1.y - t0.y, railMovedOnVertical: t1.x - t0.x, railMovedOnHorizontal: t2.x - t1b.x, pageMovedOnHorizontal: t2.y - t1b.y, ...fx };
  await shot(p, 'touch-rail.png');
  await ctx.close();
}

// Desktop context
const D = await open({ width: 1440, height: 900 });
const { p } = D;
await toWork(p);
// 2. Drag > 6px does not open the card; a plain click does.
{
  const b = await railBox(p);
  const x = b.x + 200, y = b.y + 150;
  const a = await rail(p);
  await p.mouse.move(x, y); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(x - i * 8, y); await sleep(16); }
  await p.mouse.up(); await sleep(700);
  const afterDrag = await rail(p);
  await p.evaluate(() => { document.querySelector('[data-work-rail]').scrollLeft = 0; }); await sleep(200);
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x - 4, y); await p.mouse.up(); // 4px: still a click
  await sleep(100);
  const leaving = await p.evaluate(() => { const c = document.querySelector('[data-leaving]'); return c ? { opacity: getComputedStyle(c).opacity, transform: getComputedStyle(c).transform } : null; });
  await shot(p, 'transition-leaving.png');
  await p.waitForFunction(() => location.pathname.startsWith('/work/'), { timeout: 5000 }).catch(() => {});
  await sleep(150);
  const detail = await p.evaluate(() => ({ url: location.pathname, anim: getComputedStyle(document.querySelector('.work-detail')).animationName, opacity: getComputedStyle(document.querySelector('.work-detail')).opacity }));
  await shot(p, 'transition-enter.png');
  R.drag = { before: a, afterDrag80px: afterDrag, navigatedAfterDrag: afterDrag.url !== '/', click4px: { leaving, detail } };
  await p.goto(BASE + '/', { waitUntil: 'networkidle2' }); await toWork(p);
}
// 3. Prev / next buttons with edge disabling.
{
  const steps = [await rail(p)];
  for (let i = 0; i < 6 && !steps.at(-1).nextDisabled; i++) { await p.click('.rail-btn:last-of-type'); await sleep(700); steps.push(await rail(p)); }
  const atEnd = steps.at(-1);
  await p.click('.rail-btn:first-of-type'); await sleep(700);
  R.buttons = { steps, atEnd, afterPrev: await rail(p) };
}
// 4. Wheel: moves the rail while it can, then hands off to the page.
{
  await p.evaluate(() => { document.querySelector('[data-work-rail]').scrollLeft = 0; }); await toWork(p);
  const b = await railBox(p);
  await p.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
  const w0 = await rail(p);
  await p.mouse.wheel({ deltaY: 120 }); await sleep(400);
  const w1 = await rail(p);
  await p.evaluate(() => { const el = document.querySelector('[data-work-rail]'); el.scrollLeft = el.scrollWidth; }); await sleep(200);
  const w2 = await rail(p);
  await p.mouse.wheel({ deltaY: 120 }); await sleep(600);
  const w3 = await rail(p);
  R.wheel = { start: w0, afterWheelMid: w1, atEnd: w2, afterWheelAtEnd: w3 };
}
// 5. Arrow keys only when the rail has focus.
{
  await p.evaluate(() => { document.querySelector('[data-work-rail]').scrollLeft = 0; document.activeElement?.blur(); }); await sleep(200);
  const k0 = await rail(p);
  await p.keyboard.press('ArrowRight'); await sleep(600);
  const k1 = await rail(p);
  await p.focus('[data-work-rail]');
  await p.keyboard.press('ArrowRight'); await sleep(800);
  const k2 = await rail(p);
  R.keys = { start: k0, arrowWithoutFocus: k1, arrowWithRailFocus: k2, focused: await p.evaluate(() => document.activeElement?.id) };
}
// 6. Desktop hover: 3D tilt + HUD scan.
{
  await p.evaluate(() => { document.querySelector('[data-work-rail]').scrollLeft = 0; }); await sleep(200);
  const c = await p.evaluate(() => { const r = document.querySelector('[data-work-card]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await p.mouse.move(c.x + c.w * 0.85, c.y + c.h * 0.2, { steps: 5 }); await sleep(1000);
  R.hover = await p.evaluate(() => { const card = document.querySelector('[data-work-card]'); return { tiltAttr: card.hasAttribute('data-tilt'), rx: card.style.getPropertyValue('--rx'), ry: card.style.getPropertyValue('--ry'), transform: getComputedStyle(card).transform, scanOpacity: getComputedStyle(card.querySelector('.hud-scan')).opacity, cursorView: document.querySelector('.cursor')?.dataset.view ?? null }; });
  await shot(p, 'desktop-hover-tilt.png');
}
// 7. Return from detail restores page Y and rail X, no intro replay (link and browser back).
for (const how of ['back-link', 'history-back']) {
  await p.goto(BASE + '/', { waitUntil: 'networkidle2' }); await toWork(p);
  await p.click('.rail-btn:last-of-type'); await sleep(800);
  const saved = await rail(p);
  const b = await railBox(p);
  await p.mouse.click(b.x + b.w - 120, b.y + 150); // a card that is in view
  await p.waitForFunction(() => location.pathname.startsWith('/work/'), { timeout: 5000 });
  const opened = await p.evaluate(() => location.pathname);
  await sleep(500);
  if (how === 'back-link') await p.click('.work-back'); else await p.goBack();
  await p.waitForFunction(() => location.pathname === '/', { timeout: 5000 });
  await sleep(2500);
  const restored = await rail(p);
  R[`return_${how}`] = { saved, opened, restored, dy: restored.y - saved.y, dx: restored.x - saved.x,
    introInView: await p.evaluate(() => { const r = document.getElementById('intro')?.getBoundingClientRect(); return r ? r.bottom > 0 && r.top < innerHeight : null; }) };
}
await shot(p, 'return-restored.png');
R.desktopErrors = D.errors;
await D.ctx.close();

// 8. Detail pages: fields, 4 sections, 「示例」, [X] placeholders, prev/next at both ends.
{
  const { ctx, p: h } = await open({ width: 1440, height: 900 });
  R.homeCards = await h.evaluate(() => [...document.querySelectorAll('[data-work-card]')].map((c) => ({ href: c.getAttribute('href'), sample: c.querySelector('.work-sample')?.textContent })));
  R.details = [];
  for (const { href } of R.homeCards) {
    await h.goto(BASE + href, { waitUntil: 'networkidle2' });
    R.details.push(await h.evaluate(() => {
      const main = document.querySelector('main');
      const text = main.innerText;
      const stray = (text.replace(/\[X\]/g, '').match(/[^\s]*\d[^\s]*/g) ?? []);
      const nav = (dir) => { const el = document.querySelector(`.work-nav-${dir}`); return { tag: el.tagName, disabled: el.getAttribute('aria-disabled') === 'true', href: el.getAttribute('href') }; };
      return { path: location.pathname, h1Count: document.querySelectorAll('h1').length, h1: document.querySelector('h1').textContent,
        sample: document.querySelector('.work-detail-title .work-sample')?.textContent ?? null,
        sections: [...document.querySelectorAll('.work-section h2')].map((e) => e.textContent),
        sentences: [...document.querySelectorAll('.work-section p')].map((e) => e.textContent.split('。').filter(Boolean).length),
        metrics: [...document.querySelectorAll('.work-metric-value')].map((e) => e.textContent),
        meta: [...document.querySelectorAll('.work-meta dd')].map((e) => e.textContent),
        coverLoaded: document.querySelector('.work-detail-cover img').naturalWidth,
        jsonLd: !!document.querySelector('script[type="application/ld+json"]'),
        strayDigits: stray, prev: nav('prev'), next: nav('next'), back: [...document.querySelectorAll('a[href="/#work"]')].length };
    }));
  }
  await h.goto(BASE + R.homeCards[0].href, { waitUntil: 'networkidle2' });
  await shot(h, 'detail-first.png');
  await h.screenshot({ path: path.join(OUT, 'detail-first-full.png'), fullPage: true });
  await h.goto(BASE + R.homeCards.at(-1).href, { waitUntil: 'networkidle2' });
  await h.evaluate(() => document.querySelector('.work-nav').scrollIntoView({ block: 'center' })); await sleep(300);
  await shot(h, 'detail-last-nav.png');
  await h.goto(BASE + '/', { waitUntil: 'networkidle2' }); await toWork(h); await sleep(500);
  await shot(h, 'home-work-1440.png');
  await ctx.close();
}

// Retest A: backdrop enable conditions, 0 backdrop requests when off.
R.enable = [];
for (const [name, vp, opts] of [
  ['1440 fine pointer (control)', { width: 1440, height: 900 }, {}],
  ['1023 fine pointer', { width: 1023, height: 800 }, {}],
  ['1440 reduced-motion', { width: 1440, height: 900 }, { reduced: true }],
  ['1440 touch (hasTouch+isMobile)', { width: 1440, height: 900, hasTouch: true, isMobile: true }, {}],
]) {
  const { ctx, p: e, reqs, errors } = await open(vp, opts);
  for (let i = 0; i < 3; i++) { await e.evaluate(() => document.getElementById('about').scrollIntoView()); await sleep(800); }
  await sleep(2500);
  R.enable.push({ name, state: await e.evaluate(() => document.querySelector('.robot-backdrop')?.dataset.state ?? 'not-rendered'),
    canvas: await e.evaluate(() => !!document.querySelector('.robot-backdrop canvas')),
    backdropRequests: reqs.filter((u) => /\/media\/(3d|fx)\/|\.glb(\?|$)|mech-points/.test(u)).map((u) => new URL(u).pathname), errors });
  await ctx.close();
}
await browser.close();

// Retest B: Chrome launched with --disable-webgl.
{
  const nb = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless, args: [...ARGS, '--disable-webgl'] });
  const { p: w, reqs, errors } = await open({ width: 1440, height: 900 }, {}, nb);
  const webgl = await w.evaluate(() => { const c = document.createElement('canvas'); return { webgl: !!c.getContext('webgl'), webgl2: !!c.getContext('webgl2') }; });
  await shot(w, 'no-webgl-top.png');
  for (let i = 0; i < 3; i++) { await w.evaluate(() => document.getElementById('about').scrollIntoView()); await sleep(800); }
  await sleep(2500);
  await shot(w, 'no-webgl-about.png');
  const look = await w.evaluate(() => ({ bodyBg: getComputedStyle(document.body).backgroundColor, h2: document.querySelector('#about h2, #about h1')?.textContent ?? null,
    aboutVisible: document.getElementById('about').getBoundingClientRect().height > 0, state: document.querySelector('.robot-backdrop')?.dataset.state ?? 'not-rendered',
    canvas: !!document.querySelector('.robot-backdrop canvas'), introCanvas: !!document.querySelector('#intro canvas') }));
  await toWork(w); await shot(w, 'no-webgl-work.png');
  R.noWebgl = { ...webgl, ...look, backdropRequests: reqs.filter((u) => /\/media\/(3d|fx)\//.test(u)).map((u) => new URL(u).pathname), errors };
  await nb.close();
}
fs.writeFileSync(path.join(OUT, 'p4.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
