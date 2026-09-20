---
title: 13_导入法线问题解决
date: 2026-01-08
summary: 13_导入法线问题解决
tech:
  - shader
  - rendering
  - tutorials
  - ue
kind: tutorial
series: UE-绝区零角色渲染-星见雅
order: 12
legacyUrl: /tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/13_导入法线问题解决/
draft: false
---


***如果发现计算法线贴图，进行强度控制的时候发现效果不对或者有锯齿产生，检查网格体的法线设置，因为UE默认会开启重新计算法线，我们需要将其关闭，导入模型本身的法线和切线***
![](/assets/img/ZZZRendering/Pasted%20image%2020250327162245.png)
***一般导入应该会是这样的参数***
![](/assets/img/ZZZRendering/Pasted%20image%2020250327162118.png)
***关闭重新计算的法线***
![](/assets/img/ZZZRendering/Pasted%20image%2020250327161742.png)
***这样就修复了***
![](/assets/img/ZZZRendering/Pasted%20image%2020250327162322.png)
