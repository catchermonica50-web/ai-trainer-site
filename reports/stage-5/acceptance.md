# 阶段 5 验收：性能 / 无障碍 / SEO 收尾

> 第二轮（125c814）：移动端 LCP 中位数 1949ms ✅，联系区和关于区占位隐藏，详见 round2.md。

- 分支：`feat/stage-5-polish`，从 `c50c241` 拉出。main（425fb14）和 PR #1 都没动。
- 代码提交：`6ea6c52` 隐藏占位内容、OG 图、缓存头、站点 URL；`d61eb9a` 首屏文字立即渲染（LCP）、关于区 reveal 改为只动 transform（AA）。
- 测量所用预览：https://d39c630d.ai-trainer-site.pages.dev （d61eb9a）。分支别名：feat-stage-5-polish.ai-trainer-site.pages.dev
- 环境：DESKTOP-AMTV7VQ，i7-12700H，接电源、平衡模式；Chrome/156.0.8078.80；Lighthouse 12.8.2（headless=new、无痕、禁用扩展、临时 profile）
- 测量时间：2026-11-03 21:00–21:25（北京时间）

| # | 项 | 结果 | 证据 |
|---|---|---|---|
| 1 | Lighthouse 四项 ≥90（3 次取中位数） | ❌（仅 SEO） | 桌面：性能 96 / 无障碍 100 / 最佳实践 100 / SEO 69。移动：95 / 100 / 100 / 69。SEO 只有 `is-crawlable` 一项失败，原因是 Cloudflare 给所有预览域名加了 `x-robots-tag: noindex`（已用 curl 确认），站点代码本身没有 noindex；正式站 ai-trainer-site.pages.dev 不带这个头。按约定不部署 main，所以无法在正式站上测。数据见 data/lh/summary.json，完整报告在 <out-dir>/stage5/lh/ |
| 2 | LCP <2.5s，CLS <0.1 | 桌面 ✅ / 移动 ❌ | 桌面 LCP 中位数 711ms，CLS 0。移动（Moto G Power 模拟 + 4G 限速）LCP 中位数 2832ms（三次分别为 2772/2832/2964），CLS 0。LCP 元素是 h1 "AI TRAINER"：TTFB 约 1.03s，渲染延迟约 1.8s（第一次跑时 LCP 是 4078/2752/3304，d61eb9a 去掉了"首屏文字等海报出来再显示"之后有所下降）。真实桌面 Chrome 用 PerformanceObserver 测得 LCP 1556ms |
| 3 | 首屏 JS ≤180KB（gzip，含自动加载的分包） | ✅ | 165.3 KB。统计方法：加载后静置 8 秒、不做任何操作，期间加载的全部脚本都计入（包括动态分包 c15bf2b0、605、580），每个文件单独 gzip -9 后求和。明细见 vitals.json 的 firstJs。没有发现要交互后才加载的分包 |
| 4 | 开场、滑轨、导航真实交互的 INP | ✅ | 用 Event Timing（web-vitals 用的就是这个数据源），通过有界面的 Chrome 真实发送鼠标和键盘输入。开场 168ms（只记到 1 次交互），滑轨 64ms（6 次：方向键 + 拖拽），导航 24ms（7 次）。整体 168ms，低于 200ms |
| 5 | 404 页面 | ✅ | /no-such-page-xyz 返回 HTTP 404，h1 为 "SIGNAL LOST"，截图 shots/404.png |
| 6 | `_headers` | ✅ | HTML、robots、sitemap：`max-age=0, must-revalidate`。版本化文件 /media/intro、/media/fx、/media/work、/og.v1.jpg 和 /_next/static：`max-age=31536000, immutable`（在预览上逐个实测） |
| 7 | 占位内容不渲染 | ✅ | `lib/placeholder.ts`：值为空、含 [X]、或者整体是 `[...]` 的统计卡、邮箱、社交链接，在生产构建里不渲染；邮箱是占位时"发送邮件"按钮也一起隐藏。开发模式照常显示，方便填写。填上真实值后会自动出现。生产版 out/index.html 中搜不到 [X]、[email]、链接待定。示例作品保留 [X] 和「示例」标签 |
| 8 | CPU 6x 降速时掉帧降级 | ✅ | 触发阈值（useScrub.ts）：擦洗时收集 90 个 gsap ticker 间隔，若超过 45 个大于 34ms（即约低于 29fps），就降一级，顺序是 1080 → 720 → 定格图。实测在 7144ms 时从 scrub/1080 降为 scrub/720：1080 档平均 19.6fps，720 档平均 29.9fps。录屏 <out-dir>/stage5/cpu6x-downgrade.mp4，截图 shots/cpu6x-*.png。数据见 data/cpu6x.json。之前在 6ea6c52 预览上跑过一次，3742ms 时降为 720 |
| 9 | CPU 4x 降速擦洗 ≥30fps | ✅（以均值计，余量很小） | 在 d39c630d 上跑了 3 次（15 秒持续擦洗）：平均 32.3 / 32.4 / 32.1fps。第 3 次中途降到了 720 档。P5 为 27.4 / 27.4 / 13.8。另外 run0 是 32.3。在 6ea6c52 预览上的那一次是 42.0fps。这台机器前后测量波动很大：同一个旧构建 dde81f6a，事后复测只有 20.1fps，所以数值受机器状态影响 |
| 10 | 键盘、对比度 AA、视频替代文字 | ✅ | Tab 能依次走到跳转链接、导航、开场按钮、关于区按钮、滑轨按钮、滑轨本身和 4 张作品卡，每一项都有 :focus-visible 和 outline（vitals.json 的 keyboardWalk，截图 shots/keyboard-focus.png）。Lighthouse 无障碍 100：之前关于区按钮因淡入动画处于半透明，对比度 2.53，已改成只做位移的 reveal。待机和变身视频都有 aria-label，定格图有 alt |
| 11 | metadata、OG、sitemap、robots | ✅ | 每页有 title、description、canonical；首页 OG 图为 og.v1.jpg（1200×630），另有 twitter large card；作品页用封面作 OG 图，并带 JSON-LD；sitemap 和 robots 的域名已从 localhost 改为 https://ai-trainer-site.pages.dev（可用 NEXT_PUBLIC_SITE_URL 覆盖）；每页只有一个 h1 |
| 12 | 正式部署 | ❌（按指示停在预览） | 没有动 main，也没有合并 |

## 偏差
- SEO 69 是预览域名的 noindex 头造成的，不是站点代码的问题，但正式站上还没有测过。
- 移动端 LCP 超过 2.5s。可能的原因：Noto Sans SC 首屏会加载约 700KB（12 个 woff2 分片），另外 TTFB 约 1s。这次没继续优化，可选做法是缩小中文字体的子集或者让首屏不用中文字体。
- 去掉了"首屏文字等海报绘制后再显示"的逻辑（阶段 3 的设定），因为 Chrome 实际判定的 LCP 元素是 h1，而不是海报图。
- 关于区的 reveal 不再淡入，只做位移。
- 统计卡、邮箱、社交链接之外的占位文字（about 里的 [姓名]、[ID]）不在 v5.1 这一条的范围内，所以保留未动。
- 联系区现在没有任何可聚焦元素，因为邮箱还是占位，按钮被隐藏了。
- 降速测试时开着 CDP 录屏，会占用一部分 CPU，对 fps 来说偏保守。
