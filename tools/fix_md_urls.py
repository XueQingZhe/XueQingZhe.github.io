# -*- coding: utf-8 -*-
"""
把 markdown 里带空格的图片/链接地址转成 %20。

Obsidian 的附件名大量带空格（"Pasted image 20260422151741.png"、
文件夹 "Render Feature/"），直接写成 ![](/a/b c.png) 时，
CommonMark 认为链接地址在第一个空格处就结束了 —— 整条语法不成立，
最后原样当纯文本输出。老站用的 kramdown 容忍这种写法，Astro 不容忍，
所以迁移过来的图全变成了字面量。

这里只动地址里的空格，标题和 alt 一概不碰。
"""
import re
import sys
from pathlib import Path

# ![alt](dest)  /  [text](dest)，dest 不带尖括号、不含换行
PAT = re.compile(r"(!?\[[^\]\n]*\])\(\s*([^()\n]*?)\s*\)")


def enc(m: re.Match) -> str:
    head, dest = m.group(1), m.group(2)
    if not dest or dest.startswith("<") or " " not in dest:
        return m.group(0)
    # 只处理站内/相对路径，外链原样放过（它们本来就该是编码好的）
    if re.match(r"^[a-zA-Z][\w+.-]*:", dest) and not dest.startswith("file:"):
        return m.group(0)
    return f"{head}({dest.replace(' ', '%20')})"


def fix(path: Path) -> int:
    src = path.read_text(encoding="utf-8")
    out = PAT.sub(enc, src)
    if out == src:
        return 0
    path.write_text(out, encoding="utf-8")
    return sum(1 for a, b in zip(src.split("\n"), out.split("\n")) if a != b)


def main(roots):
    total = files = 0
    for root in roots:
        for p in sorted(Path(root).rglob("*.md")):
            n = fix(p)
            if n:
                files += 1
                total += n
                print(f"  {p}  ({n} 行)")
    print(f"\n共修正 {files} 个文件 / {total} 行")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:] or ["src/content"]
    main(args)
