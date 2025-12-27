---
layout: post
title: 理论支线：PBRSpecular - GGX 速通
date: 2025-12-27 
description: 理论支线：PBRSpecular - GGX
tags: [shader, rendering, math]
categories: [TAMonth01]
#tags: formatting code
#categories: sample-posts
featured: true
toc:
  sidebar: left # 目录
comments: true # 评论
images:
  spotlight: true  # ← 启用 Spotlight图片放大
---

# PBR 核心理论

##  什么是 PBR (Physically Based Rendering)

PBR 是一种基于物理原理的渲染方法，目标是**在任何光照条件下都能得到物理正确的结果**。
PBR 的核心理念：漫反射 + 镜面反射 = 完整的表面反射
**基于微表面理论这是重点**
$$ f_r(l, v) = \underbrace{f_{diff}}_{\text{漫反射}} + \underbrace{f_{spec}}_{\text{镜面反射}} $$
**核心思想三要素：**

- **能量守恒** (Energy Conservation)：反射光不能超过入射光
- **基于微表面理论** (Microfacet Theory)：表面由无数微小镜面组成
- **使用真实物理参数**：金属度(Metallic)、粗糙度(Roughness)替代传统的高光参数

![[Pasted image 20251227192945.png]]
# Specular BRDF
**PBR与传统模型区别主要是在高光，漫反射其实还是Lambert**

$$ f_{specColor}(l, v) = \frac{D(h) \cdot F(v, h) \cdot G(l, v, h)}{4 \cdot (n \cdot l) \cdot (n \cdot v)}\cdot NoL \cdot SpecularColor$$
##  镜面反射 BRDF (Cook-Torrance) 
$$ f_{spec}(l, v) = \frac{D(h) \cdot F(v, h) \cdot G(l, v, h)}{4 \cdot (n \cdot l) \cdot (n \cdot v)} $$
**记忆口诀：DFG 除以 4NL·NV** 
**D** - Distribution (法线分布) - 高光形状 
**F** - Fresnel (菲涅尔) - 反射率 
**G** - Geometry (几何项) - 遮挡 
**分母** - 归一化因子

**这里会考虑三个关键问题**
Cook-Torrance 的 D、F、G 三项分别回答： 
1. **D 项**：微镜面法线如何分布？（高光形状） 
2. **F 项**：每个微镜面反射多少光？（反射强度） 
3. **G 项**：有多少微镜面被遮挡？（自遮挡修正）

### D- Distribution高光项公式
**问题**：在给定方向 `h`（半程向量），有多少比例的微镜面法线指向 `h`？
入射光 L 和反射光 V 的中间方向 = H (Half Vector) 
只有法线 = H 的微镜面才能将 L 反射到 V 
D(h) = 在方向 h 附近的微镜面密度

**这里使用的高光计算公式是 GGX/Trowbridge-Reitz 公式**

$$ D_{GGX}(h) = \frac{\alpha^2}{\pi \left[ (n \cdot h)^2 (\alpha^2 - 1) + 1 \right]^2} $$ ​

**参数：**

-  α(粗糙度参数 / GGX 粗糙度)和粗糙度的平方相关$$ α=roughness^2 $$
- 法线和半程向量的点积，这里其实就是Blinn-Phong$$n⋅h$$
### F 项 - Fresnel（菲涅尔）
**F0：** Fresnel at 0 degrees，正入射时的反射率（垂直看表面时的反射率），简单来说就是视线和法线夹角为0度的时候的反射率
$$ F_0​=lerp(0.04,baseColor,metallic) $$

 - 非金属（metallic=0）：F0 = 0.04（灰色）
 - 金属（metallic=1）：F0 = baseColor（彩色）

