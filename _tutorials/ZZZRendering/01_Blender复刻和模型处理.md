---
title: Blender复刻和模型处理
layout: page
permalink: /tutorials/ZZZRendering/01_Blender复刻和模型处理/
layout: post
date: 2025-12-21 
description: Blender复刻和模型处理
tags: [shader, rendering, unity, tutorials, blender]
categories: [ZZZ渲染复刻]

featured: true
toc:
  sidebar: left # 目录
comments: true # 评论
images:
  spotlight: true  # ← 启用 Spotlight图片放大
---

# 安装BlenderMMD导入插件

## 方法1 Github下载

<https://github.com/UuuNyaa/blender_mmd_tools/tree/v4.2.2?tab=readme-ov-file>

## 方法2 Blender内置下载

***内置下载或者到Blender插件社区下载***
社区地址：<https://extensions.blender.org/>
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230213258.png)

# 模型处理

## 导入

 ![图片](/assets/img/ZZZRendering/Pasted image 20241230213609.png)

## 删除无用

***joints（关节点）和rigidbodies（刚体）***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230213754.png)

## 多余材质合并

***面，齿，舌，口合并，编辑模式下材质面板点一下直接选择就行，最后选择面，点击指定***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230214738.png)
***合并后物体模式下删除材质槽***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230215139.png)
***眼睛合并到一起***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230215327.png)
***眉毛合并到一起***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230215501.png)
***眼睛高光和透贴不要删除***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230215737.png)
***头发（刘海）需要拆下来，做眼睛透过头发效果***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230220009.png)
***不需要分离，选出来之后直接新建一个材质头发指定上***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230220736.png)
***将头发，肌肤，黑丝都合并到饰品里，然后删掉其他的***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230220911.png)

## 生成一套平滑法线用于描边

***可以存在UV里面或者在定点色里面***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230221247.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230221351.png)

### 新建python脚本

***注意：mesh = bpy.data.meshes['星見雅']，这里的名称是网格体名称***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241230234721.png)
***因为是UV存值，所以需要将点位置从3维转换到2维，使用八面体映射***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250104210302.png)

```python
import bpy  
from mathutils import *
from math import *
import numpy as np

#创建空字典列表list
dict = {}
#获取模型Mesh
mesh = bpy.data.meshes['星見雅']

#calc_tangents：
#在网格中计算每个顶点的切线（tangent）、双切线（bitangent）和法线（normal），以便后续的方向相关计算。
mesh.calc_tangents(uvmap = 'UVMap')

#计算两个向量之间的夹角
# a·b = |a||b|cosθ
# θ = arccos(a·b / (|a||b|))
# 这里返回的弧度值  θ * (π/180) ≈ xxx弧度
def included_angle(v0, v1):
    return np.arccos(v0.dot(v1)/(v0.length * v1.length))

# 3维降为2维
def unitVectorToOct(v):
    # 步骤1：计算L1范数（曼哈顿距离）
    d = abs(v.x) + abs(v.y) + abs(v.z)
    # 步骤2：通过除以L1范数进行投影到八面体表面
    # o 是八面体的坐标
    o = Vector((v.x / d, v.y / d))
    # 步骤3：如果z是负数，需要进行特殊处理以保持连续性
    if v.z <= 0:
        # 使用折叠技术处理八面体的下半部分
        o.x = (1 - abs(o.y)) * (1 if o.x >= 0 else -1)
        o.y = (1 - abs(o.x)) * (1 if o.y >= 0 else -1)
    return o

#.co是coordinate的缩写，表示顶点的坐标。
# 取出模型的每一个顶点坐标，然后清空置空列表，后续存入新的坐标数据
for vertex in mesh.vertices:
    # 初始化 "<Vector (1.0, 2.0, 3.0)>": []
    dict[str(vertex.co)] = []

# 获取模型Mesh的每一个面
# l0,l1,l2分别表示模型Mesh的每一个面中的每一个顶点数据
# l0,l1,l2这样的写法是Blender的写法，表示loop0,loop1,loop2的循环体
# mesh.loops 存储了多边形顶点的循环信息
# poly.loop_start 表示多边形顶点的循环开始索引
for poly in mesh.polygons:
    #获取模型Mesh的每一个三角面中的每一个顶点数据
    l0 = mesh.loops[poly.loop_start] 
    l1 = mesh.loops[poly.loop_start + 1]
    l2 = mesh.loops[poly.loop_start + 2]
    
    #获取模型Mesh的每一个面中的每一个顶点数据
    ## 顶点的主要属性：
    #vertex.co           顶点的3D坐标 (Vector类型，包含x,y,z)
    #vertex.normal       顶点的法线方向
    #vertex.index        顶点在mesh.vertices数组中的索引号
    #vertex.groups       顶点组信息（用于骨骼绑定等）
    v0 = mesh.vertices[l0.vertex_index]
    v1 = mesh.vertices[l1.vertex_index]
    v2 = mesh.vertices[l2.vertex_index]

    #计算向量，三角形两条边向量
    vec0 = v1.co - v0.co
    vec1 = v2.co - v0.co
    
    #计算向量叉积，三角形两条边向量叉乘，得到法线
    n = vec0.cross(vec1)
    n = n.normalized()

    #v0.co 是一个 Vector 类型，包含 (x,y,z) 坐标值
    #Python的字典要求键（key）必须是"可哈希的"（hashable）
    #Vector 类型不能直接用作字典的键
    #这里将顶点坐标转换为字符串，便于后续使用
    #k0,k1,k2是字典的Key
    k0 = str(v0.co)     # 将顶点0的坐标转换为字符串
    k1 = str(v1.co)     # 将顶点1的坐标转换为字符串
    k2 = str(v2.co)     # 将顶点2的坐标转换为字符串
    
    # 计算三角形三个顶点的权重
    if k0 in dict:
        #计算顶点0的权重，w实际上是两向量夹角角度
        w = included_angle(v2.co - v0.co, v1.co - v0.co)
        # 添加数据
        dict[k0].append({"n" : n, "w" : w})
        
    if k1 in dict:
        w = included_angle(v0.co - v1.co, v2.co - v1.co)
        dict[k1].append({"n" : n, "w" : w})
        
    if k2 in dict:
        w = included_angle(v1.co - v2.co, v0.co - v2.co)
        dict[k2].append({"n" : n, "w" : w})
        
for poly in mesh.polygons:
    # 获取每一个三角面数据 
    #range(poly.loop_start, poly.loop_start + 3)遍历3个点
    for loop_index in range(poly.loop_start, poly.loop_start + 3):
        l = mesh.loops[loop_index]
        vertex_index = l.vertex_index
        v = mesh.vertices[vertex_index]
        #smoothNormal初始化
        smoothNormal = Vector((0,0,0))
        weightSum = 0
        k = str(v.co)
        if k in dict:
            a = dict[k]
            for d in a:
                n = d['n']
                w = d['w']
                #加权平均法线的计算公式：
                #例如：smoothNormal = (n1 * w1 + n2 * w2 + n3 * w3) / (w1 + w2 + w3)
                smoothNormal += n * w
                weightSum += w
        if smoothNormal.length != 0:
            smoothNormal /= weightSum
            smoothNormal = smoothNormal.normalized()
        else:
            # 如果计算出的平滑法线无效（长度为0），
            # 使用原始顶点法线作为后备方案
            smoothNormal = l.normal
        
        normal = l.normal           # 获取顶点的原始法线
        tangent = l.tangent         # 获取顶点的原始切线
        bitangent = l.bitangent     # 获取顶点的原始副切线

        # 计算投影
        # 使用原始的切线空间基底，计算平滑法线在这个空间中的表示
        x = tangent.dot(smoothNormal)       # 平滑法线在原始切线方向上的投影
        y = bitangent.dot(smoothNormal)     # 平滑法线在原始副切线方向上的投影
        z = normal.dot(smoothNormal)        # 平滑法线在原始法线方向上的投影
        
        #UV数组的大小总是等于loops的数量
        uv1 = mesh.uv_layers['UVMap.001'].uv[loop_index]
        
        uv1.vector = unitVectorToOct(Vector((x,y,z)))
```

