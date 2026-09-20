---
title: 07_添加鼻线
date: 2026-01-07
summary: 07_添加鼻线
tech:
  - shader
  - rendering
  - tutorials
  - blender
kind: tutorial
series: Blender-绝区零角色渲染-星见雅
order: 6
legacyUrl: /tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/07_添加鼻线/
draft: false
---


## 添加鼻线

***当前没有鼻线，灯光在正面没有鼻子很奇怪***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310231833.png)

### 读取鼻线Mask

***鼻线的位置其实是在面部贴图的Alpha通道中，我们已经进行传入了，但是没有调用***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310232411.png)

### 创建NoseLine组

#### 参数设置

***先为Forward组添加输入参数，垂直水平显示的阈值还有鼻线颜色***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310232547.png)
***创建新组并设置输入等参数***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310233102.png)
***传入的Mask需要先判断是否为Face***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310233149.png)

#### 获取观察向量

***获取观察向量一般来说是对世界空间下相机向量进行归一化即可。但Blender不太一样，它的相机深度轴不是Z,而是-Z,所以需要翻转。当然也有简单的获取方法**
***方法一***
***直接从几何属性获取，Incoming就是ViewDirWS，说实话这名字真不太熟啊。。***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310233515.png)
***方法二***
***直接计算***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310234448.png)

#### 计算鼻线的DisplayValue

***参考代码***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310111654.png)
***根据点乘判断方向>0同向，小于0反向，计算ViewDir和HeadUP点积已及ViewDir和HeadRight点积用作判断。***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310234521.png)
***这里我们需要自己写一个SmoothStep节点，因为Blender是MapRange节点里的不符合我们需要***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310234819.png)
***Smooth公式及节点如下：***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310230304.png)
![](/assets/img/ZZZRendering/Pasted%20image%2020250310235001.png)
***计算完成后输出结果，颜色进行压暗处理***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310235107.png)

### 混合输出

***先使用NoseLineDispValue混合描边颜色和基础颜色***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310235202.png)
***混合完成后再使用Face的布尔值对带描线的颜色和不带描线的颜色混合***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310235417.png)

### 参数设置

***给ForwardShader调参数，颜色为FF8181***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310235506.png)

### 当前效果

![](/assets/img/ZZZRendering/Pasted%20image%2020250310235646.png)
