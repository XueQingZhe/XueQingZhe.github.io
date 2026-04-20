---
layout: post
title: 碧蓝幻想角色渲染
description: 碧蓝幻想角色渲染
img: assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913165507.png
importance: 1
category: [rendering]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---


## 模型

***头部，身体，武器分离，动画分离。***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911213119.png)

## 贴图

***基础（默认）的一套贴图加各类不同的配色贴图***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911213247.png)

### NRM_base基本颜色贴图

#### 贴图

##### RGB通道

***颜色信息***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215532.png)

##### A通道

***区分皮肤和非皮肤区域的Mask***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215703.png)

#### 预览

##### RGB通道

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215757.png)

##### A通道

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215741.png)

### NRM_Sss贴图

#### 贴图

##### RGB通道

***含颜色信息，相较于NRM_base贴图，亮度降低，为暗部颜色***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215933.png)

##### A通道

***可以用于控制边缘光强度***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220412.png)

#### 预览

##### RGB通道

***含颜色信息，相较于NRM_base贴图，亮度降低，为暗部颜色***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220234.png)

##### A通道

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220154.png)

### NRM_ilm贴图

#### 贴图

##### RGBA

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911215356.png)

##### R通道

***高光强度信息***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214514.png)

##### G通道

***用于偏移阴影***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214559.png)

##### B通道

***高光范围大小，类光滑度***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214628.png)

##### A通道

***内描边信息***
*这里的描线是作为主体，较为严格，要求横平竖直*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214645.png)

#### 预览

##### R通道

***高光强度信息***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214802.png)

##### G通道

***用于偏移阴影，因为偏移阴影有正负之分，所以选择中灰度为不偏移，小于0.5和大于0.5都会偏移***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214822.png)

##### B通道

***高光范围大小，类光滑度***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214839.png)

##### A通道

***内描边信息***
*这里的描线是作为主体，较为严格，要求横平竖直*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911214908.png)

### NRM_detail贴图

#### 贴图

***含有部部分细节描边信息以及面部的渐变色***
*这里的描线是作为点缀使用，较为随意，没有要求横平竖直，但是为了避免锯齿所以像素要求更大，为2048x2048*
**注意：此贴图采用第二套UV进行采样**
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220513.png)

#### 预览

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220554.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911220645.png)

## 顶点色

### R通道

***存入了AO信息，控制遮挡关系***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911221312.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911221331.png)

### G通道

***空***

### B通道

***此通道是利用顶点色控制描边的深度***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911221643.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911221627.png)

### A通道

***空***

## Shader实现

### 获得基本Diffuse颜色

***采用NdotV获得光照信息，获得值范围为-1~1***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912094236.png)

```c
//向量
half3 normalDir = normalize(i.normal_world);
half3 lightDir = normalize(_WorldSpaceLightPos0.xyz);            
//diffuse
half NdotL = dot(normalDir, lightDir);//-1~1结果
```

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912094112.png)

### 卡通渲染二值化

#### 简易实现二值化方法

*此方法控制性较低*
***阴影二值化可以使用Step函数进行实现***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912094433.png)

```c
half toon_diffuse = step(0.0, NdotL);//色阶化(阴影二值化)
```

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912094505.png)

#### 替换方法

***_ToonThesHold表示阴影偏移阈值，控制阴影偏移***
***ToonHardness表示阴影软硬度，控制阴影软硬***

```c
_ToonThesHold("ToonThesHold", Range(0, 1)) = 0.5
_ToonHardness("ToonHardness", Float) = 20.0
```

***将原来的NdotV替换为半兰伯特half_lambert，实际就是重映射到了0~1，取值范围仅原有的一半***
***使用half_lambert减去_ToonThesHold即可控制阴影偏移，乘上_ToonHardness并进行钳制到0~1，增大_ToonHardness时小数则会越来越少即可达到边缘变硬***

```c
//diffuse
half NdotL = dot(normalDir, lightDir);          //-1~1结果
half half_lambert = (NdotL + 1.0) * 0.5;        //0~1结果
half toon_diffuse = saturate((half_lambert - _ToonThesHold) * _ToonHardness); 
```

