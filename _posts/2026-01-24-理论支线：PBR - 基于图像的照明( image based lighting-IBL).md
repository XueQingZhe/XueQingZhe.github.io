---
layout: post
title: 理论支线：PBR - 基于图像的照明( image based lighting-IBL)
date: 2026-01-24
description: 理论支线：PBR - 基于图像的照明( image based lighting-IBL)
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
**那么环境光漫反射其实就是SH(球谐光照)，镜面反射则是源自于环境反射的HDR图，这里主要是讲镜面反射**

## 采样

**通常采用是texCUBElod，因为需要将粗糙度和mipLevel相关联。**

```c
float mipLevel = roughness* 7.0;
float4 envSpecularRaw = texCUBElod(_CubeMap, float4(reflviewDir, mipLevel));
half3 envSpecular = DecodeHDR(envSpecularRaw, _CubeMap_HDR); 
```

# 与GGX的关系和使用方法

## 直接光照的镜面反射(GGX)

$$f_{DirectSpecular}^{GGX}(l, v) = \frac{D(h) \cdot F(v, h) \cdot G(l, v, h)}{4 \cdot (n \cdot l) \cdot (n \cdot v)} \cdot (n \cdot l) \cdot L_{light}$$

其中:

$$F(v, h) = F_0 + (1 - F_0)(1 - v \cdot h)^5$$

## Environment BRDF

**对于直接光，是只需要处理单一光源，所以F和G项都是实时计算的，但是对于环境光镜面反射来说，光线是四面八方传来，这意味着实时计算需要计算无数光线方向，这样肯定是不行的，所以环境光需要一个更好的处理办法，那就是Environment BRDF**

它是一张2D查找表(LUT)，描述镜面反射能量随观察角度的衰减曲线，其实就是控制衰减形状和距离程度
想象一张图片:

- **横轴(X)**: `NoV` (法线和视角夹角余弦值,范围0→1)
- **纵轴(Y)**: `roughness` (粗糙度,范围0→1)
- **像素值**: `RG两通道` 存储 `(scale, bias)` 两个数值

## 环境光照的镜面反射(IBL)

### 简化只处理菲涅尔项

**能用，几乎没有衰减也就是比较明亮，卡通渲染应该比较合适**

$$f_{IBLSpecular} = \underbrace{L_{prefiltered}(r, \text{roughness})}_{\text{D和G已经在这里了!}} \cdot F(n,v)$$

其中:
**F项发生了变化，因为环境光是四周辐射的而非根据视线方向，所以它的因子变成了法线**

$$F(n, v) = F_0 + (1 - F_0)(1 - n \cdot v)^5$$

### 使用近似拟合方法

```c
float2 EnvBRDFApprox(float roughness, float NoV)
{
    // Epic Games通过拟合大量数据得出的魔法系数
    const float4 c0 = float4(-1.0, -0.0275, -0.572, 0.022);
    const float4 c1 = float4(1.0, 0.0425, 1.04, -0.04);
    float4 r = roughness * c0 + c1;
    float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
    float2 AB = float2(-1.04, 1.04) * a004 + r.zw;
    return AB;  // AB.x = scale, AB.y = bias
}
```

**使用近似后和仅处理理菲涅尔项的对比**
![](/assets/img/TAMonth02/Pasted image 20260127204725.png)

### 使用Unity默认LUT

**IBL贴图过滤采样中处理D和G项，但G项并不完整或者没有。所以更好的方案是在额外计算F和G积分项,也就是使用LUT图**
Epic Games的聪明解决方案:拆成两部分

$$\int L_i \cdot BRDF \approx \underbrace{\int L_i \cdot D}_{\text{第1部分:预过滤环境贴图}} \times \underbrace{\int \frac{FG}{4(n \cdot v)} }_{\text{第2部分:Environment BRDF}}$$

**关键思想**:

- **第1部分**只和环境光、粗糙度有关 → 提前烘焙成Cubemap的不同mip层
- **第2部分**只和材质参数(roughness, NoV)有关 → 提前计算成一张2D表

**采样Unity默认LUT**

```c
 float2 brdfLUT = tex2D(unity_NHxRoughness, float2(roughness, nov)).rg;
 envSpecular =  envSpecular * (f0 * brdfLUT.x + brdfLUT.y);
```

### 使用自定义LUT

图片：https://learnopengl-cn.github.io/07%20PBR/03%20IBL/02%20Specular%20IBL/

![](/assets/img/TAMonth02/ibl_brdf_lut.png)

**这里使用了一个_UseCustomLUT作为开关**

```c
[Header(EnvBRDFLUT)]
[Toggle]_UseCustomLUT("Custom BRDF LUT", float) = 1.0
_CustomBRDFLUT("Custom BRDF LUT", 2D) = "white" {}
----------------------------------------
//采样BRDFLUT
float2 brdfLUT = tex2D(unity_NHxRoughness, float2(roughness, nov)).rg;
float2 CustombrdfLUT = tex2D(_CustomBRDFLUT, float2(roughness, nov)).rg;
                
if(_UseCustomLUT > 0.5)
{
    brdfLUT = CustombrdfLUT;
}
envSpecular =  envSpecular * (f0 * brdfLUT.x + brdfLUT.y);
```

## 对比

| 项目       | 直接光(GGX)                                                | 环境光(IBL)                       |
| -------- | ------------------------------------------------------- | ------------------------------ |
| **完整公式** | $\frac{DFG}{4(n \cdot l)(n \cdot v)} \cdot (n \cdot l)$ | $L_{prefiltered}(r) \cdot F$   |
| **D项**   | D(h) 实时计算                                               | 预计算到贴图Mip里                     |
| **F项**   | $F_0 + (1-F_0)(1-v \cdot h)^5$                          | $F_0 + (1-F_0)(1-n \cdot v)^5$ |
| **G项**   | G(l,v,h)实时计算                                            | 预计算到贴图里                        |
|          |                                                         |                                |

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

//1.拟合BRDF(未使用)
float2 envBRDF = EnvBRDFApprox(roughness, nov);
float3 envSpecularEasy = envSpecular * f_indirect;
//2.采样BRDFLUT
float2 brdfLUT = tex2D(unity_NHxRoughness, float2(roughness, nov)).rg;
float2 CustombrdfLUT = tex2D(_CustomBRDFLUT, float2(roughness, nov)).rg;
            
if(_UseCustomLUT > 0.5)
{
    brdfLUT = CustombrdfLUT;
}
envSpecular =  envSpecular * (f0 * brdfLUT.x + brdfLUT.y);
            
//AO
float AO = tex2D(_AOTex, texcoord).r;
```

**最终环境光的混合需要和AO相乘但和直接光的阴影不相干，有些教程里面将AO直接和baseColor相乘这其实是错误的。**
**混合输出方式参考**

```c
//output
float3 finalColor = (pbrDiffuseColor + pbrSpecularColor) * shadow + (indirectDiffuse + envSpecular )* AO ;
```
