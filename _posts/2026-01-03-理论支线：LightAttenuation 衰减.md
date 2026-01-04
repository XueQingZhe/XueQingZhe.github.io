---
layout: post
title: 理论支线：LightAttenuation 衰减
date: 2026-01-03
description: 理论支线：LightAttenuation 衰减
tags: [shader,rendering]
categories: [TAMonth01]
featured: true
toc:
  sidebar: left
comments: true
images:
  spotlight: true
---

# Point lights  点光源

## 概述

点光源的距离衰减控制了光照强度如何随距离变化。现代游戏引擎主要使用两种方法：

- **经典三参数公式**（已过时，仅用于教学）
- **物理衰减 + 窗口函数**（现代主流，Unity/UE使用）

## 经典三参数衰减公式（历史方法）

⚠️ **注意：现代引擎（Unity URP/HDRP、Unreal Engine）已不再使用此公式。**
![](/assets/img/TAMonth01/Pasted image 20251231195524.png)
$$\begin{equation} F_{att} = \frac{1.0}{K_c + K_l * d + K_q * d^2} \end{equation}$$

## 常数项 $K_c$

**$K_c$ = 1.0**，通常设置为 1.0
**作用**：防止分母为0，确保在距离为0时不会得到无穷大的亮度。
>**为什么是1.0？**

**当 d = 0 时：**
Fatt = 1.0 / (1.0 + 0 + 0) = 1.0
意味着在光源位置，衰减系数为1（没有衰减）

**如果 $K_c < 1$，比如 0.5：**
当 d = 0 时：
Fatt = 1.0 / 0.5 = 2.0  ❌
这会让光源位置的亮度增强2倍，不符合物理！

## 线性项 $K_l$

典型值：0.09, 0.07, 0.045 等
Kl = 0.09
**作用**：提供**中等距离**的线性衰减。
**效果**：
距离 d = 5: 线性贡献 = 0.09 * 5 = 0.45

## 二次项 $K_q$

典型值：0.032, 0.017, 0.0075 等 Kq = 0.032
**作用**：提供**远距离**的快速衰减。
距离 d = 10: 二次贡献 = 0.032 *10² = 3.2
距离 d = 20: 二次贡献 = 0.032* 20² = 12.8
**关键特性**：

- **距离小时**：$d^2$ 很小，二次项贡献小
- **距离大时**：$d^2$ 急剧增大，二次项主导衰减

## 设计取值思路

### 方法1：基于目标距离反推参数

**核心思路**
**先确定你想要的"光照范围"，然后反推参数。**

假设你想要光源在距离 `d = 50` 时衰减到某个阈值（比如5%亮度），可以这样计算：

```c
目标：在 d = 50 时，Fatt = 0.05

0.05 = 1.0 / (Kc + Kl * 50 + Kq * 50²)
0.05 = 1.0 / (Kc + 50*Kl + 2500*Kq)

反推：
Kc + 50*Kl + 2500*Kq = 20
```

但这是**一个方程，三个未知数**，所以需要额外约束。

#### 常用约束条件

##### 约束1：固定 Kc = 1.0

```c
理由：保证在光源位置（d=0）亮度为100%
简化方程：1.0 + 50*Kl + 2500*Kq = 20
         → 50*Kl + 2500*Kq = 19
```

##### 约束2：定义"半强度距离"

假设你希望在 `d = 13` 时亮度衰减到50%：

```c
0.5 = 1.0 / (1.0 + 13*Kl + 169*Kq)
1.0 + 13*Kl + 169*Kq = 2
13*Kl + 169*Kq = 1  ... (方程A)

同时满足范围约束：
50*Kl + 2500*Kq = 19  ... (方程B)

解这个二元一次方程组：
从(A): Kl = (1 - 169*Kq) / 13
代入(B): 50*(1 - 169*Kq)/13 + 2500*Kq = 19
        ...
得到：Kq ≈ 0.44, Kl ≈ 0.35
```

