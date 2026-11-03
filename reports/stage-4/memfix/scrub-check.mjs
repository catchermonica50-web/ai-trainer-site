// Memory fix checks: live decoded frames (dev counter, if present), blank frames and fps under fast scrubbing.
// node scrub-check.mjs <url> <outDir>   env: CHROME_PATH, HEADLESS=0
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: process.env.HEADLESS !== '0', defaultViewport: null,
  args: ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'] });
const [p] = await b.pages();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
await p.waitForFunction(() => document.querySelector('#intro')?.dataset.scrubReady === '1', { timeout: 60000 });
await sleep(3000);
// Per-frame probe: canvas drawn? centre pixels non-black? frame interval.
await p.evaluate(() => {
  const s = document.querySelector('#intro');
  const cv = s.querySelector('canvas');
  const probe = document.createElement('canvas'); probe.width = 16; probe.height = 16;
  const pc = probe.getContext('2d', { willReadFrequently: true });
  window.__probe = { samples: 0, blank: 0, undrawn: 0, intervals: [], maxGap: 0, live: [], frames: new Set() };
  let last = performance.now();
  const tick = (t) => {
    const P = window.__probe; if (P.stop) return;
    P.intervals.push(t - last); last = t;
    const visible = s.querySelector('canvas') && getComputedStyle(cv).opacity !== '0' && cv.getBoundingClientRect().bottom > 0;
    if (visible && s.dataset.frame !== undefined) {
      P.samples += 1;
      P.frames.add(s.dataset.frame);
      P.maxGap = Math.max(P.maxGap, Math.abs(Number(s.dataset.frame) - Number(s.dataset.target)));
      pc.drawImage(cv, cv.width / 2 - 200, cv.height / 2 - 200, 400, 400, 0, 0, 16, 16);
      const d = pc.getImageData(0, 0, 16, 16).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      if (sum === 0) P.blank += 1;
    } else if (visible) P.undrawn += 1;
    if (window.__frameStoreLive) P.live.push(window.__frameStoreLive.live);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const end = await p.evaluate(() => document.getElementById('about').getBoundingClientRect().top + scrollY);
await p.mouse.move(700, 500);
// Slow full pass, then 6 fast back-and-forth sweeps with large wheel steps, then partial jitter.
for (let y = 0; y < end; y += 40) { await p.mouse.wheel({ deltaY: 40 }); await sleep(16); }
await sleep(500);
for (let k = 0; k < 6; k++) {
  for (let i = 0; i < 12; i++) { await p.mouse.wheel({ deltaY: k % 2 ? 300 : -300 }); await sleep(8); }
  await sleep(150);
}
for (let k = 0; k < 40; k++) { await p.mouse.wheel({ deltaY: k % 2 ? 600 : -600 }); await sleep(20); }
await sleep(1500);
const r = await p.evaluate(() => {
  const P = window.__probe; P.stop = true;
  const iv = P.intervals.slice(5).sort((a, b) => a - b);
  const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
  const s = document.querySelector('#intro');
  return { samples: P.samples, blankSamples: P.blank, undrawnSamples: P.undrawn, distinctFramesShown: P.frames.size, maxFrameMinusTarget: P.maxGap,
    fpsMean: +(1000 / mean).toFixed(1), fpsP5: +(1000 / iv[Math.floor(iv.length * 0.95)]).toFixed(1), intervalsOver34ms: iv.filter((x) => x > 34).length, intervals: iv.length,
    devCounter: window.__frameStoreLive ? { peak: window.__frameStoreLive.peak, maxSeenPerFrame: Math.max(...P.live), now: window.__frameStoreLive.live } : null,
    datasetDecoded: s.dataset.decoded ?? null, mode: document.querySelector('[data-mode]')?.dataset.mode ?? null };
});
r.browser = await b.version(); r.url = URL; r.errors = errors;
fs.writeFileSync(path.join(OUT, `scrub-check-${new globalThis.URL(URL).hostname.split('.')[0]}.json`), JSON.stringify(r, null, 1));
console.log(JSON.stringify(r));
await b.close();
