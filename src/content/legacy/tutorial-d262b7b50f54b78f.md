---
title: 11_添加环境光
date: 2026-01-07
summary: 11_添加环境光
tech:
  - shader
  - rendering
  - tutorials
  - blender
kind: tutorial
series: Blender-绝区零角色渲染-星见雅
order: 10
legacyUrl: /tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/11_添加环境光/
draft: false
---


## 添加环境光

### 球谐光照计算公式

https://zhuanlan.zhihu.com/p/351289217

### 获取环境光

***UE和Unity中都是使用球谐光照来作为环境光，Blender中这里直接使用漫反射节点获取***
***Forward组新增强度控制参数***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321164200.png)
***这里需要对灯光进行调整，将漫反射和高光影响都设置为0，这样就只有环境光了***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321162848.png)
***调整天空球可以看到颜色变化，但是平行光移动和旋转不会影响***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321164424.png)

### 环境光混和

***得到环境光后转换成RGB颜色与强度控制参数相乘，然后在和GammaColor进行乘法混合***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321164616.png)
***输出直接使用加法混合即可，加上漫反射和高光。因为亮度会增加可能导致高光效果不明显，所以这里将高光部分大于1的部分在加一遍对高光提亮***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321164736.png)

### 当前效果

***左边是加了环境光，右面是没加的***
![](/assets/img/ZZZRendering/Pasted%20image%2020250321170054.png)
