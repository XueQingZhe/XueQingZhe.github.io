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

<div class="about-intro">
  <p class="lead-text">你好，我是<strong>吟处雪轻遮</strong>，一名正在学习技术美术 (Technical Artist) 的开发者。</p>
  <p class="intro-desc">专注于实时渲染技术的学习与实践，目标是成为一名专业的 TA。在这个博客里，我分享 Shader 开发心得、渲染原理学习笔记、项目实践经验以及技术成长历程。</p>
  <p class="motto">"音起若梦期末来，樱吹似雪入我怀"</p>
</div>

<div class="divider"></div>

<div class="section">
  <h2><i class="fas fa-code"></i> 技术栈</h2>
  
  <div class="stack-list">
    <div class="stack-row">
      <span class="stack-label">引擎平台</span>
      <div class="stack-tags">
        <span class="tag primary">Unity URP</span>
        <span class="tag primary">Unreal Engine</span>
        <span class="tag">Built-in Pipeline</span>
      </div>
    </div>
    
    <div class="stack-row">
      <span class="stack-label">编程语言</span>
      <div class="stack-tags">
        <span class="tag primary">HLSL</span>
        <span class="tag primary">ShaderLab</span>
        <span class="tag">C#</span>
        <span class="tag">Blueprint</span>
        <span class="tag">Python</span>
      </div>
    </div>
    
    <div class="stack-row">
      <span class="stack-label">专业领域</span>
      <div class="stack-tags">
        <span class="tag primary">角色渲染</span>
        <span class="tag primary">卡通着色 (NPR)</span>
        <span class="tag primary">PBR 工作流</span>
        <span class="tag">实时光照</span>
        <span class="tag">后处理效果</span>
      </div>
    </div>
    
    <div class="stack-row">
      <span class="stack-label">开发工具</span>
      <div class="stack-tags">
        <span class="tag">Blender</span>
        <span class="tag">Substance Painter</span>
        <span class="tag">RenderDoc</span>
        <span class="tag">Git</span>
        <span class="tag">VS / Rider</span>
      </div>
    </div>
  </div>
</div>

<div class="divider"></div>

<div class="section">
  <h2><i class="fas fa-compass"></i> 当前学习重点</h2>
  
  <ul class="goals-list">
    <li>
      <strong>渲染管线深入研究</strong>
      <p>深入学习 Unity URP 和 Unreal 渲染管线架构，掌握 Render Features 和自定义 Pass 开发</p>
    </li>
    <li>
      <strong>PBR 与卡通渲染实践</strong>
      <p>实现能量守恒的 PBR 着色模型，研究卡通渲染中的描边、阴影、高光等技术</p>
    </li>
    <li>
      <strong>技术作品集建设</strong>
      <p>复刻商业级游戏渲染效果（绝区零、崩坏），积累实战经验，形成完整技术作品集</p>
    </li>
    <li>
      <strong>Unreal 渲染系统探索</strong>
      <p>学习 Unreal 材质系统、后处理框架，掌握蓝图可视化编程和引擎级渲染定制</p>
    </li>
  </ul>
</div>

<div class="divider"></div>

<div class="section">
  <h2><i class="fas fa-book-open"></i> 博客内容</h2>
  
  <ul class="content-list">
    <li><strong>Shader 开发与技术探索</strong> — 编程技巧、渲染算法实现、图形学理论应用</li>
    <li><strong>渲染原理学习笔记</strong> — 光照模型、BRDF、全局光照等核心概念</li>
    <li><strong>项目实践与问题解决</strong> — 实际项目中的渲染问题与性能优化</li>
    <li><strong>技术成长与学习路径</strong> — 学习历程、资源推荐、TA 职业发展思考</li>
  </ul>
</div>

<div class="divider"></div>

