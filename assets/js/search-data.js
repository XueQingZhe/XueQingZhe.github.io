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
          section: "News",},{id: "projects-zzzrendering-xingjianya",
          title: 'ZZZRendering-XingJianYa',
          description: "ZZZRendering-XingJianYa",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "tutorials-blender复刻和模型处理",
          title: 'Blender复刻和模型处理',
          description: "Blender复刻和模型处理",
          section: "Tutorials",handler: () => {
              window.location.href = "/tutorials/ZZZRendering/01_Blender%E5%A4%8D%E5%88%BB%E5%92%8C%E6%A8%A1%E5%9E%8B%E5%A4%84%E7%90%86/";
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
