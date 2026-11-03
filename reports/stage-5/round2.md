# 阶段 5 第二轮：移动端 LCP、联系区、关于区

- 代码提交：`125c814`。预览：https://d3b6a0a8.ai-trainer-site.pages.dev ，别名 feat-stage-5-polish.ai-trainer-site.pages.dev
- 测量时间：2026-11-03 约 21:45–22:05（北京时间）
- 环境与上轮相同：Chrome/156.0.8078.80，Lighthouse 12.8.2（无痕、禁用扩展、临时 profile）

## 1. 移动端 LCP ✅
- 字体处理：
  - 去掉 next/font/google 的 Noto Sans SC。`scripts/subset-fonts.mjs` 作为 `prebuild` 执行：源字体是固定 commit 的 google/fonts NotoSansSC[wght].ttf，并校验 sha256；字重范围 400–700。
  - 生成两个带内容哈希的子集：
    - `noto-sc-first.*.woff2`：ASCII 加首屏用到的中文（跳转链接、导航、开场），158 个字符，58.6KB，**只预加载这一个**。
    - `noto-sc-rest.*.woff2`：站内其余中文，394 个字符，101KB，不预加载，用到时才下载。
  - 两个字体都设了 `font-display: swap`，后面接系统字体栈（PingFang SC、Hiragino Sans GB、Microsoft YaHei、Noto Sans CJK SC、system-ui）。
  - 原来首屏要下载约 700KB（12 个分片），现在合计约 160KB。
- 字符覆盖：导出的全部 HTML 里一共用到 429 个宽字符，两个子集全部覆盖，缺失为 0。"Trotter" 是拉丁字母，包含在 first 子集里（round2/font-coverage.json）。
- 构建可复现：Windows 和盒子各自构建，产出的子集哈希一致（74979e78 / b0ad2eeb）。
- 移动端 Lighthouse（Moto G Power 模拟 + 4G 限速）3 次：

| 次 | LCP | CLS | 性能 |
|---|---|---|---|
| 1 | 2957ms | 0 | 92 |
| 2 | 1949ms | 0 | 99 |
| 3 | 1585ms | 0 | 99 |
| **中位数** | **1949ms** | **0** | **99** |

- 桌面：LCP 中位数 705ms，CLS 0，性能 98。四项中只有 SEO 为 69，原因仍是预览域名的 noindex 头，与上轮相同。
- 首屏 JS（gzip）：165.4KB，不超过 180KB。真实交互 INP：开场 40ms，滑轨 32ms，导航 24ms。

## 2. 联系区 ✅
- `lib/sections.ts` 中 `CONTACT_VISIBLE = shown(email) || shown(social)`。为 false 时：联系区整段不渲染，导航里去掉"联系"，关于区的"联系我"按钮也隐藏。
- 预览实测（round2/navcheck.json）：
  - 导航只剩 开场 / 关于我 / 能力 / 作品集。
  - `#contact` 不存在，没有指向不存在锚点的链接，mailto 链接为 0。
  - 导航高亮：滚到关于、能力、作品集时分别高亮对应项；滚到页面底部时高亮作品集。
  - Tab 顺序：跳转链接 → 导航 4 项 → 开场 → 查看能力 → 滑轨 → 4 张作品卡 → 回到开头，每一项都有 focus-visible。
- 自动恢复验证：在盒子上临时把 email 改成测试地址并构建，联系区 1 个、导航"联系"1 个、mailto 出现。改回后重新构建，三项都是 0。临时改动已还原，没有提交。

## 3. 关于区 ✅
- 占位规则改为：值为空，或含任意 `[..]` 标记，都在生产构建中不渲染。
- 姓名按 Monica 的要求填为 **Trotter**，正常显示："你好，我是 Trotter，一名 AI 训练师。……"
- ID 仍为 `[ID]`，眉标只显示 "AI TRAINER"。临时填入测试 ID 后构建，会显示 "T-01 AI TRAINER"。
- 预览页 main 区域里除了示例作品的编号 [01]–[04]，没有其他 `[..]`。截图 round2/about-trotter.png。

## 4. 检查 ✅
在 Windows 上 lint、tsc、prettier、build 全部通过（build 中会先跑 prebuild 生成字体子集）。

## 偏差
- 移动端第 1 次 LCP 为 2957ms，高于 2.5s；中位数达标。
- 拆成 first 和 rest 两个子集，没有只用系统字体。
- 构建时需要从 GitHub 下载 17MB 的源字体（固定 commit 并校验 sha256，本地会缓存）。Cloudflare 构建已经实测成功。
