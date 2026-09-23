---
section: work
category: ""
title: URP - RendererFeature ：FXAA（快速近似抗锯齿）
date: 2026-09-18
summary: FXAA（快速近似抗锯齿
tags: &a1
  - rendering
  - PostProcess
  - unity
  - URP
  - Pipeline
  - Shader
series: ""
order: 100
cover: /published-assets/d5d6efdfca60b86a550d24b757f94396f177aac4982771d51ff4a972b42d319d.webp
work: ""
notes: []
kind: work
contentId: c62aa2f5-ccee-4555-95b2-2b719d167512
draft: false
tech: *a1
engine:
  - Unity
  - URP
role:
  - Tooling
  - Shader
year: 2026
featured: false
---

# Fast Approximate Anti-Aliasing

## 简单理解

FXAA做的事情：
这个像素在锯齿边缘上吗？如果是，应该往哪偏移采样点来混合两侧颜色？

## 种类

**FXAA有下面三种，效果和开销从高到低。用的最广的是FXAAMobile Quality，这里只实现了FXAA Mobile Quality，Unity也是用的这个。用就用Mobile Quality，需要更好的效果也不会用FXAA了，直接用TAA**

### FXAA Quality

- 端点搜索最多**26步**，用变步长加速（越往外步长越大）
- 搜索精度最高，长斜线处理准确
- 有完整的质量档位枚举（FXAA\_QUALITY\_\_PRESET 10\~39）

### FXAA Mobile Quality

- 端点搜索固定**8步**，等步长
- 质量够用，短边缘处理和PC版几乎一样，长斜线略差
- 去掉了变步长加速逻辑，代码更简单

### FXAA  Console

- **完全没有端点搜索**
- 只做固定的对角线4点采样混合
- 本质上退化成了一个有方向感知的模糊，而不是真正的边缘AA
- 性能最好，质量最差

# 实现流程

## RGB转感知亮度

**FXAA中使用的是`(0.299, 0.587, 0.114)` — BT.601标准，电视的标准**

```c
 // RGB → 亮度（感知亮度公式）
float Luma(float3 rgb)
{
	return dot(rgb, float3(0.299, 0.587, 0.114));
}
```

**现在用的更多是`(0.2126, 0.7152, 0.0722)` — BT.709，现代标准，HDTV/sRGB色彩空间定义，现在经常使用的是这个，但其实计算结果都差不多，用那个都行**

```c
// 计算亮度（Luminance）
float Luma(float3 rgb)
{
	return dot(rgb, float3(0.2126, 0.7152, 0.0722));
}
```

## 剔除不需要的像素

![](/published-assets/e1deba37c4eb8cc6ddc566d2571193939e9727fd3a9ebf1d01ff95eba9b2c008.webp)
**采样十字方向的亮度找到亮度区间，根据亮度区间剔除不需要的像素**

```c
// ---- Step 1: 采样中心和十字方向4邻域亮度 ----
float lumaM  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv).rgb);
float lumaN  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0,  1) * texel).rgb);
float lumaS  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0, -1) * texel).rgb);
float lumaE  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1,  0) * texel).rgb);
float lumaW  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1,  0) * texel).rgb);

// ---- Step 2: 对比度检测，低于阈值直接返回 ----
float lumaMin = min(lumaM, min(min(lumaN, lumaS), min(lumaE, lumaW)));
float lumaMax = max(lumaM, max(max(lumaN, lumaS), max(lumaE, lumaW)));
float contrast = lumaMax - lumaMin; //找到亮度区间

// 绝对阈值 + 相对阈值（暗部抑制）
if (contrast < max(_ContrastThreshold, lumaMax * _RelativeThreshold))
	return SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);

```

**这里需要说明的是参数范围是基本固定的，NVIDIA调参调出来的有效工作区间，不需要自己修改**

```c#
[Tooltip("对比度阈值，低于此值的边缘不处理（绝对值）")]
[Range(0.0312f, 0.0833f)] public float contrastThreshold = 0.0312f;

[Tooltip("相对阈值，过滤暗部噪点")]
[Range(0.063f, 0.333f)] public float relativeThreshold = 0.063f;
```

## 判断边缘走向

