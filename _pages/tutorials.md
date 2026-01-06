---
layout: page
permalink: /tutorials/
title: tutorials
description: 技术分享与教程
nav: true
nav_order: 5
---

<!-- 页面头部 -->
<div class="tutorials-hero">
  <div class="hero-background">
    <div class="bg-circle bg-circle-1"></div>
    <div class="bg-circle bg-circle-2"></div>
    <div class="bg-circle bg-circle-3"></div>
  </div>
  <div class="hero-content">
    <h1 class="hero-title">
      <i class="fas fa-graduation-cap"></i>
      教程系列
    </h1>
    <p class="hero-subtitle">系统化的技术学习路径</p>
  </div>
</div>

<div class="tutorials-container">
  {% assign tutorial_series = site.data.tutorials %}
  
  {% for series in tutorial_series %}
  <div class="tutorial-card">
    <div class="card-glow"></div>
    
    <div class="row g-0">
      <!-- 左侧预览图 - 缩小宽度 -->
      <div class="col-md-4">
        {% if series.image %}
        <div class="tutorial-image-container" style="--preview-img: url('{{ series.image | relative_url }}')">
          <div class="image-overlay"></div>
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="tutorial-preview-img">
        </div>
        {% else %}
        <div class="placeholder-image">
          <div class="placeholder-icon">
            <i class="fas fa-book-open fa-3x"></i>
          </div>
          <p class="placeholder-text">{{ series.title }}</p>
        </div>
        {% endif %}
      </div>
      
      <!-- 右侧内容 - 增加宽度 -->
      <div class="col-md-8">
        <div class="tutorial-content">
          <div class="content-header">
            <h3 class="tutorial-title">
              <span class="title-icon"><i class="fas fa-book"></i></span>
              {{ series.title }}
            </h3>
            {% if series.status %}
            <span class="status-badge badge-{{ series.status_color }}">
              <i class="fas fa-circle pulse-dot"></i>
              {{ series.status }}
            </span>
            {% endif %}
          </div>
          
          <p class="tutorial-description">{{ series.description }}</p>
          
          <div class="chapters-section">
            <div class="chapters-header">
              <i class="fas fa-list-ul"></i>
              <span>章节列表</span>
              <span class="chapter-count-badge">{{ series.chapters.size }}</span>
            </div>
            
            <!-- 改为两列布局 -->
            <div class="chapters-grid">
              {% for chapter in series.chapters %}
              <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-item">
                <span class="chapter-number">{{ forloop.index }}</span>
                <span class="chapter-title">{{ chapter.title }}</span>
                <i class="fas fa-arrow-right chapter-arrow"></i>
              </a>
              {% endfor %}
            </div>
          </div>
          
          <div class="tutorial-footer">
            <div class="tutorial-stats">
              <span class="stat-item">
                <i class="fas fa-book-open"></i>
                {{ series.chapters.size }} 章节
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  {% endfor %}
</div>

<div class="section-divider">
  <span class="divider-icon"><i class="fas fa-ellipsis-h"></i></span>
</div>

<div class="planned-section">
  <div class="section-header">
    <h2 class="section-title">
      <i class="fas fa-calendar-check"></i>
      计划内容
    </h2>
    <p class="section-subtitle">正在筹备中,敬请期待...</p>
  </div>
  
  <div class="planned-grid">
    <div class="planned-item">
      <div class="planned-icon gradient-1">🎨</div>
      <div class="planned-content">
        <h4 class="planned-title">Shader 基础入门系列</h4>
        <p class="planned-desc">从零开始学习着色器编程</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-2">⚡</div>
      <div class="planned-content">
        <h4 class="planned-title">Unity URP 渲染管线详解</h4>
        <p class="planned-desc">深入理解可编程渲染管线</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-3">🎭</div>
      <div class="planned-content">
        <h4 class="planned-title">卡通渲染实现指南</h4>
        <p class="planned-desc">二次元风格渲染技术解析</p>
      </div>
    </div>
    
    <div class="planned-item">
      <div class="planned-icon gradient-4">💎</div>
      <div class="planned-content">
        <h4 class="planned-title">PBR 工作流完整教程</h4>
        <p class="planned-desc">物理渲染从理论到实践</p>
      </div>
    </div>
  </div>
</div>

<style>
/* ========== 页面头部 ========== */
.tutorials-hero {
  position: relative;
  padding: 4rem 2rem;
  margin: -1rem -1rem 3rem;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.15) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: 10%;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: 15%;
  animation-delay: -5s;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  right: 20%;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.1); }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 0.75rem 0;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-flex;
  align-items: center;
  gap: 1rem;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--global-text-color-light);
  margin: 0;
}

/* ========== 教程卡片 ========== */
.tutorials-container {
  margin-bottom: 4rem;
}

.tutorial-card {
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 2.5rem;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  position: relative;
}

