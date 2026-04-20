---
layout: post
title: UE5.5 - 逐材质OverlayMaterial
description: UE5.5 - 逐材质OverlayMaterial
img: assets/img/MyPJ/Engine/Pasted image 20250422131749.png
importance: 1
category: [Engine]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---


# 交互层

## MaterialInterface.h

***因为接口类应该保证轻量化，所以不应该存储大量变量数据，数据应该是在子类中存储，接口类设置Get方法就行，因为是虚函数，所以运行时会自动查找子类已经实现的方法进行调用。
所以直接进行声明获取的虚函数就行，但在这之前。在MaterialInterface.h当前文件中，这里声明了一个模版类用于判断当前材质是否递归（说简单点就是检查获取的数据是否包含了身数据一样，这是不允许的），这里的Using关键字（等价于typedef）就是取别名的意思，类似于宏替换，调用TMicRecursionGuard就相当于调用后半句的内容。***
![](/assets/img/MyPJ/Engine/Pasted image 20250418162941.png)
***模版内部是这样的，也就是链表，里面有两个指针，一个指向传入自身的（T类型指针），一个指向上一个同类型数据（TMaterialRecursionGuard类型指针）。先初始化，将自身指针Value设为nullptr(空)，PreviousLink则是创建一个同类数据的直接指定***
***Set函数。当传入值的时候会先判断当前Value指针数据是否为空然后进行指定新数据***
***Contains函数，先创建一个同类数据，将自身指针存起来，然后和输入的InValue进行比对，如果两个指针数据是一样的直接返回true表示包含了，如果不包含则将指针数据置换成上一个PreviousLink数据继续检测，直到PreviousLink的Value数据为空了，就表示不包含返回false***
![](/assets/img/MyPJ/Engine/Pasted image 20250418163649.png)
***可能有人会比较疑惑为什么材质指针比对要循环判断，不应该比对一次就完事了吗，但这里其实是还有一个重要的地方是TMicRecursionGuard声明位置，虽然它在UMaterialInterface类外
不会被UMaterial和UMaterialInstance继承，但是Material.h和MaterialInstance.h都引入了MaterialInterface.h的头文件，所以TMicRecursionGuard在材质中相当于一个全局参数了，所以会记录多个材质实例的数据进行比对***
***而对于网格体上的获取OverlayMaterial方法，因为网格体类型和材质类型不一样所以直接get就可以不需要判断***
![](/assets/img/MyPJ/Engine/Pasted image 20250418154557.png)
***现在进行声明Get函数，参照其他函数怎么写就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250418174318.png)
***PURE_VIRTUAL宏表示声明为纯虚函数接口，父类不实现，但子类必须实现，否则报错，不是纯虚函数的话，子类是可以不实现的，也就是可选实现，这里额外声明了一个蓝图获取接口***
![](/assets/img/MyPJ/Engine/Pasted image 20250420114648.png)
***这两句其实是一个意思，但是UE做了额外的报错设置***
![](/assets/img/MyPJ/Engine/Pasted image 20250419121757.png)

```c
ENGINE_API virtual UMaterialInstance* GetOverlayMaterial(TMicRecursionGuard RecursionGuard = TMicRecursionGuard()) const PURE_VIRTUAL(UMaterialInterface::GetOverlayMaterial, return nullptr;);
ENGINE_API virtual UMaterialInstance* GetOverlayMaterial(TMicRecursionGuard RecursionGuard = TMicRecursionGuard()) const = 0;
```

## Material.h

***UMaterial继承UMaterialInterface，子类需要进行属性存储，所以需要声明变量成员。***
![](/assets/img/MyPJ/Engine/Pasted image 20250420153415.png)
***UMaterial继承UMaterialInterface，需要进行纯虚函数重写。这里进行声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250420153923.png)

## Material.cpp

***函数实现，直接返回OverlayMaterial就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250420154117.png)

## MaterialInstance.h

***与UMaterial同理，UMaterialInstance继承自MaterialInterface，这里也需要进行变量成员声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250420154159.png)
***对虚函数进行重写。这里进行函数声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250420154348.png)

## MaterialInstance.cpp

***CPP文件进行函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250420165549.png)

## MaterialInstanceBasePropertyOverrides.h

***这里是负责比对数据的类，这里声明比对对应的bool。因为是bool，这里变量类型是uint8***
![](/assets/img/MyPJ/Engine/Pasted image 20250420154820.png)
***作为数据比对的类，自然也需要有对应变量，所以在下面继续添加相关变量。注意这里变量类型***
![](/assets/img/MyPJ/Engine/Pasted image 20250420154855.png)

## MaterialInstance.cpp

***对材质实例的判断是否覆写的函数修改，UMaterialInstance和父类UMaterialInterface数据比较来判断是否重写数据，虽然是和父类比较，但是其实不准确，因为父类可以转换成子类，所以真正比对数据的类型是UMaterialInstance和UMaterial***
![](/assets/img/MyPJ/Engine/Pasted image 20250420155135.png)

## MaterialShared.cpp

***这里是数据比对的地方，自然它包含了MaterialInstanceBasePropertyOverrides结构体。这里进行初始化结构体中的bool参数，这里需要注意顺序，之前MaterialInstanceBasePropertyOverrides中声明位置顺序需要与这里对应***
![](/assets/img/MyPJ/Engine/Pasted image 20250420160914.png)
***重写等等重算符，比对自身的传入的MaterialInstanceBasePropertyOverrides结构体传入的是否相等***
![](/assets/img/MyPJ/Engine/Pasted image 20250420161324.png)

## MaterialInstance.cpp