**判断边缘其实就是描边算法中的sobel算子**
![](/published-assets/c8e24b03be995c49aac4d0b6985f049f501bad141dec54de5819e4240a31a240.webp)
![](/published-assets/7299ec53af5bed1c1146ba709cf829d734bd6bfe0aa145cbdeee44b77956e5d8.webp)
**这里和描边算法不同的是，这里是直接计算水平和垂直的那个比例更大，然后取就可以知道边缘大概是那个方向走向，然后在取垂直边缘的像素进行计算梯度**

```c
 // ---- Step 3: 采样对角线的四个角 ----
float lumaNW = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1,  1) * texel).rgb);
float lumaNE = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1,  1) * texel).rgb);
float lumaSW = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1, -1) * texel).rgb);
float lumaSE = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1, -1) * texel).rgb);

// 对水平和垂直方向分别计算梯度
float horizontal =
	abs(lumaNW + 2*lumaN + lumaNE - lumaSW - 2*lumaS - lumaSE); // Sobel水平
float vertical =
	abs(lumaNW + 2*lumaW + lumaSW - lumaNE - 2*lumaE - lumaSE); // Sobel垂直

bool isHorizontal = horizontal >= vertical;

// 垂直于边缘的两侧luma
float luma1 = isHorizontal ? lumaS : lumaW;
float luma2 = isHorizontal ? lumaN : lumaE;
float gradient1 = abs(luma1 - lumaM);
float gradient2 = abs(luma2 - lumaM);
```

**然后判断两侧的梯度那个更大，更大的一方就是边缘外扩的方向，梯度大 = 变化剧烈 = 边缘在那边。**

```c
bool is1Steeper = gradient1 >= gradient2;
float gradientScaled = 0.25 * max(gradient1, gradient2);

// 步进方向（垂直于边缘，指向更陡的一侧）
float stepLength = isHorizontal ? texel.y : texel.x;
float lumaLocalAvg;
if (!is1Steeper) stepLength = -stepLength;
lumaLocalAvg = 0.5 * (is1Steeper ? luma1 : luma2) + 0.5 * lumaM;
```

## 找到边缘的两侧端点

**这里需要说明，找两侧端点不是针对具体方向的，边缘而是斜方向的，因为Sobel采样是间隔一个像素同时垂直与边缘，那么边缘应该在中间，所以取半个像素步进，也就得到边缘像素，再由边缘像素去寻找斜方向两端的像素**

```c
// ---- Step 5: 沿边缘方向搜索端点 ----
float2 currentUV = uv;
float2 offset = isHorizontal ? float2(texel.x, 0) : float2(0, texel.y);

//因为比对差异变化的时候是只间隔了一个像素，所以步进为半个像素
if (isHorizontal) 
{
	currentUV.y += stepLength * 0.5;
}
else              
{
	currentUV.x += stepLength * 0.5;
}

// 向两端各搜索最多8步（可以调整，步数越多越精确但越贵）
float2 uv1 = currentUV - offset;
float2 uv2 = currentUV + offset;

float lumaEnd1 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv1).rgb) - lumaLocalAvg;
float lumaEnd2 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv2).rgb) - lumaLocalAvg;

bool reached1 = abs(lumaEnd1) >= gradientScaled;
bool reached2 = abs(lumaEnd2) >= gradientScaled;


// 最多迭代8步（FXAA Quality可以到12步）
[unroll]
for (int s = 0; s < 8 && !(reached1 && reached2); s++)
{
	if (!reached1) { uv1 -= offset; lumaEnd1 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv1).rgb) - lumaLocalAvg; }
	if (!reached2) { uv2 += offset; lumaEnd2 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv2).rgb) - lumaLocalAvg; }
	reached1 = abs(lumaEnd1) >= gradientScaled;
	reached2 = abs(lumaEnd2) >= gradientScaled;
}

```

## 计算混合权重

**拿垂直方向的梯度做基准来找斜方向的两个端点,斜方向的两个端点不一定对称,所以有步进的长短差别。默认偏移是lumaM - lumaLocalAvg，假设是正的，那么近的端点减去基准值后也就是lumaEnd1(或者lumaEnd2)一定是负的，因为离得越近表示变化更小，基准值是由整体的平均变化量的来**

