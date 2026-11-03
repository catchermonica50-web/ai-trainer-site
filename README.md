# AI Trainer Site

Next.js 15 App Router 静态导出项目，部署目标为 Cloudflare Pages。

## 本地运行

```powershell
npm ci
npm run dev
npm run check
npm run build
```

构建产物在 `out/`，包含根目录 `404.html`。Node 版本见 `.node-version`。
目前仅完成阶段 1 的页面骨架和令牌；开场视频、完整区段、交互及 SEO 验收按阶段 2–5 实施。
原视频尚未复制或处理。

## 目录

```text
app/                   布局、首页、work/[slug]、404、sitemap、robots
components/sections/   Intro、About、Skills、Work、Contact 骨架
components/ui/         阶段 3–4 实现 UI 组件
components/fx/         阶段 2–4 实现特效组件
content/               集中文案及作品数据
lib/                   动效令牌、媒体查询 hooks
styles/globals.css     Tailwind 4、设计令牌及基础样式
public/media/intro/    阶段 2 存放版本化处理素材
scripts/               工程脚本；阶段 2 增加转码与拆帧脚本
reports/               验收命令证据
```

## Cloudflare Pages（需用户登录授权）

1. 在 GitHub 新建空仓库，取得仓库 URL；推送本项目 `main`。
2. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git。
3. 选择 GitHub 并由用户完成授权，然后选择上述仓库。
4. 生产分支 `main`，预设 `Next.js (Static HTML Export)`，构建 `npm run build`，输出 `out`。
5. 环境变量 `NODE_VERSION=24.15.0`；`NEXT_PUBLIC_SITE_URL=https://<项目名>.pages.dev`。
   预览环境也需设置 URL；URL 尚未确定时本地 metadata/sitemap 使用 localhost。
6. Settings → Builds & deployments → Branch control：允许预览分支，并启用 PR 预览。
7. 创建一个带可见小改动的 PR，记录预览链接，确认后合并，验证 main 自动部署。
8. 至少保留两个成功生产版本；Deployments → 旧版本菜单 → Rollback to this deployment。
   检查线上内容，再回滚至最新稳定版本，记录两个部署 ID 和结果。

GitHub Actions 只运行质量检查与构建，Cloudflare Git 集成负责自动部署，不需要仓库保存 Cloudflare 密钥。
当前已配置远程仓库 `https://github.com/catchermonica50-web/ai-trainer-site.git`，
尚未提交、推送或取得部署链接，不能将以上配置说明视作部署、PR 预览或回滚已验证。
当前执行环境不允许写 `.git`（`index.lock: Permission denied`），首次提交需用户在本机终端执行。

## 简化选择与约定

- 不启用可选 Lenis，后续优先原生滚动 + ScrollTrigger。
- 字体由 `next/font/google` 构建时下载并自托管，`display: swap`。
  拉丁字体按 latin 子集，Noto Sans SC 使用 Google 提供的分片中文 unicode-range。
- UI/fx 目录保留 `.gitkeep`，不提前实现后续阶段组件。
- 动效 JS 值统一使用 `lib/motion.ts`，增强特效共用该文件的唯一媒体查询。
- 媒体现用短缓存；阶段 2 产出确切版本文件名后逐条追加 immutable 规则。
- ESLint 10 + TypeScript ESLint + Next 15 规则插件；避免已被弃用的 ESLint 9。
- 依赖更新需重新审查版本，脚本 `resolve-versions.mjs` 仅用于显式重新选版，不在构建中执行。

## 官方参考

- [Next.js 支持策略](https://nextjs.org/support-policy)
- [Pages 静态 Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [回滚](https://developers.cloudflare.com/pages/configuration/rollbacks/)