***如果使用顶点色传入的话不需要进行维度转换***

```python
# 存入顶点色而不是UV
vertex_color_layer = mesh.vertex_colors.active.data[loop_index]
# 直接将平滑法线的分量存入顶点色
vertex_color_layer.color = (smoothNormal.x, smoothNormal.y, smoothNormal.z)
```

## 模型拆分

***将有形态键的面部单独拆一个网格，包含下面的目影一起拆***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231214912.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231214944.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231215006.png)
***清理材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231215143.png)
***面部一样清理一下***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231215438.png)
***去除原网格体形态键***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231215343.png)
***给虚幻引擎需要将模型拆分多一些，刘海拆分下来***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231215833.png)

***饰品和衣服也拆分下来***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231220041.png)
***因为涉及到半透明排序还有覆层材质，眼影等全部都要拆分***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231220235.png)
***拆完记得重命名和清理材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20241231220825.png)

# Blender内模型可以不需要拆

***合并之前的模型，刘海记得单独一个材质插槽***

# 材质编辑

## 添加图像纹理

 ![图片](/assets/img/ZZZRendering/Pasted image 20250102163210.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102162951.png)
***Ctrl+G打组，并输出，更改输出接口名称***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102163650.png)

## 新建shader打组

 ![图片](/assets/img/ZZZRendering/Pasted image 20250102164312.png)
***再使用自发光Shader创建一个工具组，删掉自发光节点，创建输入接口，一个为int0~3表示判断身体区域，另一个接口为布尔类型***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102165045.png)
***返回上层输出接口只保留一个Shader即可***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102164830.png)
***输入接口新增，直接用Tool节点拖过去生成然后改名字就行这里，BodyArea是int类型0~3，1:Face 2:Eye 3:Body***
***这里的Color和Alpha是用来自定义混合颜色用的***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102165549.png)
***返回最上层，链接贴图，修改节点名称***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102165836.png)

### 混合颜色

***进入ForwardShader组，进行混合颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102180753.png)

### 判断材质域

***复制一个输入节点来判断材质域***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102170922.png)
***打组，修改输入输出，Domain是整形，输出Value是布尔***
***0.5~1.5是Face***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102172025.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102172135.png)
***同理创建3个判断***
***1.5~2.5是Eye***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102172510.png)
***大于2.5是Body***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102173034.png)
***完成后***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102173349.png)

## 对Eye材质域进行alpha混合

 ![图片](/assets/img/ZZZRendering/Pasted image 20250102180727.png)

## 复制当前基础材质

***给每个材质球都复制一份，并更改材质域和贴图***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102202518.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102202658.png)

## 更改色彩空间改为标准

***修改后就没那么灰了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102202826.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250102202846.png)

# 添加描边

## 新增描边材质

 ![图片](/assets/img/ZZZRendering/Pasted image 20250106195943.png)
***先随便给个黑色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106200452.png)
***开启背面剔除***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106200339.png)
***复制几个材质给面部身体***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106200751.png)

### 添加实体化

***这些调整实际上就是把实体化参数全部归零***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106201229.png)

### 添加新的顶点组

***添加新顶点组，表示生成的新顶点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106201412.png)
***指定给实体化修改器，这样就得到实体化生成的一个顶点组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106201539.png)
***添加几何节点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106201724.png)
***几何节点，取出刚才的组里的点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106202606.png)
***在添加一个描边材质的组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106202444.png)
***编辑模式下根据材质，选择脸的部分，然后再顶点组里面标记权重为1***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106202847.png)
***同理，头发和饰品权重标记为0.7，记得点指定***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106203037.png)
***然后衣服选中，标记为0.3***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250303110738.png)

### 几何节点

***提取OutlineMask数据***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106203753.png)
***与实体化生成的顶点数据进行比较***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106204147.png)
***添加组输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106204102.png)
***修改类型***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106204234.png)
***此时修改器面板需要指定材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106204344.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106204419.png)
***根据权重数据，设置不同材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106205247.png)
***添加描边宽度参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106205530.png)
***设置描边法线外扩***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106205655.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106210058.png)
***输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106210931.png)
***此时描边还是断开的，需要读取平滑法线进行修复***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106210901.png)
***可以使用按距离合并，能用，但会有瑕疵，使用UV中的平滑数据就不会这样，当前这里是偷懒的办法***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106211531.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106211517.png)

### 加入相机深度

***添加相机并设置FOV***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107165837.png)
***几何节点计算相机到物体深度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107214159.png)
***这里注意一点，ViewDir在这里和Unity中不太一样，这里是相机指向物体，而Unity和UE都是处理成物体指向相机，本质其实差不多，只是计算CameraForward就需要取Vector（0,0,1,1）***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107215551.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107214705.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107214122.png)
***计算ViewDir***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107171522.png)
***对于Blender的相机面向的是负Z轴方向，所以取Vector（0,0,-1,1）进行偏转获得CameraForward向量***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107213730.png)
***ViewDir和CameraForward进行dot获取深度，也就是相机和物体距离在CameraForward方向上的投影长度，这样可以规避旋转的影响，计算ViewDir在CameraForWard方向上的投影，然后钳制到0~1***
***UE单位是CM所以是钳制到100，而Blender是M所以是钳制到1，1m内随屏幕占比缩小或放大，描边适当放大或缩小不至于消失或过粗，1m外就随屏幕占比而缩小***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107215759.png)
***接入描边粗细控制，这里乘上45是FOV的值，因为在相机中物体做了透视投影，这里希望与FOV进行关联***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107223117.png)

### 加入顶点描线Z偏移

***新增参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107223441.png)
***这里获取偏移方向***
***顶点位置在裁剪空间下Z偏移等价于世界空间下延视线方向偏移***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224150.png)
***进行归一化得到偏移方向的单位向量，然后乘上ZOffset的值就是偏移量***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224233.png)
***因为只有面部需要偏移，所以需要混合设置，在这里获取混合因子***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224523.png)
***然后与原输出法线外扩的数据进行相加就行了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224653.png)
***此时还是有瑕疵，转动视角描边有问题***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224857.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107224831.png)

### 描边问题修复

***描边问题出在，几何节点中的Position是模型空间下的，而相机位置是世界空间下的，这里注意，虽然说相机位置显示的坐标是和世界坐标一致，但它其实是观察坐标系***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250107225155.png)

