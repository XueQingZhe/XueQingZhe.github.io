---
layout: post
title: UE5.5 - 逐材质Stencil
description: UE5.5 - 逐材质Stencil
img: assets/img/MyPJ/Engine/Pasted image 20250413150053.png
importance: 1
category: [Engine]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---

***启动项设置***
![](/assets/img/MyPJ/Engine/Pasted image 20250402124853.png)
***注意事项，启动项选择***
![](/assets/img/MyPJ/Engine/Pasted image 20250402124909.png)

# 逐材质Stencil

***Stencil对应就是这里，UE默认是逐Mesh的Stencil，很不方便，会影响模型拆分。这里进行源码修改***
![](/assets/img/MyPJ/Engine/Pasted image 20250403234906.png)

## 交互层

### MaterialInterface.h

***找到这个类，它是所以有材质的基类***
![](/assets/img/MyPJ/Engine/Pasted image 20250402224054.png)
***声明Stencil成员变量，丢在LightmassSetting后面就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250402224905.png)
***找到重写的函数类进行声明一个获取函数来获取刚才声明的受保护成员变量***
![](/assets/img/MyPJ/Engine/Pasted image 20250403144153.png)

### MaterialInterface.cpp

***cpp文件内对声明的获取函数进行实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250403144302.png)

### Material.h

***Material是MaterialInterface的子类，Material继承了MaterialInterface中声明的成员变量MaterialStencilValue所以不用再次声明，但是获取函数是虚函数所以需要重写，这里进行声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250403144428.png)

### Material.cpp

***重写函数，但内容其实是一样的，就是获取MaterialStencilValue值***
![](/assets/img/MyPJ/Engine/Pasted image 20250403144825.png)

### MaterialInstance.h

***材质实例继承基类MaterialInterface，所以需要进行和Material同样操作，进行重写虚函数。***
![](/assets/img/MyPJ/Engine/Pasted image 20250405151044.png)***这里需要提一点，MaterialInstance并不是继承Material而是继承基类MaterialInterface，材质和材质实例是同级的***
***声明获取函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250403152852.png)

### MaterialInstance.cpp

***函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250403153209.png)

### MaterialInstanceBasePropertyOverrides.h

***声明需要重写的值，是否重写的Bool，不太清楚为什么使用int类型不直接用Bool，可能还有其他用途或者防止内容溢出之类的***
***顺带一提这个文件是没有Cpp文件的，仅做声明变量使用，里面的变量实际上是做为材质和材质实例之间的成员比对类来使用，意思是比较材质和实例都包含这个类成员，所以直接比对材质和材质实例中这个类就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250403153347.png)
***既然是中转变量，所以自然需要再声明一个变量，跟其他变量写法差不多，直接用和之前在材质接口中声明的MaterialStencilValue同名就行，愿意加个Temp前缀也行，源码没加我就没加***
![](/assets/img/MyPJ/Engine/Pasted image 20250403153422.png)
***FMaterialInstanceBasePropertyOverrides这里是材质实例中的引用参数，MaterialInstance.h中可以看到材质参数更新就靠这里，传入参数是FMaterialInstanceBasePropertyOverrides。***
![](/assets/img/MyPJ/Engine/Pasted image 20250402230040.png)

### MaterialInstance.cpp

***是否需要更新参数取决于材质实例文件中怎么实现，这里有更新判断函数做判断，判断材质实例参数面板的值是否和父类，因为材质和材质实例都是继承同一父类，这里也可以理解成判断材质实例和材质的参数是否相等，得到的Bool值用于后续更新判断***
![](/assets/img/MyPJ/Engine/Pasted image 20250403153537.png)

### MaterialShared.cpp

***MaterialShared负责底层渲染数据的传递处理，材质实例和父类的比对在这里进行***
***这里对MaterialInstanceBasePropertyOverrides中的所有参数进行初始化，这里使用的是初始化列表写法，就是在类后面加冒号”：”，然后进行赋值，末尾函数体实际是空的***
![](/assets/img/MyPJ/Engine/Pasted image 20250405151801.png)
***重写等等判断符，进行比较，对根材质和中间重写的值进行比较***
![](/assets/img/MyPJ/Engine/Pasted image 20250405164651.png)

