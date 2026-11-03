# 第三方素材许可证

| 素材 | 用途 | 来源 URL | 作者 | 许可证 | 下载日期 | 修改 |
|---|---|---|---|---|---|---|
| Animated Robot（**已弃用**，2026-11-03 阶段 3 返工起不再随站点发布） | 曾用于「关于我」背景 3D 装饰 `public/media/3d/robot.v1.glb`（文件已从仓库与构建产物中移除） | https://poly.pizza/m/QCm7qe9uNJ （GLB 经 Poly Pizza 官方下载 static.poly.pizza） | Quaternius（https://quaternius.com） | CC0 1.0 公共领域 https://creativecommons.org/publicdomain/zero/1.0/ | 2026-11-03 | 仅保留 Robot_Idle 动画；prune/dedup/weld + meshopt 压缩；运行时重新着色为站点色板 |

- 原始文件 SHA256：`54f1a6999cca701cdc2f8fb67bcd9a283e1154cb80cac356f031bed7c2e74cbe`（401,024 B）
- 处理后：185,832 B，3,237 三角面，0 张贴图
- CC0 无署名义务；弃用后页脚署名已移除（`content/site.ts` → `footer.credit` 为空）。
- 如需切回 GLB：`content/site.ts` → `robot.mode = 'glb'`（默认 `'particles'`），并先恢复该文件。

当前「关于我」背景为粒子剪影 `public/media/fx/mech-points.v1.bin`，由本站自有素材（阶段 2 开场末帧 `intro-still.v1.webp`）经 `reports/stage-3/measure/sample-mech-points.py` 采样生成，无第三方素材。