### 方法2：查表

| 光照距离    | Kc  | Kl    | Kq     | 用途场景    |
| ------- | --- | ----- | ------ | ------- |
| **7**   | 1.0 | 0.7   | 1.8    | 手电筒、小灯泡 |
| **13**  | 1.0 | 0.35  | 0.44   | 台灯、壁灯   |
| **20**  | 1.0 | 0.22  | 0.20   | 房间吊灯    |
| **32**  | 1.0 | 0.14  | 0.07   | 大厅灯光    |
| **50**  | 1.0 | 0.09  | 0.032  | 路灯      |
| **65**  | 1.0 | 0.07  | 0.017  | 广场灯     |
| **100** | 1.0 | 0.045 | 0.0075 | 体育场灯光   |
| **160** | 1.0 | 0.027 | 0.0028 | 大型场景    |
| **200** | 1.0 | 0.022 | 0.0019 | 室外环境    |
| **325** | 1.0 | 0.014 | 0.0007 | 超大场景    |
| **600** | 1.0 | 0.007 | 0.0002 | 天空光     |

## 经典公式的问题

### ❌ 致命缺陷

1. **没有明确的Range参数**
   - 美术师无法直接控制"光照范围是多少米"
   - 只能通过调整三个晦涩的参数间接影响
   - 需要反复测试才能达到想要的效果

2. **预设参数表太死板**
   - 表中没有的范围（如18米）需要手动计算
   - 参数之间相互耦合，改一个影响全部
   - 工作流程繁琐低效

3. **无法做性能优化**
   - 理论上衰减永远不为0（延伸到无穷远）
   - GPU无法提前剔除超出范围的光源
   - 即使距离1000米也要计算

4. **无法做空间剔除**
   - CPU端无法判断光源是否影响视锥体
   - 所有光源都要传给GPU处理

**这就是为什么现代引擎全部放弃了这个公式！**

## 基于物理的简化公式

### 平方反比定律（真实物理）

现实世界中，光照遵循：

$$I = \frac{I_0}{d^2}$$

其中：

- $I$  = 衰减后的光照强度
- $I_0$  = 光源初始强度
- $d$  = 距离光源的距离
也就是

```c
float distanceSqr = distance * distance;
float physicalAttenuation = 1.0 / max(distanceSqr, 0.01 * 0.01);
```

但游戏中直接用会有问题：

- 在 `d=0` 处会无穷大
- 没有艺术控制范围的能力

## 关联点光源生效半径

对于整个衰减公式中有一点没有说明，就是**关联点光源的生效半径**，**最上面的经典三参数衰减公式随着时代更替，实际上游戏引擎现在根本不用！！** 而是采用平方反比定律（真实物理）的衰减。可是当前物理公式不论各多远都会计算也就是无限接近于0，这会导致很多性能浪费，所以需要进行截断操作。

## 现代引擎实现：物理衰减 + 窗口函数

### 设计哲学

现代引擎采用两阶段设计：

```c
完整衰减 = 物理衰减 × 窗口函数（范围截断）
         = (1/d²)  ×  Window(d, R, n)
```

优点：
✓ 基于物理，视觉真实
✓ 有明确的Range参数（艺术控制）
✓ 可提前剔除（性能优化）
✓ 边界平滑过渡（无硬边）

### 窗口函数（衰减截断）

**这里对范围进行截断，截断操作就是叫窗口函数或者衰减函数也行，最简单的线性窗口就是到了半径之后就是截断，但是会导致硬边**

```c
float window = saturate(1.0 - distance / range); 
```

问题：在边界处导数不连续（有视觉"硬边"）

**为了更加平滑的截断，在引擎中则是使用下方的窗口函数公式**

$$\text{Window}(d, R, n) = \left[\text{saturate}\left(1 - \left(\frac{d}{R}\right)^n\right)\right]^2$$

