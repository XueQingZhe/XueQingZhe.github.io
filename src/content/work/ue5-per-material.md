---
title: "UE5.5 引擎源码改造 · 逐材质渲染控制"
summary: "改 UE 引擎源码，把默认逐 Mesh 的半透明排序、Stencil 与 OverlayMaterial 全部下放到逐材质粒度，从 MaterialInterface 一路改到渲染层。"
cover: "/covers/placeholder.svg"   # ← 正文里没找到图，需要你放一张 16:9 封面
engine: [UE5]
tech: [Pipeline, Shader]
role: [Pipeline, Tooling]
year: 2026
glow: "#a78bff"
featured: true
order: 4
notes: [ue5-translucency-sort, ue5-per-material-stencil, ue5-overlay-material]
---
UE 默认的半透明排序、Stencil 和 OverlayMaterial 都是**逐 Mesh** 的，这会逼着美术为了渲染控制去拆模型。这个改造把三者都下放到**逐材质**粒度，从接口层 `UMaterialInterface` 一路改到渲染层。

三块的完整源码走查分别在下面三篇笔记里。
