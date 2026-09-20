/**
 * 正文媒体统一化 —— 构建期跑一次，运行时零成本。
 *
 * 解决的是老站最难受的一件事：正文里的图片是从 Obsidian 直接搬过来的，
 * 有 2560×1440 的引擎截图，也有 180×40 的 Inspector 局部图，
 * 浏览器按原始尺寸铺开，一屏之内忽大忽小；而且 <img> 没有宽高，
 * 图没加载完时高度是 0，加载完猛地把下文顶下去（CLS）。
 *
 * 这里做三件事：
 *   1. 构建时读真实像素尺寸（image-size 只读文件头，不解码整张图）
 *   2. 按「不放大、不超过阅读列宽、不超过一屏高」换算出展示尺寸，
 *      写成 figure 的 max-width —— 版面因此是齐的，小图也不会被拉糊
 *   3. 宽高写进 <img> 属性，占位空间在加载前就留好了
 *
 * 顺带把 <img> 包成 <figure>，alt 当图注（"Pasted image 2026…" 这种
 * Obsidian 自动名不当图注），并打上 data-zoom 交给灯箱。
 */
import { visit } from "unist-util-visit";
import { imageSize } from "image-size";
import fs from "node:fs";
import path from "node:path";

/** 展示上限：宽度跟阅读列对齐，高度不超过一屏的大半 */
const MAX_W = 720;
const MAX_H = 620;

/** Obsidian / 截图工具的自动文件名，不配当图注 */
const JUNK_ALT =
  /^(pasted[\s_-]*image|image|img|screenshot|未命名|snipaste|qq截图|微信截图)[\s_\-0-9]*$/i;

const PUBLIC = path.resolve("public");
const cache = new Map();

function probe(src) {
  if (cache.has(src)) return cache.get(src);
  let out = null;
  try {
    // 只认站内绝对路径；外链拿不到尺寸，走未知分支
    if (src.startsWith("/") && !src.startsWith("//")) {
      const rel = decodeURI(src.split("?")[0].split("#")[0]).replace(/^\/+/, "");
      const file = path.join(PUBLIC, rel);
      // 防目录穿越
      if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file)) {
        const { width, height } = imageSize(fs.readFileSync(file));
        if (width && height) out = { w: width, h: height };
      }
    }
  } catch {
    out = null;
  }
  cache.set(src, out);
  return out;
}