**F:** 菲涅尔项
**精确的公式**
 $$F(v,h)=F_0​+(F_{90}−F_0​)⋅(1−(v⋅h))^5$$
 **通常在视角和法线成90度也叫掠射角，可以理解为此时进入眼睛能观察的光线是与表面平行，那么相当于表面完全反射此部分的光线，所以几乎所有材质的F90反射率都是为1，所以红色可以化简**
 $$ F_{90} = 1 $$
 **这里需要注意，它的参数是v⋅h，并非宏观的下的fresnel（NoV），这里实际是取的微观表面的法线，不论宏观还是微观，它都满足入射角和出射角相等，那么L是入射，V是就是出射，那么微观平面法线就可以理解为L和V的角平分线也就是H(H=L+V)，这样就把fresnel（NoV）中的法线N替换，就是v⋅h了**
 $$F(v,h)=F_0​+(1−F_0​)⋅(1−(v⋅h))^5$$
**因为入射和反射对称，所以用l⋅h也是对的**
 $$F(v,h)=F_0​+(1−F_0​)⋅(1−(l⋅h))^5$$

### G 项 - Geometry（几何函数）

#### 公式：Smith-GGX

$$G(l, v, h) = G_1(l) \cdot G_1(v)$$

其中可视性遮蔽：

$$G_1(v) = \frac{n \cdot v}{(n \cdot v) \cdot (1 - k) + k}$$​
其中光线遮蔽：
$$G_1(l) = \frac{n \cdot l}{(n \cdot l) \cdot (1 - k) + k}$$

**k 的计算（直接光照）：**

$$k = \frac{(\text{roughness} + 1)^2}{8}$$**环境光K**
$$k = \frac{\text{roughness}^2}{2}$$​
# 对于D高光项计算公式的由来和解释
 **α 的定义**
 α 是微表面斜率的标准差（Standard Deviation of Microfacet Slopes） 
 直白理解：
 ***就是GGX的专用粗糙度系数***
 α 越大 → 微镜面法线越分散 → 高光越宽 
 α 越小 → 微镜面法线越集中 → 高光越尖
 **为什么要粗糙度的平方？**
 ```c
 // 用户输入的粗糙度（线性感知） 
 float roughness = 0.5; // [0, 1] 范围 
 // GGX 使用的参数 
 float alpha = roughness * roughness; // α = 0.25 
 ```
 **原因：**

1. **感知线性化**（Perceptual Linearization）
```c
   人眼对粗糙度的感知不是线性的  
   roughness = 0.5 时，看起来像"中等粗糙"
   但如果直接用 α = 0.5，视觉上会太粗糙
   平方后 α = 0.25，视觉效果更符合直觉
```
**Disney 的研究成果**
- Disney 在《Physically Based Shading at Disney》中提出
- 测试发现：α=roughness2^ 的调节曲线最符合艺术家直觉
- 现在成为行业标准

$$ D_{GGX}(h) = \frac{\alpha^2}{\pi \left[ (n \cdot h)^2 (\alpha^2 - 1) + 1 \right]^2} $$

roughness ∈ $[0, 1]$ ->平方 α ∈ $[0, 1]$ 
但实际使用：
roughness = 0.0 → α = 0.0 (完美镜面，会导致除零) 
roughness = 1.0 → α = 1.0 (完全粗糙) 
所以通常会 
```c
clamp: float alpha = max(roughness * roughness, 0.001); // 避免除零 
```
## 关于柯西公式
**标准柯西分布**（Cauchy Distribution）：

$$ p(x) = \frac{1}{\pi (1 + x^2)} $$**带尺度参数 γ (gamma)的柯西分布：**

$$ p(x; \gamma) = \frac{1}{\pi \gamma \left(1 + \frac{x^2}{\gamma^2}\right)}$$​


**进一步变形：**

$$ (x; \gamma) = \frac{1}{\pi \gamma} \cdot \frac{\gamma^2}{\gamma^2 + x^2}$$​

**整理成分子分母：**

$$ p(x; \gamma) = \frac{\gamma^2}{\pi (\gamma^2 + x^2)}$$​
**二维柯西公式**
$$ p(m_x​,m_y​)=\frac{\gamma^2}{π(\gamma^2+m_x^2​+m_y^2​)^2} $$​


**GGX高光的起点：假设微表面斜率服从带尺度参数 γ (gamma)柯西分布，这个尺度就是粗糙度参数**
## 如何描述微观平面的粗糙度变化量X
真实表面是 **“高度场”**，不是 **“角度场”**
>**真实世界里的粗糙表面是什么？**

