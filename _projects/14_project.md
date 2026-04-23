---
layout: post
title:  URP - RendererFeature ：Bloom
description:  URP - RendererFeature ：Bloom
img: assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422195144.png
importance: 2
category: [Tools]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---



# Bloom原理

Bloom也叫辉光，简单来说原理就是提取图中的亮度信息再与原图叠加，但是这样会很硬所以提取的亮度信息就需要进行模糊后混合，根据算法不同形状和效果都有所差异

# 模糊的几种算法

| 算法          | 质量  | 性能  | 适用场景    |
| ----------- | --- | --- | ------- |
| 高斯          | 最好  | 一般  | PC/主机   |
| Dual Kawase | 好   | 好   | 移动端主流   |
| Kawase      | 好   | 好   | 移动端     |
| Box         | 差   | 最好  | 不推荐正式使用 |

## Box Blur 均值模糊

![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422151741.png)

## 高斯模糊

## 标准的高斯模糊

**高斯模糊这里是采样25个点，这样性能开销比较大，所以有了分解优化，图片来自RTR4第12章**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422153609.png)
**水平和垂直分解后，采样次数从n^2变成了2n**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422153707.png)

## 优化版

**这里的9x5效果对应标准的9x9的高斯核**
**水平**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422152436.png)
**垂直**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422152334.png)

## KawaseBlur

![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422151853.png)

## DualKawaseBlur

![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422151956.png)

# 一些缺陷和解决办法

## 单向降采样

**左侧是URP默认Bloom，右侧则是单向降采样/4，混合的得到bloom，比较生硬同时因为降采样模糊程度不同，细节缺失也不一样，为了解决保留各层级细节的这个问题，就需要混合升降采样，从最低分辨率开始，每级往上叠加混合，这样会更平滑同时细节更多**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260421194648.png)

## 屏幕采样坐标问题

**采样RT的时候，使用的屏幕像素大小，但是因为降采样的原因，这并不合适，因为降采样分辨率发生了变话，那么偏移程度理应也该变化，如果统一使用屏幕像素大小，则会导致有拖影或者说位移**
<video width="100%" autoplay loop muted playsinline>
  <source src="/assets/img/MyPJ/Render Feature/Bloom/QQ20260421-222709-HD.mp4" type="video/mp4">
</video>

**解决方法也比较简单，URP采用的方法是传入RT自身的像素大小，Shader中直接声明就行**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260421234045.png)
**比如BoxBlur如下**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260421234117.png)

## Fade Fireflies（萤火虫抑制）

**这发生在 Pass 0 亮度提取阶段。问题是画面里孤立的极亮像素（1-2个像素大小的高光）在相机移动时会跳变闪烁，原因是降采样时这些像素时而被采到时而采不到，这种情况主要是存在特效粒子中。**
**解决方法是提取前先对周围4点取平均，再用亮度做权重压制,代码如下：**

```c
float2 texelSize = 1.0 / float2(_ScreenParams.x, _ScreenParams.y);

// 采样周围4个像素取平均（Fade Fireflies）
float4 d = texelSize.xyxy * float4(-1, -1, 1, 1);
float4 s0 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + d.xy);
float4 s1 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + d.zy);
float4 s2 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + d.xw);
float4 s3 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + d.zw);
float4 avg = (s0 + s1 + s2 + s3) * 0.25;

// 压制孤立高亮像素
float avgLuminance = dot(avg.rgb, float3(0.2126, 0.7152, 0.0722));
float weight = 1.0 / (avgLuminance + 1.0);
avg *= weight;

```

**亮度越高权重越低，孤立亮斑被周围暗像素拉低，降采样结果就稳定了。**
**COD使用的是更加复杂的处理，软值域处理更加柔和**

