# 阶段 2 第 9 项 · 内存修复报告

- 修复提交：`67ad5f3` fix(stage-2): bound decoded frames and keep scrub canvas CPU-backed（只改 `lib/intro/FrameStore.ts`、`lib/intro/useScrub.ts`）
- 预览：https://1ebf15fa.ai-trainer-site.pages.dev （分支别名 feat-stage-4-work.ai-trainer-site.pages.dev）
- 测量时间：2026-11-03 约 20:42（北京时间），DESKTOP-AMTV7VQ，Chrome/156.0.8078.80，puppeteer 有界面 + 临时 profile（没有动用户自己的 Chrome）

## 改动
1. 2D 画布改为 `getContext('2d', { alpha: false, willReadFrequently: true })`，走 CPU 栅格化，不让 GPU 进程为每个绘制过的 ImageBitmap 缓存纹理（这是上次 GPU 进程 +471 MiB 的根因假设）。
2. 解码窗口半径从 10 改为 8：同时最多 17 帧，外加 1 帧兜底。解码并发上限 3，从最近的帧开始解码。
3. `release()`：调用 `bitmap.close()` 并从 Map 删除。滑出窗口的帧、中途取消的帧、重复解码的帧和 dispose 时的帧都会经过这里。画布本身不持有任何帧引用（drawImage 后不保留）。没有 WebGL 纹理缓存（本路径不用 WebGL）。
4. 开发模式计数器 `DEV_LIVE` 由 `process.env.NODE_ENV !== 'production'` 控制，生产构建中会被移除。

## 验收
| # | 项 | 结果 | 证据 |
|---|---|---|---|
| 1 | 未关闭的解码帧任何时刻 ≤25 | ✅ | 在 `next dev` 下跑 scrub-check，计数器 peak=17，逐帧观察到的最大值=17（data/scrub-check-localhost.json）。生产构建 `out/` 中 grep `FrameStore] live` / `__frameStoreLive` / `decodedPeakMib` 的命中数为 0，预览页上 devCounter=null |
| 2 | 帧关闭后画布不再引用，缓存已释放 | ✅ | 见上面的 release 路径。预览测量中 GPU 进程在擦洗后回落 |
| 3 | 内存：峰值−前 ≤200MiB，10s 后 ≤前+200MiB | ✅（数值）/ ❌（任务管理器截图） | 见下表 |
| 4 | 快速来回擦洗无空白帧，≥55fps | ✅ | 预览：514 个采样中空白帧 0、未绘制 0；fpsMean 111.9，fpsP5 64.1；最大帧差 8（显示最近的已解码帧） |
| 5 | lint / tsc / prettier / build | ✅ | Windows 上全部 exit 0；`/` 的 First Load JS 119 kB |

### 内存（预览，MiB；渲染进程 + GPU 进程合计，取各 PID 在窗口内的最大值求和）
| 指标 | 擦洗前 | 峰值 | 擦洗后 10s | 峰值−前 | 10s−前 |
|---|---|---|---|---|---|
| 私有内存（≈内存占用空间） | 687.3 | 785.4 | 635.7 | +98.1 | −51.6 |
| 共享 GPU 内存 | 319.1 | 386.4 | 334.7 | +67.3 | +15.6 |
| 专用 GPU 内存 | 0 | 0 | 0 | 0 | 0 |

单独看 GPU 进程：私有内存 395.4→493.3→415.8，共享 GPU 319.1→386.4→334.7。主渲染进程：私有内存 234.9→235.1→170.4。
对比上次在生产环境的数据：GPU 私有 +471.4、共享 GPU +504.9。
测量方法与上次相同（`reports/stage-4/measure/mem.mjs`）：唯一的改动是"擦洗后"的取样窗口改为擦洗结束后 9.5–11 秒。原始数据在 data/mem-samples.csv。

## 偏差
- 任务管理器截图 ❌：脚本发送 Shift+Esc 后截屏，但 Windows 当时处于锁屏，截到的是锁屏画面（`<out-dir>/stage4-memfix/taskmanager-attempt-LOCKSCREEN.png`，未提交到仓库）。数值证据来自 Get-Process 和 Windows GPU 性能计数器，与上次方法一致。
- 盒子上的 Chrome 被判定为 mobile 模式，无法在盒子上验证，所有测量都在 Windows 上完成。
- 合计值是各 PID 在窗口内最大值之和（不同 PID 的峰值不一定在同一时刻），结果偏保守。