其中 d是距离，R是半径
**图像如下**
![](/assets/img/TAMonth01/Pasted image 20260101235434.png)
**所以最终是窗口函数和物理衰减来进行混合,也就是$physicalAtten * windowAtten$**
**在引擎中通常使用4次方来作为衰减，性能和效果比较合适，过小的话衰减过快，边界会很明显。过大衰减范围增加，计算量会增大**
$$\text{Window}(d, R, n) = \left[\text{saturate}\left(1 - \left(\frac{d}{R}\right)^4\right)\right]^2$$
**根据艺术需求：**

- 卡通风格 → n=2（明确边界）
- 写实风格 → n=6（柔和过渡）
- 魔法效果 → n=8~10（力场感）

### 衰减函数

```c
// 正确的衰减函数
float CalculateAttenuation(float3 worldPos)
{
    // 1. 距离平方
    float3 L = _LightPos - worldPos;
    float distSqr = dot(L, L);
    
    // 2. 物理衰减
    float physicalAtten = 1.0 / max(distSqr, 0.01 * 0.01);
    
    // 3. 窗口函数（无分支）
    float rangeSqr = _LightRange * _LightRange;
    float normDistSqr = distSqr / rangeSqr;
    float normDistQuad = normDistSqr * normDistSqr;
    float windowBase = saturate(1.0 - normDistQuad);
    float windowAtten = windowBase * windowBase;
    
    // 4. 组合
    return physicalAtten * windowAtten;
```

### Unity实际使用的代码（Lighting.hlsl）

![](/assets/img/TAMonth01/Pasted image 20260102192433.png)

$\text{distanceAttenuation.x} = \frac{1}{R^2}$

$\text{fadeDistance} = 0.64 \times R^2$

$\text{distanceAttenuation.y} = \frac{-R^2}{0.64R^2 - R^2}$

```c
distanceAttenuation.x = 1.0f / (lightRange * lightRange);

float lightRangeSqr = lightRange * lightRange;
float fadeDistance = 0.8f * 0.8f * lightRangeSqr; // 80% 的范围开始衰减 
distanceAttenuation.y = -lightRangeSqr / (fadeDistance - lightRangeSqr);
```

```c
float DistanceAttenuation(float distanceSqr, half2 distanceAttenuation)
{
    float lightAtten = rcp(distanceSqr); // rcp(x) = 1/x
    
    #if SHADER_HINT_NICE_QUALITY
        // 高质量：n=4
        half factor = distanceSqr * distanceAttenuation.x;
        half smoothFactor = saturate(1.0h - factor * factor);
        smoothFactor = smoothFactor * smoothFactor;
    #else
        // 标准质量：线性窗口（从80% range开始衰减）
        half smoothFactor = saturate(
            distanceSqr * distanceAttenuation.x + 
            distanceAttenuation.y
        );
    #endif
    
    return lightAtten * smoothFactor;
}
```

## 完整对应表

| 数学符号                             | Unity 代码                      | 说明                 |
| -------------------------------- | ----------------------------- | ------------------ |
| $d$                              | `distance`                    | 距离（通常不直接计算，避免sqrt） |
| $d^2$                            | `distanceSqr`                 | 距离平方               |
| $R$                              | `lightRange`                  | 光源范围               |
| $R^2$                            | `rangeSqr`                    | 范围平方               |
| $\frac{1}{R^2}$                  | `distanceAttenuation.x`       | CPU预计算             |
| $\frac{d^2}{R^2}$                | `factor`                      | 归一化距离平方            |
| $\left(\frac{d^2}{R^2}\right)^2$ | `factor * factor`             | 四次方项（用平方表示）        |
| $\left(\frac{d^2}{R^2}\right)^2$ | `1.0h - factor * factor`      | 窗口函数基础             |
| $\text{saturate}(...)$           | `saturate(...)`               | 钳制到[0,1]           |
| $[...]^2$                        | `smoothFactor * smoothFactor` | 最后平方               |

