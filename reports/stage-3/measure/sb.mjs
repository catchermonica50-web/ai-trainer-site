import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const out = {};
for (const mode of ['emulated', 'native']) {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: false, defaultViewport: null, args: ['--window-size=1460,1000'] });
  const p = (await b.pages())[0] ?? (await b.newPage());
  if (mode === 'emulated') await p.setViewport({ width: 1440, height: 900 });
  await p.goto(url, { waitUntil: 'networkidle2' });
  await p.waitForSelector('#about');
  await p.evaluate(() => document.getElementById('about').scrollIntoView());
  await new Promise((r) => setTimeout(r, 1500));
  out[mode] = await p.evaluate(() => ({ innerWidth, outerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, visualViewport: visualViewport.width }));
  await p.screenshot({ path: `sb-${mode}.png` });
  await b.close();
}
console.log(JSON.stringify(out));