不管是：
- 打磨
    
- 抛光
    
- 拉丝
    
- 喷砂
    
本质都是：

> **在一个平面上制造“高度起伏”**

**问题：** 如何描述表面的粗糙程度？ 
**传统想法（错误）：** 用法线的角度分布？ 
**问题：** 法线角度不直观，难以度量
**正确方法：** 用表面的高度变化！


**因为是微观平面也就是微表面模型下，决定粗糙度与否的其实就是表面的高低起伏，也就是每一个微观平面与宏观平面所构成的斜率**
![[ffb807b5-4259-4535-af3f-832a9eaf052a.png]]

想象用手摸一个粗糙表面： - 光滑 → 高度变化小 → 斜率小 - 粗糙 → 高度起伏大 → 斜率大 
**斜率定义：** $$ p = \frac{\Delta x}{\Delta z}, \quad q = \frac{\Delta y}{\Delta z} $$
物理意义： - p：x 方向的坡度 - q：y 方向的坡度 - 斜率越大 → 表面越陡峭 → 越粗糙
**这里的斜率其实是有两个分量方向的斜率的，图上仅画了x方向的斜率**
$$p=\frac{Δx}{Δz}​,q=\frac{Δy}{Δz}$$​
**所以现在X变量和尺度值α（粗糙度）都有了，如果代入公式就可以得到一个结果了。但是这里有一个问题，那就是现在的X变量其实是实际不存在的微表面参数空间下的变量，而非我们肉眼看见的宏观平面，那么这样的话我们就需要进行空间转换了。**
***二维的柯西分布公式***
$$ p(mx​,my​)=\frac{\gamma^2}{π(\gamma^2+mx^2​+my^2​)^2} $$
***但是我们需要的是二维的柯西分布公式，代入数值之后***
$$ p(p,q)=\frac{α^2}{π(p^2+q^2+α^2)^2} $$
***这和最终的D_GGX公式还是差一点***
$$ D_{GGX}(h) = \frac{\alpha^2}{\pi \left[ (n \cdot h)^2 (\alpha^2 - 1) + 1 \right]^2} $$​

**那么暂时总结一下就是下面几点：**
GGX 中使用的柯西分布最初定义在**微表面斜率空间（slope plane）** 上，  
该空间并不是法线方向的半球；  
而 BRDF 需要的是微表面法线在**单位半球**上的分布。  
因此必须将**斜率空间**映射到**方向空间**，  
并通过 **Jacobian** 修正映射过程中面积（权重）的变化。
## 雅可比(Jacobian )矩阵/行列式
> **Jacobian =  当我用新变量来描述同一批东西时，  
> 一个“单位面积”被拉伸或压缩了多少，这里核心思想是描述局部线性变换**

**为什么需要 Jacobian？**
简单来说：我们有斜率空间 (p,q) 的分布， 但 BRDF 需要的是法线方向 (θ,φ) 的分布。 变量变换时，概率密度需要乘以一个"缩放因子"， 这个因子就是 Jacobian 行列式 |J|。

斜率空间的分布： p(slope_x, slope_y) 
需要转换到： D(法线方向 h) 
工具： Jacobian 矩阵（变量变换）

斜率定义转换到半球空间：
  $$p = \frac{Δx}{Δz} = tan(θ) \cdot cos(φ)$$
  $$q = \frac{Δy}{Δz} = tan(θ)\cdot sin(φ)$$
  
其中：
  θ = 微平面法线与宏观法线 N 的夹角
  φ = 方位角
### 求偏导
#### p 对 θ 的偏导
**将φ看成常数 - 得到 ∂p/∂θ 和 ∂p/∂φ**
意思就是求原始p分量在变换后对θ分量的分别贡献

**函数**
$$ p = \tan(\theta) \cos(\phi) $$
**求偏导（φ 看作常数）：**

