# Stage 3 rework: acceptance (option c)

Measured on Windows (Chrome 156.0.8078.80, RTX 3060 Laptop, DPR 1.5) against preview https://7cb454a5.ai-trainer-site.pages.dev (commit 2e45cf7). Raw data: `rework/rework.json`. Scripts: `measure/rework.mjs`, `measure/ov.mjs`, `measure/sb.mjs`, `measure/sample-mech-points.py`. Local root: `<project-root>`.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Silhouette sampled from the phase 2 final-frame still | ✅ | `sample-mech-points.py`: edge + luminance sampling, crop x 0.375–0.625 / y 0.025–0.94 → `public/media/fx/mech-points.v1.bin` (7800 pts, 46,804 B) |
| 2 | Head follows the mouse; visor brightens to ice-blue near it | ✅ | look x: pointer left -0.600, right 0.321; near: 0.88 (1024) / 0.85 (1440) with the pointer on the visor, 0.00 when far |
| 3 | Opacity ≤ 0.4, contrast ≥ 4.5:1 at 1024 & 1440 | ✅ | opacity 0.4; worst-pixel: stats 10.73, 「联系我」 6.80, 「查看能力」 12.52, about-desc 6.33 (same at both widths) |
| 4 | ≤ 8k pts, ≥ 55 fps, gating unchanged, lazy, fallback, 0 requests at top | ✅ | 7800 pts; fps 165/165/165.1/165/165; scrollY 0: 0 backdrop requests, state idle; after scroll: 5 chunks + bin; hasWebGL check + SceneBoundary kept |
| 5 | GLB out of the build; licenses.md 「已弃用」 | ✅ | `robot.v1.glb` git-rm'd, no `.glb` in `out/`; licenses.md row marked 已弃用; `mode:'glb'` toggle kept, default `particles` |
| 6 | scrollWidth = clientWidth at 360/768/1024/1440 | ✅ | 345/345, 753/753, 1009/1009, 1425/1425 (4 scroll positions each). Native 1446px window at DPR 1.5 previously had maxScrollX 0.67 (pin-spacer 1431 vs viewport 1430.67); fixed with `html{overflow-x:clip}` + `.pin-spacer{max-width:100%}`; now maxScrollX 0 |
| 7 | lint / tsc / prettier / build; First Load JS ≤ 121 kB | ✅ | all pass; `/` First Load JS 111 kB (shared 103 kB), +0 kB |
| 8 | Skip link screenshots | ✅ | `rework/skip-link-focus.png` (top 8, visible), `rework/skip-link-blur.png` (top -73.9, hidden) |
