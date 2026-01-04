---
layout: about
title: about
permalink: /
subtitle: Technical Artist | Shader Developer

profile:
  align: right
  image: prof_pic.jpg
  image_circular: true
  more_info: >
    <p>专注实时渲染技术</p>
    <p>Unity · Unreal Engine</p>

announcements:
  enabled: true
  scrollable: true
  limit: 5

news: true

latest_posts:
  enabled: true
  scrollable: true
  limit: 3

social: true
selected_papers: false
nav_order: 1
---

你好!我是**吟处雪轻遮**,一名正在学习技术美术(Technical Artist)的开发者。

<div class="about-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-user-circle"></i>
      关于我
    </h2>
  </div>
  
  <p class="intro-text">我专注于实时渲染技术的学习与实践,目标是成为一名专业的技术美术(TA)。</p>
</div>

<div class="skills-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-tools"></i>
      技术栈
    </h2>
  </div>
  
  <div class="skills-grid">
    <div class="skill-card">
      <div class="skill-icon engine">🎮</div>
      <h4 class="skill-category">引擎</h4>
      <p class="skill-items">Unity (URP) · Unreal Engine</p>
    </div>
    
    <div class="skill-card">
      <div class="skill-icon code">💻</div>
      <h4 class="skill-category">语言</h4>
      <p class="skill-items">HLSL · Blueprint</p>
    </div>
    
    <div class="skill-card">
      <div class="skill-icon expertise">✨</div>
      <h4 class="skill-category">专长</h4>
      <p class="skill-items">角色渲染 · 卡通着色 · PBR</p>
    </div>
    
    <div class="skill-card">
      <div class="skill-icon tools">🔧</div>
      <h4 class="skill-category">工具</h4>
      <p class="skill-items">Blender · Substance Painter · RenderDoc · Git</p>
    </div>
  </div>
</div>

<div class="goals-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-bullseye"></i>
      当前目标
    </h2>
  </div>
  
  <div class="goals-grid">
    <div class="goal-item">
      <div class="goal-icon">🔧</div>
      <p>深入学习渲染管线架构</p>
    </div>
    <div class="goal-item">
      <div class="goal-icon">📚</div>
      <p>实践PBR与卡通渲染技术</p>
    </div>
    <div class="goal-item">
      <div class="goal-icon">✨</div>
      <p>构建完整的技术作品集</p>
    </div>
    <div class="goal-item">
      <div class="goal-icon">🎯</div>
      <p>探索Unreal Engine渲染系统</p>
    </div>
  </div>
</div>

<div class="blog-intro-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-pencil-alt"></i>
      博客内容
    </h2>
  </div>
  
  <div class="blog-topics">
    <div class="topic-card">
      <div class="topic-icon">💡</div>
      <h4>Shader开发心得</h4>
      <p>技术探索与实战经验</p>
    </div>
    
    <div class="topic-card">
      <div class="topic-icon">📖</div>
      <h4>渲染原理笔记</h4>
      <p>深入理解图形学理论</p>
    </div>
    
    <div class="topic-card">
      <div class="topic-icon">🎨</div>
      <h4>项目实践经验</h4>
      <p>问题解决与经验总结</p>
    </div>
    
    <div class="topic-card">
      <div class="topic-icon">🚀</div>
      <h4>技术成长历程</h4>
      <p>学习路径与心得分享</p>
    </div>
  </div>
</div>

<div class="contact-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-paper-plane"></i>
      联系方式
    </h2>
  </div>
  
  <div class="contact-grid">
    <a href="mailto:1215422936@qq.com" class="contact-card email">
      <div class="contact-icon">
        <i class="fas fa-envelope"></i>
      </div>
      <div class="contact-info">
        <h4>邮箱</h4>
        <p>1215422936@qq.com</p>
      </div>
    </a>
    
    <a href="https://github.com/XueQingZhe" target="_blank" class="contact-card github">
      <div class="contact-icon">
        <i class="fab fa-github"></i>
      </div>
      <div class="contact-info">
        <h4>GitHub</h4>
        <p>@XueQingZhe</p>
      </div>
    </a>
    
    <a href="https://www.zhihu.com/people/93-66-30-25" target="_blank" class="contact-card zhihu">
      <div class="contact-icon">
        <i class="fab fa-zhihu"></i>
      </div>
      <div class="contact-info">
        <h4>知乎</h4>
        <p>我的知乎主页</p>
      </div>
    </a>
    
    <a href="https://afdian.com/a/AtristForMyDream" target="_blank" class="contact-card support">
      <div class="contact-icon">
        <i class="fas fa-coffee"></i>
      </div>
      <div class="contact-info">
        <h4>爱发电</h4>
        <p>支持我的创作</p>
      </div>
    </a>
  </div>
  
  <p class="contact-cta">欢迎与我交流!</p>