#### 世界变换

***在旧的版本中，ObjectInfo是没有Transform选项的，所以需要手动计算变换，进行矩阵变换***
***这里先处理点位置，这里是属于仿射变换，包括平移，旋转，缩放***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250108182533.png)
***手动转换，这里先对位置进行处理相减，然后反向旋转，最后处理缩放***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109180637.png)
***新版Blender可以使用转换矩阵进行转换***
***这里直接获得物体空间到世界空间的逆矩阵，这样就获得了物体空间矩阵，将相机位置转换到物体空间，就和Position同一空间了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109180958.png)
***除了将相机位置转换到物体空间，也可以反过来，将Position转换到世界空间***
***取世界空间矩阵进行空间变换，获得世界空间下的顶点位置PositionWS，这样也可以计算，但这里需要注意，转换后的PositionWS和CameraPos还是不是同一坐标系，还是需要对CameraPos进行处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109181419.png)
***这里将原位置改为相对位置就可以了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109181844.png)
***最后还有就是对于向量的变换，属于线性变换，我们只需要处理旋转和缩放就行***
***这里是选择全部转换到物体空间，因为步骤较为简单***
***取出旋转的逆***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109182257.png)
***这里对CameraForWard向量进行变换，转换到物体空间***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109182355.png)

#### 除开变换额外的问题

***到这里描边修复基本完成，但依旧还存在问题，那就是仅在相机视角观察是对的，因为这里取的是活动相机位置***
***当前是相机里面观察***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109182707.png)
***这里是不用相机***
***转动视角，描边出现问题，这里不修其实也无伤大雅，因为渲染仅在相机中渲染，是不会影响最终输出的，如何想要预览正常，在新版中也可以修改***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109182754.png)

#### 调整描边生成方式修复预览

***断开几何节点输出，创建StoreNamedAttrbute存储属性进行输出，将Name设置为Outline,Value设置为1***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109184510.png)
***找到描边的材质，在里面进行处理，读取刚才几何节点传出的属性***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109184943.png)
***计算深度并打组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109185414.png)
***添加参数，描边宽度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109185615.png)
***获取描边外扩***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109191249.png)
***计算ZOffset，这里需要将相机位置转换到世界空间***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109190046.png)
***混合输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109191306.png)
***修改组名称并输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109190624.png)
***这里输出后还是没有效果，需要调整材质面板设置***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109191329.png)
***这时面部描边就生效了，先把节点组复制所有的描边材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109192001.png)
***最终预览，注意除了面部，其他部位不需要ZOffset***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109192333.png)

#### 两种生成方式

***几何节点是CPU计算，而在Shader中有GPU加速所以会渲染快很多，看帧率都看的出来，而且Shader里面是没有瑕疵的***

### 描边颜色混合

#### 导入贴图

 ![图片](/assets/img/ZZZRendering/Pasted image 20250109193241.png)
***这里设置采样颜色模式为无SRGB***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109193208.png)
***DataTex打组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202103.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109193528.png)
***创建描边自发光Shader，这里进行区域判断和颜色混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203157.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203128.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202219.png)
***解码DataTex判断是否是Body部分，只有Body部分是分了很多材质，描边颜色不一样***
***如果是Face部分，就输出ID=0,进使用Color1进行设置颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202921.png)
***计算材质ID,这里第一个乘应该是x5不是4***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202417.png)
***如果材质域是Body，会进行混合颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202910.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109202856.png)
***将输出颜色压暗***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203018.png)

#### 描边完整节点

***注意要调一下材质域，衣服部分使用是OtherDataTex的Color2输入，除了面部模型的OutlineShader组的Color1是粉色FF8181，其余都是灰色555555***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203838.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203828.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203857.png)

### 最终描边效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250109203701.png)

## 为什么使用实体化修改器而不是直接几何节点合并操作

***如果合并的话，原模型的自定义法线会被修改，这里进行合并***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106212413.png)
***合并前***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106220644.png)
***合并后***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106220618.png)
***使用实体化来进行描边的权重注册，这里指定了顶点组，是为了让实体化出来的顶点进行注册权重，可以理解为是取原来模型的那一部分顶点进行实体化，并修改权重***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106222913.png)
***在几何节点中判断权重，这样取的实体化修改器法线外扩的顶点信息***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250106222854.png)

# 着色阶段

## 添加平行光

***调整一下角度，我这里是45度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111191315.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111191435.png)

## 几何节点中将光数据传给Shader

### 平行光向量LightDirWS

 ![图片](/assets/img/ZZZRendering/Pasted image 20250111193032.png)

### 平行光颜色

***创建合并颜色节点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111193324.png)
***平行光的颜色需要使用驱动器进行读取***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111193412.png)
***调整类型***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111193450.png)
***指定场景的灯光，获取颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111193526.png)
***其他几个通道同理，这里还需要乘上光照强度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111194046.png)
***驱动器设置***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111194110.png)
***输出平行光颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111195116.png)

## 构建基础光照模型

### 读取灯光数据进行打组

 ![图片](/assets/img/ZZZRendering/Pasted image 20250111195457.png)
***打组，修改变量名称***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111195659.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111195642.png)

### 读取法线和漫反射偏移

***加入贴图，这里贴图RG是法线，B是漫反射偏移***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111195906.png)

#### 创建LightTex组

***添加贴图，调整颜色格式***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111200432.png)
***打组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111200857.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111200847.png)

#### 为基础Shader组添加参数

 ![图片](/assets/img/ZZZRendering/Pasted image 20250111201520.png)

#### 解析LightTex

***这里直接进行打组创建***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111201715.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111210130.png)
***先进行重映射，采样后映射到-1~1***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111210234.png)
***进行法线强度控制***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111210427.png)
***因为法线的各个向量平方之和是1，由此可以计算出Z分量，这里因为浮点数计算误差和贴图误差等，为了保证X和Y的平方和不超过1使用了Min节点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111213834.png)
***进行合并给到法线贴图节点，这里需要注意，这里不能使用Normalize归一化，因为Blender的NormalMap节点会进行Normal的重映射进行(x2-1),而之前计算的时候已经映射过了（-1~1），所以需要重新映射回来，就是(x0.5+0.5)重新回到0-1范围***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111214731.png)

***只有身体部分有法线贴图和漫反射偏移，所以进行判断非身体部分直接输出普通法线，上方是漫反射偏移，乘上了系数2，下方是法线输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215315.png)

#### 计算BaseAttenuation衰减（Lambert）

***解析了法线和漫反射偏移，就可以计算兰伯特光照了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215611.png)
***BaseAttenuation内部节点***
***用PiexlNorma点乘光线向量然后加上漫反射偏移DiffuseBais***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215703.png)

### 输出测试

 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215838.png)
***给各个材质进行分别设置Light贴图***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215907.png)
***光照效果***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250111215938.png)

## 光照分层着色

### ForWardShader新增输入

***添加软硬控制，光滑系数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250121222946.png)

### 创建新组

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121223307.png)

#### 对AlbedoSmoothness处理

***先乘上1.5倍进行重映射，1-重映射的值获取锐利系数，锐利系数 = 1 - 光滑系数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250121224413.png)

#### 添加BaseAttenuation并进行重映射

***新增组输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250121224246.png)

