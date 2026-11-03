// Stage 5: scrub the intro under DevTools CPU throttling; record fps, mode/quality timeline, screenshots and a screencast.
// node throttle.mjs <url> <outDir> <rate>   env: CHROME_PATH, HEADLESS=0, SECONDS (scrub duration, default 20)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [URL, OUT, RATE = '4'] = process.argv.slice(2);
const dir = path.join(OUT, `cpu${RATE}x`);
fs.mkdirSync(path.join(dir, 'cast'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: process.env.HEADLESS !== '0', defaultViewport: null,
  args: ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'] }); // fresh temp profile
const [p] = await b.pages();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
await p.waitForFunction(() => document.querySelector('#intro')?.dataset.scrubReady === '1', { timeout: 60000 });
await sleep(2000);
const cdp = await p.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(RATE) });
let n = 0;
cdp.on('Page.screencastFrame', async (f) => {
  fs.writeFileSync(path.join(dir, 'cast', `${String(n++).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: 960, everyNthFrame: 2 });
await p.evaluate(() => {
  const st = () => { const m = document.querySelector('[data-mode]'); return `${m?.dataset.mode}/${m?.dataset.quality}`; };
  window.__t = { iv: [], timeline: [{ t: 0, state: st() }], t0: performance.now(), scrolling: false };
  let last = performance.now();
  const tick = (t) => {
    const T = window.__t; if (T.stop) return;
    if (T.scrolling) T.iv.push({ d: t - last, state: st() });
    last = t;
    const s = st(); if (s !== T.timeline.at(-1).state) T.timeline.push({ t: Math.round(t - T.t0), state: s });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const shot = (name) => p.screenshot({ path: path.join(dir, `${name}.png`) });
await shot('0-start');
const end = await p.evaluate(() => document.getElementById('about').getBoundingClientRect().top + scrollY);
await p.mouse.move(700, 500);
await p.evaluate(() => (window.__t.scrolling = true));
const t0 = Date.now(); let dirn = 1; let y = 0; let k = 0;
while (Date.now() - t0 < Number(process.env.SECONDS || 20) * 1000) {
  await p.mouse.wheel({ deltaY: 60 * dirn }); y += 60 * dirn; await sleep(16);
  if (y > end * 0.9 || y < end * 0.05) dirn *= -1;
  if (++k % 120 === 0) await shot(`1-scrub-${k}`);
}
await p.evaluate(() => (window.__t.scrolling = false));
await sleep(1000);
await shot('2-end');
await cdp.send('Page.stopScreencast');
const r = await p.evaluate(() => {
  const T = window.__t; T.stop = true;
  const by = {};
  for (const { d, state } of T.iv.slice(3)) (by[state] ||= []).push(d);
  const stat = (a) => { const s = [...a].sort((x, y) => x - y); const mean = s.reduce((x, y) => x + y, 0) / s.length;
    return { frames: s.length, fpsMean: +(1000 / mean).toFixed(1), fpsMedian: +(1000 / s[Math.floor(s.length / 2)]).toFixed(1), fpsP5: +(1000 / s[Math.floor(s.length * 0.95)]).toFixed(1), over34ms: s.filter((x) => x > 34).length }; };
  return { all: stat(T.iv.slice(3).map((x) => x.d)), byState: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, stat(v)])), timeline: T.timeline };
});
Object.assign(r, { rate: Number(RATE), browser: await b.version(), url: URL, screencastFrames: n, errors,
  threshold: 'useScrub.ts: while ScrollTrigger is active and moving, collect 90 gsap ticker deltas; if more than 45 of them exceed 34 ms, onDowngrade() steps 1080 → 720 → still' });
fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(r, null, 1));
console.log(JSON.stringify(r));
await b.close();