***_ToonThesHold = 0.5；
_ToonHardness = 20；时***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912100246.png)
***_ToonThesHold = 0.7；
_ToonHardness = 20；时阴影偏移***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912100440.png)
***_ToonThesHold = 0.7；
_ToonHardness = 40；时阴影边缘变硬***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912100532.png)

### 获得基本卡通光影

#### 混合阴影输出颜色

***将基本颜色贴图颜色和光影颜色混合***

```c
// sample the texture
half4 base_map = tex2D(_BaseMap, uv1);
half3 base_color = base_map.rgb;
//diffuse
half NdotL = dot(normalDir, lightDir);          //-1~1结果
half half_lambert = (NdotL + 1.0) * 0.5;        //0~1结果
//色阶化(阴影二值化)
half toon_diffuse = saturate((half_lambert - _ToonThesHold) * _ToonHardness);
******************************************************************
//最终颜色
half3 final_color = toon_diffuse * base_color;
return float4(final_color, 1.0);
```

***此时获得了基本的卡通光照，但阴影部分还是死黑的，所以需要后续处理***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912101412.png)

#### 简单的阴影提亮方式

*此方法精细度稍差，所以碧蓝幻想采用了SSS贴图进行采样黑色部分*
***将Toon_diffuse直接加上0.5，这样原本死黑的部分变为中灰度0.5，会显示原本颜色的0.5亮度***

```c
half toon_diffuse = saturate((half_lambert - _ToonThesHold) * _ToonHardness);   
Toon_diffuse = saturate(toon_diffuse + 0.5);
******************************************************************
//最终颜色
half3 final_color = toon_diffuse * base_color;
return float4(final_color, 1.0);
```

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912102041.png)

#### 碧蓝幻想暗部颜色采样

***采样了NRM_Sss贴图的颜色信息，使用toon_diffuse作为lerp函数的Alpha值控制输出亮部和暗部的颜色***

```c
// sample the texture
half4 base_map = tex2D(_BaseMap, uv1);
half3 base_color = base_map.rgb;
half4 sss_map = tex2D(_SSSMap, uv1);
half3 sss_color = sss_map.rgb;
//diffuse
half NdotL = dot(normalDir, lightDir);          //-1~1结果
half half_lambert = (NdotL + 1.0) * 0.5;        //0~1结果
half toon_diffuse = saturate((half_lambert - _ToonThesHold) * _ToonHardness);   
*****************************************************************************
half3 final_color = lerp(sss_color, base_color, toon_diffuse);
return float4(final_color, 1.0);
```

***可以看出阴影部分颜色要精细很多***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912102850.png)

### 使用NRM_ilm贴图(G通道)

#### 控制阴影偏移(G通道)

***使用half_lambert+diffuse_control对原阴影进行偏移**

```c
//ILM贴图
half4 ilm_map = tex2D(_ILMMap, uv1);
half spec_intensity = ilm_map.r;  //高光强度
half diffuse_control = ilm_map.g; //阴影偏移控制
half spec_size = ilm_map.b;       //高光大小
half inner_line = ilm_map.a;      //内描线
********************************************************************
half half_lambert_term = half_lambert + diffuse_control;
half toon_diffuse = saturate((half_lambert_term - _ToonThesHold) * _ToonHardness);
```

***此时结果可见不正常，阴影不见了，原因是half_lambert取值范围是0~1，diffuse_control虽然是0~1的取值范围，但偏移值是按中灰度计算的，所以需要重映射到-1~1***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912105452.png)
***重映射***

```c
half diffuse_control = ilm_map.g * 2.0 - 1.0; //阴影偏移控制
```

***此时阴影恢复，头发有了阴影结构，如果阴影依旧不对则需要调整贴图，查看是否为127的中灰度值，应该是偏移数值有问题***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912110714.png)

### 添加AO

***获取顶点色***

```c
//appdata
float4 color: Color;
//v2f
float4 vertex_color : TEXCOORD3;
//v2f vert (appdata v)
o.vertex_color = v.color;
```

***取得顶点色R通道（AO信息）***

```c
  float ao = i.vertex_color.r; //AO
```

***混合AO***

