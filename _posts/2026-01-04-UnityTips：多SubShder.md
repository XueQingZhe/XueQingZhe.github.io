---
layout: post
title: UnityTips：多SubShder
date: 2026-01-04
description: UnityTips：多SubShder
tags: [unity,shader, rendering]
categories: [TAMonth01]
featured: true
toc:
  sidebar: left
comments: true
images:
  spotlight: true
---

## Shader结构层级


```c
Shader "ShaderName"                    // ← 最外层：Shader
{
    Properties { }                      // ← 属性定义（全局）
    
    SubShader                           // ← 第一个SubShader
    {
        Tags { }                        // SubShader Tags
        LOD 200
        
        Pass                            // ← Pass 1
        {
            Tags { }                    // Pass Tags
            // 渲染状态
            CGPROGRAM
            // Shader代码
            ENDCG
        }
        
        Pass                            // ← Pass 2
        {
            CGPROGRAM
            ENDCG
        }
    }
    
    SubShader                           // ← 第二个SubShader（Fallback）
    {
        Pass
        {
            CGPROGRAM
            ENDCG
        }
    }
    
    FallBack "Diffuse"                  // ← 最终Fallback
}
```

## 为什么要多个SubShader？

### 原因1：不同硬件支持

不同的GPU有不同的能力，多个SubShader可以针对不同硬件：

```c
Shader "Custom/MultiPlatform"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
    }
    
    // SubShader 1: 高端设备（PC、主机）
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 300  // Level of Detail 300
        
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 5.0  // Shader Model 5.0（高端）
            
            // 使用复杂特性：
            // - 计算着色器
            // - 曲面细分
            // - 几何着色器
            ENDCG
        }
    }
    
    // SubShader 2: 中端设备（移动高端）
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0  // Shader Model 3.0（中端）
            
            // 较简单的效果
            // - 基础PBR
            // - 简化光照
            ENDCG
        }
    }
    
    // SubShader 3: 低端设备（旧移动设备）
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100
        
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 2.0  // Shader Model 2.0（低端）
            
            // 最简单的效果
            // - 顶点光照
            // - 无阴影
            ENDCG
        }
    }
    
    FallBack "Mobile/Diffuse"  // 如果所有SubShader都不支持
}
```

### 原因2：不同渲染管线


```c
Shader "Custom/MultiPipeline"
{
    Properties { }
    
    // SubShader 1: URP（通用渲染管线）
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" }
        
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #include "Packages/com.unity.render-pipelines.universal/..."
            ENDHLSL
        }
    }
    
    // SubShader 2: HDRP（高清渲染管线）
    SubShader
    {
        Tags { "RenderPipeline"="HDRenderPipeline" }
        
        Pass
        {
            Tags { "LightMode"="Forward" }
            HLSLPROGRAM
            #include "Packages/com.unity.render-pipelines.high-definition/..."
            ENDHLSL
        }
    }
    
    // SubShader 3: Built-in管线
    SubShader
    {
        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #include "UnityCG.cginc"
            ENDCG
        }
    }
}
```

### 原因3：质量分级


```c
Shader "Custom/QualityLevels"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _NormalMap ("Normal Map", 2D) = "bump" {}
    }
    
    // 超高质量：法线贴图 + 视差贴图 + 细节贴图
    SubShader
    {
        LOD 400
        Pass
        {
            CGPROGRAM
            // 完整PBR + 所有贴图
            ENDCG
        }
    }
    
    // 高质量：法线贴图 + PBR
    SubShader
    {
        LOD 300
        Pass
        {
            CGPROGRAM
            // PBR + 法线贴图
            ENDCG
        }
    }
    
    // 中质量：简化光照
    SubShader
    {
        LOD 200
        Pass
        {
            CGPROGRAM
            // Blinn-Phong + 法线贴图
            ENDCG
        }
    }
    
    // 低质量：基础漫反射
    SubShader
    {
        LOD 100
        Pass
        {
            CGPROGRAM
            // Lambert漫反射
            ENDCG
        }
    }
}
```
