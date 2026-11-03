# 阶段 3 验收（关于我 / 能力 / 联系）

分支 `feat/stage-3-about`（基于 425fb14）。预览：https://97515607.ai-trainer-site.pages.dev（提交 139b01f），分支预览 https://feat-stage-3-about.ai-trainer-site.pages.dev。
测量脚本 `measure/p3.mjs`（puppeteer-core，有头 Chrome）。结果：`measure/p3-preview-windows.json`（Windows，RTX 3060 Laptop，Chrome 156.0.8078.80，对预览 URL）与 `measure/p3-box.json`（Linux 软件渲染，本地 out/）。

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 1 | 三个区段按占位文案实现，文案集中在 `content/site.ts` | ✅ | About/Skills/Contact/Nav/Footer 均从 `SITE` 读取；`shots/bp*-{about,skills,contact}.jpg` |
| 2 | 「关于我」文字叠在机器人两侧，移动端改为上下排列 | ✅ | 1024/1440：leftOfFigure=rightOfFigure=true；360/768：figureAboveText=true，无横向溢出 |
| 3 | HUD 卡片、按钮、标签、导航、自定义光标、磁吸悬停完成 | ✅ | 磁吸：半径内 `translate(12px, 0px)`，移出复位；光标悬停 data-hover=1；360 菜单展开 `shots/bp360-menu-open.jpg` |
| 4 | 3D、磁吸、光标仅在 ≥1024 + hover/fine + 未 reduced-motion 时启用 | ✅ | 1440/1024 fine：开启；1023、768、1440 reduced-motion、1440 触屏：backdrop=off、无 GLB 请求、无光标、无磁吸 |
| 5 | 「关于我」主体为视频末帧机器人定格图 | ✅ | 中央 figure 使用 INTRO_MEDIA.still（阶段 2 末帧） |
| 6 | 3D 背景装饰渐入、随鼠标转头、靠近有反应、懒加载、按条件开关 | ✅ | scrollY=0：0 个 GLB 请求，state=idle；滚到 About 后新增 5 个 JS chunk + robot.v1.glb，state=ready；`shots/3d-head-left-right-near.jpg`（左/右转头，靠近时面罩增亮）；WebGL 不可用时降级为不渲染，页面不崩溃 |
| 7 | 3D 模型符合第 7 节：CC0/CC-BY 记入 licenses.md；GLB ≤1.5MB、≤30k 面；≥3 候选 | ✅ | CC0 1.0（`../licenses.md`）；185,832 B，3,237 三角面，0 贴图；8 个候选见 `candidates.md` |
| v4 | 桌面 ≥55fps | ✅ | Windows 预览 fpsSamples [165, 165, 165, 165, 165.1]（受 165Hz 显示器刷新率限制） |
| 8 | `--text-dim` #8B949E，在 --panel 与 --bg 上 ≥4.5:1 | ✅ | 5.38:1（panel）、6.33:1（bg） |
| 9 | 360 / 768 / 1024 / 1440 四个断点显示正常 | ✅ | 四个宽度均无横向溢出、无控制台错误；能力卡 1/2/4/4 列 |

lint / tsc / prettier / build 全部通过；首屏 JS 111 kB，three.js 不在首屏包内。