```c
 // 计算亮度（Luminance）
float GetLuminance(float3 rgb) 
{
	return dot(rgb, float3(0.2126, 0.7152, 0.0722));
}

// Karis Weighting：亮度越高，权重越低，用于抑制超亮像素的闪烁
float KarisWeight(float3 rgb) 
{
	return 1.0 / (GetLuminance(rgb) + 1.0);
}

// 软阈值核心函数
float3 SoftThreshold(float3 color)
{
	float brightness = GetLuminance(color);
	
	// 软阈值曲线计算
	// x: threshold, y: threshold - knee, z: 2 * knee, w: 0.25 / knee
	float soft = clamp(brightness - _Threshold.y, 0.0, _Threshold.z);
	soft = _Threshold.w * soft * soft;
	
	// 取硬阈值和软阈值的较大者
	float contribution = max(soft, brightness - _Threshold.x);
	
	// 能量归一化
	return color * (contribution / max(brightness, 0.0001));
}
===============================================
===============================================
===============================================
float2 d = _MainTex_TexelSize.xy;
float2 uv = input.uv;

// --- 13-tap 采样分布 (COD WWII 方案) ---
float4 s0 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1.0, -1.0) * d);
float4 s1 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1.0, -1.0) * d);
float4 s2 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1.0,  1.0) * d);
float4 s3 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1.0,  1.0) * d);
float4 s4 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-2.0, -2.0) * d);
float4 s5 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0.0, -2.0) * d);
float4 s6 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 2.0, -2.0) * d);
float4 s7 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-2.0,  0.0) * d);
float4 s8 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0.0,  0.0) * d);
float4 s9 = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 2.0,  0.0) * d);
float4 s10= SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-2.0,  2.0) * d);
float4 s11= SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0.0,  2.0) * d);
float4 s12= SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 2.0,  2.0) * d);

// --- Karis Weight 分组加权 ---
// 通过非线性加权，让极其明亮的单像素权重降低，彻底解决闪烁
float w0 = KarisWeight( (s0 + s1 + s2 + s3).rgb * 0.25 );
float w1 = KarisWeight( (s4 + s5 + s7 + s8).rgb * 0.25 );
float w2 = KarisWeight( (s5 + s6 + s8 + s9).rgb * 0.25 );
float w3 = KarisWeight( (s7 + s8 + s10+ s11).rgb * 0.25 );
float w4 = KarisWeight( (s8 + s9 + s11+ s12).rgb * 0.25 );

float3 color = 0;
color += (s0 + s1 + s2 + s3).rgb * 0.25 * w0;
color += (s4 + s5 + s7 + s8).rgb * 0.25 * w1;
color += (s5 + s6 + s8 + s9).rgb * 0.25 * w2;
color += (s7 + s8 + s10+ s11).rgb * 0.25 * w3;
color += (s8 + s9 + s11+ s12).rgb * 0.25 * w4;
color /= (w0 + w1 + w2 + w3 + w4);

// --- 后处理限制 ---
// 1. Clamp 极值
color = min(color, _ClampMax);

// 2. 应用软阈值提取
color = SoftThreshold(color);

return float4(color, 1.0);
```


## Tent Filter（帐篷滤波）

**发生在上采样阶段。普通上采样直接双线性插值会比较生硬，Tent 是一个 3×3 的权重核，中心权重最高（4），边缘次之（2），角点最低（1），总权重 16：**

```c
1 2 1
2 4 2  ÷ 16
1 2 1
```

**形状像一顶帐篷，所以叫 Tent Filter。比简单平均更柔和，比高斯更轻量，专门用来做上采样叠加时的平滑过渡。**

# 实现的大致效果

## 参数设计

**大部分是参照URP默认的Bloom来的，额外可以设置BlurMode，以及dirtyMask更多的控制**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422161718.png)

## 模糊模式