### 分层

### 分层公式

 ![图片](/assets/img/ZZZRendering/Pasted image 20250115183100.png)
***对应代码，S1为锐利系数，S0为光滑系数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250117222413.png)
***这里是分为7层：***
ShadowFade最深阴影
Shadow较浅阴影
ShallowFade中间过渡较深阴影
Shallow中间过渡较浅阴影
SSS次表面部分
Front 明亮区域，接近没有衰减
Forward 最强反射部分,没有衰减

#### ShadowFade最深阴影

***除以锐利系数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250121225039.png)

#### Shadow较浅阴影

***除以光滑系数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230147.png)

#### ShallowFade中间过渡较深阴影

  ![图片](/assets/img/ZZZRendering/Pasted image 20250121230518.png)

#### Shallow中间过渡较浅阴影

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230547.png)

#### SSS次表面部分

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230611.png)

#### Front 明亮区域，接近没有衰减

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230634.png)

#### Forward 最强反射部分,没有衰减

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230654.png)

#### 分别输出

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230742.png)

### Albedo传入参数

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121230949.png)

### Forward组追加颜色参数输入

 ![图片](/assets/img/ZZZRendering/Pasted image 20250121232044.png)

### Forward组追加DataTex输入

 ![图片](/assets/img/ZZZRendering/Pasted image 20250122165845.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250122165824.png)

### 将Albedo组再进行打组处理并添加输入参数

 ![图片](/assets/img/ZZZRendering/Pasted image 20250122171458.png)

### 对各分层进行颜色混合

#### 阴影颜色根基深度进行提亮

 ![图片](/assets/img/ZZZRendering/Pasted image 20250122172123.png)
***打组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122172300.png)
***在进行打组创建NormalizeByAverageColor组，对颜色进行归一化，效果上，因为平均颜色的值小于1，这里会对颜色进行提亮***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122172804.png)
***打组，对深度和颜色进行混合，这里乘上0.43725，表示在0.43725m内时颜色会增亮，而相机远离时，变成原本的亮度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122173405.png)
***添加参数，对shadowColor和ShallowColor进行划分成两个亮度，对应就是ShadowFade和Shadow，ShallowFade和Shallow，然后进行输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122174244.png)
***对ShallowFadeTint、ShallowTint设置默认值***
PostShadowTint： CDCDCDFF
PostShadowFadeTint： CDCDCDFF
PostShallowTint： E6E6E6
PostShallowFadeTint： E6E6E6
***对于非阴影部分，不需要进行颜色亮度调整，直接输入输出即可，新增输入输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122175122.png)
***默认值调整***
PostSssTint： FFF1E6
PostFrontTint：FFFFFF
PostForwardTint：FFFFFF
***返回上层，当前节点为***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122175509.png)

#### 混合各层颜色

***乘法进行混合颜色后，将阴影部分进行相加，这里需要乘上灯光的颜色，所以现在对灯光进行处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122175913.png)
***追加灯光颜色输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122180150.png)

***阴影部分混合的灯光颜色需要压暗，这里是对灯光颜色处理，处理过后直接进行乘法混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122180401.png)
***阴影部分混合处理后的灯光颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122180459.png)
***非阴影部分直接进行混合即可***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122180542.png)

#### 传入参数

***返回上层对ShadowColor和ShallowColor以及灯光颜色进行传入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122181007.png)
***最上层节点调整，AlbedoSmoothness默认为0.1，设置传入DataTex***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250122181622.png)
***暴露阴影颜色值给外部，方便调整***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250124174733.png)
***暂时保持默认值就行***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250124174757.png)

#### 颜色参数设置

***面部***
ShadowColor1 ：DDBFBF
ShallowColor1 ：EEDDDD
***头发，饰品***
ShallowColor1 ：EEDDDD
ShallowColor2 ：A7A3B9
ShallowColor3 ：DAE3E8
ShallowColor4 ：E6BEBD
ShallowColor5 ：E6D4DF

ShadowColor1 : DDBFBF
ShadowColor2 : 66637B
ShadowColor3 : ABB4CE
ShadowColor4 : B48B8C
ShadowColor5 : CCACBA
***服装***
ShallowColor1 ：B9BFD1
ShallowColor2 ：DFE8ED
ShallowColor3 ：E6CEBF
ShallowColor4 ：9C94BC
ShallowColor5 ：93A0B2

ShadowColor1 : 8685AB
ShadowColor2 : BAC3E0
ShadowColor3 : CCA586
ShadowColor4 : 8780AG
ShadowColor5 : 637082
***面部参数调整***
ShadowColor1 ：DDBFBF
ShallowColor1 ：EEDDDD

#### 当前预览

 ![图片](/assets/img/ZZZRendering/Pasted image 20250124183443.png)
***乘上基础颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250304170857.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250124183819.png)

## 投影追加GooEngine

***一般的Blender版本只能在后期处理中获取深度图，但这里需要再材质面板中获取，只有GooEngine版本才行，但是GooEngine的描边只能使用几何节点构造，材质面板没有置换选项***
***一般版本获取深度：找到层设置，开启passes选项中的Z***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250302193410.png)
***合成面板这里就有了Depth节点了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250302193429.png)

### 灯光向量转换到观察空间

***光向量转换到观察空间得到偏移方向，因为是做屏幕投影，那么只要XY的方向信息即可，所以乘上（1,1，0）***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250304212707.png)

### 计算偏移量

***这里乘上5是经验值，除以100应该是以百分制来控制偏移强度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250304222513.png)

### 计算采样的屏幕深度UV

***GooEngine特有的节点，这里可以看到输入是观察空间下的Position。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250304222757.png)
***那么基于原UV进行偏移就可以得到新的UV,将当前位置转换到观察空间进行相加即可。注意这里不需要要进行透视除法，ScreenspaceInfo内部应该做了这一步，在Unity和UE中采用深度缓冲都要做透视除法***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310151036.png)

### 采样深度缓冲获得投影

****将偏移后的UV采样获得新的深度，新深度减去原深度即可获得投影，这里为了防止自投影所以原深度需要减去一个较小阈值，可以理解为去除面部，鼻子的阴影所做的处理，后面乘上一个应该是经验值的50，在使用FadeOut参数控制衰减程度，最后Clamp钳制到0~1***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310151109.png)
***输出测试可以看到投影正常生成了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310151301.png)

### 将ShadowAttenuation融入之前的分段

***对应代码操作***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250305123826.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250305123249.png)
***重映射为两个分段***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250305123658.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250305124310.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250305124334.png)

### 投影混合后的效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250305123154.png)

## SDF面部阴影

### 创建定位点

 ![图片](/assets/img/ZZZRendering/Pasted image 20250306171309.png)
***绑定到骨骼***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306171350.png)
***找到头部的骨骼名称进行指定***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306171430.png)
***对每个定位点指定父级骨骼***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306171534.png)
***调整位置，定位点移到骨骼根部，记得开启吸附***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306172218.png)
***HeadCenter延法线进行移动0.05到骨骼中心***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306172353.png)
***HeadRight除了向上移动0.05，还需要向人物面部的右侧移动0.05***
***HeadForward除了向上移动0.05，还需要向人物面部的前方移动0.05***
***位置如下***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306173019.png)

### 创建贴图组