# Spotlight 聚光灯

## 基本概念

**聚光灯 = 点光源 + 方向限制 + 角度衰减**
点光源：向所有方向发光
聚光灯：只向一个锥形区域发光
![](/assets/img/TAMonth01/Pasted image 20260102221850.png)
从图中可以看到：

| 参数            | 说明                     | 图中标注                 |
| ------------- | ---------------------- | -------------------- |
| **LightDir**  | 从**片元指向光源**的向量         | 蓝色线（从fragment到light） |
| **SpotDir**   | 聚光灯照射的方向（某个轴归一化）       | 红色线（从light向下）        |
| **Phi (φ)**   | 外锥角（Outer Cone）        | 蓝色锥体边缘               |
| **Theta (θ)** | LightDir 和 SpotDir 的夹角 | 绿色标注                 |

## 核心判断逻辑

>**片元是否在聚光灯照射范围内？**

***只要片元的光向量夹角小于等于椎体角度的一半就行，但是直接使用角度需要使用反三角函数计算量很大，而角度最大也就是$\frac{\pi}{2}$,这表示cos肯定是正数1~0，角度越大cos越小，使用cos来比较更好的办法，这和相机的裁剪原理也是类似***

```c
// 计算夹角的余弦值
float cosTheta = dot(normalize(LightDir), normalize(-SpotDir));

// 判断是否在锥内
if (cosTheta > cos(Phi)) {
    // 在聚光灯照射范围内
} else {
    // 在聚光灯外，不受光照影响
}
```

## 衰减组成

**聚光灯衰减 = 距离衰减（和点光源相同）+ 角度衰减**

### 距离衰减

```c
float DistanceAttenuation(float distanceSqr, half2 distanceAttenuation)
{
    float lightAtten = rcp(distanceSqr);  // 1/d²
    
    half factor = distanceSqr * distanceAttenuation.x;
    half smoothFactor = saturate(1.0h - factor * factor);
    smoothFactor = smoothFactor * smoothFactor;
    
    return lightAtten * smoothFactor;
}
```

### 角度衰减
>
>**聚光灯的形状是怎样？**

**在中心区域应该会被完全照亮，然后再向边缘衰减，并非和点光源一样的直接衰减，所以我们需要在这个范围内构建衰减**
Unity 使用**两个角度**来实现平滑过渡：
InnerAngle (内锥角)：完全照亮区域
OuterAngle (外锥角)：光照边界

线性插值的基本思路
我们想要一个函数，满足：

  $$f(\theta) =\begin{cases} 1.0 & \text{if } \theta \leq \phi_{\text{inner}} \\ \text{线性递减} & \text{if } \phi_{\text{inner}} < \theta < \phi_{\text{outer}} \\ 0.0 & \text{if } \theta \geq \phi_{\text{outer}} \end{cases}$$

**标准线性插值公式**

在两个端点之间线性插值：

$$f(x) = \frac{x - x_{\text{min}}}{x_{\text{max}} - x_{\text{min}}}$$

这给出：

- 当 $x = x_{\text{min}}$  时，$f(x) = 0$
- 当 $x = x_{\text{max}}$ ​ 时，$f(x) = 1$

**但我们需要反过来**

对于聚光灯，我们希望：

- 当$\theta = \phi_{\text{inner}}$ （小角度）时，衰减 = **1.0**（亮）
- 当$\theta = \phi_{\text{outer}}$ （大角度）时，衰减 = **0.0**（暗）

所以公式应该是：

$$f(\theta) = \frac{\phi_{\text{outer}} - \theta}{\phi_{\text{outer}} - \phi_{\text{inner}}}$$

**所以最终角度衰减公式：**
线性插值得到的是直线过渡会产生硬边缘截断，为了更自然的视觉效果，对结果进行平方：

