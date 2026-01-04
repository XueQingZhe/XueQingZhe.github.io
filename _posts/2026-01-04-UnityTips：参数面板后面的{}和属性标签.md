---
layout: post
title: UnityTips：参数面板后面的{}和属性标签
date: 2026-01-04
description: UnityTips：参数面板后面的{}和属性标签
tags: [unity,shader, rendering]
categories: [TAMonth01]
featured: true
toc:
  sidebar: left
comments: true
images:
  spotlight: true
---

***在声明变量的时候，后面默认参数会加一个{}，这其实是以前的属性标签的旧语法，现在已经废弃了，但为了向旧版本兼容所有留下来了，保持空白就行。不写也能编译过的***

```c
 Properties
    {
        _MainTex ("MainTex", 2D) = "white" {}
    }
```

## 属性标签

**以下是 Unity ShaderLab 中常用的属性标签（Property Attributes），按功能分类：**

## 📦 纹理相关

|标签|说明|示例|
|---|---|---|
|`[MainTexture]`|标记为主纹理，Material.mainTexture 会自动引用|`[MainTexture] _BaseMap`|
|`[MainColor]`|标记为主颜色，Material.color 会自动引用|`[MainColor] _BaseColor`|
|`[NoScaleOffset]`|隐藏纹理的缩放和偏移控件|`[NoScaleOffset] _MainTex`|
|`[Normal]`|标记为法线贴图|`[Normal] _BumpMap`|
|`[PerRendererData]`|纹理数据来自每个渲染器（如 SpriteRenderer）|`[PerRendererData] _MainTex`|

## 🎨 颜色相关

|标签|说明|示例|
|---|---|---|
|`[HDR]`|高动态范围颜色（显示拾色器）|`[HDR] _EmissionColor`|
|`[Gamma]`|标记颜色/浮点数为 Gamma 空间（sRGB）|`[Gamma] _Color`|

## 🔢 数值范围与类型

|标签|说明|示例|
|---|---|---|
|`[IntRange]`|整数范围滑块|`[IntRange] _Quality`|
|`[PowerSlider]`|指数曲线滑块|`[PowerSlider(3.0)] _Smoothness`|
|`[Enum]`|自定义枚举下拉菜单|`[Enum(Off,0,On,1)] _Mode`|
|`[KeywordEnum]`|为每个选项生成 Shader Keyword|`[KeywordEnum(None,Add,Multiply)] _Blend`|
|`[Toggle]`|开关（生成 `property name_ON` keyword）|`[Toggle] _USE_FEATURE`|
|`[ToggleUI]`|开关（不生成 keyword，仅 UI）|`[ToggleUI] _Advanced`|

## 📐 UI 布局

|标签|说明|示例|
|---|---|---|
|`[Space]`|添加垂直间距|`[Space]`|
|`[Space(20)]`|添加指定高度的间距|`[Space(20)]`|
|`[Header]`|添加分组标题|`[Header(Main Settings)]`|

## ⚙️ 高级控制

|标签|说明|示例|
|---|---|---|
|`[HideInInspector]`|在 Inspector 中隐藏|`[HideInInspector] _Internal`|
|`[NonModifiableTextureData]`|纹理不可修改（只读）|`[NonModifiableTextureData] _LUT`|

## 📊 向量分量控制

|标签|说明|示例|
|---|---|---|
|`[Vector2]`|限制为 2 分量向量|`[Vector2] _Tiling`|
|`[Vector3]`|限制为 3 分量向量|`[Vector3] _Position`|

## 🔄 特殊用途

|标签|说明|适用版本|
|---|---|---|
|`[Curve]`|曲线编辑器（用于 float 属性）|Unity 2020+|
|`[Gradient]`|渐变编辑器（需要自定义绘制）|需自定义|

---

## 📝 综合使用示例以下是 Unity ShaderLab 中常用的属性标签（Property Attributes），按功能分类：

## 📦 纹理相关

|标签|说明|示例|
|---|---|---|
|`[MainTexture]`|标记为主纹理，Material.mainTexture 会自动引用|`[MainTexture] _BaseMap`|
|`[MainColor]`|标记为主颜色，Material.color 会自动引用|`[MainColor] _BaseColor`|
|`[NoScaleOffset]`|隐藏纹理的缩放和偏移控件|`[NoScaleOffset] _MainTex`|
|`[Normal]`|标记为法线贴图|`[Normal] _BumpMap`|
|`[PerRendererData]`|纹理数据来自每个渲染器（如 SpriteRenderer）|`[PerRendererData] _MainTex`|

