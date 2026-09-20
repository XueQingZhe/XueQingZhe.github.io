---
title: 10_添加环境光
date: 2026-01-08
summary: 10_添加环境光
tech:
  - shader
  - rendering
  - tutorials
  - unity
kind: tutorial
series: Unity-绝区零角色渲染-星见雅
order: 9
legacyUrl: /tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/10_添加环境光/
draft: false
---


## 添加环境光

### 球谐光照原理

![](/assets/img/ZZZRendering/Pasted%20image%2020250320161546.png)
![](/assets/img/ZZZRendering/Pasted%20image%2020250320230227.png)

### 内置函数SH

#### Built-in Render Pipeline

***内置sh函数***

```c
Tags { "LightMode"="ForwardBase"}
--------------------------------------------
#pragma multi_compile_fwdbase
#include "AutoLight.cginc"
-------------------------------------------
//************************************
//SH代码 内置函数
//**********************************
half3 env_color = ShadeSH9(float4(normal_dir,1.0));

```

#### Universal Render Pipeline

***内置sh函数***

```c
 float3 ambientColor = SampleSH(pixelNormalWS);
```

***函数对应内容在下方文件中***
***GlobalIllumination.hlsl文件***
![](/assets/img/ZZZRendering/Pasted%20image%2020250320171830.png)
***SphericalHarmonics.hlsl文件***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321145059.png)

### 添加球谐光照

#### 新增参数

***增加环境光强度控制参数***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321143939.png)

#### 计算SH

***使用GammaColor进行混合颜色和_AmbientColorIntensity控制强度。最终输出颜色直接加上环境光颜色即可，但这里做了额外的处理，提取出高光颜色大于1的部分在相加，因为SH环境光是加法混合，整体颜色变亮可能会让高光效果不明显，所以这里为增加高光做处理。***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321143721.png)

```c
//Sh球谐光照
float3 ambientColor = SampleSH(pixelNormalWS) * gammaColor * _AmbientColorIntensity;
float3 color = ambientColor;
color += pbrDiffuseColor * albedo + pbrSpecularColor * specularColor * albedo;
color += max(0, pbrSpecularColor * specularColor * albedo - 1);

//雾效颜色混合设置
color = MixFog(color, input.positionWSAndFogFactor);
```

### 当前效果

![](/assets/img/ZZZRendering/Pasted%20image%2020250321145740.png)

![](/assets/img/ZZZRendering/Pasted%20image%2020250321150122.png)

***左边是没有环境光，右面是加上环境光处理过的。***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321150853.png)
