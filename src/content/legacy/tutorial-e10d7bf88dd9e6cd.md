---
title: 06_鼻线添加
date: 2026-01-08
summary: 06_鼻线添加
tech:
  - shader
  - rendering
  - tutorials
  - ue
kind: tutorial
series: UE-绝区零角色渲染-星见雅
order: 5
legacyUrl: /tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/06_鼻线添加/
draft: false
---


## 鼻线添加

***当前在正面鼻子是没有标识的，所以需要添加鼻线，鼻线的信息在面部贴图中的Alpha通道里***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310165834.png)

### 获取观察向量

***因为后续需要使用观察向量控制鼻线是否显示，所以需要获取观察向量***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310165927.png)

### 计算鼻线的DisplayValue

![](/assets/img/ZZZRendering/Pasted%20image%2020250310170206.png)
***分别计算视线向量和面部HeadUp以及已及ViewDir和HeadRight点积用于判断视角方向，偏转到一定程度就不显示鼻线。***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310171601.png)
***计算混合值，这里很多应该都是经验性的处理，对_NoseLineKDnDisp, _NoseLineHoriDisp进行插值，这里是进行了竖直方向的Alpha控制，混合水平控制直接使用了viewDotHeadForward - dispValue;然后钳制和混和贴图鼻线***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310171859.png)

### 混合输出

***根据计算出的DisplayValue因子插值描边颜色和原本贴图颜色，仅在Face生效***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310172037.png)
***参数值设置，这里自己随便挑就好，看自己喜好来***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310172208.png)

![](/assets/img/ZZZRendering/Pasted%20image%2020250310172225.png)

***描边颜色设置***
![](/assets/img/ZZZRendering/Pasted%20image%2020250310172342.png)

### 当前效果

![](/assets/img/ZZZRendering/Pasted%20image%2020250310172441.png)
