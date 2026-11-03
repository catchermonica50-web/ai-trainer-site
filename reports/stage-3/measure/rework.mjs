// Stage-3 rework checks: particle interactions, card contrast over particles, overflow, skip link.
// Usage: node rework.mjs <baseUrl> <outDir>   env: CHROME_PATH, HEADLESS=0 (needs a real hover:fine pointer)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const [BASE, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: process.env.HEADLESS !== '0',
  args: [
    '--window-size=1460,1000',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
  ],
});
const R = { browser: await browser.version() };
const BACKDROP = /\/media\/(3d|fx)\//;

async function open(width, height = 900) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width, height });
  const reqs = [];
  p.on('request', (r) => reqs.push(r.url()));
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  await p.waitForSelector('#about');
  return { ctx, p, reqs, errors };
}
const toAbout = async (p) => {
  await p.evaluate(() => document.getElementById('about').scrollIntoView());
  await sleep(400);
  await p.evaluate(() => document.getElementById('about').scrollIntoView());
};
const ds = (p) =>
  p.evaluate(() => ({
    ...(document.querySelector('.robot-backdrop canvas')?.dataset ?? {}),
  }));

// Relative luminance / contrast, sRGB.
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Pixels of an element's box (inset 4px) with its text hidden: the effective background. */
async function bgPixels(p, el) {
  const box = await el.boundingBox();
  const clip = {
    x: box.x + 4,
    y: box.y + 4,
    width: box.width - 8,
    height: box.height - 8,
  };
  await p.evaluate((e) => e.setAttribute('data-hide-text', ''), el);
  await sleep(120);
  // Full-viewport capture (no re-layout), then crop: clip captures beyond the viewport re-render.
  const b64 = await p.screenshot({ encoding: 'base64', captureBeyondViewport: false });
  await p.evaluate((e) => e.removeAttribute('data-hide-text'), el);
  return p.evaluate(
    async (src, clip) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + src;
      await img.decode();
      const k = img.width / innerWidth;
      const c = document.createElement('canvas');
      c.width = Math.round(clip.width * k);
      c.height = Math.round(clip.height * k);
      const g = c.getContext('2d');
      g.drawImage(
        img,
        clip.x * k,
        clip.y * k,
        clip.width * k,
        clip.height * k,
        0,
        0,
        c.width,
        c.height,
      );
      return Array.from(g.getImageData(0, 0, c.width, c.height).data);
    },
    b64,
    clip,
  );
}

async function contrastAt(width) {
  const { ctx, p } = await open(width);
  await p.addStyleTag({
    content:
      '[data-hide-text], [data-hide-text] * { color: transparent !important; text-shadow: none !important; } .cursor, .cursor * { display: none !important; }',
  });
  await toAbout(p);
  await p.waitForFunction(
    () => document.querySelector('.robot-backdrop')?.dataset.state === 'ready',
    { timeout: 30000 },
  );
  // Worst case: pointer on the visor (max glow), then let the fade-in settle.
  const v = await p.evaluate(() => {
    const r = document.querySelector('.robot-backdrop').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.5 - r.height * 0.33 };
  });
  await p.mouse.move(v.x, v.y, { steps: 10 });
  await sleep(1800);
  const opacity = await p.evaluate(
    () => getComputedStyle(document.querySelector('.robot-backdrop')).opacity,
  );
  const near = (await ds(p)).near;
  const out = [];
  for (const sel of ['.about-stats li', '.about-actions .btn', '.about-desc']) {
    const els = await p.$$(sel);
    for (const [i, el] of els.entries()) {
      const color = await p.evaluate((e) => {
        const c = getComputedStyle(e)
          .color.match(/[\d.]+/g)
          .map(Number);
        return c;
      }, el);
      const px = await bgPixels(p, el);
      let worst = null;
      let worstRatio = Infinity;
      let sum = [0, 0, 0];
      const n = px.length / 4;
      for (let k = 0; k < px.length; k += 4) {
        const bg = [px[k], px[k + 1], px[k + 2]];
        sum = sum.map((s, j) => s + bg[j]);
        const a = color[3] ?? 1;
        const fg = color.slice(0, 3).map((c, j) => c * a + bg[j] * (1 - a));
        const r = ratio(fg, bg);
        if (r < worstRatio) {
          worstRatio = r;
          worst = bg;
        }
      }
      const mean = sum.map((s) => s / n);
      const a = color[3] ?? 1;
      out.push({
        sel: `${sel}[${i}]`,
        text: await p.evaluate((e) => e.textContent.trim().slice(0, 20), el),
        color: color.join(','),
        meanBg: mean.map((x) => Math.round(x)).join(','),
        meanRatio: +ratio(
          color.slice(0, 3).map((c, j) => c * a + mean[j] * (1 - a)),
          mean,
        ).toFixed(2),
        worstBg: worst.join(','),
        worstRatio: +worstRatio.toFixed(2),
      });
    }
  }
  await p.screenshot({ path: path.join(OUT, `contrast-${width}.png`) });
  await ctx.close();
  return { width, opacity, near, cards: out };
}

