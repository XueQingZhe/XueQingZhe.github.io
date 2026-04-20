---
layout: post
title: UE5.5 - 逐材质半透明排序
description: UE5.5 - 逐材质半透明排序
img: assets/img/MyPJ/Engine/Pasted image 20250416230212.png
importance: 1
category: [Engine]
related_publications: true
images:
  spotlight: true
toc:
  sidebar: left # 目录
---


# 逐材质半透明排序

## 排序规则

***UE的半透明排序是根据SortPriority > Distance > MeshIdInPrimtive(SectionPriority)来判断的。***

### MeshIdInPrimtive

***UE同一个Mesh上不同部位可以赋予不同的材质，UE管它们叫做Section，一般情况下MeshIdInPrimtive就是按照模型Section的Id来进行设置的。***

### Distance

***这个是根据每个Mesh到摄像机的距离计算的，从远到近排序，离相机越远Distance值越小，保证离相机近的Mesh较后渲染。***

### Priority

***这个就是我们在Mesh上设置的TranslucencySortPriority***

# 交互层

## MaterialInterface.h

***因为接口类应该保证轻量化，所以不应该存储大量变量数据，数据应该是在子类中存储，接口类设置Get方法就行，因为是虚函数，所以运行时会自动查找子类已经实现的方法进行调用。UMaterialInterface中添加MaterialTranslucencySortPriority和MaterialTranslucencySectionPriority成员变量的获取函数但不声明变量成员，前者负责控制整体排序，后者控制在多个材质在Mesh中的前后顺序***
***在下面声明获取函数，类型为int32***
![](/assets/img/MyPJ/Engine/Pasted image 20250420113129.png)

## MaterialInterface.cpp

***在CPP文件内进行函数实现，因为没有函数成员，所以返回0就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250420113528.png)

## Material.h

***UMaterial继承自MaterialInterface，在这里进行数据存储，声明变量成员***
![](/assets/img/MyPJ/Engine/Pasted image 20250420113808.png)

## MaterialInstance.h

***与UMaterial同理，UMaterialInstance继承自MaterialInterface，进行变量声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250420114047.png)

## Material.h

***UMaterial继承自MaterialInterface，所以需要对虚函数进行重写。这里进行声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250414151544.png)

## Material.cpp

***CPP文件进行函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250414152047.png)

## MaterialInstance.h

***与UMaterial同理，UMaterialInstance继承自MaterialInterface，所以需要对虚函数进行重写。这里进行函数声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250414152608.png)

## MaterialInstance.cpp

***CPP文件进行函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250414154844.png)

## MaterialInstanceBasePropertyOverrides.h

***这里是负责比对数据的类，这里声明比对对应的bool。因为是bool，这里变量类型是uint8***
![](/assets/img/MyPJ/Engine/Pasted image 20250414155429.png)
***作为数据比对的类，自然也需要有对应变量，所以在下面继续添加相关变量。注意这里变量类型是int32***
![](/assets/img/MyPJ/Engine/Pasted image 20250414155604.png)

## MaterialInstance.cpp

***对材质实例的判断是否覆写的函数修改，UMaterialInstance和父类UMaterialInterface数据比较来判断是否重写数据***
![](/assets/img/MyPJ/Engine/Pasted image 20250415110000.png)

## MaterialShared.cpp

***初始化结构体中的bool参数和属性默认值，这里需要注意顺序，之前MaterialInstanceBasePropertyOverrides中声明位置顺序需要与这里对应***
![](/assets/img/MyPJ/Engine/Pasted image 20250420161019.png)
***重写等等操作符的时候需要追加判断，上面是判断Bool是否相等，而下面是判断值是否相对***
![](/assets/img/MyPJ/Engine/Pasted image 20250419132240.png)

## MaterialInstance.cpp

***设置UMaterialInstance的更新函数中MaterialTranslucencySortPriority和MaterialTranslucencySectionPriority的初始值***
![](/assets/img/MyPJ/Engine/Pasted image 20250415111738.png)
***在初始化下面一点设置更新逻辑***
![](/assets/img/MyPJ/Engine/Pasted image 20250415111854.png)