```c
 half half_lambert_term = half_lambert * ao + diffuse_control;
```

***此时阴影细节更加丰富，已经达到初步效果***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912112111.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912112428.png)

### 高光计算

#### 一般高光计算

***传统方式使用Bulinphong进行计算高光***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912094236.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912170719.png)

#### 特殊高光算法

***使用NdotV获得菲涅尔遮罩，并映射到0~1范围***

```c
//spec
float NdotV = (dot(normalDir, viewDir) + 1.0) * 0.5;
```

*NdotV结果如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912172801.png)
***因为有AO和阴影偏移影响所以需要混合AO信息和加上偏移***

```c
float spec_term = NdotV * ao + diffuse_control;
```

*spec_term结果如下：*
***此时的阴影信息仅会收到视角影响，而正常情况下光照方向也会影响阴影位置，所以需要对正常光照下的阴影进行混合***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912173526.png)
***高光项取9:1的比例混合 half_lambert 和 spec_term***
***ps：此处使用偏移后的half_lambert_term更为合理，但两者结果一样可以不用修改***

```c
half half_lambert_term = half_lambert * ao + diffuse_control;
```

***

```c
spec_term = half_lambert * 0.9 + spec_term * 0.1;
********************************************************************
spec_term = half_lambert_term * 0.9 + spec_term * 0.1;
```

*half_lambert结果如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912173331.png)
*混合后spec_term结果如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912174053.png)
***spec_term - (1 - spec_size * _SpecSize)可以获得高光mask，spec_term减去高光区域（黑色）的即减去一个负数，该区域会变亮，减去白色区域则会变黑，最后求出高光区域，此处500是控制边缘软硬度***

```c
half toon_spec = saturate((spec_term - (1 - spec_size * _SpecSize)) * 500);
```

*NRM_ilm贴图(B通道)spec_size*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230912174259.png)
*1 - spec_size * _SpecSize*

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913093215.png)
*toon_spec*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913093903.png)
***设置将要混合的高光颜色***

```c
half3 spec_color  = (_SpecColor.xyz + base_color) * 0.5;
```

*此时高光颜色为红色*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913094231.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913094210.png)
***将高光区域mask混合高光颜色和控制强度***

```c
half3 final_spec = toon_spec * spec_color * spec_intensity; 
```

*最终高光结果*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913094319.png)

### 贴图描线添加

***读取NRM_ilm贴图(A通道)和NRM_detail贴图，即内描线和细节描线***

```c
//ILM贴图
half4 ilm_map = tex2D(_ILMMap, uv1);
half spec_intensity = ilm_map.r;  //高光强度
half diffuse_control = ilm_map.g * 2.0 - 1.0; //阴影偏移控制
half spec_size = ilm_map.b;       //高光大小
half inner_line = ilm_map.a;      //内描线
//Detail贴图
half4 detail_map = tex2D(_DetialMap, uv2);//细节描线
*******************************************************
//描线
half3 inner_line_color = lerp(base_color * 0.2, float3(1,1,1), inner_line);
```

*inner_line，内描线如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913103228.png)
***使用lerp函数，白色输出依旧为白色（1,1,1），而黑色部分输出原本颜色的0.2强度，即可获得混合原本颜色的描线***
*inner_line_color如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913103536.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913104642.png)
***同理对细节描写进行颜色混合***

```c
half3 detail_line_color = lerp(base_color * 0.5, float3(1,1,1), detail_map.xyz);
```

*detail_map.xyz如下：
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913103702.png)
*detail_line_color如下：
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913104042.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913104608.png)
***将两种描线混合，因为两种线并不会有重复，所以乘法混合即可***

```c
half3 final_line = inner_line_color * detail_line_color;
```

*final_line如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913104218.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913104527.png)

### 最终颜色混合


```c
half3 final_color = (final_diffuse + final_spec) * final_line;
```

*final_color如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105407.png)
***碧蓝幻想在末尾做了一个类色调映射的计算，来压低亮度提高对比度***

```c
final_color = sqrt(max(exp2(log2(max(final_color,0)) * 2.2), 0.0)); //色彩调整
return float4(final_color, 1.0);
```

