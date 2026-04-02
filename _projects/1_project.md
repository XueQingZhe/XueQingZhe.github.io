---
layout: page
title: 绝区零星见雅
description: Unity,UE,Blender 仿绝区零角色渲染——星见雅
img: assets/img/MyPJ/ZZZXingJianYa/UUEB.png
importance: 1
category: [rendering]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---

# 最终效果

**从左到右分别是Unity,UE,blender效果**
![](/assets/img//MyPJ/ZZZXingJianYa/UUEB.png)

# 效果拆解

## 描边

**使用BackFace描边，Blender将平滑法线数据烘焙到模型的UV2通道，然后在读取解析，搭配MaterialID和顶点色进行分区染色以及粗细控制**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402110405.png)

## 光照分层染色

**动态Ramp，配合MaterialID，分区染色**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402110731.png)

## 屏幕空间投影

**基于深度缓冲实现屏幕空间自投影，blender因为获取不到深度，所以更换为GooEngine版本**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402112342.png)

## SDF面部阴影

**面部采样SDF贴图来构建阴影**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402112530.png)
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402112301.png)

## 鼻线

**描边线只能保证侧面的轮廓线，所以根据视角正面时对鼻线单独混合**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402112918.png)

## 金属反射

**采样使用MatCap颜色与漫反射进行混合**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402113339.png)

## PBR高光

**头部使用球形法线计算，身体使用pixelNormal计算，高光算法使用移动端优化的GGX，强度参数略有不同**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402154637.png)

## 环境光

**使用URP的球谐光照SH函数，额外设置强调控制参数，这里参数较小，效果不是特别明显**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402155027.png)

![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402155204.png)

![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402155332.png)

## 边缘光

**屏幕空间的边缘光**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402155604.png)

## 眼睛透过头发

**通过模板测试将眼睛部分在头发上重新绘制，Blender没有这个功能，使用后期合成进行单独叠加一层**
![](/assets/img//MyPJ/ZZZXingJianYa/Pasted image 20260402160049.png)