/* 发光效果 */
.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.15) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
}

.tutorial-card:hover .card-glow {
  opacity: 1;
  animation: rotate 10s linear infinite;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.tutorial-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.15);
  border-color: var(--global-theme-color);
}

/* ========== 图片区域 - 缩小高度 ========== */
.tutorial-image-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
}

/* 模糊背景 */
.tutorial-image-container::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-image: var(--preview-img);
  background-size: cover;
  background-position: center;
  filter: blur(25px) brightness(0.4);
  transform: scale(1.15);
  z-index: 0;
}

/* 渐变遮罩 */
.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.2) 0%,
    transparent 100%
  );
  z-index: 1;
}

/* 前景图片 */
.tutorial-preview-img {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 1.5rem;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.7));
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.tutorial-card:hover .tutorial-preview-img {
  transform: scale(1.05) translateY(-6px);
  filter: drop-shadow(0 12px 28px rgba(0,0,0,0.8));
}

/* 占位图 */
.placeholder-image {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  height: 100%;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.placeholder-icon {
  color: var(--global-theme-color);
  opacity: 0.3;
  transition: all 0.5s;
}

.tutorial-card:hover .placeholder-icon {
  transform: scale(1.15) rotate(8deg);
  opacity: 0.5;
}

.placeholder-text {
  margin-top: 1rem;
  font-weight: 600;
  color: var(--global-text-color-light);
  font-size: 1rem;
}

/* ========== 内容区域 ========== */
.tutorial-content {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.tutorial-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--global-text-color);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.title-icon {
  color: var(--global-theme-color);
  font-size: 1.2rem;
}

/* 状态徽章 */
.status-badge {
  padding: 0.45rem 0.9rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.badge-primary {
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.3);
}

.pulse-dot {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tutorial-description {
  color: var(--global-text-color-light);
  margin-bottom: 1.5rem;
  line-height: 1.7;
  font-size: 1rem;
}

/* ========== 章节列表 - 改为网格布局 ========== */
.chapters-section {
  flex-grow: 1;
  margin-bottom: 1.25rem;
}

.chapters-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  color: var(--global-theme-color);
  margin-bottom: 1rem;
  font-size: 1rem;
  padding-bottom: 0.65rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.chapter-count-badge {
  background: var(--global-theme-color);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  margin-left: auto;
}

/* 章节网格 - 两列布局 */
.chapters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 10px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleY(0);
  transition: transform 0.3s;
}

.chapter-item:hover::before {
  transform: scaleY(1);
}

.chapter-item:hover {
  transform: translateX(4px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

.chapter-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 7px;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.chapter-title {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-arrow {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-item:hover .chapter-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* 底部信息 */
.tutorial-footer {
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--global-divider-color);
}

.tutorial-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-item i {
  color: var(--global-theme-color);
}

/* ========== 分隔线 ========== */
.section-divider {
  text-align: center;
  margin: 4rem 0;
  position: relative;
}

.section-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--global-divider-color);
}

.divider-icon {
  display: inline-block;
  background: var(--global-bg-color);
  padding: 0.5rem 1.5rem;
  color: var(--global-text-color-light);
  position: relative;
  z-index: 1;
  font-size: 1.5rem;
}

/* ========== 计划内容 ========== */
.planned-section {
  margin-top: 4rem;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--global-text-color);
}

.section-subtitle {
  color: var(--global-text-color-light);
  font-size: 1.05rem;
  margin: 0;
}

.planned-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.planned-item {
  background: var(--global-bg-color);
  border: 2px dashed var(--global-divider-color);
  border-radius: 16px;
  padding: 2rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.planned-item::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--global-theme-color-rgb), 0.05) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s;
}

.planned-item:hover {
  border-style: solid;
  border-color: var(--global-theme-color);
  background: var(--global-code-bg-color);
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.12);
}

.planned-item:hover::before {
  opacity: 1;
}

.planned-icon {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  margin: 0 auto 1.5rem;
  transition: transform 0.4s;
}

.gradient-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.gradient-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.gradient-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.gradient-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.planned-item:hover .planned-icon {
  transform: scale(1.1) rotate(5deg);
}

.planned-content {
  text-align: center;
  position: relative;
  z-index: 1;
}

.planned-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
}

.planned-desc {
  color: var(--global-text-color-light);
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.6;
}

/* ========== 响应式 ========== */
@media (max-width: 992px) {
  .chapters-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tutorials-hero {
    padding: 3rem 1.5rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .tutorial-card .row {
    flex-direction: column;
  }
  
  .tutorial-image-container,
  .placeholder-image {
    min-height: 240px;
  }
  
  .tutorial-content {
    padding: 1.75rem;
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .tutorial-title {
    font-size: 1.3rem;
  }
  
  .chapters-grid {
    grid-template-columns: 1fr;
  }
  
  .chapter-item {
    padding: 0.75rem 0.9rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>