## PreviewMaterial.cpp

***这里对应的是参数面板中的材质预览使用的材质的处理。材质预览材质对内部材质实例之间的数据拷贝，预览材质直接使用材质实例的参数***
![](/assets/img/MyPJ/Engine/Pasted image 20250415112506.png)

## MaterialEditorInstanceDetailCustomization.h

***UI操作***
***这里其实是相当于调用宏直接声明两个函数，一个是 Enabled()函数，表示可以进行覆写的bool，一个是Changed(bool)函数，表示开始进行传值也就是Change。后续作为UI更改的判断依据***
![](/assets/img/MyPJ/Engine/Pasted image 20250415131808.png)

## MaterialEditorInstanceDetailCustomization.cpp

***之前声明了现在进行函数实现，这里也是使用宏进行函数实现，这里传入一个是需要覆写的变量名，还有个额外的我们手动控制的参数bRequiresPermutation来控制是否开启覆写和传值功能，默认是开启所以给true***
![](/assets/img/MyPJ/Engine/Pasted image 20250415133010.png)
***对应的宏内容是这个，其实就是封装的函数体***
![](/assets/img/MyPJ/Engine/Pasted image 20250415160642.png)
***对于函数体这里还有一点，这里是使用的编辑器对象的内容去判断是否发生Changed操作***
![](/assets/img/MyPJ/Engine/Pasted image 20250415160610.png)
***对于材质面板的参数判断其实分了层，感觉是真的繁琐，虽然我们是在面版上直接输入，但实际上UE将我们在面版上输入的值是存起来了也就是UMaterialInstanceConstant这个类型中，它继承UMaterialInstance，然后在与材质实例的参数值进行比对，最后在进行覆写操作。***
***上面图中的DoesSourceMaterialInstanceDisallowStaticParameterPermutation函数，它是判断复选框是否开启的时候材质是否为静态参数，NewValue是我们在面版上输入的值，它与默认值bDisallowStaticParameterPermutations组合进行判断，bDisallowStaticParameterPermutations如果为true，那么表示该材质为静态，不得修改，这个参数是在UMaterialInstance.h中，默认情况下是值为false***
![](/assets/img/MyPJ/Engine/Pasted image 20250415164201.png)
***上面说的如果不理解，那么看下面这个图就可以理解了，Changed函数内if判断实际上也是对应这里的复选框，如果复选框勾选材质且实例不为静态且我们手动控制的bRequiresPermutation是true，那么就对MaterialEditorInstance中的bOverride_PropertyVariableName设置为我们复选框的输入的bool值，后面就可以进行传值操作***
![](/assets/img/MyPJ/Engine/Pasted image 20250415161804.png)
***创建UI以及UI的执行逻辑***
![](/assets/img/MyPJ/Engine/Pasted image 20250415133204.png)
***对应的宏内容是这样的***
![](/assets/img/MyPJ/Engine/Pasted image 20250415154137.png)
***里面有两个Lambda判断操作，第一个就是是否显示重置按钮，也就是下面编辑面板这个图标。第二Lambda则是对应点击这个重置按钮会执行什么操作，其实就是从父类直接拿默认值数据过来***
![](/assets/img/MyPJ/Engine/Pasted image 20250415150816.png)
***这里代码根本上是在调用下面这个函数，第一个是参数名称，第二个和第三个是不是很眼熟，其实就是前面创建过函数作为UI参数。三和四就是上面说的Lambda判断，最后一个则是控制是否显示当前UI，默认是true***
![](/assets/img/MyPJ/Engine/Pasted image 20250415154634.png)
***上面函数中的IsOverriddenAndVisibleFn对应是这里，默认是true，bShowOnlyOverrides它的值在MaterialEditorInstanceConstant.h中可以找到，但是这里的的是否显示我们并不能精准控制每一条属性的隐藏或显示，它是编辑器进行整体设定的***
![](/assets/img/MyPJ/Engine/Pasted image 20250415170448.png)
***对应就是材质面版里的各种显示设置***
![](/assets/img/MyPJ/Engine/Pasted image 20250415171147.png)