## 🎨 颜色相关

|标签|说明|示例|
|---|---|---|
|`[HDR]`|高动态范围颜色（显示拾色器）|`[HDR] _EmissionColor`|
|`[Gamma]`|标记颜色/浮点数为 Gamma 空间（sRGB）|`[Gamma] _Color`|

## 🔢 数值范围与类型

|标签|说明|示例|
|---|---|---|
|`[IntRange]`|整数范围滑块|`[IntRange] _Quality`|
|`[PowerSlider]`|指数曲线滑块|`[PowerSlider(3.0)] _Smoothness`|
|`[Enum]`|自定义枚举下拉菜单|`[Enum(Off,0,On,1)] _Mode`|
|`[KeywordEnum]`|为每个选项生成 Shader Keyword|`[KeywordEnum(None,Add,Multiply)] _Blend`|
|`[Toggle]`|开关（生成 `property name_ON` keyword）|`[Toggle] _USE_FEATURE`|
|`[ToggleUI]`|开关（不生成 keyword，仅 UI）|`[ToggleUI] _Advanced`|

## 📐 UI 布局

|标签|说明|示例|
|---|---|---|
|`[Space]`|添加垂直间距|`[Space]`|
|`[Space(20)]`|添加指定高度的间距|`[Space(20)]`|
|`[Header]`|添加分组标题|`[Header(Main Settings)]`|

## ⚙️ 高级控制

|标签|说明|示例|
|---|---|---|
|`[HideInInspector]`|在 Inspector 中隐藏|`[HideInInspector] _Internal`|
|`[NonModifiableTextureData]`|纹理不可修改（只读）|`[NonModifiableTextureData] _LUT`|

## 📊 向量分量控制

|标签|说明|示例|
|---|---|---|
|`[Vector2]`|限制为 2 分量向量|`[Vector2] _Tiling`|
|`[Vector3]`|限制为 3 分量向量|`[Vector3] _Position`|

## 🔄 特殊用途

|标签|说明|适用版本|
|---|---|---|
|`[Curve]`|曲线编辑器（用于 float 属性）|Unity 2020+|
|`[Gradient]`|渐变编辑器（需要自定义绘制）|需自定义|

## 📝 综合使用示例


```c
Properties {
    // ========== 标题和间距 ==========
    [Header(Main Settings)]
    [Space(10)]
    
    // 主纹理和颜色（会被 Material.mainTexture/color 引用）
    [MainTexture] [NoScaleOffset] _BaseMap ("Albedo", 2D) = "white" {}
    [MainColor] _BaseColor ("Color", Color) = (1,1,1,1)
    
    [Space]
    [Header(Normal and Height)]
    
    // 法线贴图
    [Normal] _BumpMap ("Normal Map", 2D) = "bump" {}
    
    // 开关控制
    [Toggle(_PARALLAXMAP)] _UseParallax ("Use Parallax", Float) = 0
    
    [Space(15)]
    [Header(Effects)]
    
    // HDR 颜色
    [HDR] _EmissionColor ("Emission", Color) = (0,0,0,1)
    
    // 指数滑块
    [PowerSlider(3.0)] _Smoothness ("Smoothness", Range(0,1)) = 0.5
    
    // 枚举下拉
    [Enum(UnityEngine.Rendering.BlendMode)] _SrcBlend ("Src Blend", Float) = 1
    [Enum(UnityEngine.Rendering.BlendMode)] _DstBlend ("Dst Blend", Float) = 0
    
    // 关键字枚举（会生成多个 Shader Variant）
    [KeywordEnum(None, Add, Multiply, Screen)] _BlendMode ("Blend Mode", Float) = 0
    
    [Space]
    [Header(Advanced)]
    
    // 内部变量（不显示）
    [HideInInspector] _Internal ("", Float) = 0
    
    // 每渲染器数据
    [PerRendererData] _RendererColor ("Renderer Color", Color) = (1,1,1,1)
}
```
