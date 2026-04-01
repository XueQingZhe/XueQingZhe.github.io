// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "我的技术作品集",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-books",
          title: "books",
          description: "推荐的TA学习资源与技术书籍",
          section: "Navigation",
          handler: () => {
            window.location.href = "/books/";
          },
        },{id: "nav-tutorials",
          title: "tutorials",
          description: "技术分享与教程",
          section: "Navigation",
          handler: () => {
            window.location.href = "/tutorials/";
          },
        },{id: "nav-tagsfilters",
          title: "tagsFilters",
          description: "按标签浏览所有文章和教程",
          section: "Navigation",
          handler: () => {
            window.location.href = "/tags/";
          },
        },{id: "post-lv-3-unity主线-一个简单的pbrshader",
        
          title: "Lv.3 Unity主线：一个简单的PBRShader",
        
        description: "Lv.3 Unity主线：一个简单的PBRShader",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/Lv.3-Unity%E4%B8%BB%E7%BA%BF-%E4%B8%80%E4%B8%AA%E7%AE%80%E5%8D%95%E7%9A%84PBRShader/";
          
        },
      },{id: "post-理论支线-直接光漫反射与ggx高光的混合问题",
        
          title: "理论支线：直接光漫反射与GGX高光的混合问题",
        
        description: "理论支线：直接光漫反射与GGX高光的混合问题",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/%E7%90%86%E8%AE%BA%E6%94%AF%E7%BA%BF-%E7%9B%B4%E6%8E%A5%E5%85%89%E6%BC%AB%E5%8F%8D%E5%B0%84%E4%B8%8EGGX%E9%AB%98%E5%85%89%E7%9A%84%E6%B7%B7%E5%90%88%E9%97%AE%E9%A2%98/";
          
        },
      },{id: "post-理论支线-pbr-基于图像的照明-image-based-lighting-ibl",
        
          title: "理论支线：PBR - 基于图像的照明( image based lighting-IBL)",
        
        description: "理论支线：PBR - 基于图像的照明( image based lighting-IBL)",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/%E7%90%86%E8%AE%BA%E6%94%AF%E7%BA%BF-PBR-%E5%9F%BA%E4%BA%8E%E5%9B%BE%E5%83%8F%E7%9A%84%E7%85%A7%E6%98%8E(-image-based-lighting-IBL)/";
          
        },
      },{id: "post-lv-3-unity主线-视差-parallax-mapping",
        
          title: "Lv.3 Unity主线：视差(Parallax Mapping)",
        
        description: "Lv.3 Unity主线：视差(Parallax Mapping)",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/Lv.3-Unity%E4%B8%BB%E7%BA%BF-%E8%A7%86%E5%B7%AE(Parallax-Mapping)/";
          
        },
      },{id: "post-unitytips-法线的空间变化",
        
          title: "UnityTips：法线的空间变化",
        
        description: "UnityTips：法线的空间变化",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/UnityTips-%E6%B3%95%E7%BA%BF%E7%9A%84%E7%A9%BA%E9%97%B4%E5%8F%98%E5%8C%96/";
          
        },
      },{id: "post-unitytips-多subshder",
        
          title: "UnityTips：多SubShder",
        
        description: "UnityTips：多SubShder",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/UnityTips-%E5%A4%9ASubShder/";
          
        },
      },{id: "post-unitytips-参数面板后面的-和属性标签",
        
          title: "UnityTips：参数面板后面的{}和属性标签",
        
        description: "UnityTips：参数面板后面的{}和属性标签",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/UnityTips-%E5%8F%82%E6%95%B0%E9%9D%A2%E6%9D%BF%E5%90%8E%E9%9D%A2%E7%9A%84-%E5%92%8C%E5%B1%9E%E6%80%A7%E6%A0%87%E7%AD%BE/";
          
        },
      },{id: "post-理论支线-lightattenuation-衰减",
        
          title: "理论支线：LightAttenuation 衰减",
        
        description: "理论支线：LightAttenuation 衰减",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/%E7%90%86%E8%AE%BA%E6%94%AF%E7%BA%BF-LightAttenuation-%E8%A1%B0%E5%87%8F/";
          
        },
      },{id: "post-理论支线-gamma-correction-伽马校正",
        
          title: "理论支线：Gamma Correction  伽马校正",
        
        description: "理论支线：Gamma Correction  伽马校正",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/%E7%90%86%E8%AE%BA%E6%94%AF%E7%BA%BF-Gamma-Correction-%E4%BC%BD%E9%A9%AC%E6%A0%A1%E6%AD%A3/";
          
        },
      },{id: "post-理论支线-pbrspecular-ggx-速通",
        
          title: "理论支线：PBRSpecular - GGX 速通",
        
        description: "理论支线：PBRSpecular - GGX",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/%E7%90%86%E8%AE%BA%E6%94%AF%E7%BA%BF-PBRSpecular-GGX-%E9%80%9F%E9%80%9A/";
          
        },
      },{id: "post-ggx-d-h-分布可视化",
        
          title: "GGX_D(H)分布可视化",
        
        description: "GGX_D(H)分布可视化",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/GGX_D(H)%E5%88%86%E5%B8%83%E5%8F%AF%E8%A7%86%E5%8C%96/";
          
        },
      },{id: "post-lv-2-unity主线-添加环境光",
        
          title: "Lv.2 Unity主线：添加环境光",
        
        description: "如何添加环境光",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.2-Unity%E4%B8%BB%E7%BA%BF-%E6%B7%BB%E5%8A%A0%E7%8E%AF%E5%A2%83%E5%85%89/";
          
        },
      },{id: "post-lv-2-unity主线-添加多光源交互",
        
          title: "Lv.2 Unity主线：添加多光源交互",
        
        description: "如何多光源交互",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.2-Unity%E4%B8%BB%E7%BA%BF-%E6%B7%BB%E5%8A%A0%E5%A4%9A%E5%85%89%E6%BA%90%E4%BA%A4%E4%BA%92/";
          
        },
      },{id: "post-镜面反射光照模型phong和blinn-phong",
        
          title: "镜面反射光照模型Phong和Blinn-Phong",
        
        description: "镜面反射光照模型Phong和Blinn-Phong",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.2-Unity%E4%B8%BB%E7%BA%BF-%E9%95%9C%E9%9D%A2%E5%8F%8D%E5%B0%84%E5%85%89%E7%85%A7%E6%A8%A1%E5%9E%8BPhong%E5%92%8CBlinn-Phong/";
          
        },
      },{id: "post-lv-2-unity主线-添加法线",
        
          title: "Lv.2 Unity主线：添加法线",
        
        description: "如何添加法线",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.2-Unity%E4%B8%BB%E7%BA%BF-%E6%B7%BB%E5%8A%A0%E6%B3%95%E7%BA%BF/";
          
        },
      },{id: "post-lv-2-unity主线-添加阴影",
        
          title: "Lv.2 Unity主线： 添加阴影",
        
        description: "如何添加阴影",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.2-Unity%E4%B8%BB%E7%BA%BF-%E6%B7%BB%E5%8A%A0%E9%98%B4%E5%BD%B1/";
          
        },
      },{id: "post-lv-1-unity主线-unity函数常用速查",
        
          title: "Lv.1 Unity主线：Unity函数常用速查",
        
        description: "Unity函数常用速查",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.1-Unity%E4%B8%BB%E7%BA%BF-Unity%E5%87%BD%E6%95%B0%E5%B8%B8%E7%94%A8%E9%80%9F%E6%9F%A5/";
          
        },
      },{id: "post-blinn-phong-半程向量-halfway-vector-可视化",
        
          title: "Blinn-Phong 半程向量（Halfway Vector）可视化",
        
        description: "Blinn-Phong 半程向量（Halfway Vector）可视化",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Blinn-Phong-%E5%8D%8A%E7%A8%8B%E5%90%91%E9%87%8F-Halfway-Vector-%E5%8F%AF%E8%A7%86%E5%8C%96/";
          
        },
      },{id: "post-lv-1-数学支线-3blue1brown线性代数",
        
          title: "Lv.1 数学支线 3Blue1Brown线性代数",
        
        description: "3Blue1Brown线性代数简记",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.1-%E6%95%B0%E5%AD%A6%E6%94%AF%E7%BA%BF-3Blue1Brown%E7%BA%BF%E6%80%A7%E4%BB%A3%E6%95%B0/";
          
        },
      },{id: "post-lv-1-unity主线-built-in-shader结构速览",
        
          title: "Lv.1 Unity主线：Built-in Shader结构速览",
        
        description: "Built-in Shader结构速览",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/Lv.1-Unity%E4%B8%BB%E7%BA%BF-Built-in-Shader%E7%BB%93%E6%9E%84%E9%80%9F%E8%A7%88/";
          
        },
      },{id: "news-开始了ta学习计划-建立了个人技术博客和作品集网站",
          title: '🚀开始了TA学习计划！建立了个人技术博客和作品集网站。',
          description: "",
          section: "News",},{id: "news-tamonth01结束-tamonth02开始",
          title: 'TAMonth01结束, TAMonth02开始！',
          description: "",
          section: "News",},{id: "news-默认管线转到urp管线",
          title: '默认管线转到URP管线！',
          description: "",
          section: "News",},{id: "projects-zzzrendering-xingjianya",
          title: 'ZZZRendering-XingJianYa',
          description: "ZZZRendering-XingJianYa",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-urp-pbr",
          title: 'URP - PBR',
          description: "基于 Cook-Torrance 模型手写完整 PBR",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-unity-绝区零橘福福",
          title: 'Unity-绝区零橘福福',
          description: "Unity仿绝区零角色渲染——橘福福",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "tutorials-01-blender模型处理",
          title: '01_Blender模型处理',
          description: "01_Blender模型处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/01_Blender%E6%A8%A1%E5%9E%8B%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-02-材质初步处理",
          title: '02_材质初步处理',
          description: "02_材质初步处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/02_%E6%9D%90%E8%B4%A8%E5%88%9D%E6%AD%A5%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-03-描边追加",
          title: '03_描边追加',
          description: "03_描边追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/03_%E6%8F%8F%E8%BE%B9%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-04-着色模型构建",
          title: '04_着色模型构建',
          description: "04_着色模型构建",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/04_%E7%9D%80%E8%89%B2%E6%A8%A1%E5%9E%8B%E6%9E%84%E5%BB%BA/";
            },},{id: "tutorials-05-投影追加",
          title: '05_投影追加',
          description: "05_投影追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/05_%E6%8A%95%E5%BD%B1%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-06-面部阴影sdf重构",
          title: '06_面部阴影SDF重构',
          description: "06_面部阴影SDF重构",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/06_%E9%9D%A2%E9%83%A8%E9%98%B4%E5%BD%B1SDF%E9%87%8D%E6%9E%84/";
            },},{id: "tutorials-07-添加鼻线",
          title: '07_添加鼻线',
          description: "07_添加鼻线",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/07_%E6%B7%BB%E5%8A%A0%E9%BC%BB%E7%BA%BF/";
            },},{id: "tutorials-08-添加matcap",
          title: '08_添加MatCap',
          description: "08_添加MatCap",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/08_%E6%B7%BB%E5%8A%A0MatCap/";
            },},{id: "tutorials-09-颜色锐化处理",
          title: '09_颜色锐化处理',
          description: "09_颜色锐化处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/09_%E9%A2%9C%E8%89%B2%E9%94%90%E5%8C%96%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-10-添加pbr高光",
          title: '10_添加PBR高光',
          description: "10_添加PBR高光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/10_%E6%B7%BB%E5%8A%A0PBR%E9%AB%98%E5%85%89/";
            },},{id: "tutorials-11-添加环境光",
          title: '11_添加环境光',
          description: "11_添加环境光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/11_%E6%B7%BB%E5%8A%A0%E7%8E%AF%E5%A2%83%E5%85%89/";
            },},{id: "tutorials-12-添加边缘光",
          title: '12_添加边缘光',
          description: "12_添加边缘光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/12_%E6%B7%BB%E5%8A%A0%E8%BE%B9%E7%BC%98%E5%85%89/";
            },},{id: "tutorials-13-眼睛处理-末",
          title: '13_眼睛处理(末)',
          description: "13_眼睛处理(末)",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/BlenderPJ/13_%E7%9C%BC%E7%9D%9B%E5%A4%84%E7%90%86(%E6%9C%AB)/";
            },},{id: "tutorials-01-导入及资源处理",
          title: '01_导入及资源处理',
          description: "01_导入及资源处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/01_%E5%AF%BC%E5%85%A5%E5%8F%8A%E8%B5%84%E6%BA%90%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-02-描边追加",
          title: '02_描边追加',
          description: "02_描边追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/02_%E6%8F%8F%E8%BE%B9%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-03-着色模型构建",
          title: '03_着色模型构建',
          description: "03_着色模型构建",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/03_%E7%9D%80%E8%89%B2%E6%A8%A1%E5%9E%8B%E6%9E%84%E5%BB%BA/";
            },},{id: "tutorials-04-投影追加",
          title: '04_投影追加',
          description: "04_投影追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/04_%E6%8A%95%E5%BD%B1%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-05-面部阴影sdf重构",
          title: '05_面部阴影SDF重构',
          description: "05_面部阴影SDF重构",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/05_%E9%9D%A2%E9%83%A8%E9%98%B4%E5%BD%B1SDF%E9%87%8D%E6%9E%84/";
            },},{id: "tutorials-06-鼻线添加",
          title: '06_鼻线添加',
          description: "06_鼻线添加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/06_%E9%BC%BB%E7%BA%BF%E6%B7%BB%E5%8A%A0/";
            },},{id: "tutorials-07-增加matcap",
          title: '07_增加MatCap',
          description: "07_增加MatCap",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/07_%E5%A2%9E%E5%8A%A0MatCap/";
            },},{id: "tutorials-08-颜色锐化处理",
          title: '08_颜色锐化处理',
          description: "08_颜色锐化处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/08_%E9%A2%9C%E8%89%B2%E9%94%90%E5%8C%96%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-09-添加pbr高光",
          title: '09_添加PBR高光',
          description: "09_添加PBR高光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/09_%E6%B7%BB%E5%8A%A0PBR%E9%AB%98%E5%85%89/";
            },},{id: "tutorials-10-添加环境光",
          title: '10_添加环境光',
          description: "10_添加环境光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/10_%E6%B7%BB%E5%8A%A0%E7%8E%AF%E5%A2%83%E5%85%89/";
            },},{id: "tutorials-11-添加边缘光",
          title: '11_添加边缘光',
          description: "11_添加边缘光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/11_%E6%B7%BB%E5%8A%A0%E8%BE%B9%E7%BC%98%E5%85%89/";
            },},{id: "tutorials-12-眼睛处理",
          title: '12_眼睛处理',
          description: "12_眼睛处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/12_%E7%9C%BC%E7%9D%9B%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-13-导入法线问题解决",
          title: '13_导入法线问题解决',
          description: "13_导入法线问题解决",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UEPJ/13_%E5%AF%BC%E5%85%A5%E6%B3%95%E7%BA%BF%E9%97%AE%E9%A2%98%E8%A7%A3%E5%86%B3/";
            },},{id: "tutorials-01-管线及资源设置",
          title: '01_管线及资源设置',
          description: "01_管线及资源设置",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/01_%E7%AE%A1%E7%BA%BF%E5%8F%8A%E8%B5%84%E6%BA%90%E8%AE%BE%E7%BD%AE/";
            },},{id: "tutorials-02-描边追加",
          title: '02_描边追加',
          description: "02_描边追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/02_%E6%8F%8F%E8%BE%B9%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-03-着色模型构建",
          title: '03_着色模型构建',
          description: "03_着色模型构建",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/03_%E7%9D%80%E8%89%B2%E6%A8%A1%E5%9E%8B%E6%9E%84%E5%BB%BA/";
            },},{id: "tutorials-04-投影追加",
          title: '04_投影追加',
          description: "04_投影追加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/04_%E6%8A%95%E5%BD%B1%E8%BF%BD%E5%8A%A0/";
            },},{id: "tutorials-05-面部阴影sdf重构",
          title: '05_面部阴影SDF重构',
          description: "05_面部阴影SDF重构",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/05_%E9%9D%A2%E9%83%A8%E9%98%B4%E5%BD%B1SDF%E9%87%8D%E6%9E%84/";
            },},{id: "tutorials-06-鼻线添加",
          title: '06_鼻线添加',
          description: "06_鼻线添加",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/06_%E9%BC%BB%E7%BA%BF%E6%B7%BB%E5%8A%A0/";
            },},{id: "tutorials-07-增加matcap",
          title: '07_增加MatCap',
          description: "07_增加MatCap",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/07_%E5%A2%9E%E5%8A%A0MatCap/";
            },},{id: "tutorials-08-颜色锐化处理",
          title: '08_颜色锐化处理',
          description: "08_颜色锐化处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/08_%E9%A2%9C%E8%89%B2%E9%94%90%E5%8C%96%E5%A4%84%E7%90%86/";
            },},{id: "tutorials-09-添加pbr高光",
          title: '09_添加PBR高光',
          description: "09_添加PBR高光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/09_%E6%B7%BB%E5%8A%A0PBR%E9%AB%98%E5%85%89/";
            },},{id: "tutorials-10-添加环境光",
          title: '10_添加环境光',
          description: "10_添加环境光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/10_%E6%B7%BB%E5%8A%A0%E7%8E%AF%E5%A2%83%E5%85%89/";
            },},{id: "tutorials-11-添加边缘光",
          title: '11_添加边缘光',
          description: "11_添加边缘光",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/11_%E6%B7%BB%E5%8A%A0%E8%BE%B9%E7%BC%98%E5%85%89/";
            },},{id: "tutorials-12-眼睛处理",
          title: '12_眼睛处理',
          description: "12_眼睛处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/XingJianYa(Miyabi)/UnityPJ/12_%E7%9C%BC%E7%9D%9B%E5%A4%84%E7%90%86/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%31%32%31%35%34%32%32%39%33%36@%71%71.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/XueQingZhe", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