*函数图如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105729.png)
***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105706.png)
***效果预览***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105841.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105906.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913105928.png)

### 外轮廓线描边添加

***复制Pass，删除多余代码，添加正面剔除，去除光照头文件***

```c
Cull Front
CGPROGRAM
#pragma vertex vert
#pragma fragment frag
#include "UnityCG.cginc"
```

***修改顶点Shader，进行顶点偏移设置***
***获取顶点位置，加上顶点法线方向的单位向量x位于长度，即可按法线放大原来模型顶点，开启正面剔除后就可以获得轮廓描线。这俩乘上一个0.0001是控制_OutlineWidth的强度，使其更可控***

```c
v2f vert (appdata v)
{
	v2f o;
	//******************世界空间处理***********
	// float3 pos_world = mul(unity_ObjectToWorld, v.vertex).xyz;
	// float3 normal_world = normalize(UnityObjectToWorldNormal(v.normal));
	// pos_world += normal_world * _Outline; 
	// o.pos = mul(UNITY_MATRIX_VP, float4(pos_world, 1.0));
	
	//*******************观察空间处理**************
	float3 pos_view = UnityObjectToViewPos(v.vertex);
	float3 normal_world = UnityObjectToWorldNormal(v.normal);
	float3 outlinDir = normalize(mul((float3x3)UNITY_MATRIX_V,normal_world));
	pos_view += outlinDir * _OutlineWidth * 0.0001; 
	o.pos = mul(UNITY_MATRIX_P, float4(pos_view, 1.
	o.uv = v.texcoord0;
	o.vertex_color = v.color;
	return o;
}
```

***修改片元Shader，为描线混合颜色***

```c
half4 frag (v2f i) : SV_Target
{
      
    // *****sample the texture******
    //Base贴图
    half4 base_map = tex2D(_BaseMap, i.uv);
    half3 base_color = base_map.rgb;

//此段混合颜色算法
    half maxComponent = max(max(base_color.r, base_color.g), base_color.b) - 0.004;
    half3 saturatedColor = step(maxComponent.rrr, base_color) * base_color;
    saturatedColor = lerp(base_color.rgb, saturatedColor, 0.6);
    half3 outlineColor = 0.8 * saturatedColor * base_color * _OutlineColor.xyz;

    return float4(outlineColor, 1.0);
}
```

*此时轮廓描线如下：*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913111753.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913112244.png)
***此时描线均为同样粗细和深度，所以需要处理***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913112148.png)
***使用顶点色，使用A通道进行绘制描边粗细的权重***

```c
pos_view += outlinDir * _OutlineWidth * 0.0001 * v.color.a; 
```

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913143605.png)
***混合顶点色B通道，对描边进行Z轴深度控制***

```c
_OutlineZbias("Outline Zbias", Float) = -10.0
**********************************************
float _OutlineZbias;
********************************************
outlinDir.z = _OutlineZbias * (1.0 - v.color.b);
```

*顶点色B通道如下：***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230911221627.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913145630.png)

### 边缘补光（可选做，主要是Demo展示用）

***新增灯光向量，和灯光颜色参数***

```c
_RimLightDir("RimLight Dir", vector) = (1,0,-1,0)
_RimLightColor("RimLight Color", Color) = (1,1,1,1)
```

***将补充灯光转换到视图空间，使其随视角变化，当前为世界空间***
*unity_MatrixInvV为世界空间到视图空间逆矩阵*

```c
//补光
float3 lightDir_rim = normalize(mul((float3x3)unity_MatrixInvV ,_RimLightDir.xyz));
```

***按照NdoL算法求出边缘光，base_mask是皮肤区域mask，toon_diffuse是控制在无光照地方不产生补光，sss_alpha控制每个区域补光强度不同***

```c
half NdotL_rim = (dot(normalDir, lightDir_rim) + 1.0) * 0.5;      
half rimlight_term = NdotL_rim  + diffuse_control;
half toon_rim = saturate((rimlight_term - _ToonThesHold) * 20); 
half3 rim_color  = (_RimLightColor.rgb + base_color) * 0.5 * sss_alpha;
half3 final_rim_color = toon_rim * rim_color * base_mask * toon_diffuse * _RimLightColor.a;
```

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913163520.png)

