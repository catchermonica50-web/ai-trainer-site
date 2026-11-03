// Phase 3 self-test. node p3.mjs <baseUrl> <outDir>   (CHROME_PATH env, optional HEADLESS=0)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: process.env.HEADLESS !== '0',
  args: ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const R = { browser: await browser.version() };

async function open(vp, opts = {}) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(vp);
  if (opts.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const reqs = [];
  p.on('request', (r) => reqs.push({ t: Date.now(), url: r.url() }));
  const errors = [];
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  return { ctx, p, reqs, errors };
}
const state = (p) => p.evaluate(() => ({
  backdrop: document.querySelector('.robot-backdrop')?.dataset.state,
  cursor: !!document.querySelector('.cursor'), hasCursorClass: document.documentElement.classList.contains('has-cursor'),
  fps: document.querySelector('.robot-canvas canvas, canvas[data-fps]')?.dataset.fps ?? null,
  canvas: !!document.querySelector('.robot-backdrop canvas'), scrollY: Math.round(scrollY),
  enhancedQuery: matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches }));
const toAbout = async (p) => { await p.evaluate(() => document.getElementById('about').scrollIntoView()); await sleep(400); await p.evaluate(() => document.getElementById('about').scrollIntoView()); };

// 1. Desktop 1440: lazy-load, enable state, fps, magnetic, head turn screenshots.
{
  const { ctx, p, reqs, errors } = await open({ width: 1440, height: 900 });
  const before = { ...(await state(p)), robotRequests: reqs.filter((r) => /\/media\/(3d|fx)\//.test(r.url)).length,
    lateChunks: reqs.map((r) => r.url).filter((u) => u.includes('/_next/static/chunks/')).length };
  const chunksBefore = new Set(reqs.map((r) => r.url));
  await toAbout(p);
  await p.waitForFunction(() => document.querySelector('.robot-backdrop')?.dataset.state === 'ready', { timeout: 30000 }).catch(() => {});
  const newReqs = reqs.filter((r) => !chunksBefore.has(r.url)).map((r) => r.url.replace(BASE, ''));
  // Wiggle the pointer for fps and head motion.
  for (let i = 0; i < 120; i += 1) { await p.mouse.move(720 + Math.sin(i / 8) * 600, 450 + Math.cos(i / 11) * 250); await sleep(16); }
  await sleep(1200);
  const after = await state(p);
  const fpsSamples = [];
  for (let i = 0; i < 5; i += 1) { await p.mouse.move(200 + i * 250, 300 + (i % 2) * 300, { steps: 30 }); await sleep(1000); fpsSamples.push(Number((await state(p)).fps)); }
  await p.mouse.move(150, 400, { steps: 10 }); await sleep(900);
  await p.screenshot({ path: path.join(OUT, 'd1440-about-pointer-left.png') });
  await p.mouse.move(1300, 380, { steps: 10 }); await sleep(900);
  await p.screenshot({ path: path.join(OUT, 'd1440-about-pointer-right.png') });
  // Magnetic: pointer 40px right of the primary button's edge.
  const mag = await p.evaluate(() => { const a = document.querySelector('.about .btn-primary'); const r = a.getBoundingClientRect(); return { x: r.right + 40, y: r.top + r.height / 2 }; });
  await p.mouse.move(mag.x, mag.y, { steps: 5 }); await sleep(400);
  const magIn = await p.evaluate(() => { const m = document.querySelector('.about .magnetic'); return { transform: m.style.transform, magnet: m.dataset.magnet }; });
  await p.mouse.move(mag.x + 120, mag.y, { steps: 5 }); await sleep(400);
  const magOut = await p.evaluate(() => document.querySelector('.about .magnetic').style.transform);
  // Cursor hover state on a link.
  const link = await p.evaluate(() => { const r = document.querySelector('.nav-link').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(link.x, link.y, { steps: 3 }); await sleep(300);
  const cursorHover = await p.evaluate(() => document.querySelector('.cursor')?.dataset.hover);
  const glb = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/media\/(3d|fx)\//.test(e.name)).map((e) => ({ name: e.name.split('/').pop(), bytes: e.encodedBodySize, transfer: e.transferSize })));
  const contrast = await p.evaluate(() => {
    const css = getComputedStyle(document.documentElement); const hex = (v) => css.getPropertyValue(v).trim();
    const lum = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
    const td = hex('--text-dim'); return { textDim: td, onPanel: ratio(td, hex('--panel')), onBg: ratio(td, hex('--bg')) };
  });
  R.desktop1440 = { before, newRequestsAfterScroll: newReqs, after, fpsSamples, magneticIn: magIn, magneticOut: magOut, cursorHover, glb, contrast, errors };
  await ctx.close();
}
// 2. Enable-condition matrix.
const matrix = [
  ['1440 fine pointer', { width: 1440, height: 900 }, {}],
  ['1024 fine pointer', { width: 1024, height: 800 }, {}],
  ['1023 fine pointer', { width: 1023, height: 800 }, {}],
  ['768', { width: 768, height: 1024 }, {}],
  ['1440 reduced-motion', { width: 1440, height: 900 }, { reduced: true }],
  ['1440 touch (hasTouch+isMobile)', { width: 1440, height: 900, hasTouch: true, isMobile: true }, {}],
];
R.matrix = [];
for (const [name, vp, opts] of matrix) {
  const { ctx, p, reqs } = await open(vp, opts);
  await toAbout(p); await sleep(2500);
  const s = await state(p);
  R.matrix.push({ name, ...s, robotRequested: reqs.some((r) => /\/media\/(3d|fx)\//.test(r.url)),
    magnet: await p.evaluate(() => { const m = document.querySelector('.about .magnetic'); const r = m.getBoundingClientRect(); return { x: r.right + 30, y: r.top + r.height / 2 }; }).then(async (pt) => { await p.mouse.move(pt.x, pt.y, { steps: 4 }); await sleep(300); return p.evaluate(() => document.querySelector('.about .magnetic').style.transform || ''); }) });
  await ctx.close();
}
// 3. Breakpoint screenshots of About / Skills / Contact + nav.
R.breakpoints = [];
for (const w of [360, 768, 1024, 1440]) {
  const { ctx, p, errors } = await open({ width: w, height: w < 768 ? 780 : 900 });
  await toAbout(p); await sleep(1500);
  const shots = {};
  for (const id of ['about', 'skills', 'contact']) {
    const el = await p.$('#' + id); await el.scrollIntoView(); await sleep(500);
    await el.screenshot({ path: path.join(OUT, `bp${w}-${id}.png`) }); shots[id] = `bp${w}-${id}.png`;
  }
  const layout = await p.evaluate(() => {
    const L = document.querySelector('.about-left').getBoundingClientRect(), F = document.querySelector('.about-figure').getBoundingClientRect(), Rr = document.querySelector('.about-right').getBoundingClientRect();
    const overflowX = document.documentElement.scrollWidth > innerWidth;
    const cols = getComputedStyle(document.querySelector('.skills-grid')).gridTemplateColumns.split(' ').length;
    return { leftOfFigure: L.right <= F.left + 1, rightOfFigure: Rr.left >= F.right - 1, figureAboveText: F.bottom <= L.top + 1, overflowX, skillsCols: cols,
      toggleVisible: getComputedStyle(document.querySelector('.nav-toggle')).display !== 'none' };
  });
  if (w === 360) { await p.click('.nav-toggle'); await sleep(300); await p.screenshot({ path: path.join(OUT, 'bp360-menu-open.png') });
    layout.menuOpen = await p.evaluate(() => getComputedStyle(document.getElementById('nav-menu')).display); }
  R.breakpoints.push({ width: w, layout, shots, errors });
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, 'p3.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1).slice(0, 6000));
await browser.close();