$$\text{AngleAttenuation} = \left[\text{saturate}\left(\frac{\cos\theta - \cos\phi_{\text{outer}}}{\cos\phi_{\text{inner}} - \cos\phi_{\text{outer}}}\right)\right]^2$$

其中：

- $\theta$= LightDir 和 SpotDir 的夹角
- $\phi_{\text{inner}}$​ = 内锥角
- $\phi_{\text{outer}}​$ = 外锥角

平方是性能和效果的最佳平衡：

|指数|中点值|指令数|效果|使用|
|---|---|---|---|---|
|t¹|0.50|0|线性，太硬|❌|
|**t²**|**0.25**|**1**|**适中**|**✓ Unity/UE**|
|t³|0.125|2|过于激进|特殊效果|
|t⁴|0.0625|2|极窄光束|激光效果|

### 衰减混合

**最终角度衰减公式是这样**
$$\text{AngleAttenuation} = \left[\text{saturate}\left(\frac{\cos\theta - \cos\phi_{\text{outer}}}{\cos\phi_{\text{inner}} - \cos\phi_{\text{outer}}}\right)\right]^2$$
放进 shader 后，每个像素至少需要：

1. `cosInner`、`cosOuter`（通常从角度算 cos）

2. `cosInner - cosOuter`

3. `(cosθ - cosOuter)`

4. **一次除法**

5. `saturate`

**除法是 GPU 上的慢指令**（尤其是老架构 / mobile）
所以为了优化，会把公式拆分使用**MAD**也就是乘法加法，在GPU运行更快,$\cos\theta$是必须片元计算的，其它两个参数就在灯光设置时交给cpu算了
$$A = \text{saturate} \left( \cos\theta \cdot \frac{1}{\cos\phi_{inner} - \cos\phi_{outer}} - \frac{\cos\phi_{outer}}{\cos\phi_{inner} - \cos\phi_{outer}} \right)$$

```c
atten = saturate(SdotL * spotAttenuation.x + spotAttenuation.y);
```

**最终的衰减就是 $DistanceAttenuation * AngleAttenuation$**

## Unity Shader 代码参考

```c
float3 lightToPixel = normalize(WorldPos - LightPos);
float3 spotDir = normalize(SpotLightDirection);
float cosTheta = dot(spotDir, lightToPixel);
```

```c
half AngleAttenuation(half3 spotDirection, half3 lightDirection, half2 spotAttenuation)
{
    // Spot Attenuation with a linear falloff can be defined as
    // (SdotL - cosOuterAngle) / (cosInnerAngle - cosOuterAngle)
    // This can be rewritten as
    // invAngleRange = 1.0 / (cosInnerAngle - cosOuterAngle)
    // SdotL * invAngleRange + (-cosOuterAngle * invAngleRange)
    // If we precompute the terms in a MAD instruction
    
    // 步骤1：计算 cos(θ)
    half SdotL = dot(spotDirection, lightDirection);
    
    // 步骤2：线性插值（MAD 优化）
    // 等价于：(SdotL - cosOuter) / (cosInner - cosOuter)
    half atten = saturate(SdotL * spotAttenuation.x + spotAttenuation.y);
    
    // 步骤3：平方平滑
    return atten * atten;
}
```

## 聚光灯阴影性能

**移动端优化建议：**

- 限制聚光灯数量（≤ 3-5 个）
- 使用较小的 Range
- 避免重叠的聚光灯
- 使用 Light Culling

 聚光灯阴影比点光源便宜，但比方向光昂贵：

| 光源类型            | Shadow Maps  | 性能    | 备注     |
| --------------- | ------------ | ----- | ------ |
| **Directional** | 4 cascades   | 中     | 覆盖整个场景 |
| **Spot**        | **1 张**      | **好** | 只覆盖锥体  |
| **Point**       | 6 张（Cubemap） | 差     | 6个方向   |

**优化建议：**

- 只对主要聚光灯开启阴影
- 使用合适的 Shadow Resolution（512-1024）
- 考虑使用烘焙阴影
