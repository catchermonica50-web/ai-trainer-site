// Stage 5: first-screen JS (gzip), real-interaction INP (Event Timing, same source web-vitals uses), LCP/CLS, keyboard walk, 404 + headers.
// node vitals.mjs <url> <outDir>   env: CHROME_PATH, HEADLESS=0
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: process.env.HEADLESS !== '0', defaultViewport: null,
  args: ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'] });
const [p] = await b.pages();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.evaluateOnNewDocument(() => {
  window.__v = { events: [], lcp: 0, cls: 0, scripts: [] };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => e.interactionId && window.__v.events.push({ id: e.interactionId, name: e.name, d: e.duration, tag: window.__v.tag || '' })))
    .observe({ type: 'event', durationThreshold: 16, buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__v.lcp = e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__v.cls += e.value))).observe({ type: 'layout-shift', buffered: true });
});
await p.goto(URL, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(8000); // idle, no input: everything loaded now counts as first-screen JS
const scripts = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.initiatorType === 'script' || e.name.endsWith('.js')).map((e) => e.name));
const firstJs = [];
for (const u of scripts) { const buf = Buffer.from(await (await fetch(u)).arrayBuffer()); firstJs.push({ url: u.replace(URL.replace(/\/$/, ''), ''), raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length }); }
const firstJsGzipKB = +(firstJs.reduce((a, x) => a + x.gzip, 0) / 1024).toFixed(1);
const lcpCls = await p.evaluate(() => ({ lcpMs: Math.round(window.__v.lcp), cls: +window.__v.cls.toFixed(4) }));
const tag = (t) => p.evaluate((t) => (window.__v.tag = t), t);
// Intro: skip button / scroll back / play button
await tag('intro');
for (const sel of ['button[aria-label*="跳过"], .intro-skip, button:has(> span)']) { const h = await p.$(sel); if (h) { await h.click().catch(() => {}); await sleep(800); } }
await p.evaluate(() => scrollTo(0, 0)); await sleep(800);
const introBtns = await p.$$('#intro button');
for (const h of introBtns.slice(0, 3)) { await h.click().catch(() => {}); await sleep(700); }
// Rail: keyboard + drag
await tag('rail');
await p.evaluate(() => document.getElementById('work').scrollIntoView()); await sleep(1500);
const rail = await p.$('#work [aria-label*="滑轨"]') || await p.$('#work [tabindex="0"]');
if (rail) { await rail.focus(); for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowRight'); await sleep(400); } await p.keyboard.press('ArrowLeft'); await sleep(400);
  const bb = await rail.boundingBox(); if (bb) { const y = bb.y + bb.height / 2; await p.mouse.move(bb.x + bb.width * 0.7, y); await p.mouse.down(); for (let i = 0; i < 15; i++) { await p.mouse.move(bb.x + bb.width * (0.7 - i * 0.03), y); await sleep(16); } await p.mouse.up(); await sleep(600); } }
// Nav: click each in-page link, then a work card route and back
await tag('nav');
for (const id of ['about', 'skills', 'work', 'contact', 'intro']) { const h = await p.$(`nav a[href$="#${id}"]`); if (h) { await h.click().catch(() => {}); await sleep(900); } }
const card = await p.$('#work a[href^="/work/"]');
if (card) { await p.evaluate(() => document.getElementById('work').scrollIntoView()); await sleep(800); await card.click().catch(() => {}); await sleep(2000); await tag('nav'); const back = await p.$('a[href="/"], a[href="/#work"]'); if (back) { await back.click().catch(() => {}); await sleep(2000); } }
const ev = await p.evaluate(() => window.__v.events);
const per = {}; for (const e of ev) { const k = e.tag; (per[k] ||= {}); per[k][e.id] = Math.max(per[k][e.id] || 0, e.d); }
const inp = Object.fromEntries(Object.entries(per).map(([k, m]) => { const v = Object.values(m).sort((a, b) => b - a); return [k, { interactions: v.length, inpMs: v[0] ?? null, all: v }]; }));
const allV = Object.values(per).flatMap((m) => Object.values(m)).sort((a, c) => c - a);
// Keyboard walk on a fresh home load
await p.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1500);
const walk = [];
for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); await sleep(120);
  walk.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e);
    return { tag: e.tagName, text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), href: e.getAttribute('href'), focusVisible: e.matches(':focus-visible'), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, ring: cs.boxShadow !== 'none' }; })); }
await p.screenshot({ path: path.join(OUT, 'keyboard-focus.png') });
// 404
const res404 = await p.goto(new globalThis.URL('/no-such-page-xyz', URL).href, { waitUntil: 'networkidle2' });
await sleep(1000); await p.screenshot({ path: path.join(OUT, '404.png') });
const h404 = { status: res404.status(), title: await p.$eval('h1', (e) => e.textContent).catch(() => null) };
// Cache headers
const heads = {};
const html = await p.goto(URL); heads['/'] = html.headers()['cache-control'];
for (const u of ['/robots.txt', '/sitemap.xml', '/og.v1.jpg', '/media/intro/intro-still.v1.webp', '/media/intro/seq-1080.v1/f000.webp', '/media/fx/mech-points.v1.bin', '/media/work/prompt-eval-benchmark.v1.webp', firstJs[0]?.url].filter(Boolean)) {
  const r = await fetch(new globalThis.URL(u, URL)); heads[u] = r.headers.get('cache-control'); }
const meta = await p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name=description]')?.content, og: document.querySelector('meta[property="og:image"]')?.content, canonical: document.querySelector('link[rel=canonical]')?.href, h1: document.querySelectorAll('h1').length }));
const robots = await (await fetch(new globalThis.URL('/robots.txt', URL))).text();
const sitemap = await (await fetch(new globalThis.URL('/sitemap.xml', URL))).text();
const r = { browser: await b.version(), url: URL, firstJsGzipKB, firstJs, ...lcpCls, inp, inpOverallMs: allV[0] ?? null, keyboardWalk: walk, h404, cacheControl: heads, meta, robots, sitemap, errors };
fs.writeFileSync(path.join(OUT, 'vitals.json'), JSON.stringify(r, null, 1));
console.log(JSON.stringify({ firstJsGzipKB, ...lcpCls, inp: Object.fromEntries(Object.entries(inp).map(([k, v]) => [k, [v.interactions, v.inpMs]])), inpOverallMs: r.inpOverallMs, h404, heads, meta, errors }));
await b.close();