$$\frac{\partial p}{\partial \theta} = \frac{\partial}{\partial \theta}[\tan(\theta) \cos(\phi)]$$
**常数cosφ提出来**
$$=cos(ϕ)⋅\frac{∂}{θ∂}​[tan(θ)]$$
**tan(θ) 的导数**
$$= \cos(\phi) \cdot \sec^2(\theta)$$
**最终结果**
$$= \sec^2(\theta) \cdot \cos(\phi)  $$
#### p 对 φ 的偏导
**将θ看成常数 - 得到 ∂p/∂θ 和 ∂p/∂φ**
意思就是求原始p分量在变换后对φ分量的分别贡献

**函数**
$$p=tan(θ)cos(ϕ)$$
**求偏导（θ 看作常数）：**

$$\frac{\partial p}{\partial \phi} = \frac{\partial}{\partial \phi}[\tan(\theta) \cos(\phi)]$$

 **常数tanθ提出来**
$$=\tan(\partial)⋅\frac{\partial}{\partial\phi​}[\cos(\phi)]$$



**cos(φ) 的导数**
$$= \tan(\theta) \cdot (-\sin(\phi))$$
**最终结果**
$$=-\tan(\theta) \sin(\phi)$$

**所以p对φ和θ方向的贡献就有了，也就是雅可比矩阵的第一行**
$$
\begin{bmatrix}
\frac{\partial p}{\partial \theta} & \frac{\partial p}{\partial \phi} \\

\end{bmatrix}$$
$$\begin{bmatrix}
\sec^2(\theta) \cos(\phi) & -\tan(\theta) \sin(\phi)
\end{bmatrix}$$


#### q 对 θ 的偏导

**函数：**

$$q = \tan(\theta) \sin(\phi)$$

**求偏导（φ 看作常数）：**

$$\frac{\partial q}{\partial \theta} = \frac{\partial}{\partial \theta}[\tan(\theta) \sin(\phi)]$$

**常数sinφ提出来**
$$= \sin(\phi) \cdot \frac{\partial}{\partial \theta}[\tan(\theta)]$$


**tan(θ) 的导数***
$$= \sin(\phi) \cdot \sec^2(\theta)$$

**最终结果**
$$= \sec^2(\theta) \sin(\phi)$$

#### q 对 φ 的偏导

**函数：**

$$q = \tan(\theta) \sin(\phi)$$

**求偏导（θ 看作常数）：**

$$\frac{\partial q}{\partial \phi} = \frac{\partial}{\partial \phi}[\tan(\theta) \sin(\phi)]$$
**常数提tanθ出来**
$$= \tan(\theta) \cdot \frac{\partial}{\partial \phi}[\sin(\phi)]$$

**sin(φ) 的导数**
$$= \tan(\theta) \cdot \cos(\phi)$$

**最终结果**
$$= \tan(\theta) \cos(\phi)$$


**所以q对φ和θ方向的贡献就有了，也就是雅可比矩阵的第二行**
$$
\begin{bmatrix}
\frac{\partial q}{\partial \theta} & \frac{\partial q}{\partial \phi}
\end{bmatrix}$$
$$\begin{bmatrix}
\sec^2(\theta) \sin(\phi) & \tan(\theta) \cos(\phi)
\end{bmatrix}$$
### 组成雅可比Jacobian 矩阵
$$
J = \begin{bmatrix}
\frac{\partial p}{\partial \theta} & \frac{\partial p}{\partial \phi} \\
\frac{\partial q}{\partial \theta} & \frac{\partial q}{\partial \phi}
\end{bmatrix}
$$

$$J = \begin{bmatrix}
\sec^2(\theta) \cos(\phi) & -\tan(\theta) \sin(\phi) \\
\sec^2(\theta) \sin(\phi) & \tan(\theta) \cos(\phi)
\end{bmatrix}$$

因为我们处理的是一个**面积缩放**，需要的是一个缩放的**标量**，而非矩阵变换，所以此处对矩阵采用行列式形式计算提取一个值
应用 2×2 行列式公式
$$\begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc​$$
$$|J| = \sec^2(\theta) \cos(\phi) \cdot \tan(\theta) \cos(\phi) - [-\tan(\theta) \sin(\phi)] \cdot \sec^2(\theta) \sin(\phi)$$
$$= \sec^2(\theta) \tan(\theta) \cos^2(\phi) + \sec^2(\theta) \tan(\theta) \sin^2(\phi)$$
**化简（这是化简行列式，不是矩阵）**