/** 等比缩到框内，只缩不放 */
function fit(w, h) {
  const s = Math.min(1, MAX_W / w, MAX_H / h);
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

const el = (tagName, properties, children = []) => ({
  type: "element",
  tagName,
  properties,
  children,
});

export function rehypeMedia() {
  return (tree) => {
    /* 视频：老站正文里是手写的 <video autoplay loop muted>。
       一页挂三四段录屏时全部自动播，既费流量也看不过来；
       这里统一收进同一套画框，改成「进视口才播、离开就停」，
       并补上 controls，想逐帧看的人能自己拖。 */
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "video" || !parent || index === null) return;
      if (parent.type === "element" && parent.tagName === "figure") return;

      const auto = node.properties?.autoPlay || node.properties?.autoplay;
      node.properties = {
        ...node.properties,
        autoPlay: false,
        controls: true,
        muted: true,
        playsInline: true,
        loop: node.properties?.loop ?? true,
        preload: "none",
        width: null,
        height: null,
        // 原来写了 autoplay 的，改成进视口才播
        ...(auto ? { "data-inview": "" } : {}),
      };

      parent.children[index] = el("figure", { className: ["fig", "fig--video"] }, [
        el("div", { className: ["vbox"] }, [node]),
      ]);
    });

    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "img" || !parent || index === null) return;
      // 已经在 figure 里的（比如 MDX 手写的）不重复包；
      // 包在链接里的也不包 —— figure 塞进 <a> 同样是非法嵌套
      if (parent.type === "element" && (parent.tagName === "figure" || parent.tagName === "a"))
        return;

      const src = String(node.properties?.src ?? "");
      if (!src) return;
      const alt = String(node.properties?.alt ?? "").trim();

      // ![](xxx.mp4) 这种写法在 Obsidian 里能播，在网页上是一张裂图
      if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) {
        parent.children[index] = el("figure", { className: ["fig", "fig--video"] }, [
          el("div", { className: ["vbox"] }, [
            el("video", {
              src,
              controls: true,
              muted: true,
              loop: true,
              playsInline: true,
              preload: "none",
              ...(src.startsWith('/published-assets/') && fs.existsSync(path.join(PUBLIC, src.replace(/^\//,'').replace(/\.[^.]+$/, '-poster.jpg'))) ? {poster:src.replace(/\.[^.]+$/, '-poster.jpg')} : {}),
              "data-inview": "",
            }),
          ]),
        ]);
        return;
      }

      const dim = probe(src);

      node.properties = {
        ...node.properties,
        loading: "lazy",
        decoding: "async",
        "data-zoom": "",
        // 图片默认不可聚焦，补一个 tabindex 才能用键盘 Enter 打开灯箱
        tabindex: "0",
        alt: alt || "",
      };

      const figProps = { className: ["fig"] };
      if (dim) {
        const d = fit(dim.w, dim.h);
        node.properties.width = dim.w;
        node.properties.height = dim.h;
        // 展示宽度锁死，版面就齐了；height 用 auto，比例交给宽高属性
        figProps.style = `max-width:${d.w}px`;
        // 小图（没被缩过）标出来，样式上不加满宽边框，免得一个小图占一整行
        if (d.w === dim.w && dim.w < 420) figProps.className.push("fig--sm");
      } else {
        figProps.className.push("fig--unknown");
      }

      const children = [el("span", { className: ["fig-box"] }, [node])];
      if (alt && !JUNK_ALT.test(alt) && !/\.(png|jpe?g|gif|webp|svg)$/i.test(alt)) {
        children.push(el("figcaption", {}, [{ type: "text", value: alt }]));
      }

      parent.children[index] = el("figure", figProps, children);
    });

    /* 图片在 <p> 里，而 <figure> 不能放进 <p>（非法嵌套，浏览器会就地把
       段落截断，后面的样式全乱）。老站的正文又普遍是
       「**一句说明**\n![](图)」这种文字和图挤在同一段的写法，
       所以不能只处理「整段只有图」的情况，得把段落拆开：
       文字各自成段，图提到段落外面。 */
    visit(tree, (node) => {
      if (!node.children?.length) return;
      let changed = false;
      const out = [];

      for (const c of node.children) {
        const isP = c.type === "element" && c.tagName === "p";
        const hasFig =
          isP && c.children.some((g) => g.type === "element" && g.tagName === "figure");
        if (!hasFig) {
          out.push(c);
          continue;
        }
        changed = true;

        let buf = [];
        const flush = () => {
          // 只剩空白的段落不要留，不然图和图之间会多出一段空行
          if (buf.some((g) => g.type !== "text" || g.value.trim())) {
            out.push(el("p", { ...c.properties }, buf));
          }
          buf = [];
        };
        for (const g of c.children) {
          if (g.type === "element" && g.tagName === "figure") {
            flush();
            out.push(g);
          } else {
            buf.push(g);
          }
        }
        flush();
      }

      if (changed) node.children = out;
    });
  };
}

export default rehypeMedia;

/* -------------------------------------------------------------------------
 * 正文里手写的 <video>（老站的写法）。
 *
 * 这些是 markdown 里的裸 HTML，Astro 默认不解析成节点、原样透传，
 * 所以上面的 rehype 阶段根本看不到它们。只能在更早的 remark 阶段
 * 对 html 节点做字符串级处理。
 *
 * 做三件事：套上和图片同一套画框；把 autoplay 换成「进视口才播」；
 * 补 controls，想逐帧比对的人能自己拖进度条。
 * ---------------------------------------------------------------------- */