***设置UMaterialInstance的更新函数中MaterialTranslucencySortPriority和MaterialTranslucencySectionPriority的初始值***
![](/assets/img/MyPJ/Engine/Pasted image 20250420161606.png)
***在初始化下面一点设置更新逻辑***
![](/assets/img/MyPJ/Engine/Pasted image 20250420161700.png)

## PreviewMaterial.cpp

***这里对应的是参数面板中的材质预览使用的材质的处理。材质预览材质对内部材质实例之间的数据拷贝，预览材质直接使用材质实例的参数***
![](/assets/img/MyPJ/Engine/Pasted image 20250420162035.png)

## MaterialEditorInstanceDetailCustomization.h

***UI***
***这里其实是相当于调用宏直接声明两个函数，一个是 Enabled()函数，表示可以进行覆写的bool，一个是Changed(bool)函数，表示开始进行传值也就是Change。后续作为UI更改的判断依据***
![](/assets/img/MyPJ/Engine/Pasted image 20250420163043.png)

## MaterialEditorInstanceDetailCustomization.cpp

***之前声明了现在进行函数实现，这里也是使用宏进行函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250420163640.png)
***创建UI以及UI的恢复点击执行逻辑***
![](/assets/img/MyPJ/Engine/Pasted image 20250420164015.png)
![](/assets/img/MyPJ/Engine/Pasted image 20250415150816.png)

# 渲染层

## MaterialShared.h

***找到FMaterial类，FMaterial做的工作就是实时查询UMaterial和UMaterialInstance的参数并进行进行处理（其实并不是它而是它的子类），所以自然需要读取我们创建的属性，那么就需要创获取函数来读取，注意这里需要给默认的函数实现返回0***
![](/assets/img/MyPJ/Engine/Pasted image 20250420174927.png)
******找到FMaterialResource类，它继承FMaterial类，负责真正的数据处理***
![](/assets/img/MyPJ/Engine/Pasted image 20250420175531.png)

## MaterialShared.cpp

***对虚函数进行实现，作比对看是返回UMaterial还是UMaterialInstance的值去渲染***
![](/assets/img/MyPJ/Engine/Pasted image 20250420180620.png)

## StaticMeshRender.cpp

***找到DrawStaticElements***
![](/assets/img/MyPJ/Engine/Pasted image 20250420190613.png)
***将原本的静态网格体上的OverlayMaterial替换成材质上的OverlayMaterial参数，这里需要进行判断，材质上的OverlayMaterial应该与静态网格体上的OverlayMaterial绘制互斥***
![](/assets/img/MyPJ/Engine/Pasted image 20250422123519.png)
***下面一点还有一个***
![](/assets/img/MyPJ/Engine/Pasted image 20250422123834.png)

## SkeletalMesh.cpp

***与StaticMeshRender类似，找到DrawStaticElements函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250420194035.png)
***将原本的骨骼网格体上的OverlayMaterial替换成材质上的OverlayMaterial参数***
![](/assets/img/MyPJ/Engine/Pasted image 20250420193928.png)
***GetDynamicElementsSection也需要修改，注意是重载后的GetDynamicElementsSection***
![](/assets/img/MyPJ/Engine/Pasted image 20250421141720.png)
***替换成材质上的OverlayMaterial参数***
![](/assets/img/MyPJ/Engine/Pasted image 20250421142339.png)

## MeshComponent.cpp

***FMaterialRelevance负责统计整合Mesh上的所有材质特性数据，按位或操作就是进行整合，需要追加我们增加的材质特性数据。***
![](/assets/img/MyPJ/Engine/Pasted image 20250420223509.png)
***在MaterialRelevance.h可以看到相关数据大概有那些，这里是二进制bit数据，uint8 bOpaque : 1;表示只用最后一位数值，也就是0000 0001或者0000 0000这样，因为Bool只有0和1，所以采用二进制进行存储，最后顺序排列组成一个64位的二进制链表示材质属性***
![](/assets/img/MyPJ/Engine/Pasted image 20250420224308.png)

## PrimitiveSceneProxy.cpp

***PrimitiveSceneProxy实际上就行渲染数据的类型，内部负责处理存储一些渲染数据***
***开启逐材质的覆层材质的世界偏移输入***
![](/assets/img/MyPJ/Engine/Pasted image 20250420232139.png)
***因为在渲染之前，会进行渲染数据的验证，验证方式在MeshBatch.h中可以找到这个函数声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250422124009.png)
***函数实现在SceneManagement.cpp中***
![](/assets/img/MyPJ/Engine/Pasted image 20250422124202.png)
***在往下找就可以找到VerifyUsedMaterial的实现，在PrimitiveSceneProxy.cpp中，因为追加的OverlayMaterial是依赖于Mesh的本身材质的，在渲染验证的时候，本身的材质渲染会在前面先进行验证，通过的会添加进UsedMaterialsForVerification这个数据组中，因为判断的时候不会再次验证在组中的数据，所以我们设置的OverlayMaterial就不会被验证，自然就不会被渲染，所以这里需要进行遍历进行验证***
![](/assets/img/MyPJ/Engine/Pasted image 20250422123144.png)

# 测试和效果预览

***先创建一个带世界偏移的母材质***
![](/assets/img/MyPJ/Engine/Pasted image 20250422131137.png)
***创建一个实例随意改下参数***
![](/assets/img/MyPJ/Engine/Pasted image 20250422131342.png)
***这里我创建了两个***
![](/assets/img/MyPJ/Engine/Pasted image 20250422131656.png)
***先指定红色OverlayMaterial指定到物体材质上，现在就有效果了***
![](/assets/img/MyPJ/Engine/Pasted image 20250422131417.png)
***然后测试给另一个材质上绿色的覆层材质，效果正常***
![](/assets/img/MyPJ/Engine/Pasted image 20250422131749.png)