# 渲染层

## MaterialShared.h

***找到FMaterial类，FMaterial做的工作就是实时查询UMaterial和UMaterialInstance的参数并进行进行处理（其实并不是它而是它的子类），所以自然需要读取我们创建的属性，那么就需要创获取函数来读取，注意这里需要给默认的函数实现返回0***
![](/assets/img/MyPJ/Engine/Pasted image 20250415172426.png)
******找到FMaterialResource类，它继承FMaterial类，负责真正的数据处理***
![](/assets/img/MyPJ/Engine/Pasted image 20250403232649.png)
***声明继承过来的需要重写的虚函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250415172812.png)

## MaterialShared.cpp

***对虚函数进行实现，作比对看是返回UMaterial还是UMaterialInstance的值去渲染***
![](/assets/img/MyPJ/Engine/Pasted image 20250415174511.png)

## BasePassRendering.cpp

***如果想简单实现半透明排序MaterialTranslucencySortPriority，那么在这里直接将默认的排序覆盖掉就行，也可以整合到CalculateTranslucentMeshStaticSortKey中去设置。找到对应计算半透明排序的位置，直接用材质上的排序给他覆盖掉就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250415180940.png)
***对应这里类型转换的计算方法，直接照抄原本的就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250408111606.png)

## PrimitiveSceneProxy.h

***接下来做网格体内的排序处理MaterialTranslucencySectionPriority，也就是不论是静态网格体还是骨骼网格体的代理都是继承自PrimitiveSceneProxy，两个都引入了PrimitiveSceneProxy.h的。所以直接在这里声明共有文件就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250416113649.png)
***因为需要做排序，所以方便起见直接声明一个结构体来方便使用，当然直接声明在PrimitiveSceneProxy.h和SkeletalMeshSceneProxy.h中也可以，只不过需要声明两次。***
***找到这个类***
![](/assets/img/MyPJ/Engine/Pasted image 20250416122502.png)
***将结构体丢在上面一点就行，不要放在类里面***
![](/assets/img/MyPJ/Engine/Pasted image 20250416124100.png)
***然后就是计算排序的方法，因为静态网格和骨骼网格体的排序方法不一样，它们是继承一个父类，所以函数之直接在父类FPrimitiveSceneProxy中声明虚函数就行。这里声明一个排序函数和一个获取函数。因为排序不在父类实现所以设置为虚函数，获取函数的话直接是静态函数就行。***
![](/assets/img/MyPJ/Engine/Pasted image 20250416133650.png)

## PrimitiveSceneProxy.cpp

***在CPP文件需要实现获取的静态函数，使用未排序的序列和排序后的序列进行比对，如果有相同的就返回排序后的值也就i，反之返回默认的索引，这里其实直接return i； 也就排序后的索引其实最精简，但是防止bug加上了判断和return SectionIndex;***
![](/assets/img/MyPJ/Engine/Pasted image 20250416133747.png)

## StaticMeshSceneProxy.h

***先处理静态网格体数据。因为继承关系，现在进行声明需要重写负责排序的虚函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416133129.png)

## StaticMeshRender.cpp

***虽然名字不一样但是它是StaticMeshSceneProxy.h的cpp文件，这里对排序函数实现。，这里进行排序使用Lambda表达式结合自定义排序规则，MaterialTranslucencySectionPriority是设置在材质面板上的让它优先排序然后再根据默认的SectionIndex排序***
![](/assets/img/MyPJ/Engine/Pasted image 20250416134229.png)
***根据流程，需找到获取Mesh元素的函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416135451.png)
***Mesh元素在GetDynamicMeshElements这里处理***
![](/assets/img/MyPJ/Engine/Pasted image 20250416135614.png)
***对于排序位置是根据MeshIdInPrimitive来设定的，现在已经有了进行索引排序处理，但是索引需要给到OutMeshBatch.MeshIdInPrimitive，MeshIdInPrimitive处理是在函数GetMeshElement中。GetDynamicMeshElements中调用了GetMeshElement函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416135217.png)
***对应MeshIdInPrimitive位置如下***
![](/assets/img/MyPJ/Engine/Pasted image 20250416135249.png)