### MaterialInstance.cpp

***进行判断，如果父类不为空，则先初始化材质实例的所有值，如果有重写的值就直接读取重写的值，反之读取父类的值***
![](/assets/img/MyPJ/Engine/Pasted image 20250403220652.png)

### PreviewMaterial.cpp

***这里进行判断，如果没有发现重写，就读取材质实例的值给重写的值***
![](/assets/img/MyPJ/Engine/Pasted image 20250403220931.png)

### MaterialEditorInstanceDetailCustomization.h

***这里进行声明UI函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250403222251.png)

### MaterialEditorInstanceDetailCustomization.cpp

***找到创建UI的函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250403222728.png)
***这里进行生创建UI***
![](/assets/img/MyPJ/Engine/Pasted image 20250403222504.png)
***简单来说生成就是材质实例面板***
![](/assets/img/MyPJ/Engine/Pasted image 20250403223237.png)
***创建UI还需要有赋值操作，使用宏来实现，这里直接参考裁剪值来写就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250403222645.png)
***函数实现就是这个宏，将新值传给材质实例编辑类***
![](/assets/img/MyPJ/Engine/Pasted image 20250403224015.png)

## 渲染层

***交互层改完后现在进行渲染层的修改，材质渲染这里，FMaterial做的工作就是实时查询UMaterial和UMaterialInstance的参数并进行进行处理，然后继承给FMaterialResource进行渲染***

### MaterialShared.h

***找到FMaterial类，前面说过，FMaterial做的工作就是实时查询UMaterial和UMaterialInstance的参数并进行进行处理，所以自然需要读取我们创建的MaterialStencil，那么就需要创获取函数来读取***
![](/assets/img/MyPJ/Engine/Pasted image 20250403232147.png)
***声明获取函数，注意这里不能完全参照下面的GetOpacityMaskClipValue来写了，不能设为纯虚函数，因为还有其他文件继承它，所以这里给一个默认实现返回0***
![](/assets/img/MyPJ/Engine/Pasted image 20250405165510.png)
***找到FMaterialResource类，它继承FMaterial类***
![](/assets/img/MyPJ/Engine/Pasted image 20250403232649.png)
***声明继承过来的需要重写的虚函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250403232722.png)

### MaterialShared.cpp

***对虚函数进行实现，作比对看是返回UMaterial还是UMaterialInstance的值去渲染***
![](/assets/img/MyPJ/Engine/Pasted image 20250403233249.png)

### CustomDepthRendering.cpp

***修改自定义深度渲染，因为自定义深度和自定义Stencil在UE中是绑定在一起的，默认就可以获取到CustomDepthStencilValue，所以只需要把我们创建的材质中的MaterialStencilValue传给它就行。有这里找到位置将注释地方更换掉，如果MaterialStencilValue大于0就直接输出给CustomDepthStencilValue***
![](/assets/img/MyPJ/Engine/Pasted image 20250403234411.png)

## Stencil的项目设置

***如果需要使用和查看Stencil，必须更改项目设置***
![](/assets/img/MyPJ/Engine/Pasted image 20250405193935.png)
***预览参数选择***
![](/assets/img/MyPJ/Engine/Pasted image 20250413144054.png)
***在预览之前需要在材质中设置自定义深度写入，否则是不会生效的***
![](/assets/img/MyPJ/Engine/Pasted image 20250413144615.png)

## 当前效果

***这里是使用的一个有两个材质的模型，两个材质分别设置Stencil值***
![](/assets/img/MyPJ/Engine/Pasted image 20250413145615.png)
***现在预览可以看到逐材质Stencil生效了***
![](/assets/img/MyPJ/Engine/Pasted image 20250413150053.png)