***对于面部的SDF图读取，因为要根据灯光信息来决定采样UV的U方向，所以这里直接输出两个，一个的正常一个U反向***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307123327.png)

### 面部材质读取特殊处理

***因为面部是特殊的LightMap而且没有材质ID,所以LightMap的位置是空的，刚好这里可以利用起来，直接用空出的槽位读取***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307123802.png)

### 创建解析Light的组

***因为只有面部使用所以需要区域判断，还有灯光向量也需要输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307124058.png)

#### 计算灯光在面部的投影

***这里解释一下project节点就相当于AB向量点乘得到的B在A上的投影距离再乘上A,在用光向量减去这个投影向量就可以得到面到光源的一个向量***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307124832.png)

#### 计算光向量与面部的夹角

***A为面部到光源的向量，B和C为A在面部的前方向的负向量和右向量上面的投影长度，这里可以想象BC构成一个水平的坐标系，A是照射上面是斜着的，根据三角函数可以求出Tangent正切，在通过反正切函数得到角度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307200159.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307191746.png)
***注意这里不是常规的反正切而是actan2函数，对应上图的话就是左右分两半，从-Forward方向为起点也就是0，向下为末端π，左半为正右半为负。所以函数的输出范围就是-π到π，那么转为弧度就-1到1。如果大于0就1-去这个值，小于零就加1，这样就得到当光线在正面时为0，在背面为1***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307200324.png)

#### 根据光源方向翻转UV方向

***光源投影向量与右向量点乘，大于0就表示在右侧需要翻转UV的U反向采样，反之则不需要。因为贴图是默认是光线在左***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306163120.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307213634.png)

#### 根据区域来控制是否使用

***分通道输出，仅在材质域为面部的时候输出，反之输出0即可***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307213950.png)
***到这里解析贴图数据节点完成***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307214115.png)

### 混合之前的着色层级

***找到AlbedoShader添加输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307214308.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250306222607.png)

#### SDF分层

***看节点费劲可以看这个代码去连***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250305211639.png)
***在AlbedoShader内部创建新组进行数据处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307214456.png)
***内部处理节点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307215146.png)
***计算angleAttenuation,这里计算方式应该是设计好的，具体怎么设计的不清楚，现在就已经成功得到SDF了，但还需要对投影进行混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307215253.png)
***分层***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307215412.png)
***混合输出，这里算法太复杂，我也不清楚为什么这样计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307215501.png)
***最后在将输出和BaseAttenuation进行混合，使用AngelMask作为混合因子***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250307215754.png)

#### 当前效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250307220041.png)

## 添加鼻线

***当前没有鼻线，灯光在正面没有鼻子很奇怪***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310231833.png)

### 读取鼻线Mask

***鼻线的位置其实是在面部贴图的Alpha通道中，我们已经进行传入了，但是没有调用***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310232411.png)

### 创建NoseLine组

#### 参数设置

***先为Forward组添加输入参数，垂直水平显示的阈值还有鼻线颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310232547.png)
***创建新组并设置输入等参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310233102.png)
***传入的Mask需要先判断是否为Face***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310233149.png)

#### 获取观察向量

***获取观察向量一般来说是对世界空间下相机向量进行归一化即可。但Blender不太一样，它的相机深度轴不是Z,而是-Z,所以需要翻转。当然也有简单的获取方法**
***方法一***
***直接从几何属性获取，Incoming就是ViewDirWS，说实话这名字真不太熟啊。。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310233515.png)
***方法二***
***直接计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310234448.png)

#### 计算鼻线的DisplayValue

***参考代码***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310111654.png)
***根据点乘判断方向>0同向，小于0反向，计算ViewDir和HeadUP点积已及ViewDir和HeadRight点积用作判断。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310234521.png)
***这里我们需要自己写一个SmoothStep节点，因为Blender是MapRange节点里的不符合我们需要***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310234819.png)
***Smooth公式及节点如下：***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310230304.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235001.png)
***计算完成后输出结果，颜色进行压暗处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235107.png)

### 混合输出

***先使用NoseLineDispValue混合描边颜色和基础颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235202.png)
***混合完成后再使用Face的布尔值对带描线的颜色和不带描线的颜色混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235417.png)

### 参数设置

***给ForwardShader调参数，颜色为FF8181***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235506.png)

### 当前效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250310235646.png)

## 添加MatCap

### 贴图打组

***MatCap的遮罩信息在下方贴图的B通道中，先打组传入ForwardShader等下处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314172045.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314171851.png)

### 计算MatCap的UV

***因为Blender的组中不能传入贴图采样器，所以只能在ForwardShader组外面对matcap处理***
***使用之前的两个组获取法线***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314172318.png)
***创建一个新的组进行MatCapUV的计算***
***采样matCap的固定公式，将法线转换到观察空间，取XY作为UV进行采样，这里因为原本法线是-1~1，这里需要重映射到0~1，这样得到了基础的MatcapUV***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314172450.png)
***添加输入参数***
***对应的折射开关，折射深度，折射UV的缩放和平移***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314172702.png)
***在Unity或者UE中可以用4维的向量控制缩放和平移，但是Blender的向量属性只显示3维，所以这里只能拆分掉缩放和平移参数使用两个向量控制***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173004.png)
***当折射开启时，需要对UV进行调整，当然这里并非是真的计算折射，其实只是对MatCap采样进行缩放和平移调整。这里先乘上折射深度***
***整体公式就是：matCapUV = matCapUV * depth + Scale * input.uv + Offset;***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173130.png)

***计算并加上物体本身UV方向的平移值***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173345.png)
***最后在加上整体的平移***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173511.png)
***最后根据折射开关的Bool进行输出不同的UV,不开启就输出基础的MatCapUV***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173549.png)

### ForwardShader计算

#### 参数添加

***添加参数，对应是MatCap开关，MatCap贴图，Matcap染色，Matcap颜色强度和Alpha强度以及混合模式***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314173938.png)

#### 处理Matcap相关参数

***获取材质ID***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314175445.png)
***根据材质ID控制输出颜色等数据，之前只写了颜色选择，这里记得需要新建和修改，拓展两个出来，一个是Float类型，一个是Int类型***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314175529.png)
***读取传入的贴图新建一个组进行解释获得MatCap的Mask***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314175739.png)
***取出B通道就是MatCap的Mask***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314175842.png)

### 混合计算MatCap

***参数都处理完后，新建应该混合的组进行颜色混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314180016.png)
***输入参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314180119.png)
***这里分为三种混合模式***
***混合模式参数对应，0：乘法混合，1：加法混合，2：叠加混合***
***乘法混合（Multiply Alpha Blend）***
***这里先计算Alpha的值，blendColor就是MatCap采样颜色乘上基础混合颜色和Matcap颜色总强度，最后是使用alpha进行插值***
***从效果来说，乘法会使颜色变暗，而使用alpha混合，输出部分就全部是Matcap颜色或全是基础颜色，两者是不会有重叠的***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314180151.png)
***加法混合（Additive Blend）***
***同样先计算Alpha，几个混合模式中Alpha是一样的。这里是先是使用乘法混合matcap颜色和相关系数，最后是加法混合，使用原本颜色加上matcap颜色***
***效果来说就，在最后一步加法混合时，原颜色并没有剔除掉Alpha中部分，所以在alpha区域两个颜色相加就会变亮***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314180211.png)
***叠加混合（Overlay Blend）***
***叠加混合之前做了增加对比度的操作***
***对比度调整***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250312224202.png)
***先对matcap的blendColor进行处理，-0.5就是原本颜色范围变成-0.5~0.5以0.5为中心环绕，这时这个值作为一个基数在乘上颜色强度就得到了一个降低暗部增强亮部的系数，最后加上原本的matcapColor,相当于以matcapColor增强对比度***
***为了防止前面的颜色对比度过高失真所以使用一个中性灰色0.5进行平滑***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314180236.png)