```c
// ---- Step 6: 计算像素在边缘上的位置，得到blend权重 ----
//计算获取端点，步进了多少
float dist1 = isHorizontal ? (uv.x - uv1.x) : (uv.y - uv1.y);  
float dist2 = isHorizontal ? (uv2.x - uv.x) : (uv2.y - uv.y);

bool direction1 = dist1 < dist2; // 离哪端更近
float edgeBlend = 0.5 - min(dist1, dist2) / (dist1 + dist2);

// 检查中心luma方向是否和边缘一致，不一致说明不在边缘上
float lumaCenter = lumaM - lumaLocalAvg;
//因为不对称，近的一端减去基准值，应该会和中心减去基准值异号
bool goodSpan = (direction1 ? lumaEnd1 : lumaEnd2) < 0 != lumaCenter < 0;
float spanLength = edgeBlend;
//如果同号说明不在边缘混合重置为0
if (!goodSpan) spanLength = 0;
```

## 亚像素混合（解决单像素高光、细线噪点）

**还是取3x3邻域进行平均，对角线权重为2，十字则为1，所以除以12，利用这个平均权重来作为偏移的权重**

```c
// ---- Step 7: 亚像素混合（消除粗糙锯齿）----
// 3x3邻域加权平均
float lumaAvg = (1.0/12.0) * (2*(lumaN+lumaS+lumaE+lumaW) + lumaNW+lumaNE+lumaSW+lumaSE);

//越亮的像素就进行更强的混合
float subpixelOffset = saturate(abs(lumaAvg - lumaM) / contrast);
subpixelOffset = smoothstep(0, 1, subpixelOffset);
subpixelOffset = subpixelOffset * subpixelOffset * _SubpixelBlending;

// 取两种offset中较大的
float finalOffset = max(spanLength, subpixelOffset);
```

# 效果预览

## 开启前

![](/published-assets/ee0270130cf090e8b9437684670903258ab43b464abe94b434adaaf6c4cea1c8.webp)

## 开启后

![](/published-assets/d483aef429a3d9754f1b47c4a53d34bb8288ac222c75addbd6578e1fcfba5164.webp)

# 完整代码

## C#代码

```c#
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class CustomFXAA : ScriptableRendererFeature
{
    [System.Serializable]
    public class FXAASettings
    {
        public Shader fxaaShader;

        [Tooltip("对比度阈值，低于此值的边缘不处理（绝对值）")]
        [Range(0.0312f, 0.0833f)] public float contrastThreshold = 0.0312f;

        [Tooltip("相对阈值，过滤暗部噪点")]
        [Range(0.063f, 0.333f)] public float relativeThreshold = 0.063f;

        [Tooltip("亚像素混合强度")]
        [Range(0f, 1f)] public float subpixelBlending = 0.75f;
    }

    public FXAASettings settings = new FXAASettings();
    private CustomFXAARenderPass _pass;
    private Material _material;

    public override void Create()
    {
        if (settings.fxaaShader == null) return;
        if (_material == null)
            _material = CoreUtils.CreateEngineMaterial(settings.fxaaShader);

        _pass = new CustomFXAARenderPass(settings, _material)
        {
            renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing
        };
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
    {
        if (_material == null || settings.fxaaShader == null) return;
        // 只在Game相机和SceneView相机上执行，过滤掉其他类型
        var cameraType = renderingData.cameraData.cameraType;
        if (cameraType != CameraType.Game && cameraType != CameraType.SceneView) return;
        
        // ---材质传参---
        _pass.UpdateSettings(settings);

        _pass.Setup(renderer.cameraColorTarget);
        renderer.EnqueuePass(_pass);
    }

    protected override void Dispose(bool disposing)
    {
        CoreUtils.Destroy(_material);
    }
}

public class CustomFXAARenderPass : ScriptableRenderPass
{
    private CustomFXAA.FXAASettings _settings;
    private Material _material;
    private RenderTargetIdentifier _cameraColorTarget;

    private int _tempRTID;
    private RenderTargetIdentifier _tempRT;

    // Shader 属性 ID 化（性能优化：避免每帧通过字符串查找）
    private static readonly int ContrastThresholdID = Shader.PropertyToID("_ContrastThreshold");
    private static readonly int RelativeThresholdID = Shader.PropertyToID("_RelativeThreshold");
    private static readonly int SubpixelBlendingID = Shader.PropertyToID("_SubpixelBlending");
    
    public CustomFXAARenderPass(CustomFXAA.FXAASettings settings, Material material)
    {
        _settings = settings;
        _material = material;
        _tempRTID = Shader.PropertyToID("_FXAATemp");

    }

    public void UpdateSettings(CustomFXAA.FXAASettings settings)
    {
        _settings = settings;
    }

    public void Setup(RenderTargetIdentifier colorTarget)
    {
        _cameraColorTarget = colorTarget;
    }

    public override void OnCameraSetup(CommandBuffer cmd, ref RenderingData renderingData)
    {
        var desc = renderingData.cameraData.cameraTargetDescriptor;
        desc.depthBufferBits = 0;
        desc.msaaSamples = 1;
        cmd.GetTemporaryRT(_tempRTID, desc, FilterMode.Bilinear);
        _tempRT = new RenderTargetIdentifier(_tempRTID);
    }

    public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
    {
        
        if (_material == null) return;
        CommandBuffer cmd = CommandBufferPool.Get("CustomFXAA");
        // ---传参---
        _material.SetFloat(ContrastThresholdID, _settings.contrastThreshold);
        _material.SetFloat(RelativeThresholdID, _settings.relativeThreshold);
        _material.SetFloat(SubpixelBlendingID, _settings.subpixelBlending);


        // 把屏幕尺寸传给shader（FXAA需要知道texelSize）
        var desc = renderingData.cameraData.cameraTargetDescriptor;


        // Color → FXAA处理 → 中转RT → 回写Color
        Blit(cmd, _cameraColorTarget, _tempRT, _material, 0);
        Blit(cmd, _tempRT, _cameraColorTarget);
        //Debug.Log("FXAA Execute");
        context.ExecuteCommandBuffer(cmd);
        CommandBufferPool.Release(cmd);
    }

    public override void OnCameraCleanup(CommandBuffer cmd)
    {
        cmd.ReleaseTemporaryRT(_tempRTID);
    }
}
```

