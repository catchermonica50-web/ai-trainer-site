// Phase 2 item 9 retest: renderer + GPU process memory around a full intro scrub, headed Chrome, temp profile.
// node mem.mjs <url> <outDir>   env: CHROME_PATH. Windows only (uses PowerShell for process + GPU counters).
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: false, defaultViewport: null,
  args: ['--window-size=1460,1000', '--autoplay-policy=no-user-gesture-required'] }); // puppeteer uses a fresh temp profile
const [p] = await b.pages();
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await p.evaluate(() => sessionStorage.clear());
await p.reload({ waitUntil: 'networkidle2' });
await sleep(3000);
const cdp = await b.target().createCDPSession();
const info = (await cdp.send('SystemInfo.getProcessInfo')).processInfo;
const gpu = info.filter((x) => x.type === 'GPU').map((x) => x.id);
const renderers = info.filter((x) => x.type === 'renderer').map((x) => x.id);
const csv = path.join(OUT, 'mem-samples.csv');
const ps = `
$pids=@(${[...gpu, ...renderers].join(',')}); "t,pid,privateMB,workingSetMB,gpuDedicatedMB,gpuSharedMB" | Out-File -Encoding ascii '${csv}'
while ($true) {
  $t=[DateTimeOffset]::Now.ToUnixTimeMilliseconds()
  $g=@{}; try { (Get-Counter '\\GPU Process Memory(*)\\Dedicated Usage','\\GPU Process Memory(*)\\Shared Usage' -ErrorAction SilentlyContinue).CounterSamples | % { if ($_.InstanceName -match 'pid_(\\d+)_') { $k="$($matches[1])|$($_.Path -match 'dedicated')"; $g[$k]=$g[$k]+$_.CookedValue } } } catch {}
  foreach ($id in $pids) { $pr=Get-Process -Id $id -ErrorAction SilentlyContinue; if ($pr) {
    "$t,$id,$([math]::Round($pr.PrivateMemorySize64/1MB,1)),$([math]::Round($pr.WorkingSet64/1MB,1)),$([math]::Round(($g["$id|True"])/1MB,1)),$([math]::Round(($g["$id|False"])/1MB,1))" | Out-File -Append -Encoding ascii '${csv}' } }
}`;
const sampler = spawn('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore' });
const marks = {};
const mark = (k) => (marks[k] = Date.now());
await sleep(4000); mark('beforeEnd');
await p.screenshot({ path: path.join(OUT, 'mem-before.png') });
// Scrub start -> end of the pin in small wheel steps, then back to the top (round trip).
const end = await p.evaluate(() => { const a = document.getElementById('about'); return a.getBoundingClientRect().top + scrollY; });
await p.mouse.move(700, 500);
mark('scrubStart');
let shotTaken = false;
for (let y = 0; y < end; y += 40) {
  await p.mouse.wheel({ deltaY: 40 }); await sleep(30);
  if (!shotTaken && y > end / 2) { await p.screenshot({ path: path.join(OUT, 'mem-during.png') }); shotTaken = true; }
}
await sleep(800);
for (let y = end; y > 0; y -= 40) { await p.mouse.wheel({ deltaY: -40 }); await sleep(30); }
await sleep(800);
mark('scrubEnd');
const frameState = await p.evaluate(() => ({ scrollY, mode: document.querySelector('[data-mode]')?.dataset.mode ?? null }));
await sleep(11000); mark('afterEnd');
await p.screenshot({ path: path.join(OUT, 'mem-after.png') });
// Task Manager window: flag file tells the PowerShell driver which browser PID to focus for Shift+Esc.
if (process.env.TM_WAIT) { fs.writeFileSync(path.join(OUT, 'tm-ready.txt'), String(b.process().pid)); await sleep(+process.env.TM_WAIT); }
sampler.kill();
await sleep(500);
const rows = fs.readFileSync(csv, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(',').map(Number));
const sum = (from, to, pid) => rows.filter((r) => r[1] === pid && r[0] >= from && r[0] <= to);
const report = { browser: await b.version(), url: URL, pids: { gpu, renderers }, marks, frameState, method:
  'Get-Process PrivateMemorySize64 (≈ Chrome task manager "memory footprint" on Windows) and WorkingSet64 per PID every loop; GPU memory = Windows perf counters \\GPU Process Memory(pid_*)\\Dedicated/Shared Usage. PIDs from CDP SystemInfo.getProcessInfo.', per: {} };
for (const pid of [...gpu, ...renderers]) {
  const all = rows.filter((r) => r[1] === pid);
  if (!all.length) continue;
  const before = sum(marks.scrubStart - 4000, marks.scrubStart, pid);
  const during = sum(marks.scrubStart, marks.scrubEnd, pid);
  const after = sum(marks.scrubEnd + 9500, marks.afterEnd, pid);
  const col = (set, i, f) => (set.length ? f(...set.map((r) => r[i])) : null);
  const stat = (i) => ({ before: col(before, i, Math.max), peak: col(during, i, Math.max), after: col(after, i, Math.max),
    increase: col(during, i, Math.max) !== null && col(before, i, Math.max) !== null ? +(col(during, i, Math.max) - col(before, i, Math.max)).toFixed(1) : null });
  report.per[pid] = { type: gpu.includes(pid) ? 'GPU' : 'renderer', samples: all.length, privateMB: stat(2), workingSetMB: stat(3), gpuDedicatedMB: stat(4), gpuSharedMB: stat(5) };
}
const tot = (k, f) => +Object.values(report.per).reduce((a, v) => a + (v[f][k] ?? 0), 0).toFixed(1);
report.total = Object.fromEntries(['privateMB', 'gpuSharedMB', 'gpuDedicatedMB'].map((f) => [f, { before: tot('before', f), peak: tot('peak', f), after10s: tot('after', f) }]));
fs.writeFileSync(path.join(OUT, 'mem.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await b.close();
