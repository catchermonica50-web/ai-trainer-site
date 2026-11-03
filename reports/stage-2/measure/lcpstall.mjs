// Cold-cache LCP + fast-scroll stall test. node lcpstall.mjs <url> <out.json> <runs> [throttle]
// throttle = "down_kbps:rtt_ms" applies CDP network emulation (control run).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [URL_, OUT, RUNS = '3', THR] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const runs = [];
for (let r = 0; r < +RUNS; r += 1) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cold-'));
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: false, userDataDir: dir,
    args: ['--disable-extensions', '--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required', '--no-first-run'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const cdp = await p.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (THR) { const [k, rtt] = THR.split(':').map(Number);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: rtt, downloadThroughput: k * 128, uploadThroughput: k * 64 }); }
  await p.evaluateOnNewDocument(() => {
    window.__lcp = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: Math.round(e.startTime), tag: e.element?.tagName, size: e.size, url: e.url.split('/').pop() })))
      .observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await p.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await sleep(+(process.env.WAIT ?? 5000));
  const nav = await p.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    const poster = res.find((e) => e.name.includes('intro-poster'));
    const n = performance.getEntriesByType('navigation')[0];
    const bytes = res.reduce((s, e) => s + (e.encodedBodySize || 0), 0);
    const end = Math.max(...res.map((e) => e.responseEnd));
    return { lcp: window.__lcp, ttfb: Math.round(n.responseStart), posterStart: Math.round(poster?.startTime ?? -1), posterEnd: Math.round(poster?.responseEnd ?? -1), posterBytes: poster?.encodedBodySize,
      kbytes5s: Math.round(bytes / 1024), approxMbps: +((bytes * 8) / 1e6 / (end / 1000)).toFixed(1) };
  });
  await p.waitForFunction(() => document.querySelector('#intro')?.dataset.scrubReady === '1', { timeout: 30000 });
  // Cold frames: reload the store? No — frames warm up during the 5s wait; measure as a visitor would.
  await p.evaluate(() => { window.__s = []; const s = document.querySelector('#intro'); const t0 = performance.now();
    const tick = () => { window.__s.push([Math.round(performance.now() - t0), +(s.dataset.target ?? 0), +(s.dataset.frame ?? 0), +(s.dataset.scrollTarget ?? 0)]); if (window.__s.length < 1200) requestAnimationFrame(tick); }; tick(); });
  await p.mouse.move(700, 450);
  for (let i = 0; i < 30; i += 1) { await p.mouse.wheel({ deltaY: 120 }); await sleep(16); } // ~3600px in ~0.6s: whole pin

  await sleep(6000);
  const s = await p.evaluate(() => window.__s);
  const behind = s.map(([t, tg, f]) => [t, Math.abs(tg - f)]);
  const maxBehind = Math.max(...behind.map((x) => x[1]));
  let over = 0, freeze = 0, last = s[0], frozenSince = s[0][0];
  for (let i = 1; i < s.length; i += 1) { const dt = s[i][0] - s[i - 1][0]; if (behind[i][1] > 3) over += dt;
    if (s[i][2] !== last[2] || s[i][1] === s[i][2]) { last = s[i]; frozenSince = s[i][0]; } else freeze = Math.max(freeze, s[i][0] - frozenSince); }
  const lastBad = [...behind].reverse().find((x) => x[1] > 1);
  const finalLcp = nav.lcp[nav.lcp.length - 1];
  runs.push({ run: r + 1, ...nav, finalLcp, maxFramesBehind: maxBehind, msMoreThan3Behind: over, longestFreezeMs: freeze, lastBehind1At: lastBad?.[0] ?? 0, maxScrubLag: Math.max(...s.map((x) => Math.abs(x[3] - x[1]))), endState: s[s.length - 1] });
  await b.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
const summary = { url: URL_, waitBeforeScrollMs: +(process.env.WAIT ?? 5000), throttle: THR ?? 'none', runs: runs.length,
  medianLcpMs: med(runs.map((x) => x.finalLcp.t)), lcpElements: runs.map((x) => `${x.finalLcp.tag}:${x.finalLcp.url}`),
  medianMaxBehind: med(runs.map((x) => x.maxFramesBehind)), medianMsBehind3: med(runs.map((x) => x.msMoreThan3Behind)), medianFreezeMs: med(runs.map((x) => x.longestFreezeMs)),
  medianMbps: med(runs.map((x) => x.approxMbps)), medianTtfb: med(runs.map((x) => x.ttfb)) };
fs.writeFileSync(OUT, JSON.stringify({ summary, runs }, null, 2));
console.log(JSON.stringify(summary));