</div>

<style>
/* ========== 通用区域样式 ========== */
.about-section,
.skills-section,
.goals-section,
.blog-intro-section,
.contact-section {
  margin: 3rem 0;
}

.section-header {
  margin-bottom: 2rem;
  position: relative;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title i {
  color: var(--global-theme-color);
  font-size: 1.6rem;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -0.5rem;
  left: 0;
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg,
    var(--global-theme-color) 0%,
    transparent 100%
  );
  border-radius: 3px;
}

/* ========== 简介文字 ========== */
.intro-text {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--global-text-color);
  margin: 0;
}

/* ========== 技能网格 ========== */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.skill-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.skill-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.08) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s;
}

.skill-card:hover::before {
  opacity: 1;
}

.skill-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  border-color: var(--global-theme-color);
}

.skill-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}

.skill-category {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  position: relative;
  z-index: 1;
}

.skill-items {
  color: var(--global-text-color-light);
  line-height: 1.7;
  margin: 0;
  position: relative;
  z-index: 1;
}

/* ========== 目标网格 ========== */
.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.goal-item {
  background: var(--global-bg-color);
  border: 2px dashed var(--global-divider-color);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s;
  cursor: default;
}

.goal-item:hover {
  border-style: solid;
  border-color: var(--global-theme-color);
  background: var(--global-code-bg-color);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.goal-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.goal-item p {
  margin: 0;
  color: var(--global-text-color);
  font-weight: 500;
  line-height: 1.6;
}

/* ========== 博客主题卡片 ========== */
.blog-topics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.topic-card {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.05) 0%,
    rgba(var(--global-theme-color-rgb), 0.02) 100%
  );
  border: 1px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: all 0.4s;
}

.topic-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 28px rgba(0,0,0,0.12);
  border-color: var(--global-theme-color);
}

.topic-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.topic-card h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.5rem 0;
}

.topic-card p {
  color: var(--global-text-color-light);
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.6;
}

/* ========== 联系方式卡片 ========== */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 16px;
  padding: 1.75rem;
  text-decoration: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.contact-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleY(0);
  transition: transform 0.4s;
}

.contact-card:hover::before {
  transform: scaleY(1);
}

.contact-card:hover {
  transform: translateX(8px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-color: var(--global-theme-color);
}

.contact-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.15) 0%,
    rgba(var(--global-theme-color-rgb), 0.25) 100%
  );
  border-radius: 12px;
  font-size: 1.8rem;
  color: var(--global-theme-color);
  flex-shrink: 0;
  transition: transform 0.3s;
}

.contact-card:hover .contact-icon {
  transform: scale(1.1) rotate(5deg);
}

.contact-info {
  flex: 1;
}

.contact-info h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.3rem 0;
}

.contact-info p {
  font-size: 0.95rem;
  color: var(--global-text-color-light);
  margin: 0;
}

/* 特殊联系方式颜色 */
.contact-card.email:hover {
  border-color: #EA4335;
}

.contact-card.github:hover {
  border-color: #333;
}

.contact-card.zhihu:hover {
  border-color: #0084FF;
}

.contact-card.support:hover {
  border-color: #FF6B6B;
}

.contact-cta {
  text-align: center;
  font-size: 1.2rem;
  color: var(--global-theme-color);
  font-weight: 600;
  margin: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .section-title {
    font-size: 1.5rem;
  }
  
  .skills-grid,
  .goals-grid,
  .blog-topics,
  .contact-grid {
    grid-template-columns: 1fr;
  }
  
  .skill-card,
  .goal-item,
  .topic-card {
    padding: 1.5rem;
  }
  
  .contact-card {
    padding: 1.5rem;
  }
  
  .contact-icon {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }
}

/* ========== Profile图片增强 ========== */
.profile {
  margin-bottom: 2rem;
}

.profile img {
  border: 3px solid var(--global-theme-color);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  transition: all 0.4s;
}

.profile img:hover {
  transform: scale(1.05) rotate(2deg);
  box-shadow: 0 12px 32px rgba(0,0,0,0.2);
}

/* ========== News和Posts增强 ========== */
.news,
.latest-posts {
  margin: 3rem 0;
}

.news h2,
.latest-posts h2 {
  color: var(--global-theme-color);
  font-weight: 700;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.news h2::before {
  content: '📢';
  font-size: 1.5rem;
}

.latest-posts h2::before {
  content: '📝';
  font-size: 1.5rem;
}
</style>