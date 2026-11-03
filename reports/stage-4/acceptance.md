# Stage 4: work rail and detail pages, acceptance

- Commit under test: `c441d58` on `feat/stage-4-work` (preview https://6f6c910f.ai-trainer-site.pages.dev). The follow-up commit only fixes the nav indicator on detail pages and adds this report.
- Browser: Windows, Chrome 156.0.8078.80, headed (`HEADLESS=0`, real `hover:fine` pointer), DPR 1.5. Box headless Chrome 156.0.8078.47 was used for development runs only.
- Raw data: `p4/p4.json`, `mem/mem.json`, `mem/mem-samples.csv`, `add-work-test.json`. Scripts: `measure/p4.mjs`, `measure/mem.mjs`, `<project-root>/scripts/make-work-covers.py`.

## Section 11, stage 4

| # | Item | Result | Evidence (p4.json) |
|---|---|---|---|
| 1 | Touch: vertical swipe scrolls the page, horizontal swipe moves the rail | ✅ | CDP touch events at 390×844: vertical swipe on the rail page +353px, rail +0; horizontal swipe rail +220px, page +0; `touch-action: pan-y` |
| 2 | Drag >6px does not open the detail; a click does | ✅ | 80px mouse drag: rail x 0→80, URL stays `/`; 4px press-release opens `/work/rlhf-preference-data` |
| 3 | Prev/next buttons, disabled at the ends | ✅ | x 0 (prev disabled) → 498 → 687/687 (next disabled) → prev → 189 |
| 4 | Wheel moves the rail while it can, then releases the page | ✅ | Mid-rail: x 0→180, page y unchanged; at end: x 687 unchanged, page y +120 |
| 5 | Arrow keys only with the rail focused | ✅ | Body focus: ArrowRight x 0→0; rail focus: x 0→498 |
| 6 | Mouse drag; desktop tilt + HUD scan, both off on touch | ✅ | Desktop hover: `--rx 3.60deg`, `--ry 4.20deg`, scan opacity 1, cursor VIEW on; touch: no `data-tilt`, `(hover:hover) and (pointer:fine)` false |
| 7 | 4 static `/work/[slug]` pages, fields per §8, 4 sections | ✅ | 4 HTML files in `out/work/`; each: one h1, sections 背景/我的工作/方法/结果 (2–3 sentences each), 2–3 metrics, role/period/tags, 16:10 WebP cover (10–21 KB), JSON-LD |
| 8 | 「示例」 on cards and detail pages; only [X] placeholders, no companies | ✅ | 4/4 cards and 4/4 detail titles show 示例; no digits left in detail `<main>` text after removing `[X]` (strayDigits = 0 on all 4); no company or client names in `content/works.ts` |
| 9 | Prev/next work and back to works; ends handled | ✅ | First page: prev disabled (`aria-disabled`), next is a link; last page: next disabled; 3 links to `/#work` per page |
| 10 | Card → detail transition | ✅ | 100ms after the click the card has opacity 0.09 and scale ≈1.03 (`data-leaving`); the detail `<main>` runs `work-enter` (opacity 0.91 at +150ms). Screenshots: `transition-leaving.png`, `transition-enter.png` |
| 11 | Returning from a detail page restores page Y and rail X without replaying the intro | ✅ | Back link and browser back: saved y 4496, x 498 → restored y 4496, x 498 (dy 0, dx 0), intro not in view |
| 12 | Adding a work needs one entry in `content/works.ts` | ✅ | A temporary 5th entry (only that file) built 5 detail pages, a sitemap entry, a home card, and the last work's next link pointed to it. Reverted. |

## Retests

| Retest | Result | Evidence |
|---|---|---|
| Backdrop enable conditions | ✅ | 1440 fine pointer (control): ready, 1 request (`mech-points.v1.bin`). 1023 fine pointer, 1440 reduced-motion, 1440 touch: state off, no canvas, 0 GLB or particle requests |
| `--disable-webgl` | ✅ | webgl and webgl2 unavailable; backdrop state `failed`, no canvas, 0 backdrop requests, 0 console errors; the intro canvas scrub and About text render (`no-webgl-top.png`, `no-webgl-about.png`, `no-webgl-work.png`) |
| Stage 2 item 9: sequence decode memory on production (≤200 MiB increase) | ❌ | See below |

### Sequence memory on production

- Method: `measure/mem.mjs`. Headed Chrome with a fresh temporary profile (puppeteer). Open https://ai-trainer-site.pages.dev/, clear sessionStorage, and reload. Then scrub top → end of the pin → top with 40px wheel steps (about 9 s). Process IDs come from CDP `SystemInfo.getProcessInfo`.
- Memory: `Get-Process` PrivateMemorySize64 and WorkingSet64 for each process. GPU memory: the Windows counters `\GPU Process Memory(pid_*)\Dedicated/Shared Usage`. One sample about every 0.9 s (17 samples per process). Before = the 4 s before scrubbing. Peak = maximum during the scrub. After = 3–5 s after the scrub.
- Chrome task manager screenshots were not taken. Only page screenshots exist (`mem-before.png`, `mem-during.png`, `mem-after.png`).

| Process (MiB) | Before | Peak | After | Increase |
|---|---|---|---|---|
| Tab renderer, private | 226.9 | 228.7 | 149.5 | +1.8 |
| GPU process, private | 614.7 | 1086.1 | 1085.8 | **+471.4** |
| GPU process, shared GPU memory | 556.2 | 1061.1 | 1017.6 | **+504.9** |

The GPU process grew by 471 MiB private and 505 MiB shared, and had not dropped 5 s later. This fails the 200 MiB budget. The likely cause, not verified, is that decoded ImageBitmaps are GPU-backed and stay resident in the GPU process. The fix would go in the stage 2 FrameStore and was not started here.

## Build

lint, tsc, prettier, and build pass. `/` First Load JS is 119 kB, up from 111 kB, which adds the rail and cards. `/work/[slug]` is 107 kB. There is no `.glb` in `out/`.
