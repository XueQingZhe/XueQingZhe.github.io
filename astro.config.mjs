// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkObsidian } from './src/plugins/remark-obsidian.mjs';
import { rehypeMedia, remarkRawVideo, remarkHeadingLevels } from "./src/plugins/rehype-media.mjs";

export default defineConfig({
  site: "https://xueqingzhe.github.io",
  // 用户站点部署在域名根路径，所以 base 留空。
  // 如果先部署到 Cloudflare Pages 预览，也不用改。
  integrations: [mdx(), sitemap()],

  // 打包产物目录名。默认是 _astro，下划线开头在某些托管上是保留前缀
  // （发布预览时就被拒了），换个普通名字，部署到哪里都不会踩。
  build: { assets: "bundle" },

  // 老站 URL 保命用 —— 由 tools/migrate_projects.py 生成。
  // 老的 /projects/N_project/ 全部指到新位置；10/11/12 指向笔记，
  // 因为正文实际落在那儿（作品页只是个汇总入口）。
  redirects: {
    "/blog/": "/notes/",
    "/projects/": "/work/",
    "/blog/2025/": "/notes/#year-2025",
    "/blog/2026/": "/notes/#year-2026",
    "/blog/category/tamonth01/": "/notes/",
    "/blog/category/tamonth02/": "/notes/",
    "/blog/category/tamonth04/": "/notes/",
    "/blog/category/学习笔记/": "/notes/",
    "/blog/tag/math/": "/notes/",
    "/blog/tag/rendering/": "/notes/",
    "/blog/tag/shader/": "/notes/",
    "/blog/tag/unity/": "/notes/",
    "/blog/tag/学习/": "/notes/",
    "/projects/10_project/": "/notes/ue5-translucency-sort/",
    "/projects/11_project/": "/notes/ue5-per-material-stencil/",
    "/projects/12_project/": "/notes/ue5-overlay-material/",
    "/projects/13_project/": "/work/granblue-character/",
    "/projects/14_project/": "/notes/urp-bloom/",
    "/projects/1_project/": "/work/zzz-xingjianya/",
    "/projects/2_project/": "/work/urp-pbr/",
    "/projects/3_project/": "/work/zzz-jufufu/",
    "/projects/4_project/": "/work/urp-outline-feature/",
    "/projects/5_project/": "/work/blender-ta-tools/",
    "/projects/6_project/": "/work/early-works/",
    "/projects/7_project/": "/work/early-works/",
    "/projects/8_project/": "/work/early-works/",
    "/projects/9_project/": "/work/early-works/",
  },

  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" }, wrap: false },
    // 正文里的图统一成 <figure>：构建期读真实像素尺寸算好展示宽高，
    // 并打上 data-zoom 交给灯箱。见 src/plugins/rehype-media.mjs。
    remarkPlugins: [remarkMath, remarkObsidian, remarkHeadingLevels, remarkRawVideo],
    rehypePlugins: [rehypeMedia, [rehypeKatex, {strict: false}]],
  },
});