## Shader代码

```c
Shader "Hidden/FXAA"
{
    Properties
    {
        _MainTex ("Source", 2D) = "white" {}
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Cull Off ZWrite Off ZTest Always

        Pass
        {
            Name "FXAA"
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            float4 _MainTex_TexelSize;
            float  _ContrastThreshold;
            float  _RelativeThreshold;
            float  _SubpixelBlending;

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings   { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert(Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = v.uv;
                return o;
            }

            // RGB → 亮度（感知亮度公式）
            float Luma(float3 rgb)
            {
                return dot(rgb, float3(0.299, 0.587, 0.114));
            }

            float4 frag(Varyings i) : SV_Target
            {
                float2 uv = i.uv;
                float2 texel = _MainTex_TexelSize.xy;

                // ---- Step 1: 采样中心和十字方向4邻域亮度 ----
                float lumaM  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv).rgb);
                float lumaN  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0,  1) * texel).rgb);
                float lumaS  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 0, -1) * texel).rgb);
                float lumaE  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1,  0) * texel).rgb);
                float lumaW  = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1,  0) * texel).rgb);

                // ---- Step 2: 对比度检测，低于阈值直接返回 ----
                float lumaMin = min(lumaM, min(min(lumaN, lumaS), min(lumaE, lumaW)));
                float lumaMax = max(lumaM, max(max(lumaN, lumaS), max(lumaE, lumaW)));
                float contrast = lumaMax - lumaMin; //找到亮度区间

                // 绝对阈值 + 相对阈值（暗部抑制）
                if (contrast < max(_ContrastThreshold, lumaMax * _RelativeThreshold))
                    return SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);

                // if (contrast < max(_ContrastThreshold, lumaMax * _RelativeThreshold))
                //     return float4(0, 0, 0, 1); // 黑色标记边缘

                // ---- Step 3: 采样对角线的四个角 ----
                float lumaNW = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1,  1) * texel).rgb);
                float lumaNE = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1,  1) * texel).rgb);
                float lumaSW = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(-1, -1) * texel).rgb);
                float lumaSE = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2( 1, -1) * texel).rgb);

                // ---- Step 4: 判断边缘方向（水平 or 垂直）----
                // 对水平和垂直方向分别计算梯度
                float horizontal =
                    abs(lumaNW + 2*lumaN + lumaNE - lumaSW - 2*lumaS - lumaSE); // Sobel水平
                float vertical =
                    abs(lumaNW + 2*lumaW + lumaSW - lumaNE - 2*lumaE - lumaSE); // Sobel垂直

                bool isHorizontal = horizontal >= vertical;

                // 垂直于边缘的两侧luma
                float luma1 = isHorizontal ? lumaS : lumaW;
                float luma2 = isHorizontal ? lumaN : lumaE;
                float gradient1 = abs(luma1 - lumaM);
                float gradient2 = abs(luma2 - lumaM);

                // 梯度更大的一侧是边缘方向
                bool is1Steeper = gradient1 >= gradient2;
                //float gradientScaled = 0.25 * max(gradient1, gradient2);//边缘检索端点阈值
                float gradientScaled = max(0.25 * max(gradient1, gradient2), 1.0/128.0);
             
                
                // 步进方向（垂直于边缘，指向更缓的一侧）
                float stepLength = isHorizontal ? texel.y : texel.x;
                float lumaLocalAvg;
                //混合需要在更缓的一侧进行混合
                if (is1Steeper) stepLength = -stepLength;
                lumaLocalAvg = 0.5 * (is1Steeper ? luma1 : luma2) + 0.5 * lumaM; //平均亮度

                // ---- Step 5: 沿边缘方向搜索端点 ----
                float2 currentUV = uv;
                float2 offset = isHorizontal ? float2(texel.x, 0) : float2(0, texel.y);

                //因为比对差异变化的时候是只间隔了一个像素，所以步进为半个像素
                if (isHorizontal) 
                {
                    currentUV.y += stepLength * 0.5;
                }
                else              
                {
                    currentUV.x += stepLength * 0.5;
                }

                // 向两端各搜索最多8步（可以调整，步数越多越精确但越贵）
                float2 uv1 = currentUV - offset;
                float2 uv2 = currentUV + offset;

                float lumaEnd1 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv1).rgb) - lumaLocalAvg;
                float lumaEnd2 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv2).rgb) - lumaLocalAvg;

                bool reached1 = abs(lumaEnd1) >= gradientScaled;
                bool reached2 = abs(lumaEnd2) >= gradientScaled;

                
                // 最多迭代8步（FXAA Quality可以到12步）
                [unroll]
                for (int s = 0; s < 8 && !(reached1 && reached2); s++)
                {
                    if (!reached1) { uv1 -= offset; lumaEnd1 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv1).rgb) - lumaLocalAvg; }
                    if (!reached2) { uv2 += offset; lumaEnd2 = Luma(SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv2).rgb) - lumaLocalAvg; }
                    reached1 = abs(lumaEnd1) >= gradientScaled;
                    reached2 = abs(lumaEnd2) >= gradientScaled;
                }

                // ---- Step 6: 计算像素在边缘上的位置，得到blend权重 ----
                //计算获取端点，步进了多少
                float dist1 = isHorizontal ? (currentUV.x - uv1.x) : (currentUV.y - uv1.y);  
                float dist2 = isHorizontal ? (uv2.x - currentUV.x) : (uv2.y - currentUV.y);

                bool direction1 = dist1 < dist2; // 离哪端更近
                float edgeBlend = 0.5 - min(dist1, dist2) / (dist1 + dist2);

                // 检查中心luma方向是否和边缘一致，不一致说明不在边缘上
                float lumaCenter = lumaM - lumaLocalAvg;
                //因为不对称，近的一端减去基准值，应该会和中心减去基准值异号
                bool goodSpan = (direction1 ? lumaEnd1 : lumaEnd2) < 0 != lumaCenter < 0;

                if (dist1 + dist2 < 0.00001)
                {
                    return SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv);
                }
                float spanLength = edgeBlend;
                 
                //如果同号说明不在边缘混合重置为0
                if (!goodSpan) spanLength = 0;

                // ---- Step 7: 亚像素混合（解决单像素高光、细线噪点）----
                // 3x3邻域加权平均
                float lumaAvg = (1.0/12.0) * (2*(lumaN+lumaS+lumaE+lumaW) + lumaNW+lumaNE+lumaSW+lumaSE);
                
                //越亮的像素就进行更强的混合
                float subpixelOffset = saturate(abs(lumaAvg - lumaM) / contrast);
                subpixelOffset = smoothstep(0, 1, subpixelOffset);
                subpixelOffset = subpixelOffset * subpixelOffset * _SubpixelBlending;

                // 取两种offset中较大的
                float finalOffset = max(spanLength, subpixelOffset);

                // ---- Step 8: 采样最终颜色 ----
                float2 finalUV = uv;

                //finalUV.y += 5.0 * texel.y; // 强制往上偏移5个像素

                if (isHorizontal) 
                {
                    finalUV.y += finalOffset * stepLength;
                }
                else              
                {
                    finalUV.x += finalOffset * stepLength;
                }

                return SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, finalUV);
            }
            ENDHLSL
        }
    }
}
```
