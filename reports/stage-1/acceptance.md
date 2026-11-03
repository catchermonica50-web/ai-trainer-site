# 阶段 1 验收记录

状态：本地实现完成；Git 提交和 Cloudflare 管线尚未完成。未进入阶段 2。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| Next 15 + TS strict + Tailwind 4 静态导出 | 通过 | build.log，退出码 0，9 个静态页面生成 |
| 目录结构 | 通过（骨架） | app、sections、ui、fx、content、lib、styles、media/intro、scripts 均已创建 |
| 设计与动效令牌 | 通过 | styles/globals.css、lib/motion.ts；四字体 next/font 配置在 app/layout.tsx |
| 稳定精确版本和锁文件 | 部分完成 | versions.md、package-lock.json 已生成；Git 写入被禁止，锁文件尚未提交 |
| main 自动部署 Pages | 未完成 | 仅已配置 origin；无远程推送、账号授权与线上链接证据 |
| PR 预览和回滚 | 未完成 | 尚无 Cloudflare 项目与生产部署 |
| ESLint / Prettier / tsc | 通过 | checks.log，三个检查退出码 0 |

## 简化与限制

- 仅实现基础静态页面骨架；UI/fx 具体组件按阶段 2–4 实现，目录以 .gitkeep 保留。
- 可选 Lenis 暂不引入。
- 本地站点 URL 默认 localhost；部署时设 NEXT_PUBLIC_SITE_URL。
- Next 15 官方维护期延长至 2027-01-31，见 https://nextjs.org/support-policy 。
- 精确版本取自 npm registry 各指定主版本中未标 deprecated 的稳定版，无预发布版本。
- ESLint 10 配合 Next 15 规则插件；未使用只接受旧 ESLint 的 eslint-config-next。
- Next 内置 PostCSS 同主版本覆盖到 8.5.32，已消除高危通告。
- npm audit 仍有 12 项中危报告，关联 minimatch 的开发工具依赖链，详见 audit.log。
- 所有手写源码文件不超过 200 行；自动生成锁文件、日志不计入此约束。
- 尚未复制或修改原素材。1080p 视频与开场交互属于阶段 2。

## 用户操作

在本机 PowerShell 中提交推送（执行环境无法写入 .git）：

```powershell
Set-Location D:\Projects\ai-trainer-site
git add .
git commit -m "chore: scaffold static AI trainer site and design tokens"
git push -u origin main
```

如弹出 GitHub 登录，由用户完成。随后登录 Cloudflare Dashboard，
Workers & Pages → Create application → Pages → Connect to Git，授权 GitHub 并选择 ai-trainer-site。
设置 main、npm run build、out、NODE_VERSION=24.15.0；取得 pages.dev 地址后设置
NEXT_PUBLIC_SITE_URL 为该地址并重新部署。
之后继续在阶段 1 验证 PR 预览及回滚，验收确认前不进入阶段 2。