## StaticMeshSceneProxy.h

***为了将我们排序后的索引给到MeshIdInPrimitive，直接对GetMeshElement函数进行重载，这里进行函数声明，将排序好的索引传入。***
![](/assets/img/MyPJ/Engine/Pasted image 20250416140315.png)

## StaticMeshRender.cpp

***重载的GetMeshElement函数直接调用原本GetMeshElement函数，最后将将我们排序后的索引给到MeshIdInPrimitive就行***
![](/assets/img/MyPJ/Engine/Pasted image 20250416140710.png)
***再次找到获取动态Mesh元素的函数GetDynamicMeshElements***
![](/assets/img/MyPJ/Engine/Pasted image 20250408195557.png)
***找到GetMeshElement位置，替换成重载过的GetMeshElement即可，将排序好的索引传入***
![](/assets/img/MyPJ/Engine/Pasted image 20250416141359.png)
***到这里GetDynamicMeshElements函数其实已经改完了，但是在函数末尾Collector.AddMesh会将我们设置的MeshIdInPrimitive给覆盖掉，所以需要做额外处理***
![](/assets/img/MyPJ/Engine/Pasted image 20250416141840.png)

## SceneManagement.cpp

***Collector.AddMesh定义在SceneManagement.cpp中，SceneManagement负责处理FStaticMeshSceneProxy和FSkeletalMeshSceneProxy等相关数据。找到对应函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416142215.png)
***在函数内部可以找到，这里把我们设置的MeshIdInPrimitive给覆盖掉了***
![](/assets/img/MyPJ/Engine/Pasted image 20250416142247.png)

## SceneManagement.h

***为了解决值覆盖，这里对AddMesh进行重载，新增一个bool来控制是否覆盖***
![](/assets/img/MyPJ/Engine/Pasted image 20250416142533.png)

## SceneManagement.cpp

***AddMesh重载函数实现直接拷贝一份默认的AddMesh就行，位移修改就是使用bool判断赋值***
![](/assets/img/MyPJ/Engine/Pasted image 20250416142654.png)

## StaticMeshRender.cpp

***找到GetDynamicMeshElements末尾的AddMesh函数替换成重载过的AddMesh重载函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416142833.png)
***最后找到绘制静态元素的地方，这里需要做和GetDynamicMeshElements相似的处理***
![](/assets/img/MyPJ/Engine/Pasted image 20250408194422.png)

***索引排序以及调用重载的GetMeshElement函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416143526.png)
***再下面一点也需要修改，同样的进行索引排序***
![](/assets/img/MyPJ/Engine/Pasted image 20250416144013.png)
***以及调用重载的GetMeshElement函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416144244.png)
***现在静态网格就修改完毕了***

## SkeletalMeshSceneProxy.h

***骨骼网格体也需要修改，因为继承关系，对排序函数进行重写声明***
![](/assets/img/MyPJ/Engine/Pasted image 20250416145051.png)

## SkeletalMesh.cpp

***排序函数实现***
![](/assets/img/MyPJ/Engine/Pasted image 20250416150746.png)
***流程和静态网格体其实差不多，先找到Collector.AddMesh在哪里调用，最终可以定位到GetDynamicElementsSection函数，如果想简单的修改，那么直接像下图一样修改原函数就行，直接赋值，然后更改Collector.AddMesh就行。我测试过是没有问题的***
![](/assets/img/MyPJ/Engine/Pasted image 20250416153152.png)

## SkeletalMeshSceneProxy.h

***直接修改原函数比较快但没有留下原来的函数，还是不太好，所以最好还是重载一个新GetDynamicElementsSection方法***
![](/assets/img/MyPJ/Engine/Pasted image 20250416153722.png)

## SkeletalMesh.cpp

