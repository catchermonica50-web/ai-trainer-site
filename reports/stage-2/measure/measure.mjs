// Stage 2 automated self-test against a deployed preview. Run outside the repo:
//   node measure.mjs <baseUrl> <outDir>
import puppeteer, { KnownDevices } from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [BASE, OUT] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH;
fs.mkdirSync(OUT, { recursive: true });
const result = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: false,
  args: ['--incognito', '--disable-extensions', '--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: null,
});
result.browser = await browser.version();

async function newPage(viewport) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.bringToFront();
  if (viewport) await page.setViewport(viewport);
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors };
}
const stage = (page) =>
  page.evaluate(() => {
    const s = document.querySelector('#intro');
    const st = document.querySelector('.intro-stage');
    const v = document.querySelector('video');
    return {
      mode: st?.dataset.mode, quality: st?.dataset.quality, frame: Number(s?.dataset.frame ?? -1),
      decoded: Number(s?.dataset.decoded ?? 0), peakMiB: Number(s?.dataset.decodedPeakMib ?? 0),
      scrollY: Math.round(scrollY), aboutTop: Math.round(document.getElementById('about').getBoundingClientRect().top),
      video: v ? { paused: v.paused, loop: v.loop, muted: v.muted, t: v.currentTime, src: v.currentSrc, ended: v.ended } : null,
      still: !!document.querySelector('img[alt*="定格"]'), seen: sessionStorage.getItem('intro:seen'),
    };
  });

// 1. Desktop: poster/LCP, idle loop, hint, keyboard reachability.
{
  const { ctx, page, errors } = await newPage({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.__lcp = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: e.startTime, tag: e.element?.tagName, url: e.url })))
      .observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'desktop-0300ms.png') });
  const hintEarly = await page.$eval('.intro-hint', (e) => getComputedStyle(e).opacity);
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, 'desktop-2300ms-hint.png') });
  const hintLate = await page.$eval('.intro-hint', (e) => getComputedStyle(e).opacity);
  const s1 = await stage(page); await sleep(1000); const s2 = await stage(page);
  const tabs = [];
  for (let i = 0; i < 4; i += 1) { await page.keyboard.press('Tab'); tabs.push(await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 24))); }
  result.desktop = { lcp: await page.evaluate(() => window.__lcp), hintOpacity: { at300ms: hintEarly, at2300ms: hintLate },
    idle: { first: s1.video, oneSecLater: s2.video }, mode: s1.mode, quality: s1.quality, tabOrder: tabs,
    fade: await page.$eval('canvas', (c) => getComputedStyle(c).transitionDuration).catch(() => null) };

  // 2. Scrub round trip: fps, frame mapping, memory, unpin, reverse.
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await sleep(1000);
  result.desktop.idleBeforeScrub = (await stage(page)).video;
  await page.waitForFunction(() => document.querySelector('#intro')?.dataset.scrubReady === '1', { timeout: 20000 });
  await sleep(3000);
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); const tick = (t) => { window.__ft.push(t - last); last = t; window.__raf = requestAnimationFrame(tick); }; window.__raf = requestAnimationFrame(tick); });
  const samples = [];
  await page.mouse.move(700, 450);
  for (let i = 0; i < 150; i += 1) { await page.mouse.wheel({ deltaY: 30 }); await sleep(16); if (i % 10 === 0) samples.push(await stage(page)); }
  await sleep(1500);
  const atEnd = await stage(page);
  await page.screenshot({ path: path.join(OUT, 'desktop-scrub-end.png') });
  for (let i = 0; i < 100; i += 1) { await page.mouse.wheel({ deltaY: 60 }); await sleep(16); }
  await sleep(800);
  const pastEnd = await stage(page);
  await page.screenshot({ path: path.join(OUT, 'desktop-about.png') });
  for (let i = 0; i < 250; i += 1) { await page.mouse.wheel({ deltaY: -60 }); await sleep(16); if (i % 25 === 0) samples.push(await stage(page)); }
  for (let i = 0; i < 6; i += 1) { await sleep(500); samples.push(await stage(page)); }
  await sleep(1500);
  const back = await stage(page);
  const ft = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__ft.slice(1); });
  const sorted = [...ft].sort((a, b) => a - b);
  const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
  result.scrub = { frames: ft.length, avgFps: +(1000 / avg).toFixed(1), p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
    over34ms: ft.filter((d) => d > 34).length, atEnd, pastEnd, backAtTop: back, peakDecodedMiB: Math.max(...[...samples, atEnd, pastEnd, back].map((s) => s.peakMiB)),
    maxDecodedFrames: Math.max(...[...samples, atEnd, back].map((s) => s.decoded)), frameTrace: samples.map((s) => [s.scrollY, s.frame, s.decoded]) };

  // 3. Return in same tab with seen flag → lands on #about.
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(1500);
  result.returnVisit = await stage(page);
  await page.screenshot({ path: path.join(OUT, 'desktop-return-about.png') });
  result.desktopConsoleErrors = errors;
  await ctx.close();
}

// 4. Skip button via keyboard.
{
  const { ctx, page, errors } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.focus('.intro-skip'); await page.keyboard.press('Enter'); await sleep(2500);
  result.skip = { ...(await stage(page)), errors };
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
  result.skipThenReturn = await stage(page);
  await page.screenshot({ path: path.join(OUT, 'return-after-skip.png') });
  for (let i = 0; i < 40; i += 1) { await page.mouse.wheel({ deltaY: -60 }); await sleep(16); } await sleep(1000);
  result.skipThenScrollUp = await stage(page);
  await ctx.close();
}

// 5. Mobile emulation, 6. reduced motion, 7. low deviceMemory, 8. forced failures.
async function scenario(name, setup, act) {
  const { ctx, page, errors } = await newPage({ width: 1440, height: 900 });
  await setup(page);
  await page.goto(BASE, { waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(1500);
  const before = await stage(page);
  const after = act ? await act(page) : null;
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  result[name] = { before, after, errors };
  await ctx.close();
}
const block = (re) => async (page) => { await page.setRequestInterception(true); page.on('request', (r) => (re.test(r.url()) ? r.abort() : r.continue())); };
await scenario('mobile', async (p) => p.emulate(KnownDevices['iPhone 13']), async (p) => {
  await p.evaluate(() => scrollBy(0, 80)); await sleep(6500); return stage(p); });
await scenario('reducedMotion', (p) => p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]));
await scenario('lowMemory', (p) => p.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 })), async (p) => {
  await p.mouse.move(700, 450); for (let i = 0; i < 60; i += 1) { await p.mouse.wheel({ deltaY: 40 }); await sleep(20); } await sleep(1500); return stage(p); });
await scenario('fail1080', block(/seq-1080/), async (p) => {
  await p.mouse.move(700, 450); for (let i = 0; i < 60; i += 1) { await p.mouse.wheel({ deltaY: 40 }); await sleep(20); } await sleep(2000); return stage(p); });
await scenario('failAllMedia', block(/intro-idle|seq-|intro-transform/));
await scenario('autoplayRejected', async (p) => p.evaluateOnNewDocument(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked', 'NotAllowedError')); }; }),
  async (p) => p.evaluate(() => !!document.querySelector('.intro-play')));

await browser.close();
fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1).slice(0, 6000));
