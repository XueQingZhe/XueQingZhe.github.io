# 水庭氛围与作品交互细化 · 2026-09-20

## 范围

本次修改本地 `F:\MyWeb\astro-site`。修改前的 src/docs 已存于 `F:\MyWeb\backups\before-water-atmosphere-v7-20260920`。沿用水庭入口和原有栏目结构。

## 缩放闪烁

`renderer.setSize` / `setPixelRatio` 会清空 WebGL drawing buffer；原先 ResizeObserver 只调度下一帧，30 Hz 绘制节流下会将空画布交给合成器。改为尺寸、投影更新后，在同一 ResizeObserver 回调中立即补画，再恢复正常调度。保留离屏、隐藏、零尺寸和暂停的渲染条件，没有把常态帧率拉高。

复现使用五个 RGBA 采样点及逐帧状态，同时检查标题/入口透明度。修前每轮 35 个实际尺寸回调均采到黑画布；修后运行和暂停均为 0。额外以默认 WebGL 上下文截取 12 张实际合成图，96 个采样格全部非黑；跨 700px 像素比断点的往返缩放亦无黑帧、无 ResizeObserver 或 JS 错误。离屏缩放不增加绘制次数。

## 场景与页边

- 删除拱门内单独悬空的一簇草。
- 悬垂花串从 9 串减为 5 串，缩小轮廓，位置取自实际枝条路径；枝条接回右侧树冠。夜间压低花串亮度/透明度，减少自发光贴片感。
- 首页新增轻暗角，位于文字和交互控件下方。
- 新增 MarginGarden，在作品、手记、研习、关于及文章详情共享完整日夜插图的柔和边缘裁切。使用用户已提供的 `seasons/day/complete.webp` 和 `seasons/night/complete.webp`，不再将拆开的角色/背景拼接。页边图逐渐消隐到内容中央。
- 阅读状态透明度更低；日间暖纸、夜间靛蓝与微弱灯光。边角叠加淡 SVG 水纹、拱门线稿和低速微光。装饰不参与点击、搜索索引和无障碍阅读。900px 以下关闭大背景图和光点，保留轻暗角。
- 暂停及减少动态偏好会停止新增持续动效。

## 作品与文字

- 图框随指针轻微转动，角度限定在 ±1.65°；封面仍完整 contain 展示。
- 局部反光、四角取景线和边界内的查看提示随鼠标出现。说明文字和标题的位置保持固定。
- 编号、字距与标题的色带揭示形成档案式排版。WORK 标题增加鼠标局部照亮的描边重影。
- 普通链接行为、系统指针、键盘聚焦、筛选/深链接与作品媒体保留。触屏使用常显阅读入口；暂停/减少动态时不做图框旋转。
- 连续缩放时，查看提示原先保存的像素坐标可能越出窄卡片，即便透明也会产生横向滚动。改为比例坐标并在 CSS 中限定范围，直接约束提示的位置。

## 研究参考

阅读官方页面，按水庭风格自行实现；未引入其整套演示代码或额外动画库。

- [Codrops：Design Finds — Detail Hovers on Images](https://tympanus.net/codrops/2024/05/06/design-finds-detail-hovers-on-images/)：悬停时补充作品细节。
- [Codrops：Recreating the Gradient Mask Hover Effect from Evervault](https://tympanus.net/codrops/2023/05/17/recreating-the-gradient-mask-hover-effect-from-evervault/)：由 CSS 变量驱动的局部渐变遮罩；仅交互时调度动画。
- [Codrops：Hover Animations for Terminal-like Typography](https://tympanus.net/codrops/2024/06/19/hover-animations-for-terminal-like-typography/)：文字层级与悬停揭示的参考。最终没有使用频繁字符乱序，以保持长文阅读稳定。
- [GSAP SplitText](https://gsap.com/docs/v3/Plugins/SplitText/)：字体加载、无障碍标签与拆字动画生命周期。

## 验证记录

- `work/resize-before-results.json`、`resize-after-results.json`、`resize-default-results.json`、`resize-breakpoint-after-results.json`：闪烁复现与回归证据。
- `work/margin-garden-check.json`：日夜背景、窄屏、装饰隔离与暂停状态。
- `work/check-work-gallery.mjs`：作品交互、焦点、触屏与减少动态验证。
- 最终构建的作品页按 1920→1440→900→700→390→320 连续缩放，所有宽度横向溢出为 0；日夜切换和阅读背景验证无页面错误。
- 静态构建和 `npm run check:site`：80 个页面、70 个搜索页面，60 条旧链接检查；资源引用与数学渲染无错误。