**模糊种类其实就下面这几种，没有在扩展了**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422162511.png)
**开始是想对比blender的星芒的，但我没搞出来，去查了blender的代码，因为Blender是离线渲染，用的是ComputerShader，emmm，不会，暂时先留个坑吧，而且这个星芒效果开销比较大，属于很难用上的**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422162417.png)
**虽然没搞出来，但是还是保留成了一个比较特别的效果，感觉有点类似近视眼看东西的感觉**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422163043.png)

## 几种效果对比

**几种模式里面BoxBlur效果最差，KawaseBlur因为迭代次数院校，是最柔和的，高斯和DualKawaseBlur差不多，用DualKawaseBlur性能更好一点**
![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422163720.png)

![](/assets/img/MyPJ/Render Feature/Bloom/Pasted image 20260422163536.png)

# 部分参考代码

**源代码我就不放了，不过部分算法代码我还是放在这里，方便拷贝**

## Box

**BoxBlur，这里其实有9Tap的等等，但是反正不怎么用，这里就直接用最简单的4Tap**

```c
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, -1) * texelSize);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, -1) * texelSize);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1,  1) * texelSize);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1,  1) * texelSize);
col /= 4;
```

## Gaussian

```c
 // 水平高斯 9-tap
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-4, 0) * texelSize) * 0.01621622;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-3, 0) * texelSize) * 0.05405405;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-2, 0) * texelSize) * 0.12162162;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 0) * texelSize) * 0.19459459;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0, 0) * texelSize) * 0.22702703;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 0) * texelSize) * 0.19459459;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 2, 0) * texelSize) * 0.12162162;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 3, 0) * texelSize) * 0.05405405;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 4, 0) * texelSize) * 0.01621622;
```

## Kawase

**KawaseOffsets是迭代次数**

```c
 float2 offset = (_KawaseOffset + 0.5) * _MainTex_TexelSize.xy;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1,-1) * offset);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1,-1) * offset);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 1) * offset);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 1) * offset);
col /= 4;
```

## Dual Kawase

```c
 // Dual Kawase 上采样核
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 0) * texelSize * 2.0);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 0) * texelSize * 2.0);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0,-1) * texelSize * 2.0);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0, 1) * texelSize * 2.0);
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1,-1) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1,-1) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 1) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 1) * texelSize) * 2.0;
col /= 12.0;
```

## Star(其实是方形)

**KawaseOffsets当成共用的参数用**

```c
float4 h = 0, v = 0, d1 = 0, d2 = 0;
float offset = pow(2.0, _KawaseOffset); // 每次Pass偏移不同，但只采2个点

h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( offset, 0) * _MainTex_TexelSize.xy);
h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-offset, 0) * _MainTex_TexelSize.xy);

v += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(0,  offset) * _MainTex_TexelSize.xy);
v += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(0, -offset) * _MainTex_TexelSize.xy);

d1 += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( offset,  offset) * _MainTex_TexelSize.xy);
d1 += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-offset, -offset) * _MainTex_TexelSize.xy);

d2 += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-offset,  offset) * _MainTex_TexelSize.xy);
d2 += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( offset, -offset) * _MainTex_TexelSize.xy);

col = (h + v + d1 + d2) / 8.0;
```

## Streak 条状

**KawaseOffsets当成共用的参数用**

```c
float offset = pow(2.0, _KawaseOffset);
// 只做水平方向
float4 h = 0;
h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-offset * 2, 0) * _MainTex_TexelSize.xy);
h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-offset,     0) * _MainTex_TexelSize.xy);
h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( offset,     0) * _MainTex_TexelSize.xy);
h += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( offset * 2, 0) * _MainTex_TexelSize.xy);
col = h * 0.25;
```

## Tent

```c
// Tent 核
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1,-1) * texelSize) * 1.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0,-1) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1,-1) * texelSize) * 1.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 0) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0, 0) * texelSize) * 4.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 0) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2(-1, 1) * texelSize) * 1.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 0, 1) * texelSize) * 2.0;
col += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv + float2( 1, 1) * texelSize) * 1.0;
col /= 16.0;
```
