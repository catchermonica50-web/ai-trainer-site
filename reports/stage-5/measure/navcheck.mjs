// Contact hidden in production: nav entries, anchors, section presence, nav highlight per section, Tab order end, about copy.
// node navcheck.mjs <url> <outDir>   env: CHROME_PATH, HEADLESS=0
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: process.env.HEADLESS !== '0', defaultViewport: null, args: ['--window-size=1460,1000'] });
const [p] = await b.pages();
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
await sleep(1500);
const dom = await p.evaluate(() => {
  const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  const anchors = [...document.querySelectorAll('a[href*="#"]')].map((a) => a.getAttribute('href'));
  return {
    navItems: [...document.querySelectorAll('nav .nav-link')].map((a) => [a.textContent, a.getAttribute('href')]),
    contactSection: !!document.getElementById('contact'),
    deadAnchors: anchors.filter((h) => { const id = h.split('#')[1]; return id && !ids.has(id); }),
    mailto: document.querySelectorAll('a[href^="mailto:"]').length,
    aboutEyebrow: document.querySelector('#about .tag, #about [class*="tag"]')?.textContent ?? null,
    aboutDesc: document.querySelector('.about-desc')?.textContent ?? null,
    placeholdersInMain: (document.querySelector('main').innerText.match(/\[[^\]]*\]/g) || []).filter((x) => !/^\[0\d\]$/.test(x)),
    fontsLoaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  };
});
const highlight = {};
for (const id of ['about', 'skills', 'work']) {
  await p.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'center' }), id);
  await sleep(1200);
  highlight[id] = await p.evaluate(() => document.querySelector('nav .nav-link[aria-current]')?.getAttribute('href') ?? null);
}
await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await sleep(1200);
highlight.pageBottom = await p.evaluate(() => document.querySelector('nav .nav-link[aria-current]')?.getAttribute('href') ?? null);
await p.screenshot({ path: path.join(OUT, 'contact-hidden-bottom.png') });
await p.evaluate(() => document.getElementById('about').scrollIntoView()); await sleep(1200);
await p.screenshot({ path: path.join(OUT, 'about-trotter.png') });
await p.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1500);
const tabs = [];
for (let i = 0; i < 22; i++) { await p.keyboard.press('Tab'); await sleep(100); tabs.push(await p.evaluate(() => { const e = document.activeElement; return `${e.tagName}|${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 16)}|${e.getAttribute('href') ?? ''}|fv=${e.matches(':focus-visible')}`; })); }
const r = { url: URL, browser: await b.version(), ...dom, highlight, tabs };
fs.writeFileSync(path.join(OUT, 'navcheck.json'), JSON.stringify(r, null, 1));
console.log(JSON.stringify(r));
await b.close();
