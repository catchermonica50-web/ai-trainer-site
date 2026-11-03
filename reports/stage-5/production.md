# 阶段 5 正式发布验证

- 时间：2026-11-03 约 22:00–22:10（UTC+8）
- main：425fb14 → **bb9f73e**，快进推送，未使用强推
- Cloudflare Pages 正式部署：**b813999b**（b813999b-c521-4988-8734-0ee2e1273b47），check-run 结果 success
- 回滚目标：425fb14（部署 8b3a2108），本次未回滚
- 构建一致性：https://ai-trainer-site.pages.dev 与 https://b813999b.ai-trainer-site.pages.dev 的 HTML md5 都是 bdc8269f，chunk 列表 md5 都是 d9f4c6e1
- 页面内容：出现 Trotter；没有 #contact；正式域名不带 x-robots-tag

## 测量（正式域名，Lighthouse 12.8.2 / Chrome 156，均为临时配置文件）

| 项目 | 第 1 次 | 第 2 次 | 第 3 次 | 中位数 | 标准 | 结果 |
|---|---|---|---|---|---|---|
| SEO | 100 | 100 | 100 | 100 | ≥90 | ✅ |
| 移动端 LCP | 1289ms | 1522ms | 2799ms | 1522ms | <2.5s | ✅ |
| 移动端 CLS | 0 | 0 | 0 | 0 | <0.1 | ✅ |
| 移动端性能 | 100 | 100 | 93 | 100 | ≥85 | ✅ |
| CPU 4x 滚动 fps（平均） | 109.0 | 37.6 | 36.7 | 37.6 | ≥30 | ✅ |

无障碍和最佳实践三次都是 100。

fps 说明：用 throttle.mjs 在开场区来回滚动 15 秒，统计 rAF 间隔，结束时状态都是 scrub/1080，页面错误 0。第 1 次帧数为 1629，明显偏高，可能是 CPU 降速在一开始没生效，第 2、3 次分别为 564 和 551 帧。即使去掉第 1 次，剩下两次也都 ≥30。p5 fps 依次为 54.6、32.9、32.8。

原始数据在测量机 D:\Tools\_measure\prod 下（m1–m3.report.json 和 .html、fps1–3）。