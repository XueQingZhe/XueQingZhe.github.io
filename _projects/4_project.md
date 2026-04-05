---
layout: post
title: URP Screen Space Outline RenderFeature
description: URP Screen Space Outline RenderFeature
img: assets/img/MyPJ/Render Feature/ScreenSpaceOutline/封面.png
importance: 1
category: [Tools]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---



# 描边算法

**这里分别是三种算子或者叫卷积核，简单理解就是从左到右，性能和效果逐渐递增，Roberts算子只有2x2也就没有中心点，所以会中心偏移半个像素这样**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403224003.png)
**算子定义了邻域采样的权重分布，通过对周围像素的深度/法线值进行加权求和来计算梯度，UV偏移决定采样位置，来采样SenceDepth和SenceNormal**

# 全局描边

**全局描边，是对整个场景进行描线，但是这会对角色描线，这是不必要的，所以仅适合做重描线的风格化**

## 参数设计

**为了通用性，这里直接将算子和描边混合方式全部参数化，方便调整**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403224900.png)

![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403225237.png)
**Shader使用宏控制，尽量减少编译的性能开销**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403225328.png)

## 效果对比

**参数统一，仅调整算子和模式**

### DepthOnly

**仅深度描边，明显Sobel细节更多**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403230105.png)

### NormalOnly

**采样SceneNormal得到的描边，细节更多，但是杂色也更多，反而Roberts看着更好一点**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403230702.png)

### DepthAndNormal

**混合模式主要还是解决DepthOnly描线缺失的问题，需要对Normal混合阈值进行微调**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260403231040.png)

# 点击高亮(描边)

**因为场景通常不会使用全局描边，描边一般使用在交互物品上或者特殊独立显示的物体，所以这里做了一个点击生效的描边，需要额外增加射线检测的脚本给相机**

## 参数设计

**大致原理和前者全局描边类似，但是额外需要写入深度，从原理上来讲使用Stencil剔除也是可以的，但是我测试貌似行不通，有个说法是unity的深度图写入和抗锯齿会清除掉在RenderFeature写入的Stencil**
**这里额外增加了X光效果，以及剔除遮蔽描边的控制**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405130101.png)

## 深度写入和法线写入

**因为涉及到深度和法线两种描边方式，针对单一物体，所以需要插入绘制两张RT**
**对于法线RT写入同时写入深度剔除掉自遮蔽的部分**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405130527.png)

**图中可以看到这样剔除掉了自遮蔽的部分，但是因为是单独对点击物体注入Pass，是无法得到场景其他物体遮蔽的，所以需要额外处理**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405130939.png)

## X光效果

**自遮蔽描边属于X光效果，所以描线则有单独Pass写入进行独立控制**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405222214.png)
**自遮蔽效果如下，可以勾勒内部描线**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405213658.png)

## 其余物体的遮蔽处理

**因为当前的描边是基于单个物体的，这意味着深度测试是不完全的，没有其他物体的遮蔽信息，所以会出现现在这种描边穿透效果。**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405213838.png)

**为了解决这个问题，需要对描边算子跑两遍，一遍使用场景深度计算，一遍使用写入的CustomDepthRT计算，这其实就可以得到当前物体在场景深度下的mask**
**这样就计算出物体的正确的含场景遮蔽描边线**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405222625.png)
**在使用上面得到的含遮蔽的描边和现在计算的无遮蔽描边进行Lerp就得到最终输出描边**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405223138.png)
**遮蔽处理后效果**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405225058.png)
**因为这个透显效果实际上应该和X光效果同时出现，所以共用了XRayAlpha参数**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405223527.png)
**对于法线描边处理方式和深度描边一样处理，不过mask计算稍有不同，略有瑕疵，这个难以避免**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405224917.png)

## 效果对比

### 遮蔽

**cullOccludedOutline开关控制是否开启遮蔽**
![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/Pasted image 20260405224329.png)

### X光效果过渡混合

![](/assets/img/MyPJ/Render Feature/ScreenSpaceOutline/QQ20260405-224658.mp4)

## 其他问题

**法线描边通过在写入阶段开启深度测试，在 RT 写入时即剔除自遮挡部分，避免了内部结构线的干扰。剩余的瑕疵主要来自场景其他物体对法线边缘的遮挡，与深度描边的处理方式相同，通过双遍算子+mask解决，但边界处仍有轻微残留，难以完全消除。**