$$|J| = \sec^2(\theta) \tan(\theta) \cos^2(\phi) + \sec^2(\theta) \tan(\theta) \sin^2(\phi)$$
$$= \sec^2(\theta) \tan(\theta) [\cos^2(\phi) + \sin^2(\phi)]$$
$$= \sec^2(\theta) \tan(\theta)$$
$$= \frac{\sin(\theta)}{\cos^3(\theta)}$$

**单位面积的缩放：**

输入空间：dθ × dφ（单位面积）
  ↓ 变换
输出空间：|J| × dθ × dφ（变换后面积）

|J| = 面积放大/缩小因子

概率守恒： 
$$ p(θ, φ) dθ dφ = p(p, q) dp dq$$
$$p(θ, φ) dθ dφ= p(p,q)  dθ dφ × |J|$$
所以： 
$$p(p, q) = p(θ, φ) / |J|$$

代入 
$$|J| = \frac{\sin(\theta)}{\cos^3(\theta)} $$
得到
$$p(p, q) = p(\theta, \phi) \cdot \frac{\cos^3(\theta)}{\sin(\theta)}$$​


**现在就有(p,q) → (θ,φ)最终的雅可比了，也就是已经转换到宏观空间了，但是还需要转换到球面空间**

**立体角微元:**
$$dω = sin(θ) dθ dφ$$

**从 (p,q) 到立体角：**

$$dp \, dq = \frac{\sin(\theta)}{\cos^3(\theta)} d\theta \, d\phi$$
$$=\frac{1}{\cos^3(\theta)} \cdot \sin(\theta) d\theta d\phi$$
$$=\frac{1}{\cos^3(\theta)} \cdot d\omega$$
$$= \frac{d\omega}{\cos^3(\theta)}$$
**还需要考虑单位球上投影：**
投影到法线空间的"面积"元素需要除以 cos⁡(θ)：

$$dA_h = \frac{d\omega}{\cos(\theta)}$$
也就是
$$ d\omega= \frac{dA_h}{\cos(\theta)}$$
**代入分布**

$$dp \, dq = \frac{d\omega}{\cos^3(\theta)}$$
$$= \frac{dA_h / \cos(\theta)}{\cos^3(\theta)}$$
$$=\frac{dA_h}{\cos^4(\theta)}$$
**所以最终得到结果是**
$$ |J| =\frac{dA_h}{\cos^4(\theta)}$$
**概率密度变换**

$$p(p, q) \, dp \, dq = D(h) \, dA_h$$
$$D(h) = p(p, q) \frac{dp \, dq}{dA_h}$$
$$= p(p, q) \frac{dA_h / \cos^4(\theta)}{dA_h}$$$$= \frac{p(p, q)}{\cos^4(\theta)}$$

**根据点乘定义，这里定义n和h都是单位向量，所以结果是cos(θ)**
$$n \cdot h = cos(θ)$$
**所以有：**

$$\cos(\theta) = n \cdot h$$
**代入 cos(θ)，得到了最终的分布关系**

$$D(h) = \frac{p(p, q)}{(n \cdot h)^4}$$


### 微表面斜率空间转到宏观法线
**当前微表面的法线表示是(p,q,1)，但是我们需要进行归一化**
***归一化因子就是所有分量的平方相加在开方***
$$|h_{raw}| = \sqrt{p^2 + q^2 + 1^2} = \sqrt{p^2 + q^2 + 1}$$

$$h = \frac{h_{raw}}{|h_{raw}|} = \frac{(p, q, 1)}{\sqrt{p^2 + q^2 + 1}}$$
**即：**

$$h = \left( \frac{p}{\sqrt{p^2+q^2+1}}, \frac{q}{\sqrt{p^2+q^2+1}}, \frac{1}{\sqrt{p^2+q^2+1}} \right)$$


**点积计算**
**这里左侧表示宏观计算noh,右侧则是微观的noh，它们在数值上应该相等**
$$n\cdot h = (0, 0, 1) \cdot \frac{(p, q, 1)}{\sqrt{p^2 + q^2 + 1}}$$

