# 吟处雪轻遮 · 水亭

Astro 静态个人网站：水亭入口、日夜光影、作品画廊、技术文章、系统研习与全文搜索。首页使用 Three.js，内页使用轻量环境动效，文章支持专注阅读与本地阅读进度。

## 本地启动

需要 Node.js 22 或更新的受支持版本。首次使用运行 `npm ci`，之后双击 `启动网站.cmd` 或运行 `npm start`。

- 网站预览：<http://127.0.0.1:4325/>
- 文章发布管理器：<http://127.0.0.1:4875/>
- 修改网站样式时，可单独运行 `npm run dev` 使用 Astro 热更新；预览生产版本先运行 `npm run build`。

启动器会验证端口上确实是这个网站的服务。升级工具后如果提示“旧版服务占用”，关闭原预览窗口再启动。默认仅监听本机回环地址。

## 文章发布

发布管理器从本地笔记库读取文章，默认零选择。操作顺序：选择笔记 → 分析 → 逐项审核附件 → 生成待预览副本 → 检查正文 → 确认写入本地网站。

写入时会构建 Astro 和 Pagefind，再一起切换内容、附件、搜索索引和网站预览；构建或切换失败会回滚。源笔记不会被编辑。撤回文章需要取消选择并完成同样的审核流程。文章移动后保持公开地址；移动同时改写时可手动重新关联。

站点副本分别位于 `content/published/notes/` 和 `public/published-assets/`。私有选择、缓存、暂存及备份在网站外的 `../private-publisher/`，不能放进 Git。跨笔记引用只允许已选文章，附件必须明确审核。动态 Dataview、脚本和不支持的 HTML 会阻止生成并提示处理。

可以通过 `PUBLISHER_VAULT`、`PUBLISHER_STATE`、`PUBLISHER_SITE` 指定本地路径；`SITE_PORT` 与 `PUBLISHER_PORT` 调整预览和管理端口。独立启动管理器时，`PUBLISHER_PREVIEW_URL` 控制预览链接。视频转码需要本地 FFmpeg，未安装时可保留原件。

## GitHub Pages

正式域名：<https://xueqingzhe.github.io/>。构建站点根路径，不添加仓库名作为 base。

`.github/workflows/deploy.yml` 在 PR 上运行检查，更新 `main` 后构建并将 `dist/` 发布到 `gh-pages`。沿用原站的 Pages 分支配置：`Deploy from a branch` → `gh-pages` → `/ (root)`。`.nojekyll` 已包含，避免重复执行 Jekyll。

本地管理器只生成网站副本，**不会自动提交或推送 Git**。正式源仓库更新后，提交选定文章、附件及网站代码；推送 `main` 才触发公开部署。不要执行旧版 Obsidian 同步工具，也不要把整个私有笔记库复制到仓库。

## 验证

```sh
npm test
npm run test:integration
npm run build
npm run check:site
npm run check:release
```

可选浏览器测试：安装 Playwright Chromium 后运行 `npm run test:ui`。Windows 已安装 Edge 时可设置 `PUBLISHER_TEST_BROWSER=msedge`。视频测试可设置 `PUBLISHER_TEST_FFMPEG` 指向 FFmpeg。所有测试使用独立合成笔记，不读取真实笔记库。

`check:site` 检查旧文章链接、站内资源和数学公式；`check:release` 检查公开产物边界、站点大小及 GitHub 单文件限制。

## 目录

- `src/`：页面、组件、样式、场景脚本及已迁移文章。
- `public/`：会直接公开的图片、字体、媒体与站点文件。
- `content/published/notes/`：明确选定的笔记副本。
- `tools/publisher/`：仅在本机运行的发布工具。
- `docs/`：迁移记录、设计说明和检查结果。
- `work/`：本地试验与临时素材，已忽略。
- `dist/`：构建结果，交给部署工作流，不手动加入源分支。