***最终混合输出，使用MatCap开关判断是否使用MatCap***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314182503.png)

### 最外层参数调整

***饰品，头发等***
***MatCapTintColor5：E0C8BF***
***第五个插槽是丝袜的Matcap，需要开启折射，调整RefractUVScale5为0***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314182622.png)
***服装***
***颜色MatCapTintColor2：DBE4F8，MatCapTintColor5：D9E6EC***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250314182729.png)

### 当前效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250314182834.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250314182903.png)

## 颜色锐化处理

### 创建GammaColor组

#### 参数设置

***输入输出参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315233029.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315233117.png)

#### 计算遮蔽信息

***NDotL，顶点法线的兰伯特非常光滑细节较少***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315230058.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315225911.png)
***pixelNDotL，含贴图法线发兰伯特拥有很多细节***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315230119.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315225948.png)
***NDotL - pixelNDotL，两者相减可以得到物体的凹凸信息，那么用1减去这个值就可以得到一个遮罩的遮蔽信息occlusion***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315230140.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315230027.png)

***当前遮蔽信息还是不够强烈所以先乘上3在用1减去，这样增强效果，这里乘以几都可以，可以随意调整，以效果为主,最后进行钳制防止有小于零的值***
***saturate((1 - 3 * (NDotL - pixelNDotL)))***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231304.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231321.png)
***occlusion的杂色太多了，所以整体提亮2倍，去除一些杂色，只保留较小的信息，这里乘几同样也是经验值类的，自己随意调整以效果为准***
***(saturate((1 - 3 * (NDotL - pixelNDotL))) * 2***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231411.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231422.png)
***最后计算获得一个颜色衰减值，兰伯特的值是-1~1，这里使用半兰伯特0~1和遮罩系数进行计算是为了保留教暗地方的依旧有颜色衰减值，我们默认使用的是兰伯特光照，所以这里进行混合，使用0.5也就是均匀混合。这样就得到了一个颜色的衰减值，注意这里说的衰减值是作用于Gamma矫正也就是颜色变化，而不是仅仅亮度变化，这里叫做颜色Gamma矫正衰减系数应该比较合适***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231533.png)

#### 计算颜色亮度和gamma值

***有了颜色Gamma矫正衰减系数，然后知道Gamma矫正的值后，就可以对颜色进行Gamma矫正了，但在这之前需要钳制颜色亮度，因为Gamma其实本质可以理解为Pow(Color，gamma)，对于大于1的进行Pow会导致变得非常亮***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231806.png)
***ClampColor组***
***这里对颜色各个分量取得最大值，如果大于1，就将整个颜色除以这个值进行压暗，保证颜色不变的情况下降低明度，钳制到1以下**
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315231917.png)
***Luminance组***
***这里计算颜色的亮度值，因为Blender没有Luminance函数所以需要我们自己创建，参数有两个，一个是颜色，一个是各个通道的权重值，公式： 亮度值 = 0.299×R+0.587×G+0.114×B***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315232122.png)
***使用颜色Gamma矫正衰减系数混合计算Gmma值，这里这个乘 0.2875和加1.4375的操作也属于经验值，并不是固定的，以效果为准。有了Gama值后，现在就进行颜色的Gamma矫正了。Blender直接使用Gamma节点，根据效果来调整强度，使用兰伯特控制，亮的部分就使用Gamma，暗的地方就减小Gamma强度使用GammaHalf***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315232602.png)
***完整节点***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315234803.png)

#### 颜色混合输出

 ![图片](/assets/img/ZZZRendering/Pasted image 20250315233456.png)

### 当前效果

***左边是无处理，右边是进行颜色调整了的***
***可以看出处理过之后颜色变化更明显了，没有那么扁平了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250315233555.png)

## 添加PBR高光

### 贴图信息

***找到找到DataTex1贴图组，其中G通道就是金属度，B通道是高光遮罩***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319134741.png)
***金属度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319134812.png)
***高光遮罩***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319134957.png)

***找到DataTex2组，光滑度信息在G通道中***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319135037.png)
***光滑度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319135330.png)

### 提取贴图信息

#### 金属和高光遮罩

***修改之前解释DataTex1的组，提取金属和高光遮罩信息***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212522.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212546.png)

#### 光滑度

***修改之前解释DataTex2的组，提取光滑度信息***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212627.png)
***这里注意默认给0.58的光滑度而不是0***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212650.png)

### PBR漫反射和高光划分

#### 划分比例

 ![图片](/assets/img/ZZZRendering/Pasted image 20250316145231.png)

#### 创建DividePBRColor新组

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212801.png)
***pbrDiffuseColor进行金属与非金属的划分，非金属的最大漫反射比例是0.96，0.96 x  Color就是非金属的漫反射，而金属部分是只有镜面反射的没有漫反射，所以漫反射为0。pbrSpecularColor镜面反射，非金属的镜面反射比例就是1-0.96，因为非金属的镜面反射颜色不受本身颜色影响仅受材料的反射率影响，所以这里给上0.04固定颜色。而金属部分，金属的镜面反射是受颜色影响的所以反射原本的颜色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319145325.png)

### 高光的一般计算方法

***高光的常规计算方式是Phong和BlinnPhong***

#### Phong BRDF

***公式：***
***K是指SpecularIntensity高光强度，R是灯光向量（-L）的反射向量，V是观察向量，这里需要指明一点这里参加计算的灯光向量是物体指向灯光的向量，也就是-L***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317140026.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317141340.png)
***常规计算代码：***

```c
float3 reflect_dir = reflect(-light_dir, normal_dir); //获取灯光反射向量
float RdotV = dot(reflect_dir, view_dir);//数值范围在-1~1所以需要限制
float3 specular = pow(max(0.0, RdotV), _Shininess) * _SpecularIntensity;
```

#### Blinn-Phong BRDF

***K是指SpecularIntensity高光强度，H是半角向量是L和V之间的向量，V是观察向量,它不需要计算反射所以性能被Phong更好***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317141812.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317141851.png)

```c
half3 half_dir = normalize(light_dir + view_dir);//获得灯光与视角中间的半角向量
half NdotH = dot(normal_dir, half_dir);///数值范围在-1~1所以需要限制
```

#### PBR中 GGX BRDF高光计算

***相关资料***
<https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-20-66/siggraph2015_2D00_mmg_2D00_renaldas_2D00_notes.pdf>
***公式：***
***公式看起来太复杂了，说人话就是D是像NoH粗糙度影响然后乘上SpecularMask得到高光形状（这部分可以由我们自己调整），F是菲涅尔系数，G是物体表面的遮蔽。F和G是固定公式***
***GGX高光计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317151131.png)
***不乘上面末尾的NoL就是BRDF计算的结果***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317145043.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317150032.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317150839.png)

