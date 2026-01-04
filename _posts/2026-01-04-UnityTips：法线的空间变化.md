---
layout: post
title: UnityTips：法线的空间变化
date: 2026-01-04
description: UnityTips：法线的空间变化
tags: [unity, shader, rendering]
categories: [TAMonth01]
featured: true
toc:
  sidebar: left
comments: true
images:
  spotlight: true
---

# 法线空间转换

***通常法线空间转换，使用下面两种方法***

## 1使用内置函数

```c
o.normalWS = unity_ObjectToWorldNormal(v.normalOS);
o.tangentWS = UnityObjectToWorldDir(v.tangentOS);
```

## 2使用矩阵乘法


```c
o.normalWS = mul(float4(v.normalOS, 0.0), unity_WorldToObject).xyz;
o.tangentWS = mul(unity_ObjectToWorld, float4(v.tangentOS.xyz, 0.0)).xyz;
```

***D:\Unity\2022.3.62f3c1\Editor\Data\CGIncludes\UnityCG.cginc。在源文件中Unity的转换方法是这样的。***
![](/assets/img/TAMonth01/Pasted image 20251205170810.png)

# 关于法线的矩阵乘法顺序

***对于法线和切线转换，调用顺序是不一样的，这是为什么呢***

```c
o.normalWS = mul(float4(v.normalOS, 0.0), unity_WorldToObject).xyz;
o.tangentWS = mul(unity_ObjectToWorld, float4(v.tangentOS.xyz, 0.0)).xyz;
```

***通常来说，以切线为准，切线直接使用unity_ObjectToWorld转换就可以了***

```c
o.tangentWS = mul(unity_ObjectToWorld, float4(v.tangentOS, 0.0));
```

***法线转换是不能直接这样做的，因为在非均匀缩放的时候法线会跟着变。这里需要推一下***
  ![](/assets/img/TAMonth01/tempFileForShare_20251205-181701(1).jpg)

## 副切线（副法线）


```c
o.binormalWS = normalize(cross(o.normalWS, o.tangentWS)) * v.tangent.w;
//* v.tangent.w是为了处理不同平台副法线翻转问题
```