***函数实现直接拷贝原来的就好***
![](/assets/img/MyPJ/Engine/Pasted image 20250416154317.png)
***内部还需要修改，将排序的索引指定给MeshIdInPrimitive***
![](/assets/img/MyPJ/Engine/Pasted image 20250416154253.png)
***将Collector.AddMesh换成我们重载过的***
![](/assets/img/MyPJ/Engine/Pasted image 20250416155813.png)
***找到GetDynamicMeshElements函数***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160036.png)
***它调用了GetDynamicElementsSection，所以需要换成我们重载过的，这里先进行排序索引***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160403.png)
***替换函数，将排序索引传入***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160524.png)
***最后找到DrawStaticElements函数进行处理，如果不处理这部分，那么你在骨骼网格体资产预览是对的，但放在场景中却不生效***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160706.png)
***计算排序索引***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160836.png)
***将排序好的索引指定给MeshIdInPrimitive***
![](/assets/img/MyPJ/Engine/Pasted image 20250416160932.png)

## BasePassRendering.cpp

***现在就完成了模型内的半透明排序了，可以进行编译了。回头来看之前的MaterialTranslucencySortPriority这里，其实就是在MaterialTranslucencySectionPriority排序完成后，如果有值，就覆盖掉***
![](/assets/img/MyPJ/Engine/Pasted image 20250416161822.png)

# 当前效果及测试

## 静态网格体测试

### MaterialTranslucencySortPriority测试

***这里是一个带两个材质槽的模型，给上两个半透明材质实例***
![](/assets/img/MyPJ/Engine/Pasted image 20250416224949.png)
***材质上全部都勾选MaterialTranslucencySortPriority，值都为0，状态不变和上图一样***
![](/assets/img/MyPJ/Engine/Pasted image 20250416224618.png)
***调整红色材质MaterialTranslucencySortPriority值为1，排序发生改变，因为红色数值更大，渲染更靠后，在蓝色之后渲染再叠加***
![](/assets/img/MyPJ/Engine/Pasted image 20250416224932.png)

### MaterialTranslucencySectionPriority测试

***同样勾选MaterialTranslucencySectionPriority，值默认的0***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225218.png)
***当前状态***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225257.png)
***将红色材质MaterialTranslucencySectionPriority值设为1***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225334.png)
***此时排序发生改变***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225411.png)

### 对比测试

***这里看似MaterialTranslucencySectionPriority是和MaterialTranslucencySortPriority效果相同，实际上并不一样。这里在追加一个绿色半透明模型放在前方，默认什么都不开的状态如下***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225840.png)
***先将红色材质MaterialTranslucencySectionPriority值设为1***
![](/assets/img/MyPJ/Engine/Pasted image 20250416225929.png)
***现在的状态是红色盖住蓝色，但是没有超过绿色***
![](/assets/img/MyPJ/Engine/Pasted image 20250416230010.png)
***现在红色材质换成改MaterialTranslucencySortPriority值为1***
![](/assets/img/MyPJ/Engine/Pasted image 20250416230154.png)
***这里是红色直接覆盖了蓝色和绿色***
![](/assets/img/MyPJ/Engine/Pasted image 20250416230212.png)

## 骨骼网格体测试

### MaterialTranslucencySortPriority测试

***默认情况***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231422.png)
***修改红色材质MaterialTranslucencySortPriority值为1，排序更改生效***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231443.png)

### MaterialTranslucencySectionPriority测试

***默认情况***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231532.png)
***修改红色材质MaterialTranslucencySectionPriority值为1，排序更改生效***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231604.png)

## 对比测试

***增加一个绿色半透明模型放在前面，默认情况如下图***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231841.png)
***修改红色材质MaterialTranslucencySortPriority值为1，因为不受模型距离排序控制，所以红色会叠在最前方***
![](/assets/img/MyPJ/Engine/Pasted image 20250416231933.png)
***修改红色材质MaterialTranslucencySectionPriority值为1，红色会叠在蓝色前方，但不会超过其他模型***
![](/assets/img/MyPJ/Engine/Pasted image 20250416232115.png)
