import rss from "@astrojs/rss";
import { allNotes, noteUrl } from "../lib/content";
import type { APIContext } from "astro";

/** 笔记订阅。作品不进 RSS —— 那是要看画面的，文字摘要没意义。 */
export async function GET(ctx: APIContext) {
  const notes = (await allNotes())
    .filter((n) => !n.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: "吟处雪轻遮 · 笔记",
    description: "Unity URP / NPR 渲染与 TA 工具链的技术笔记",
    site: ctx.site!,
    items: notes.map((n) => ({
      title: n.data.title,
      description: n.data.summary ?? "",
      pubDate: n.data.date,
      link: noteUrl(n),
      categories: n.data.tech,
    })),
    customData: "<language>zh-CN</language>",
  });
}
