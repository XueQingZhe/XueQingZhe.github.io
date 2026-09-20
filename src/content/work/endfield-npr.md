---
title: Endfield 角色 Shader 复刻
summary: 逆向明日方舟：终末地的角色渲染管线，在 URP 下重建 SDF 面部阴影与多层描边。
cover: /covers/endfield.svg
media:
  - type: compare
    before: /covers/cmp-before.svg
    after: /covers/cmp-after.svg
    beforeLabel: 关闭 SDF 阴影
    afterLabel: 开启 + 多层描边
    caption: 拖动中间的滑块对比
engine: [Unity, URP]
tech: [NPR, SDF, Outline, HLSL]
role: [Shader]
glow: "#ffa25c"
year: 2026
featured: true
order: 2
notes: endfield-shader-analysis
draft: true   # 我留的样例，确认新内容没问题后整个文件删掉即可
---

对比滑块就是上面那个——TA 作品集最该有的组件，一拖就说明白了。