***Unity中URP的BRDF.hlsl文件中也有介绍,但这里是使用的优化版的减少计算量***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317144917.png)
***简化方式简单来说就是将F(菲涅尔项)与G(几何遮蔽项)变成了V点乘F***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317151101.png)
***将含G的这部分式子替换成V了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317151351.png)
***不需要纠结怎么简化的，反正最后优化成近似的结果，V乘F公式就变成了下面这个,L是光向量，H是半角向量***

```c
V * F = 1.0 / ( LoH^2 * (roughness + 0.5) )
```

***计算公式就变成了***

```C
BRDFspec = (D * V * F) / 4.0

Finalspec = (D * V * F) / 4.0 * NoL
```

### Forward组输入参数增加

***分别对应金属度，光滑度，头部球形法线范围，总高光强度，球形法线高光开关，高光范围，高光软硬度控制，高光Toon强度，根基模型大小控制高光强度的额外控制***

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212400.png)
***高光染色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319150044.png)

### 饰品类PBR卡通高光计算

#### 参数处理

***使用MatID和Select组处理输入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212836.png)

#### 创建高光Shader组

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319212856.png)

#### 计算HalfDir和传入参数

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319213107.png)
***传入对应参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319213157.png)

#### 计算球形法线使用范围

***Specular内***
***头发部分使用球形法线，其余部分使用贴图法线，使用顶点位置减去球心HeadCenter位置就可以得到球状法线，使用HeadSphereRang进行控制范围计算出球形法线的一个遮罩，使用遮罩对贴图法线和球形法线混合输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319154457.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319153852.png)

#### 使用球状遮罩混合法线

***当HeadSphereRang有效时输出混合的法线，无效则输出贴图法线***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319213400.png)

#### 计算高光项和衰减项

***根据公式，计算高光项ShapeNoH。当HeadSphereRang计算ShapeAttenuation，反之使用原贴图法线计算的BaseAttenuation***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319213703.png)
***使用混合法线计算的衰减进行了开方和重映射都是为了调整曲线，增加高光的有效范围，开放可以使高光的衰减变平缓***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250317154915.png)

#### 最终计算

```c
V * F = 1.0 / ( LoH^2 * (roughness + 0.5) )
Finalspec = (D * V * F) / 4.0 * NoL
```

***回忆公式，这里VxF项中Roughness直接给1，然后直接使用公式计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319214722.png)
***计算完(D * V * F) / 4.0后和RangeNoL相乘就得到高光了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319214820.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319220309.png)

### 衣服类PBR写实高光计算

***这里直接照抄GGX就行***

```c
 brdfData.normalizationTerm = (roughness + 0.5) * 4.0
 
 Final BRDFspec = roughness^2 / ( NoH^2 * (roughness^2 - 1) + 1 )^2 * (LoH^2 * (roughness + 0.5) * 4.0)
```

#### 光滑度转粗糙度等参数处理

***这里还是使用GGX的计算方式，但需要引入粗糙度计算了，贴图给的是光滑度，需要进行处理，这里直接新建一个处理光滑度的组***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319215102.png)
***这里计算Roughness的相关参数。光滑度转粗糙度是1-Smoothness在平方，1-Smoothness是感知粗糙度，真正参与计算的是它的平方，也就是粗糙度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319215636.png)

#### 计算GGX

***根据公式直接计算GGX高光，这里直接使用贴图法线计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319215819.png)

#### 最终混合

***计算完GGX后减去光滑度，降低光滑表面的高光强度，然后乘上光照衰减，钳制到0~1。除以粗糙度这里在提高粗糙表面的高光强度。最后使用两个参数控制高光强度然后乘上高光遮罩后就得到了高光，末尾的乘法相当于提高了高光的硬度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319220115.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319220223.png)

### 两种高光混合

***使用是否开启了球形法线为判断来混合，后面使用SpecularIntensity进行整体的强度控制，然后染色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319220622.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250319220600.png)

### 混合颜色

***使用区域判断，因为高光在面部眼睛是没有的，所以使用身体开关判断***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319221250.png)
***使用乘法进行计算，最后混合Diffuse和Specular直接加法混合即可***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319221541.png)

### 当前效果

***参数***
***默认总强度是0.01，头发需要开启球形法线高光，其余参数自己看着调就行***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319221739.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250319221647.png)

## 添加环境光

### 球谐光照计算公式

<https://zhuanlan.zhihu.com/p/351289217>

### 获取环境光

***UE和Unity中都是使用球谐光照来作为环境光，Blender中这里直接使用漫反射节点获取***
***Forward组新增强度控制参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321164200.png)
***这里需要对灯光进行调整，将漫反射和高光影响都设置为0，这样就只有环境光了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321162848.png)
***调整天空球可以看到颜色变化，但是平行光移动和旋转不会影响***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321164424.png)

### 环境光混和

***得到环境光后转换成RGB颜色与强度控制参数相乘，然后在和GammaColor进行乘法混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321164616.png)
***输出直接使用加法混合即可，加上漫反射和高光。因为亮度会增加可能导致高光效果不明显，所以这里将高光部分大于1的部分在加一遍对高光提亮***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321164736.png)

### 当前效果

***左边是加了环境光，右面是没加的***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250321170054.png)

## 添加边缘光

### ForwardShader新增参数

***对应是皮肤ID,屏幕空间边缘光宽度、阈值、衰减强度、亮度，太阳光光颜色，边缘光染色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327140731.png)

### 创建边缘光Shader

 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141318.png)

### 输入参数处理

***法线，灯光向量和ShadowAttenuation以及屏幕空间参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141422.png)
***IsSkin计算和金属度***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141517.png)
***PBR参数直接拉过来就行***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141650.png)
***阳光颜色以及边缘光染色和之前操作一样，使用MatID进行判断输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141029.png)

### 相关参数计算

#### 背光衰减

***因为边缘光是根据视线方向和灯光方向来控制的，比如说背光的时候边缘光会很强，而面光面就比较弱。所以先计算LOV***
***这里对（-LOV）进行了重映射，映射到0~1，这里注意是（-LOV)，因为LOV根据点乘特征同向为一反向为-1，所以面光面为1，背光面为-1，而边缘光应该以背光面为主，所以取（-LOV）计算，得到viewAttenuation***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327141855.png)
***这里得到viewAttenuation后还做了额外的处理，先进行平方后在乘0.5和加0.5，相当于平滑过渡，同时也是为了面光面也有边缘光为0.5，不为0，下面的函数图可以更好理解***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250324230706.png)

#### 法线垂直方向衰减

***UE是Z轴向上，所以这里取法线的Z方向，也就是垂直的方向，重映射到0~1。对皮肤和服装部分进行区分，让服装的强度低一点直接进行平方，最后整体进行平滑处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142036.png)

#### 兰伯特方向衰减

***其实就光源对于模型的衰减，也适用于边缘光。这里因为之前计算过投影，所以也追加进去***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142133.png)

#### 菲涅尔衰减

