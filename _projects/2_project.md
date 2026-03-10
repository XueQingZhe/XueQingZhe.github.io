---
layout: page
title: URP - PBR
description: 基于 Cook-Torrance 模型手写完整 PBR 
img: assets/img/MyPJ/URP_PBR/Pasted image 20260310222758.png
importance: 1
category: [rendering]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---

URP管线，不依赖内置函数，从零手写的完整 PBR 渲染管线，基于 Cook-Torrance 模型手写完整 PBR 管线，不调用 UniversalFragmentPBR 内置光照函数，所有光照计算均自主实现，便于后续定制和扩展。

# 大致实现内容


1. 自主 PBR 实现
   - Cook-Torrance BRDF（GGX D/F/G）
   - IBL 环境光（Split Sum，预过滤Cubemap + Environment BRDF）

2. Parallax Occlusion Mapping
   - 动态层数控制
   - 光线步进自阴影
   - 视角衰减
   
2. 完整 URP Pass 结构
   - ForwardLit / ShadowCaster / DepthOnly / DepthNormals
   - 支持 SSAO 
   
2. 多光源支持（点光源/聚光灯） 

3. 雾效 

4. 移动端性能变体（shader_feature裁剪）

# 粗糙度金属度矩阵图

roughness × metallic 参数矩阵，验证 PBR 实现正确性
![](/assets/img/MyPJ/URP_PBR/Pasted image 20260310223319.png)

# 材质效果

**石头、布料、金属等多种材质效果展示**
![](/assets/img/MyPJ/URP_PBR/Pasted image 20260310224605.png)
**单独模型材质效果测试**

<video width="100%" autoplay loop muted playsinline>
  <source src="/assets/img/MyPJ/URP_PBR/PBR材质效果预览-HD.mp4" type="video/mp4">
</video>

# POM视差

**实现了基于高度图的视差遮蔽映射，通过动态层数采样模拟表面凹凸的 视差效果，在低面数网格上实现真实的深度感。左图为普通法线贴图， 右图为POM效果。**
![](/assets/img/MyPJ/URP_PBR/Pasted image 20260310234712.png)

## 自阴影

**在POM基础上实现光线步进自阴影，凸起部分对相邻区域产生遮蔽， 增强了表面细节的真实感。支持软阴影和阴影强度调节。**
![](/assets/img/MyPJ/URP_PBR/视差自阴影.gif)

## 视角衰减

**视差随视角衰减**
![](/assets/img/MyPJ/URP_PBR/视差视角衰减 1.gif)

# URP-SSAO

**支持POM效果的SSAO**
![](/assets/img/MyPJ/URP_PBR/URP-SSAO.gif)
