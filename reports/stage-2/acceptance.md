# 阶段 2 验收记录

- 超分：Real-ESRGAN ncnn-vulkan v0.2.5.0（官方 release，zip SHA256 ABC02804E17982A3BE33675E4D471E91EA374E65B70167ABC09E31ACB412802D），模型 realesrgan-x4plus，-s 4 -t 0 -g 1 -j 1:2:2，再 lanczos 缩到 1920×1080。
- 耗时：2.mp4 121 帧 545.0s；0.mp4 122 帧 549.0s；编码 71.5s。
- 对比图：reports/stage-2/upscale/（first/mid/last 并排 + 放大）；flicker.txt：相邻帧平均亮度差 x4plus/lanczos = 1.03（2.mp4）、0.994（0.mp4）。
- 实测：reports/stage-2/measure/{local,preview,preview2}/measure.json + 截图；脚本 measure.mjs（需 CHROME_PATH 环境变量，在仓库外安装 puppeteer-core 后运行）。
- 已知问题：冷 CDN/慢网下快速滚动时，未下载的帧不会显示，画面停在最后一张已加载的帧（preview2：一直停在第 15 帧，等加载完成后才继续）。preview 上的 LCP 是 H1，不是海报图。