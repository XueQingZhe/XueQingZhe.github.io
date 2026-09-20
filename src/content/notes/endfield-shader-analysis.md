---
title: CharacterNPR 复刻代码解析
date: 2026-04-22
summary: 逐指令核实终末地角色着色器，把散落的公式组织成可编译可读的 HLSL。
tech: [NPR, SDF, HLSL]
work: endfield-npr
draft: true   # 我留的样例，确认新内容没问题后整个文件删掉即可
---

## 这是什么

从 Obsidian 同步过来的笔记长这样。标题超过两个会自动生成右侧目录。

## 和作品页的关系

上面 frontmatter 里的 `work: endfield-npr` 会在页头生成一个「← 对应作品」的按钮，
作品页那边的 `notes:` 则反过来指到这里。这条双向链路就是「先看到效果，再看怎么想的」。

### 三级标题也会进目录

正文宽度被收到 70 字符，中文长行读起来不会累。