<div class="section">
  <h2><i class="fas fa-paper-plane"></i> 联系方式</h2>
  
  <div class="contact-list">
    <a href="mailto:1215422936@qq.com" class="contact-item">
      <i class="fas fa-envelope"></i>
      <span>1215422936@qq.com</span>
    </a>
    <a href="https://qm.qq.com/q/kYwCma6AAY" target="_blank" class="contact-item">
      <i class="fab fa-qq"></i>
      <span>QQ 群: 1038259915</span>
    </a>
    <a href="https://github.com/XueQingZhe" target="_blank" class="contact-item">
      <i class="fab fa-github"></i>
      <span>GitHub</span>
    </a>
    <a href="https://www.zhihu.com/people/93-66-30-25" target="_blank" class="contact-item">
      <i class="fab fa-zhihu"></i>
      <span>知乎</span>
    </a>
    <a href="https://afdian.com/a/AtristForMyDream" target="_blank" class="contact-item">
      <i class="fas fa-heart"></i>
      <span>爱发电</span>
    </a>
  </div>
  
  <p class="contact-note">欢迎交流技术问题，分享学习心得，或讨论 TA 相关话题。</p>
</div>

<style>
/* ========== 基础样式 ========== */
.about-intro {
  margin: 2rem 0;
  line-height: 1.8;
}

.lead-text {
  font-size: 1.15rem;
  color: var(--global-text-color);
  margin-bottom: 0.75rem;
}

.lead-text strong {
  color: var(--global-theme-color);
}

.intro-desc {
  color: var(--global-text-color-light);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.motto {
  color: var(--global-text-color-light);
  font-style: italic;
  font-size: 0.95rem;
  opacity: 0.8;
  margin: 1.5rem 0 0;
  padding-left: 1rem;
  border-left: 2px solid var(--global-theme-color);
}

/* ========== 分隔线 ========== */
.divider {
  height: 1px;
  background: var(--global-divider-color);
  margin: 2.5rem 0;
}

/* ========== Section ========== */
.section {
  margin: 2rem 0;
}

.section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--global-text-color);
  margin: 0 0 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.section h2 i {
  color: var(--global-theme-color);
  font-size: 1rem;
}

/* ========== 技术栈 ========== */
.stack-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stack-row {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.stack-label {
  min-width: 100px;
  font-weight: 500;
  color: var(--global-text-color);
  font-size: 0.9rem;
  padding-top: 0.35rem;
}

.stack-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 1;
}

.tag {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: var(--global-code-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--global-text-color);
}

.tag.primary {
  background: rgba(var(--global-theme-color-rgb), 0.1);
  border-color: rgba(var(--global-theme-color-rgb), 0.3);
  color: var(--global-theme-color);
}

/* ========== 目标列表 ========== */
.goals-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.goals-list li {
  margin-bottom: 1.25rem;
  padding-left: 1rem;
  border-left: 2px solid var(--global-divider-color);
}

.goals-list li:hover {
  border-left-color: var(--global-theme-color);
}

.goals-list strong {
  display: block;
  font-size: 1rem;
  color: var(--global-text-color);
  margin-bottom: 0.35rem;
}

.goals-list p {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
  line-height: 1.6;
  margin: 0;
}

/* ========== 内容列表 ========== */
.content-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.content-list li {
  padding: 0.5rem 0;
  font-size: 0.95rem;
  color: var(--global-text-color-light);
  border-bottom: 1px solid var(--global-divider-color);
}

.content-list li:last-child {
  border-bottom: none;
}

.content-list strong {
  color: var(--global-text-color);
}

/* ========== 联系方式 ========== */
.contact-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.contact-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--global-code-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 6px;
  text-decoration: none;
  color: var(--global-text-color);
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.contact-item:hover {
  border-color: var(--global-theme-color);
  color: var(--global-theme-color);
}

.contact-item i {
  font-size: 1rem;
  color: var(--global-theme-color);
}

.contact-note {
  font-size: 0.9rem;
  color: var(--global-text-color-light);
  margin: 1rem 0 0;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .stack-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stack-label {
    min-width: auto;
  }
  
  .contact-list {
    flex-direction: column;
  }
  
  .contact-item {
    justify-content: flex-start;
  }
}

/* ========== Profile ========== */
.profile img {
  border: 2px solid var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>