// 1. Particle interactions + fps + lazy-load at 1440.
{
  const { ctx, p, reqs, errors } = await open(1440);
  const at0 = {
    scrollY: await p.evaluate(() => scrollY),
    backdropRequests: reqs
      .filter((u) => BACKDROP.test(u))
      .map((u) => new URL(u).pathname),
    state: await p.evaluate(
      () => document.querySelector('.robot-backdrop').dataset.state,
    ),
  };
  const n0 = reqs.length;
  await toAbout(p);
  await p.waitForFunction(
    () => document.querySelector('.robot-backdrop')?.dataset.state === 'ready',
    { timeout: 30000 },
  );
  const after = reqs.slice(n0).map((u) => new URL(u).pathname);
  const r = await p.evaluate(() =>
    JSON.parse(
      JSON.stringify(document.querySelector('.robot-backdrop').getBoundingClientRect()),
    ),
  );
  const visor = { x: r.left + r.width / 2, y: r.top + r.height / 2 - r.height * 0.33 };
  const probes = {};
  for (const [name, x, y] of [
    ['left', 40, visor.y],
    ['right', 1400, visor.y],
    ['far-bottom-left', 40, 880],
    ['on-visor', visor.x, visor.y],
  ]) {
    await p.mouse.move(x, y, { steps: 12 });
    await sleep(2300);
    probes[name] = await ds(p);
  }
  const fps = [];
  for (let i = 0; i < 5; i++) {
    await p.mouse.move(visor.x + (i % 2 ? 150 : -150), visor.y, { steps: 20 });
    await sleep(1100);
    fps.push(Number((await ds(p)).fps));
  }
  const files = await p.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => /\/media\/(3d|fx)\//.test(e.name))
      .map((e) => ({ name: new URL(e.name).pathname, bytes: e.encodedBodySize })),
  );
  R.particles = { at0, afterScroll: after, probes, fps, files, errors };
  await ctx.close();
}

// 2. Contrast with particles behind (1024, 1440).
R.contrast = [await contrastAt(1024), await contrastAt(1440)];

// 3. Horizontal overflow at each width, at top and at each section.
R.overflow = [];
for (const w of [360, 768, 1024, 1440]) {
  const { ctx, p } = await open(w, w < 1024 ? 740 : 900);
  const rows = [];
  for (const where of ['top', 'about', 'skills', 'contact']) {
    if (where !== 'top') {
      await p.evaluate((id) => document.getElementById(id).scrollIntoView(), where);
      await sleep(500);
    }
    rows.push({
      where,
      ...(await p.evaluate(() => {
        const d = document.documentElement;
        const wide = [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > d.clientWidth + 0.5)
          .slice(0, 5)
          .map((e) => `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 60));
        return {
          innerWidth,
          clientWidth: d.clientWidth,
          scrollWidth: d.scrollWidth,
          wide,
        };
      })),
    });
  }
  R.overflow.push({ width: w, rows });
  await ctx.close();
}

// 4. Skip link: visible on Tab focus, hidden after blur.
{
  const { ctx, p } = await open(1440);
  const read = () =>
    p.evaluate(() => {
      const a = document.querySelector('.skip-link');
      const r = a.getBoundingClientRect();
      return {
        focused: document.activeElement === a,
        top: r.top,
        bottom: r.bottom,
        visibleInViewport: r.bottom > 0,
      };
    });
  const before = await read();
  await p.keyboard.press('Tab');
  await sleep(300);
  const focused = await read();
  await p.screenshot({
    path: path.join(OUT, 'skip-link-focus.png'),
    clip: { x: 0, y: 0, width: 720, height: 160 },
  });
  await p.evaluate(() => document.activeElement.blur());
  await sleep(300);
  const blurred = await read();
  await p.screenshot({
    path: path.join(OUT, 'skip-link-blur.png'),
    clip: { x: 0, y: 0, width: 720, height: 160 },
  });
  R.skipLink = { before, focused, blurred };
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'rework.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
await browser.close();