### 最终效果

![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913163609.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913163627.png)
***脸部法线处理后效果***
*使用法线传递进行修改面部法线*
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913165824.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913165729.png)
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913165635.png)
***修改前***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913170215.png)
***修改后***
![](/assets/img/MyPJ/Granblue Fantasy/Pasted image 20230913165507.png)

## 完整Shader代码


```c
Shader "Unlit/Toon"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _SSSMap ("SSS Map", 2D) = "black" {}
        _ILMMap("ILM Map", 2D) = "gray" {}
        _DetialMap("Detial Map", 2D) = "white" {}
        _ToonThesHold("ToonThesHold", Range(0, 1)) = 0.5
        _ToonHardness("ToonHardness", Float) = 20.0
        _SpecColor("SpecColor", Color) = (0.0, 0.0, 0.0, 0.0)
        _SpecSize("SpecSize", Range(0,1)) = 0.0
        _RimLightDir("RimLight Dir", vector) = (1,0,-1,0)
        _RimLightColor("RimLight Color", Color) = (1,1,1,1)
        _OutlineWidth("Outline Width",Range(0,20)) = 7.0
        _OutlineColor("Outline Color",Color) = (0.0, 0.0, 0.0, 0.0)
        _OutlineZbias("Outline Zbias", Float) = -10.0
        
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            Tags { "LightMode"="ForWardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fwdbase
            #include "UnityCG.cginc"
            #include "AutoLight.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 texcoord0 : TEXCOORD0;
                float2 texcoord1 : TEXCOORD1;
                float3 normal : NORMAL;
                float4 color: Color;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float4 uv : TEXCOORD0;
                float3 pos_world : TEXCOORD1;
                float3 normal_world : TEXCOORD2;
                float4 vertex_color : TEXCOORD3;
                SHADOW_COORDS(4)
            };

            sampler2D _BaseMap;
            sampler2D _SSSMap;
            sampler2D _ILMMap;
            sampler2D _DetialMap;
            float _ToonThesHold;
            float _ToonHardness;
            float _SpecSize;
            float4 _SpecColor;
            float4 _RimLightDir;
            float4 _RimLightColor;
   

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = float4(v.texcoord0, v.texcoord1);
                o.pos_world = mul(unity_ObjectToWorld, v.vertex).xyz;
                o.normal_world = normalize(UnityObjectToWorldNormal(v.normal));
                o.vertex_color = v.color;
                TRANSFER_SHADOW(o)
                return o;
            }

            half4 frag (v2f i) : SV_Target
            {
                half2 uv1 = i.uv.xy;
                half2 uv2 = i.uv.zw;

                //向量
                half3 normalDir = normalize(i.normal_world);
                half3 lightDir = normalize(_WorldSpaceLightPos0.xyz);
                half3 viewDir = normalize(_WorldSpaceCameraPos.xyz - i.pos_world);

                // *****sample the texture******
                //Base贴图
                half4 base_map = tex2D(_BaseMap, uv1);
                half3 base_color = base_map.rgb;
                half base_mask = base_map.a; //区分皮肤区域mask
                //SSS贴图
                half4 sss_map = tex2D(_SSSMap, uv1);
                half3 sss_color = sss_map.rgb; //暗部颜色
                half sss_alpha = sss_map.a;   //边缘光强度控制
                //ILM贴图
                half4 ilm_map = tex2D(_ILMMap, uv1);
                half spec_intensity = ilm_map.r;  //高光强度
                half diffuse_control = ilm_map.g * 2.0 - 1.0; //阴影偏移控制
                half spec_size = ilm_map.b;       //高光大小
                half inner_line = ilm_map.a;      //内描线
                //Detail贴图
                half4 detail_map = tex2D(_DetialMap, uv2);//细节描线

                //AO
                float ao = i.vertex_color.r; //AO
                float atten = SHADOW_ATTENUATION(i); //阴影衰减

                //diffuse
                half NdotL = dot(normalDir, lightDir);          //-1~1结果
                half half_lambert = (NdotL + 1.0) * 0.5;        //0~1结果
                half half_lambert_term = half_lambert * ao * atten + diffuse_control;
                half toon_diffuse = saturate((half_lambert_term - _ToonThesHold) * _ToonHardness);           //色阶化(阴影二值化)
                half3 final_diffuse = lerp(sss_color, base_color, toon_diffuse);
                //spec
                float NdotV = (dot(normalDir, viewDir) + 1.0) * 0.5;
                float spec_term = NdotV * ao + diffuse_control;
                spec_term = half_lambert * 0.9 + spec_term * 0.1;
                half test = spec_size * _SpecSize;
                half toon_spec = saturate((spec_term - (1- spec_size * _SpecSize)) * 500);
                half3 spec_color  = (_SpecColor.rgb + base_color) * 0.5;
                half3 final_spec = toon_spec * spec_color * spec_intensity; 

                //描线
                half3 inner_line_color = lerp(base_color * 0.2, float3(1,1,1), inner_line);
                half3 detail_line_color = lerp(base_color * 0.5, float3(1,1,1), detail_map.xyz);
                half3 final_line = inner_line_color * detail_line_color;

                //补光
                float3 lightDir_rim = normalize(mul((float3x3)unity_MatrixInvV ,_RimLightDir.xyz));
                half NdotL_rim = (dot(normalDir, lightDir_rim) + 1.0) * 0.5;      
                half rimlight_term = NdotL_rim  + diffuse_control;
                half toon_rim = saturate((rimlight_term - _ToonThesHold) * 20); 
                half3 rim_color  = (_RimLightColor.rgb + base_color) * 0.5 * sss_alpha;
                half3 final_rim_color = toon_rim * rim_color * base_mask * toon_diffuse * _RimLightColor.a;


                half3 final_color = (final_diffuse + final_spec + final_rim_color) * final_line;
                final_color = sqrt(max(exp2(log2(max(final_color,0)) * 2.2), 0.0)); //色彩调整
                return float4(final_color, 1.0);
            }
            ENDCG
        }
        Pass
        {

            Cull Front
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 texcoord0 : TEXCOORD0;
                float2 texcoord1 : TEXCOORD1;
                float3 normal : NORMAL;
                float4 color: Color;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 vertex_color : TEXCOORD3;
            };

            sampler2D _BaseMap;
            sampler2D _SSSMap;
            sampler2D _ILMMap;
            float _OutlineWidth;
            float4 _OutlineColor;
            float _OutlineZbias;
   

            v2f vert (appdata v)
            {
                v2f o;
                //******************世界空间处理***********
                // float3 pos_world = mul(unity_ObjectToWorld, v.vertex).xyz;
                // float3 normal_world = normalize(UnityObjectToWorldNormal(v.normal));
                // pos_world += normal_world * _Outline; 
                // o.pos = mul(UNITY_MATRIX_VP, float4(pos_world, 1.0));

                //*******************观察空间处理**************
                float3 pos_view = UnityObjectToViewPos(v.vertex);
                float3 normal_world = UnityObjectToWorldNormal(v.normal);
                float3 outlinDir = normalize(mul((float3x3)UNITY_MATRIX_V,normal_world));
                outlinDir.z = _OutlineZbias * (1.0 - v.color.b);
                pos_view += outlinDir * _OutlineWidth * 0.0001 * v.color.a; 
                o.pos = mul(UNITY_MATRIX_P, float4(pos_view, 1.0));

                o.uv = v.texcoord0;
                o.vertex_color = v.color;

                return o;
            }

            half4 frag (v2f i) : SV_Target
            {
      
                // *****sample the texture******
                //Base贴图
                half4 base_map = tex2D(_BaseMap, i.uv);
                half3 base_color = base_map.rgb;


                half maxComponent = max(max(base_color.r, base_color.g), base_color.b) - 0.004;
                half3 saturatedColor = step(maxComponent.rrr, base_color) * base_color;
                saturatedColor = lerp(base_color.rgb, saturatedColor, 0.6);
                half3 outlineColor = 0.8 * saturatedColor * base_color * _OutlineColor.xyz;

                return float4(outlineColor, 1.0);
            }
            ENDCG
        }
    }
    Fallback "Diffuse"
}

```
