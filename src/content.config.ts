import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* ---------------------------------------------------------------------------
 * 内容模型
 *
 * 这是整个改版方案里最要紧的一块：把原来混在 _projects/ 里的两类东西拆开。
 *
 *   work   = 可展示成果。有画面、有视频、有前后对比，用封面网格呈现。
 *   notes  = 技术长文。原理推导、逆向笔记，用文章版式 + 侧边目录呈现。
 *
 * 两边通过 work.notes / notes.work 互相指路，形成
 * 「先看到效果 → 再点进去看怎么想的」这条链路。
 *
 * schema 写在这里的好处：字段名敲错、少填必填项，构建时直接报错，
 * 不会像以前那样静默渲染出一张空卡片。
 * ------------------------------------------------------------------------- */

/** 详情页画廊里的一项。type 决定用哪个组件渲染。 */
const mediaItem = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("image"),
    src: z.string(),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("video"),
    src: z.string(),
    poster: z.string().optional(),
    caption: z.string().optional(),
  }),
  /** 前后对比滑块 —— TA 作品集的刚需：描边开关、Bloom 前后、LUT 对比 */
  z.object({
    type: z.literal("compare"),
    before: z.string(),
    after: z.string(),
    beforeLabel: z.string().default("Before"),
    afterLabel: z.string().default("After"),
    caption: z.string().optional(),
  }),
]);

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work" }),
  schema: z.object({
    title: z.string(),
    category: z.string().trim().default(''),
    /** 一句话讲清做了什么。不要复制 title —— 老站上大半条目就是这么废掉的。 */
    summary: z.string(),
    /** 16:9 封面，建议统一 1600×900 */
    cover: z.string(),
    coverVideo: z.string().optional(),
    coverAlt: z.string().optional(),

    media: z.array(mediaItem).default([]),

    engine: z.array(z.string()).default([]),
    /** 技术点。词表见 src/data/taxonomy.ts，三个集合共用一套。 */
    tech: z.array(z.string()).default([]),
    /** 你在这件事里干了什么：Shader / Tooling / Art / Tech Art … */
    role: z.array(z.string()).default([]),

    /** 这个作品的辉光色（十六进制）。页面的颜色来自作品本身，不是刷上去的。
        不填就用全站默认的青。 */
    glow: z.string().optional(),

    year: z.number().int().min(2000).max(2100),
    status: z.enum(["wip", "shipped"]).default("shipped"),
    /** 首页精选 */
    featured: z.boolean().default(false),
    /** 排序权重，小的在前 */
    order: z.number().default(100),

    /** 关联的原理长文 slug。一个作品可能拆成好几篇（比如引擎源码改造那种），
        所以单个字符串和数组都收，页面里统一成数组处理。 */
    notes: z.union([z.string(), z.array(z.string())]).optional(),
    repo: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    category: z.string().trim().default(''),
    /** obsidian_sync.py 会校验这两个必填字段 */
    date: z.coerce.date(),
    summary: z.string().optional(),
    tech: z.array(z.string()).default([]),
    /** 反向指回对应的作品 slug */
    work: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const articleSchema = z.object({
  title: z.string(), date: z.coerce.date(), summary: z.string().optional(),
  category: z.string().trim().default(''),
  tech: z.array(z.string()).default([]), work: z.string().optional(), draft: z.boolean().default(false),
  contentId: z.string().optional(), series: z.string().optional(), order: z.number().default(100),
  legacyUrl: z.string().optional(),
  replaces: z.string().regex(/^(notes|legacy|work):.+$/).optional(),
  kind: z.enum(['article','tutorial','work']).default('article'), track: z.string().optional(),
  section: z.enum(['notes','tutorials','work']).optional(),
  cover: z.string().optional(), coverAlt: z.string().optional(), coverVideo: z.string().optional(),
  engine: z.array(z.string()).default([]), role: z.array(z.string()).default([]),
  year: z.number().int().min(2000).max(2100).optional(),
  featured: z.boolean().default(false), status: z.enum(['wip','shipped']).default('shipped'),
  media: z.array(mediaItem).default([]), glow: z.string().optional(),
  notes: z.union([z.string(), z.array(z.string())]).optional(), repo: z.string().url().optional(),
});
const published = defineCollection({ loader: glob({ pattern: '**/*.md', base: './content/published/notes' }), schema: articleSchema.superRefine((data,ctx)=>{
  if (data.section === 'work' || (!data.section && data.kind === 'work')) {
    for (const key of ['cover','summary'] as const) if (!data[key]?.trim()) ctx.addIssue({code:'custom',path:[key],message:'作品需要封面和摘要。'});
  }
}) });
const legacy = defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/legacy' }), schema: articleSchema });
export const collections = { work, notes, published, legacy };
