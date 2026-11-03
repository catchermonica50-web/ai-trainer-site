import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: false, defaultViewport: null, args: ['--window-size=1460,1000'] });
const p = (await b.pages())[0];
await p.goto(process.argv[2], { waitUntil: 'networkidle2' });
await p.evaluate(() => document.getElementById('about').scrollIntoView());
await new Promise((r) => setTimeout(r, 1200));
console.log(JSON.stringify(await p.evaluate(() => {
  const d = document.documentElement, vw = visualViewport.width;
  const cs = (e) => { const s = getComputedStyle(e); return [s.overflowX, s.width]; };
  const wide = [...document.querySelectorAll('*')].map((e) => [e, e.getBoundingClientRect()]).filter(([, r]) => r.right > vw + 0.01).map(([e, r]) => `${e.tagName}.${String(e.className).slice(0, 40)} r=${r.right.toFixed(2)} w=${r.width.toFixed(2)}`).slice(0, 12);
  return { dpr: devicePixelRatio, vw, cw: d.clientWidth, sw: d.scrollWidth, bodySW: document.body.scrollWidth, bodyCW: document.body.clientWidth, html: cs(d), body: cs(document.body), scrollX: scrollX, maxScrollX: (() => { scrollTo(99999, scrollY); const m = scrollX; scrollTo(0, scrollY); return m; })(), wide };
})));
await b.close();