**展开点积：**

$$= \frac{0 \times p + 0 \times q + 1 \times 1}{\sqrt{p^2 + q^2 + 1}}$$
$$= \frac{1}{\sqrt{p^2 + q^2 + 1}}$$

**现在就可以反向求解p和q

$$p^2 + q^2 = \frac{1 - (n \cdot h)^2}{(n \cdot h)^2}$$


**代入$p^2$+$q^2$**
我们有： - 柯西分布：$p(p,q) = \frac{\alpha^2}{\pi(p^2+q^2+\alpha^2)^2}$ - 几何关系：$p^2 + q^2 = \frac{1-(n \cdot h)^2}{(n \cdot h)^2}$
$$ p(p,q)=\frac{α^2}{π(p^2+q^2+α^2)^2} $$
**得到**
$$p(p, q) = \frac{\alpha^2 (n \cdot h)^4}{\pi [(n \cdot h)^2(\alpha^2 - 1) + 1]^2}$$

根据前面得到的关系
$$D(h) = \frac{p(p, q)}{(n \cdot h)^4}$$

**最终最终得到**
$$ D_{GGX}(h) = \frac{\alpha^2}{\pi \left[ (n \cdot h)^2 (\alpha^2 - 1) + 1 \right]^2} $$



# 对于F菲涅尔项的公式由来和解释
## 精确 Fresnel 方程（1823）
```c
发明者：Augustin-Jean Fresnel（法国物理学家）
年代：  1823 年
用途：  光学、物理学

公式：
  Rs = |n₁cosθᵢ - n₂cosθₜ|²
       |n₁cosθᵢ + n₂cosθₜ|
       
  Rp = |n₁cosθₜ - n₂cosθᵢ|²
       |n₁cosθₜ + n₂cosθᵢ|
       
  R = (Rs + Rp) / 2

需要：
  n₁ = 空气折射率 (1.0)
  n₂ = 材质折射率 (1.5, 1.33, ...)
  θᵢ = 入射角
  θₜ = 折射角（由 Snell 定律算出）
  
特点：
  ✅ 完全精确
  ✅ 物理正确
  ❌ 计算复杂
  ❌ 需要 IOR
  ❌ 需要 Snell 定律
  ❌ GPU 上慢
```
## Schlick 近似（1994）
```c
发明者：Christophe Schlick
年代：  1994 年
用途：  实时渲染、游戏

公式：
  F(θ) = F₀ + (1 - F₀)(1 - cosθ)⁵

需要：
  F₀ = 基础反射率（可以从 IOR 预计算）
  cosθ = 角度余弦（一个点积）
  
特点：
  ✅ 简单（一个 pow）
  ✅ 快速（适合 GPU）
  ✅ 误差小（< 1%）
  ❌ 不是完全精确
```
# 对于G几何遮挡项的公式的由来和解释
**D** 项说有微表面朝向 h和高光形状，**F** 项说它们会是否反射，但是因为有许多微平面，它们之间反射肯定会有遮挡关系，那么**G**项就是计算遮挡关系

## 公式：Smith-GGX
**Height-Correlated Smith-GGX（完整版）：**

$$G_1(m) = \frac{2(n \cdot m)}{(n \cdot m) + \sqrt{\alpha^2 + (1-\alpha^2)(n \cdot m)^2}}$$
**其中：**
- m = 方向（可以是 v  或  l）
- α = 粗糙度参数（= roughness²）

**因为原公式计算太过复杂所以有了简化公式：**
**Christophe Schlick 提出的近似：**

$$G_1(m) \approx \frac{n \cdot m}{(n \cdot m)(1-k) + k}$$
**参数 k 的定义（Schlick 原始）：**

$$k = \frac{\alpha}{2}$$

**其中 $\alpha  = roughness²$**

**所以：**

