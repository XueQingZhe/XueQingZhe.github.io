---
title: "Blender TA 工具集"
summary: "Python 插件：平滑法线烘焙、顶点色跨模型传递、贴图批量烘焙输出，以及按平面或曲线生成楼梯。"
cover: "/covers/generated/e243c0b5216c05d3.webp"   # ← 自动取的正文第一张图，换成精选的 16:9 封面
engine: [Blender]
tech: [Tooling]
role: [Tooling]
year: 2025
glow: "#ffa25c"
featured: false
order: 7
---
# 整体功能

**整合phthon脚本，配合ai制作的blender插件，下面是功能列表，逐步随需求进行更新**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420134657.png)

# 功能参数

## 平滑法线

![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420135014.png)

## 顶点色写入

**需要先烘焙模型的顶点色到贴图，然后根据贴图烘焙到另一模型**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420135051.png)

## 烘焙贴图到本地文件

**快速烘焙输出选中的物体的颜色等数据到贴图**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420135252.png)

## 简易楼梯生成

**快速生成楼梯，可以根据选中的平面和曲线进行不同计算**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420135427.png)
**自动模式自动计算每次高宽，手动则固定高宽**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420135807.png)
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420140304.png)
**曲线计算，也是分为自动和手动，因为曲线并非是线性的，所以一个是否贴合曲线控制，随曲线变化层高宽**
![](/assets/img/MyPJ/Tool/BlenderTool/Pasted%20image%2020260420140052.png)
