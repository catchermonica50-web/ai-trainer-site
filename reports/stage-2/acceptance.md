# 阶段 2 验收记录

## 超分
- Real-ESRGAN ncnn-vulkan v0.2.5.0（官方 release，zip SHA256 ABC02804E17982A3BE33675E4D471E91EA374E65B70167ABC09E31ACB412802D）
- 模型 realesrgan-x4plus，`-s 4 -t 0 -g 1 -j 1:2:2`，再 lanczos 缩到 1920×1080
- 耗时：2.mp4 121 帧 545.0s；0.mp4 122 帧 549.0s；编码 71.5s
- 对比图：`reports/stage-2/upscale/`；flicker.txt 中相邻帧平均亮度差之比（x4plus/lanczos）：2.mp4 为 1.03，0.mp4 为 0.994

## 第 2 轮修复（帧调度 + LCP）
- FrameStore：帧下载改为按优先级排队，最多同时 6 个请求，优先级按与当前目标帧的距离计算，每次滚动更新都会重新排序。idle 开始播放后（或 2.5s 后）启动下载：先下载前 24 帧和每隔 8 帧的稀疏帧；之后每隔 8 帧的稀疏帧仍按距离的 1/3 优先下载。目标帧还没到时，先画已解码的最近帧，并临时解码离目标最近的已下载帧顶上。
- LCP：海报图设置 `fetchpriority=high` 和 `decoding=sync`，并加了 `<link rel=preload as=image type=image/avif imagesrcset=…>`，与 `<picture>` 第一个 AVIF source 一致。海报 decode 完成、再过两帧后，才显示 H1/文案（之前 opacity 0）并挂载 idle 视频；3s 后兜底强制显示。

## 测量（Chrome 156，有界面浏览器，每次全新 profile、禁用缓存，3 次取中位数）
脚本：`measure/lcpstall.mjs`；原始数据在 `measure/v2/`。

| 场景 | LCP 元素 | LCP 中位数 | 最多落后帧数 | 落后 >3 帧时长 | 最长画面停顿 | 网络 |
|---|---|---|---|---|---|---|
| 修复前 preview（4a6a1a83 / e8a89ee5，单次） | H1 | 2028 / 3912ms（海报 7112ms） | 停在第 58 / 15 帧，直到下载完成 | 数秒 | 数秒 | 慢 |
| preview 0f55895c，等 5s 后快速滚动 | 3 次都是海报 IMG | 2116ms | 4 | 37ms | 189ms | 约 6.2Mbps，TTFB 约 630ms |
| preview 0f55895c，scrubReady 后立即快速滚动 | 3 次都是海报 IMG | 2084ms | 113 | 425ms | 204ms | 约 2.1Mbps（下载被滚动中断） |
| 对照：本地 prod build + CDP 限速 10Mbps/150ms，等 5s | 3 次都是海报 IMG | 1360ms | 4 | 31ms | 68ms | 限速 |
| 对照：同上，立即滚动 | 3 次都是海报 IMG | 1380ms | 112 | 772ms | 416ms | 限速 |

- “落后帧数”= |tween 当前帧 − 实际画出的帧|，不包含 scrub 0.5s 的平滑滞后。“立即滚动”时第一帧可能还没下载完，所以起步就落后约 112 帧；之后 0.4–0.8s 内追上，中间一直画最近帧，没有长时间停在旧帧上。
- 中间提交 c2fd571 的数据（`v2/r-preview*.json`）：等待场景下 LCP 已是海报，但立即滚动时 3 次里有 2 次 LCP 是 H1。原因是 onLoad 时海报还没画出来；131b510 改为 decode 完成并过两帧后再显示，已修复。
- 功能回归（`measure/preview3/`）：idle、提示、Tab 顺序、擦洗到第 121 帧并解除 pin、倒放回第 0 帧、回访与跳过都定位 #about、跳过后上滚重新进入擦洗、移动端、reduced-motion、低内存 720、1080 失败降到 720、全部失败显示定格图、autoplay 被拒显示播放按钮，全部通过。擦洗平均 138fps，p95 帧耗时 8.3ms，超过 34ms 的帧 4 个；解码内存峰值（应用计数器算出，非 DevTools 实测）166.1MiB。
- 网络说明：preview 所在网络 TTFB 约 630ms、吞吐约 2–8Mbps，属于偏慢网络；本地限速对照的 TTFB 只计 CDP 延迟，不代表 CDN 情况。
