---
layout: page
title: Unity-绝区零橘福福
description: Unity仿绝区零角色渲染——橘福福
img: assets/img/MyPJ/ZZZJuFuFu/封面.png
importance: 1
category: [rendering]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---

# 最终效果

**本作品集中的NPR角色渲染Demo基于Unity URP，还原以miHoYo系为代表的日系卡通渲染风格，涵盖从光照模型到后处理的完整渲染管线。**
**最终效果如下，使用URP下的ASES,Bloom等配置**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401163052.png)

<video width="100%" autoplay loop muted playsinline>
  <source src="/assets/img/MyPJ/ZZZJuFuFu/QQ20260331-013013-HD.mp4" type="video/mp4">
</video>


# 效果拆解

## 动态Ramp(直接光漫反射)

**以NdotL为输入，通过七层Ramp区间（ShadowFade / Shadow / ShallowFade / Shallow / SSS / Front / Forward）对漫反射进行分段染色，每层的offset/bias/scale参数均可在运行时调整；配合MaterialID，不同材质区域（皮肤、衣物、头发）可独立配置各自的Ramp曲线。**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401165528.png)

## 描边

**使用BackFace描边，将平滑法线数据烘焙到模型的UV2通道，然后在outLinePass中解析，搭配MaterialID和顶点色进行分区染色以及粗细控制**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401165119.png)

## 屏幕空间投影

**头发和衣物基于深度缓冲实现屏幕空间自投影。相较于传统ShadowMap方案，无需额外Shadow Pass，适合移动端预算；代价是角色移出屏幕边缘时投影会裁切，属于已知取舍。**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401164448.png)

## 间接光漫反射

**间接光漫反射沿用URP的球谐光照，额外暴露强度和色调参数，允许美术按场景氛围整体调色。**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401170010.png)

## 间接光镜面反射

**减小移动端压力，无法负担实时反射探针的情况，使用MatCap模拟金属镜面反射，在保持效果的同时降低运行时开销，使用MatCap颜色与漫反射进行叠加混合，控制金属反射**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401170629.png)
**对比效果如下，可见高光区域金属感的差异**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401171046.png)

## 直接光镜面反射

**使用移动端优化的GGX算法，头发部分则是使用球形法线来计算**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401171256.png)
**对比效果如下，开启后金属部分更加明显，同时也显示了头发高光**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401171702.png)

## 边缘光

**屏幕空间边缘光，配合MaterialID，分别控制染色和强度**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401172113.png)

## 眼睛透过头发

**眼部在渲染顺序上位于头发之后，通过Stencil Buffer标记头发遮挡区域，再以额外Pass重绘眼部，避免穿帮**
![](/assets/img/MyPJ/ZZZJuFuFu/Pasted image 20260401172544.png)
