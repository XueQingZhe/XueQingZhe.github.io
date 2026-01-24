---
layout: post
title: 理论支线：基于图像的照明( image based lighting-IBL)
date: 2026-01-24
description: 理论支线：基于图像的照明( image based lighting-IBL)
tags: [unity, shader, rendering]
categories: [TAMonth02]
featured: true
toc:
  sidebar: left
comments: true
images:
  spotlight: true
giscus_comments: true
related_posts: true
---

# 介绍

这通常通过作立方体贴图环境贴图（取自现实世界或从三维场景生成）实现，使我们能直接将其用于光照方程：将每个立方体贴图像素视为光发射体。这样我们就能有效捕捉环境的全局光照和整体感觉，让物体在环境中有更好的归属感。

## IBL渲染方程方程

$$L_o(p,\omega_o) = \int\limits_{\Omega}(k_d\frac{c}{\pi} + k_s\frac{DFG}{4(\omega_o \cdot n)(\omega_i \cdot n)}) L_i(p,\omega_i) n \cdot \omega_i  d\omega_i$$
这里可以拆分成两个部分
$$L_o(p,\omega_o) = 
		\int\limits_{\Omega} (k_d\frac{c}{\pi}) L_i(p,\omega_i) n \cdot \omega_i  d\omega_i

		+ 

		\int\limits_{\Omega} (k_s\frac{DFG}{4(\omega_o \cdot n)(\omega_i \cdot n)})
			L_i(p,\omega_i) n \cdot \omega_i  d\omega_i$$
**这里其实看公式可以知道这就是漫反射 + 镜面反射，这个内容和直接光是类似的**
**那么环境光漫反射其实就是SH(球谐光照)，镜面反射则是源自于环境反射的HDR图**

## 采样

**通常采用是texCUBElod，因为需要将粗糙度和mipLevel相关联。**

```c
float mipLevel = roughness* 7.0;
float4 envSpecularRaw = texCUBElod(_CubeMap, float4(reflviewDir, mipLevel));
half3 envSpecular = DecodeHDR(envSpecularRaw, _CubeMap_HDR); 
```

# 与GGX的关系

## 直接光照的镜面反射(GGX)

$$f_{DirectSpecular}^{GGX}(l, v) = \frac{D(h) \cdot F(v, h) \cdot G(l, v, h)}{4 \cdot (n \cdot l) \cdot (n \cdot v)} \cdot (n \cdot l) \cdot L_{light}$$

其中:

$$F(v, h) = F_0 + (1 - F_0)(1 - v \cdot h)^5$$

## 环境光照的镜面反射(IBL)

$$f_{IBLSpecular} = \underbrace{L_{prefiltered}(r, \text{roughness})}_{\text{D和G已经在这里了!}} \cdot F(n,v)$$

其中:
**这其实就是F项发生了变换，因为环境光是四周辐射的而非根据视线方向，所以它的因子变成了法线**
$$F(n, v) = F_0 + (1 - F_0)(1 - n \cdot v)^5$$

## 对比

| 项目       | 直接光(GGX)                                                | 环境光(IBL)                       |
| -------- | ------------------------------------------------------- | ------------------------------ |
| **完整公式** | $\frac{DFG}{4(n \cdot l)(n \cdot v)} \cdot (n \cdot l)$ | $L_{prefiltered}(r) \cdot F$   |
| **D项**   | D(h) 实时计算                                               | 预计算到贴图Mip里                     |
| **F项**   | $F_0 + (1-F_0)(1-v \cdot h)^5$                          | $F_0 + (1-F_0)(1-n \cdot v)^5$ |
| **G项**   | G(l,v,h)实时计算                                            | 预计算到贴图里                        |

| 项目       | 直接光照(GGX)                      | 环境光照(IBL)                      |
| -------- | ------------------------------ | ------------------------------ |
| **F公式**  | $F_0 + (1-F_0)(1-v \cdot h)^5$ | $F_0 + (1-F_0)(1-n \cdot v)^5$ |
| **输入角度** | `VoH`                          | `NoV`                          |
| **物理含义** | 光线在微表面上的菲涅尔                    | 宏观表面的菲涅尔                       |
| **计算时机** | 每个光源都要算                        | 算一次就够                          |

- 环境光来自**各个方向**,没有单一的L
- 近似认为反射方向R周围的锥形区域贡献最大
- 这个锥形区域的中心轴 ≈ 法线N
- 所以用`NoV`(法线到视角)

# 代码参考

```c
//环境光漫反射
float3 f_indirect = f0 + (1-f0) * pow(1 - max(0,(dot(viewDir, pixelNormal))), 5);
float3 kD_indirect  = (1.0 - f_indirect) * (1.0 - metallic);
float3 indirectDiffuse  = kD_indirect * envColorSH;
//环境光镜面漫反射
float mipLevel = roughness* 7.0;
float4 envSpecularRaw = texCUBElod(_CubeMap, float4(reflviewDir, mipLevel));
half3 envSpecular = DecodeHDR(envSpecularRaw, _CubeMap_HDR); 
envSpecular *= f_indirect;
//AO
float AO = tex2D(_AOTex, texcoord).r;
```

**最终环境光的混合需要和AO相乘但和直接光的阴影不相干，有些教程里面将AO直接和baseColor相乘这其实是错误的。**
**混合输出方式参考**

```c
//output
float3 finalColor = (pbrDiffuseColor + pbrSpecularColor) * shadow + (indirectDiffuse + envSpecular )* AO ;
```
