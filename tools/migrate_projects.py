#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migrate_projects.py — 把老站 al-folio 的 _projects 迁到 Astro 站

做四件事：
  1. 按下面的 PLAN 表把 14 个老条目重新归类成 work / notes
  2. 套上新的 frontmatter（标题、摘要、技术栈、辉光色都在 PLAN 里写死）
  3. 把引用到的 assets/img/** 整个搬到 astro-site/public/assets/img/**
  4. 生成老 URL → 新 URL 的重定向表，贴进 astro.config.mjs

为什么要重新归类：老站把「可展示的成果」和「引擎源码级长文」混在同一个
集合里渲染成同一张卡片，结果两边都不像。拆开之后：
  work  = 有画面、能一眼看懂做了什么
  notes = 原理推导和源码走查，用文章版式

用法：
    python tools/migrate_projects.py --dry-run     # 先看会做什么
    python tools/migrate_projects.py               # 正式迁
    python tools/migrate_projects.py --no-assets   # 只迁文字，不搬图
"""

from __future__ import annotations

import argparse
import re
from urllib.parse import unquote
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ============================================================================
# 路径
# ============================================================================

OLD_SITE = Path(r"F:\MyWeb\MyBlog\XueQingZhe.github.io")

# 转 WebP 时顺便限制最大宽度：Obsidian 截图常常是 2K+，站上用不到那么大
MAX_COVER_W = 1920
NEW_SITE = Path(__file__).resolve().parent.parent  # astro-site/

for _s in ("stdout", "stderr"):
    try:
        getattr(sys, _s).reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError, OSError):
        pass


# ============================================================================
# 迁移计划
#
# summary 是我按每篇正文的实际内容写的 —— 老站上这些条目的 description
# 全是 title 的复制，等于没写，卡片因此什么信息都没有。
# 你过一遍，改成你自己的说法。
# ============================================================================

WORK = [
    dict(
        src=["13_project.md"], slug="granblue-character",
        title="碧蓝幻想角色渲染",
        summary="头 / 身 / 武器分离的角色卡渲：多套配色贴图、A 通道区分皮肤 Mask、顶点色驱动分区控制，附完整 Shader 代码。",
        engine=["Unity", "URP"], tech=["NPR", "Shader", "HLSL"], role=["Shader"],
        year=2026, glow="#ff9a5c", featured=True, order=1,
    ),
    dict(
        src=["1_project.md"], slug="zzz-xingjianya",
        title="绝区零 · 星见雅",
        summary="Unity / UE / Blender 三端还原同一套 NPR：UV2 烘焙平滑法线的 BackFace 描边、动态 Ramp 分区染色、屏幕空间自投影与 SDF 面部阴影。",
        engine=["Unity", "URP", "UE5", "Blender"], tech=["NPR", "SDF", "Outline", "Shader"],
        role=["Shader"], year=2026, glow="#6aa8ff", featured=True, order=2,
    ),
    dict(
        src=["3_project.md"], slug="zzz-jufufu",
        title="绝区零 · 橘福福",
        summary="七层 Ramp 区间（ShadowFade → Forward）对漫反射分段染色，配合 MaterialID 让皮肤 / 衣物 / 头发各自独立配置曲线。",
        engine=["Unity", "URP"], tech=["NPR", "Shader", "HLSL"], role=["Shader"],
        year=2026, glow="#ffb84f", featured=True, order=3,
    ),
    dict(
        src=["10_project.md", "11_project.md", "12_project.md"], slug="ue5-per-material",
        title="UE5.5 引擎源码改造 · 逐材质渲染控制",
        summary="改 UE 引擎源码，把默认逐 Mesh 的半透明排序、Stencil 与 OverlayMaterial 全部下放到逐材质粒度，从 MaterialInterface 一路改到渲染层。",
        engine=["UE5"], tech=["Pipeline", "Shader"], role=["Pipeline", "Tooling"],
        year=2026, glow="#a78bff", featured=True, order=4,
        notes=["ue5-translucency-sort", "ue5-per-material-stencil", "ue5-overlay-material"],
        # 三篇源码走查单独作为 notes，这里只留一段引子
        body_only_intro=True,
        intro=(
            "UE 默认的半透明排序、Stencil 和 OverlayMaterial 都是**逐 Mesh** 的，"
            "这会逼着美术为了渲染控制去拆模型。这个改造把三者都下放到**逐材质**粒度，"
            "从接口层 `UMaterialInterface` 一路改到渲染层。\n\n"
            "三块的完整源码走查分别在下面三篇笔记里。\n"
        ),
    ),
    dict(
        src=["4_project.md"], slug="urp-outline-feature",
        title="URP 屏幕空间描边 RenderFeature",
        summary="Roberts / Sobel / Scharr 三种算子与混合方式全参数化，用宏控制变体编译；含点击高亮与 X 光两种衍生用法。",
        engine=["Unity", "URP"], tech=["Outline", "RenderFeature", "PostProcess", "HLSL"],
        role=["Shader", "Tooling"], year=2025, glow="#4fe3ff", featured=True, order=5,
    ),
    dict(
        src=["2_project.md"], slug="urp-pbr",
        title="URP 手写 PBR 管线",
        summary="不调用 UniversalFragmentPBR，从零实现 Cook-Torrance（GGX D/F/G）与 Split-Sum IBL，含 POM 视差、光线步进自阴影与完整 Pass 结构。",
        engine=["Unity", "URP"], tech=["Shader", "HLSL", "PostProcess"], role=["Shader"],
        year=2025, glow="#4fd8b0", featured=False, order=6,
    ),
    dict(
        src=["5_project.md"], slug="blender-ta-tools",
        title="Blender TA 工具集",
        summary="Python 插件：平滑法线烘焙、顶点色跨模型传递、贴图批量烘焙输出，以及按平面或曲线生成楼梯。",
        engine=["Blender"], tech=["Tooling"], role=["Tooling"],
        year=2025, glow="#ffa25c", featured=False, order=7,
    ),
    dict(
        src=["6_project.md", "7_project.md", "8_project.md", "9_project.md"],
        slug="early-works",
        title="早期作品 · 场景与建模",
        summary="转向 TA 之前的练习：风格化房间与场景、UE 废墟教室、Blender 建模渲染。留档用，不代表现在的水平。",
        engine=["UE5", "Blender"], tech=["Art"], role=["Art"],
        year=2024, glow="#8c93a8", featured=False, order=99,
        section_titles=["风格化房间", "风格化场景", "UE 废墟教室", "Blender 建模渲染"],
    ),
]

NOTES = [
    dict(src="10_project.md", slug="ue5-translucency-sort",
         title="UE5.5 逐材质半透明排序",
         summary="UE 的半透明排序走 SortPriority > Distance > MeshIdInPrimitive，这篇把排序下放到材质粒度的完整源码改动。",
         tech=["Pipeline", "Shader"], work="ue5-per-material"),
    dict(src="11_project.md", slug="ue5-per-material-stencil",
         title="UE5.5 逐材质 Stencil",
         summary="UE 默认逐 Mesh 的 Stencil 会逼着拆模型。从 MaterialInterface 到渲染层的改法。",
         tech=["Pipeline", "Shader"], work="ue5-per-material"),
    dict(src="12_project.md", slug="ue5-overlay-material",
         title="UE5.5 逐材质 OverlayMaterial",
         summary="接口层加虚函数、子类存数据，以及材质递归检查 TMicRecursionGuard 为什么要循环比对。",
         tech=["Pipeline", "Shader"], work="ue5-per-material"),
    dict(src="14_project.md", slug="urp-bloom",
         title="URP RendererFeature · Bloom",
         summary="高斯 / Kawase / Dual Kawase / Box 四种模糊的质量与开销对比，以及分解优化怎么把采样数从 n² 降到 2n。",
         tech=["PostProcess", "RenderFeature", "HLSL"], work="urp-outline-feature"),
]


# ============================================================================
# 工具
# ============================================================================

FM_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)


def split_fm(text: str) -> tuple[str, str]:
    m = FM_RE.match(text)
    return (m.group(1), text[m.end():]) if m else ("", text)


LINK_RE = re.compile(r"(!?\[[^\]\n]*\])\(\s*([^()\n]*?)\s*\)")


def enc_space(m: re.Match) -> str:
    """把链接地址里的空格转成 %20。

    这是迁移里最隐蔽的一个坑：Obsidian 附件名普遍带空格
    （"Pasted image 20260422151741.png"、目录 "Render Feature/"），
    写成 ![](/a/b c.png) 在 CommonMark 里根本不成立 ——
    地址在第一个空格处就断了，整条语法作废，最后原样当纯文本吐出来。
    老站的 kramdown 容忍这种写法，Astro 不容忍，所以不转的话
    三百多张图会全部变成屏幕上的一行 ![](...) 字面量。
    """
    head, dest = m.group(1), m.group(2)
    if not dest or dest.startswith("<") or " " not in dest:
        return m.group(0)
    if re.match(r"^[a-zA-Z][\w+.-]*:", dest):   # http: 之类的外链不碰
        return m.group(0)
    return f"{head}({dest.replace(' ', '%20')})"


def clean_body(body: str) -> str:
    """老站正文搬过来时要修的几处。"""
    # assets/img//MyPJ 这种双斜杠（老站里真实存在）
    body = re.sub(r"(/assets/img)/{2,}", r"\1/", body)
    # 带空格的附件路径 -> %20
    body = LINK_RE.sub(enc_space, body)
    # 老站大量用 **粗体** 当小标题的替身，保留原样不动 —— 那是作者的写法
    return body.strip() + "\n"


def yaml_list(items) -> str:
    return "[" + ", ".join(items) + "]"


def q(s: str) -> str:
    return '"' + s.replace('"', '\\"') + '"'


def assets_in(text: str) -> set[str]:
    """正文里引用到的站内资源路径。

    不能用一条「非空白字符」的正则去抓 —— 你的文件名里有空格
    （"Pasted image 2026….png"、"Render Feature/"），那样会在空格处截断，
    抓出 /assets/img/MyPJ/Render 这种半截路径。所以按语法上下文抓：
    Markdown 图片抓到右括号，HTML src 抓到引号。
    """
    out: set[str] = set()

    def add(raw: str) -> None:
        p = raw.strip()
        p = re.sub(r"\s+\"[^\"]*\"$", "", p)   # markdown 的可选 title
        p = re.sub(r"[?#].*$", "", p).strip()
        p = re.sub(r"(/assets/img)/{2,}", r"\1/", p)
        # 正文里的地址已经是 %20 编码过的，落到磁盘上要还原成真实文件名
        p = unquote(p)
        if p.startswith("/assets/"):
            out.add(p)

    for m in re.finditer(r"!\[[^\]]*\]\(\s*<?([^)<>]+?)>?\s*\)", text):
        add(m.group(1))
    for m in re.finditer(r"""(?:src|href|poster)\s*=\s*["']([^"']+)["']""", text):
        add(m.group(1))
    return out


def first_image(text: str) -> str | None:
    """正文里第一张静态图 —— 拿来当临时封面，总比一个占位方块强。

    跳过 gif / 视频：封面要能秒开，而且 16:9 裁切后动图容易糊。
    """
    for m in re.finditer(r"!\[[^\]]*\]\(\s*<?([^)<>]+?)>?\s*\)", text):
        u = re.sub(r"[?#].*$", "", m.group(1).strip())
        u = re.sub(r"(/assets/img)/{2,}", r"\1/", u)
        if u.startswith("/assets/") and u.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            return u
    return None


def mtime_date(p: Path) -> str:
    return datetime.fromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%d")


# ============================================================================
# 主流程
# ============================================================================


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="老站 _projects → Astro work / notes")
    ap.add_argument("--old", default=str(OLD_SITE), help="老站仓库根目录")
    ap.add_argument("--dry-run", action="store_true", help="只打印，不写任何文件")
    ap.add_argument("--no-assets", action="store_true", help="跳过图片搬运")
    ap.add_argument("--assets-only", action="store_true", help="只搬图，不重写 md")
    ap.add_argument("--webp", action="store_true",
                    help="PNG/JPG 转 WebP 并改写正文引用（需要 Pillow）。"
                         "你的截图有 231MB，转完通常能压到 1/5 以下。")
    args = ap.parse_args(argv)

    old_root = Path(args.old)
    src_dir = old_root / "_projects"
    if not src_dir.is_dir():
        print(f"[错误] 找不到老站 _projects：{src_dir}", file=sys.stderr)
        return 1

    out_work = NEW_SITE / "src/content/work"
    out_note = NEW_SITE / "src/content/notes"
    dry = args.dry_run
    write_md = not args.assets_only

    webp = args.webp
    if webp:
        try:
            from PIL import Image  # noqa: F401
        except ImportError:
            print("[提示] 没装 Pillow，--webp 被忽略（pip install Pillow）", file=sys.stderr)
            webp = False
    wanted_assets: set[str] = set()
    # 用 dict：同一个老 URL 只能有一个目标，重复键在 JS 对象里会静默覆盖
    redirects: dict[str, str] = {}

    print(f"老站 : {old_root}")
    print(f"新站 : {NEW_SITE}")
    print(f"{'（dry-run，不写文件）' if dry else ''}\n")

    # ---------------- work ----------------
    print("── WORK ──")
    for w in WORK:
        parts, missing = [], []
        for name in w["src"]:
            f = src_dir / name
            if not f.exists():
                missing.append(name)
                continue
            _, body = split_fm(f.read_text(encoding="utf-8", errors="replace"))
            parts.append(clean_body(body))
            redirects[f"/projects/{f.stem}/"] = f"/work/{w['slug']}/"
        if missing:
            print(f"  [警告] 缺少源文件：{missing}")
        if not parts:
            continue

        if w.get("body_only_intro"):
            body = w["intro"]
        elif w.get("section_titles"):
            # 合并条目：每个来源加一个二级标题分隔，否则读者不知道在看哪一件
            body = "\n\n".join(
                f"## {t}\n\n{b}" for t, b in zip(w["section_titles"], parts)
            )
        else:
            body = "\n\n".join(parts)

        wanted_assets |= assets_in(body)
        cover = first_image(body)

        fm = [
            "---",
            f"title: {q(w['title'])}",
            f"summary: {q(w['summary'])}",
            (f"cover: {q(cover)}   # ← 自动取的正文第一张图，换成精选的 16:9 封面"
             if cover else
             f"cover: {q('/covers/placeholder.svg')}   # ← 正文里没找到图，需要你放一张 16:9 封面"),
            f"engine: {yaml_list(w['engine'])}",
            f"tech: {yaml_list(w['tech'])}",
            f"role: {yaml_list(w['role'])}",
            f"year: {w['year']}",
            f"glow: {q(w['glow'])}",
            f"featured: {str(w['featured']).lower()}",
            f"order: {w['order']}",
        ]
        if w.get("notes"):
            fm.append(f"notes: {yaml_list(w['notes'])}")
        fm += ["---", ""]

        dst = out_work / f"{w['slug']}.md"
        print(f"  {' + '.join(w['src']):<44} → work/{w['slug']}.md  ({len(body)}B)")
        if not dry and write_md:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text("\n".join(fm) + body, encoding="utf-8", newline="\n")

    # ---------------- notes ----------------
    print("\n── NOTES ──")
    for n in NOTES:
        f = src_dir / n["src"]
        if not f.exists():
            print(f"  [警告] 缺少源文件：{n['src']}")
            continue
        _, body = split_fm(f.read_text(encoding="utf-8", errors="replace"))
        body = clean_body(body)
        wanted_assets |= assets_in(body)

        fm = [
            "---",
            f"title: {q(n['title'])}",
            f"date: {mtime_date(f)}",
            f"summary: {q(n['summary'])}",
            f"tech: {yaml_list(n['tech'])}",
        ]
        if n.get("work"):
            fm.append(f"work: {q(n['work'])}")
        fm += ["---", ""]

        dst = out_note / f"{n['slug']}.md"
        print(f"  {n['src']:<44} → notes/{n['slug']}.md  ({len(body)}B)")
        if not dry and write_md:
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text("\n".join(fm) + body, encoding="utf-8", newline="\n")
        # 笔记的老 URL 也要跳转。这里刻意放在 work 之后覆盖：
        # 10/11/12 既喂了合并后的 work 条目、又各自成篇，正文实际落在 notes，
        # 所以老链接该指到 notes 才不会让人扑空。
        redirects[f"/projects/{f.stem}/"] = f"/notes/{n['slug']}/"

    # ---------------- 资源 ----------------
    print(f"\n── ASSETS ── 正文共引用 {len(wanted_assets)} 个文件")
    remap: dict[str, str] = {}   # 老路径 → 转完的新路径
    if args.no_assets:
        print("  （--no-assets，跳过）")
    else:
        copied = skipped = miss = conv = 0
        src_bytes = dst_bytes = 0
        for rel in sorted(wanted_assets):
            s_p = old_root / rel.lstrip("/")
            if not s_p.exists():
                miss += 1
                if miss <= 8:
                    print(f"  [缺失] {rel}")
                continue
            src_bytes += s_p.stat().st_size

            # WebP：只转静态位图，gif / 视频 / svg 原样搬
            to_webp = webp and s_p.suffix.lower() in {".png", ".jpg", ".jpeg"}
            out_rel = re.sub(r"\.(png|jpe?g)$", ".webp", rel, flags=re.I) if to_webp else rel
            d_p = NEW_SITE / "public" / out_rel.lstrip("/")
            if to_webp:
                remap[rel] = out_rel

            if d_p.exists() and d_p.stat().st_mtime >= s_p.stat().st_mtime:
                skipped += 1
                dst_bytes += d_p.stat().st_size
                continue

            if dry:
                copied += 1
                continue

            d_p.parent.mkdir(parents=True, exist_ok=True)
            if to_webp:
                try:
                    from PIL import Image
                    with Image.open(s_p) as im:
                        im.load()
                        if im.width > MAX_COVER_W:
                            h = round(im.height * MAX_COVER_W / im.width)
                            im = im.resize((MAX_COVER_W, h), Image.LANCZOS)
                        mode = "RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB"
                        im.convert(mode).save(d_p, "WEBP", quality=84, method=5)
                    conv += 1
                except Exception as e:
                    print(f"  [警告] 转 WebP 失败，改为直接复制：{rel}（{e}）")
                    d_p = NEW_SITE / "public" / rel.lstrip("/")
                    d_p.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(s_p, d_p)
                    remap.pop(rel, None)
            else:
                shutil.copy2(s_p, d_p)
            dst_bytes += d_p.stat().st_size
            copied += 1

        print(f"  复制 {copied} / 跳过 {skipped} / 源文件缺失 {miss}"
              + (f" / 转 WebP {conv}" if conv else ""))
        print(f"  体积 {src_bytes/1048576:.1f} MB → {dst_bytes/1048576:.1f} MB"
              + (f"（省了 {100 - dst_bytes/max(src_bytes,1)*100:.0f}%）" if dst_bytes < src_bytes else ""))
        if miss > 8:
            print(f"  （还有 {miss - 8} 个缺失未列出）")

        # 转了格式就得同步改写正文里的引用，否则全是 404
        if remap and not dry:
            touched = 0
            for md in list((NEW_SITE / "src/content/work").glob("*.md")) + \
                      list((NEW_SITE / "src/content/notes").glob("*.md")):
                t = md.read_text(encoding="utf-8")
                o = t
                for a, b in remap.items():
                    t = t.replace(a, b)
                if t != o:
                    md.write_text(t, encoding="utf-8", newline="\n")
                    touched += 1
            print(f"  改写了 {touched} 个 md 里的图片引用（.png/.jpg → .webp）")

    # ---------------- 重定向 ----------------
    print(f"\n── REDIRECTS ── {len(redirects)} 条，粘进 astro.config.mjs 的 redirects:")
    print("  redirects: {")
    for a, b in sorted(redirects.items()):
        print(f"    {q(a)}: {q(b)},")
    print("  },")

    if not dry:
        rf = NEW_SITE / "tools" / "redirects.generated.txt"
        rf.write_text(
            "\n".join(f'    "{a}": "{b}",' for a, b in sorted(redirects.items())) + "\n",
            encoding="utf-8",
        )
        print(f"\n  已同时写到 {rf.relative_to(NEW_SITE)}")

    print("\n迁完之后还要你自己做的：")
    print("  1. 每个 work 的 cover 换成真实 16:9 封面（现在是占位）")
    print("  2. 删掉 src/content/notes/ 里我留的样例笔记")
    print("  3. 把 redirects 粘进 astro.config.mjs")
    print("  4. npm run build 看 schema 有没有报错")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