$$k = \frac{\text{roughness}^2}{2}$$
**但是Schlick 的 k = α/2 在实际使用中有问题，如果粗糙度是0.5，掠射角看的时候偏亮，暗粗糙度变化不符合直觉**
**问题：如果直接用 roughness²也就是α** 当 roughness = 0.5（中等粗糙）时： 
``` c
float k = roughness * roughness / 2; // k = 0.125 
掠射角（NoV = 0.1）： 
G₁ = 0.1 / (0.1 × 0.875 + 0.125) = 0.47 
```
**边缘只暗了 53%，看起来不够粗糙，也就是反射还是太过明显**

**Disney 的解决方案（2012）：**

**重新映射 α：**

$$\alpha_{\text{remapped}} = \frac{\text{roughness} + 1}{2}$$

**然后：**

$$k = \frac{\alpha_{\text{remapped}}^2}{2}$$

**代入：**

$$k = \frac{\left(\frac{\text{roughness}+1}{2}\right)^2}{2}$$
$$= \frac{(\text{roughness}+1)^2}{4 \times 2}$$
$$= \frac{(\text{roughness}+1)^2}{8}$$
**Disney 的重映射：**
```c
float k = (roughness + 1) * (roughness + 1) / 8;  // k = 0.281

掠射角（NoV = 0.1）：
  G₁ = 0.1 / (0.1 × 0.719 + 0.281)
     = 0.28
```
**边缘暗了 72%，符合"中等粗糙"的预期**

**所以k 的计算（直接光照）：**

$$k = \frac{(\text{roughness} + 1)^2}{8}$$
​**对于环境光K**
直接光（点光源）： 
- 光来自单一方向 
- 需要重映射以符合感知 
- k = (α_remapped)² / 2 
环境光（IBL）：
- 光来自整个半球 
- 已经在预过滤时考虑了分布 
- 不需要重映射 
- k = α² / 2（原始 Schlick）
**所以环境光K不用变**
$$k = \frac{\text{roughness}^2}{2}$$
**其中可视性遮蔽：**
$$G_1(v) = \frac{n \cdot v}{(n \cdot v) \cdot (1 - k) + k}$$​
**其中光线遮蔽：**
$$G_1(l) = \frac{n \cdot l}{(n \cdot l) \cdot (1 - k) + k}$$
**那么最终计算结果形式是**
$$G(l, v, h) = G_1(l) \cdot G_1(v)$$

## 最终结果解释
![[Pasted image 20251227192921.png]]
这里用乘法表示交集意思是**满足光线能照射到**且**可视性遮蔽是可视的**
Smith 的核心假设
独立性假设： Shadowing 和 Masking 相互独立 
概率论： P(可见) = P(光线不被挡) × P(视线不被挡) = G₁(l) × G₁(v)
$$G(l, v, h) = G_1(l) \cdot G_1(v)$$
# BRDF的归一化分母
1. 因子 **4**： 来源：立体角 Jacobian 变换 从微表面法线 h 到入射方向 l$$ dω_h = dω_l / [4(v·h)] $$
2. 因子 **(n·l)**： 来源：入射投影 光从 l 方向的有效强度 Lambert 余弦定律 
3. 因子 **(n·v)**： 来源：出射投影 从 v 方向看的有效面积 Foreshortening 效应

 **(n·l) 和 (n·v)：** 
 都是**单位向量**的点积 
 等于夹角的 cos 值 
 表示投影比例 
 代表"损失"或"缩减"
# 移动端的优化SpecularBRDF
**标准的GGX高光计算**
$$ f_{spec}(l, v) = \frac{D(h) \cdot F(v, h) \cdot G(l, v, h)}{4 \cdot (n \cdot l) \cdot (n \cdot v)}\cdot NoL \cdot SpecularColor$$
**替换几何项**
$$V(l,v,h)=\frac{G(l,v,h)}{4⋅(n⋅l)⋅(n⋅v)}$$**近似**​

$$ F⋅V≈\frac{1}{LoH_2⋅(roughness+0.5)}$$​

**最终GGX高光完整公式：**

$$Specular = D \cdot \frac{1}{LoH^2 \cdot (roughness + 0.5)} \cdot NoL \cdot SpecularColor$$
$$ D_{GGX}(h) = \frac{\alpha^2}{\pi \left[ (n \cdot h)^2 (\alpha^2 - 1) + 1 \right]^2} $$