const VIDEO_OPEN = /<video\b([^>]*)>/i;

/** 把 <video> 开头到 </video> 之间被 remark 切碎的 html 节点重新粘回一块 */
function joinVideoNodes(children) {
  const out = [];
  let buf = null;
  for (const c of children) {
    if (buf) {
      if (c.type === "html") {
        buf.value += "\n" + c.value;
        if (/<\/video>/i.test(c.value)) {
          out.push(buf);
          buf = null;
        }
        continue;
      }
      if (c.type === "text" && !c.value.trim()) continue;
      // 没等到 </video> 就遇上别的内容，放弃合并，原样还回去
      out.push(buf);
      buf = null;
      out.push(c);
      continue;
    }
    if (c.type === "html" && /<video\b/i.test(c.value) && !/<\/video>/i.test(c.value)) {
      buf = { ...c };
      continue;
    }
    out.push(c);
  }
  if (buf) out.push(buf);
  return out;
}

export function remarkRawVideo() {
  return (tree) => {
    /* remark 会把
         <video ...>
           <source ...>
         </video>
       切成三个相邻的 html 节点。先合并，否则包画框时只包住开标签，
       <source> 会被甩到 </figure> 外面，视频直接没源。 */
    visit(tree, (node) => {
      if (Array.isArray(node.children)) node.children = joinVideoNodes(node.children);
    });

    visit(tree, "html", (node) => {
      const v = String(node.value ?? "");
      if (!VIDEO_OPEN.test(v)) return;
      if (/class=["'][^"']*\bvbox\b/.test(v)) return;

      const out = v.replace(VIDEO_OPEN, (_m, attrs) => {
        let a = attrs
          .replace(/\s*\bautoplay\b(?:=(["']).*?\1)?/gi, " data-inview")
          .replace(/\s*\bcontrols\b(?:=(["']).*?\1)?/gi, "")
          .replace(/\s*\bwidth\s*=\s*(["']).*?\1/gi, "")
          .replace(/\s*\bheight\s*=\s*(["']).*?\1/gi, "")
          .trim();
        for (const need of ["controls", "playsinline", 'preload="none"']) {
          const key = need.split("=")[0];
          if (!new RegExp(`\\b${key}\\b`, "i").test(a)) a += ` ${need}`;
        }
        return `<video ${a.trim()}>`;
      });

      node.value = `<figure class="fig fig--video"><div class="vbox">${out}</div></figure>`;
    });
  };
}

/* -------------------------------------------------------------------------
 * 标题层级归一化。
 *
 * Obsidian 里笔记的标题是文件名，正文第一层小标题习惯直接写 `#`。
 * 搬到网页上，页面标题已经是 <h1> 了，正文再出现 h1 会有两个问题：
 *   · 一页两个 h1，文档大纲是坏的（SEO 和读屏都看这个）
 *   · 目录按 h2/h3 取，那一层 h1 分节反而被漏掉 —— 最顶层的章节不见了
 *
 * 但各篇的起点还不一样：有的从 # 起，有的从 ## 起，
 * 葛叶那篇一路用到 #####。所以不能一刀切地全体降级，
 * 而是按每篇自己最浅的那一层对齐到 h2，整篇同步平移 ——
 * 这样 Obsidian 里的相对层级原样保留，站内又是统一的。
 *
 * 放在 remark 阶段：Astro 是在 rehype 阶段收集 headings 给页面用的，
 * 在这之前改完，目录数据和正文 DOM 才不会对不上。
 * ---------------------------------------------------------------------- */
export function remarkHeadingLevels() {
  return (tree) => {
    let min = 7;
    visit(tree, "heading", (n) => {
      if (n.depth < min) min = n.depth;
    });
    if (min > 6) return;
    const shift = Math.max(0, 2 - min);
    if (!shift) return;
    visit(tree, "heading", (n) => {
      n.depth = Math.min(6, n.depth + shift);
    });
  };
}