***这一步是真正求边缘光的步骤，一般边缘光都是通过菲涅尔进行计算。因为这里需要对相机距离进行反馈，所以先计算相机距离，这里相机距离有现成的节点直接用***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142337.png)
***对皮肤进行判断，皮肤的菲涅尔效果应该比衣服更弱，所以被（1-NOV)减去的值应该更多，然后衰减程度也和相机距离相关，min(1, cameraDistance / 12.0)最大值为1，当相机距离为12米时为最大，这里12.0就是相机距离，综合起来看就是随距离越远，菲涅尔强度略微增强（其实肉眼看不太出来）***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142322.png)

#### 相机距离衰减

***这里相当于5m之后开始逐渐衰减，5m之前不变，因为小于5的时候减去的部分是负数进行钳制就会变成0***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142418.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250325012211.png)

#### 背光外围向中心方向衰减

 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142453.png)

### 边缘光颜色控制

#### 阳光颜色混色

***皮肤只混合灰度，而非皮肤混合颜色。这里对阳光强度控制，先对基础颜色进行压制将颜色尽量压制到暗部，然后进行不完全的归一化，对暗处提亮，而亮的地方进行压制防止过曝，前面进行压制过后暗处的地方相当于变多了，那么暗部细节就会提亮。这里其实是计算平均整体亮度，但是为了保证有一定明暗关系，所以取了0.7而不是1***
***最后混合，人物的投影和边缘都受阳光颜色影响染色，其余的则由Albedo负责***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142643.png)

#### 边缘光漫反射和镜面反射

***上面边缘光使用提亮过后的漫反射颜色，先提亮在使用平均值进行压暗等处理，下面使用BRDiffuseColor的强度计算得到边缘光的强度***
***边缘光的镜面反射直接使用PBR镜面反射，使用金属度划分插值边缘光漫反射和镜面反射程度然后整体控制强度，然后乘上上面计算的衰减参数和光源颜色以及边缘光染色就得到边缘光了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327142919.png)

#### 衰减混合

***将计算的相关衰减都乘起来就得到了基础的边缘光了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327143633.png)
***这里基础强度乘了个48***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327143806.png)
***在末尾乘上边缘光的染色，这里的颜色强度也做了控制。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327143857.png)
***大致曲线是这样，略微平滑提亮***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250325105925.png)
***现在边缘光大致就是这样的，为了看着更清楚我又提亮了50倍（不用跟着操作）***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327144350.png)

### 屏幕空间边缘光

***得到菲涅尔计算得到的边缘光内部有非常多细节，而屏幕空间计算的边缘没有那么多内部细节所以可以剔除这些不必要的细节***
***之前提过Blender屏幕空间采样只有GooEngine版本有对应节点，而普通版只有在后期处理做，会比较麻烦***

#### GooEngine方法

***这里和计算投影是一个原理，但是使用的法线方向偏移，而Blender这里法线需要重映射，因为读取出来的范围是-1~1。采样偏移的深度图与原深度图进行相减。计算最后就是乘上一个强度系数控制***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327143510.png)
***这里自己调参数***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327145610.png)

#### 普通版方法

***需要获取深度Z和法线，但这里层级里面的是世界空间的法线，我们需要屏幕空间法线，而后期处理里面不能转换，所以需要自己在材质中处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327145814.png)
***材质中转换之后使用AOV输出***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327150226.png)
***层级面版中需要声明，名字保持一致***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327150312.png)

***现在后期里面就有这个输出了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327150412.png)
***计算方法和GooEngine是一样的，但是有些差异***
***后期里面的归一化只有1维的，所以归一化只能自己手动写。归一化就是向量各个分量除以向量的模***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327150657.png)
***法线直接对XY向量归一化就行了，因为不需要第三个分量计算***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327151009.png)
***各分量乘上宽度在进行透视除法除以深度（GooEngine计算不需要透视除法），最后合并成向量就得到了偏移量了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327151357.png)
***剩下就是计算深度差值了，后期里面是直接使用置换节点控制***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327153621.png)
***差不多就这样子，参数自己随便调。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327153837.png)

### 最终混合

***两种高光直接乘法混合输出，普通版Blender就需要将菲涅尔计算的高光AOV输出到后期进行混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327153927.png)
***最外层输出边缘光直接加法加上去就行***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327154112.png)

### 当前效果

***有一点点效果就行了，参数自己随便调，我这的GooEngine参数是下面这个，颜色随便给灰度就行***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327154330.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250327154232.png)

## 眼睛处理

### 参数调整

***调整眼影和内外高光的透明度，眼影改成黑色***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250330235841.png)
***修改混合模式为Alpha混合***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250330235933.png)
***调整形态键可以看到外高光在眼影下面，这里需要调整顺序***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331000011.png)
***Blender是直接使用材质插槽进行排序，将外高光顺序调到眼影下方***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331000048.png)
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331000147.png)

### 眼透处理

***Unity中使用模板测试，UE有两张深度图，Blender里面这两个都没有，GooEngine版仅有一张深度图，所以这里做眼透只能采用后期处理来做了***

#### 拆分网格

***将前发和眼睛部分拆出来，记得清理材质***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331001202.png)
***创建两个集合，将眼睛和头发分别放进去***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331001454.png)
***将遮罩显示打开***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331001550.png)

#### 视图层渲染设置

***复制视图层***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331001824.png)
***直接复制设置***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331001927.png)
***重命名，当前就有了眼睛视图层***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002024.png)
***打开身体部分的遮挡，只做遮挡使用***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002102.png)
***禁用头发***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002202.png)

 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002222.png)
***给视图层添加AOV输入，将眼睛遮罩传入后期处理***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002328.png)
***切回到原视图，将头发遮罩传入***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002535.png)
***头发材质中将1 - Alpha传入后期***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331002753.png)
***眼睛部分的所有材质，传1就行，这里注意眼睛模型材质插槽中所有材质中都要有这一步。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331003018.png)

### 后期处理

#### 关于半透明AOV传值问题

***上面对于眼睛数据传入AOV数据，这里需要额外的修改**
***Blender中半透明材质是不能给后期处理传值的，也就不能输出AOV。这里指的半透明是指混合模式为AlphaBlend。***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331015608.png)
***当然混合模式不止一种，这里仅当AlphaHashed模式和不透明模式下可以传递AOV。AlphaBlend和AlphaHashed计算方式不同，后者开销更大，但是它可以传递AOV，一般用于树叶，毛发一类需要正确排序的情况。正常使用就用AlphaBlend了***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331015705.png)
***所以这里有几个处理方法***
***1.眼睛整体不传值，直接使用当前遮罩***
***2.眼睛部分是不透明，只需要传眼睛材质的就行***
***3.将除了眼睛部分的高光眼影的混合模式改为AlphaHashed，在分别传值***

#### 混合两个视图层

***我这里使用的是直接传眼睛部分，高光不管，方法3开销很多，本来就已经很卡了***
***这里取得头发和眼睛的遮罩进行钳制然后相乘就可以得到需要叠加眼透的遮罩，在用这个遮罩混合两个图层***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331020808.png)
***对应的头发，眼睛，以及眼透的遮罩***
 ![图片](/assets/img/ZZZRendering/Pasted image 20250331021144.png)

## 最终效果

 ![图片](/assets/img/ZZZRendering/Pasted image 20250331021254.png)
