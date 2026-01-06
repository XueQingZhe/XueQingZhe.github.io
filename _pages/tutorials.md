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
  <h1 class="hero-title">
    <i class="fas fa-graduation-cap"></i>
    教程系列
  </h1>
  <p class="hero-subtitle">系统化的技术学习路径</p>
</div>

<!-- 3D弧形轮播区 -->
<div class="carousel-3d-container">
  <div class="carousel-3d-viewport">
    <div class="carousel-3d-stage" id="carousel3D">
      {% assign tutorial_series = site.data.tutorials %}
      {% assign total = tutorial_series.size %}
      
      {% for series in tutorial_series %}
      <div class="carousel-item-3d" 
           data-index="{{ forloop.index0 }}"
           style="--total: {{ total }}; --index: {{ forloop.index0 }};"
           onmouseenter="showHoverCard({{ forloop.index }})"
           onmouseleave="hideHoverCard({{ forloop.index }})"
           onclick="expandChapters({{ forloop.index }})">
        {% if series.image %}
        <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
        {% else %}
        <div class="item-placeholder">
          <i class="fas fa-book-open fa-2x"></i>
        </div>
        {% endif %}
        
        {% if series.status %}
        <span class="item-badge badge-{{ series.status_color }}">
          <i class="fas fa-circle"></i>
        </span>
        {% endif %}
        
        <div class="item-title">{{ series.title }}</div>
      </div>
      
      <!-- 悬停大卡片 -->
      <div class="hover-card" id="hover-{{ forloop.index }}">
        <div class="hover-card-content">
          <div class="hover-image">
            {% if series.image %}
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
            {% else %}
            <div class="hover-placeholder">
              <i class="fas fa-book-open fa-3x"></i>
            </div>
            {% endif %}
          </div>
          <div class="hover-info">
            <h3>{{ series.title }}</h3>
            {% if series.status %}
            <span class="hover-status badge-{{ series.status_color }}">
              <i class="fas fa-circle"></i>
              {{ series.status }}
            </span>
            {% endif %}
            <p>{{ series.description }}</p>
            <div class="hover-meta">
              <i class="fas fa-list"></i>
              {{ series.chapters.size }} 章节
            </div>
            <div class="hover-hint">
              <i class="fas fa-mouse-pointer"></i>
              点击查看完整目录
            </div>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>
  
  <!-- 控制按钮 -->
  <button class="carousel-nav nav-prev" onclick="rotateCarousel(-1)">
    <i class="fas fa-chevron-left"></i>
  </button>
  <button class="carousel-nav nav-next" onclick="rotateCarousel(1)">
    <i class="fas fa-chevron-right"></i>
  </button>
</div>

<!-- 展开的章节目录 -->
<div class="chapters-expanded" id="chaptersExpanded">
  {% for series in tutorial_series %}
  <div class="chapters-section" id="section-{{ forloop.index }}" style="display: none;">
    <div class="chapters-header">
      <div class="header-info">
        <i class="fas fa-list-ul"></i>
        <h3>{{ series.title }} - 章节列表</h3>
        <span class="total-badge">{{ series.chapters.size }}</span>
      </div>
      <button class="collapse-btn" onclick="collapseChapters()">
        <i class="fas fa-times"></i>
        收起
      </button>
    </div>
    
    <div class="chapters-bars">
      {% for chapter in series.chapters %}
      <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-bar">
        <span class="bar-number">{{ forloop.index }}</span>
        <span class="bar-title">{{ chapter.title }}</span>
        <i class="fas fa-arrow-right bar-icon"></i>
      </a>
      {% endfor %}
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

<script>
let currentRotation = 0;
let totalItems = {{ tutorial_series.size }};
let currentExpanded = null;

// 旋转轮播
function rotateCarousel(direction) {
  currentRotation += direction;
  const carousel = document.getElementById('carousel3D');
  const angleStep = 360 / totalItems;
  
  carousel.style.transform = `rotateY(${currentRotation * angleStep}deg)`;
}

// 显示悬停卡片
function showHoverCard(id) {
  const card = document.getElementById(`hover-${id}`);
  if (card && currentExpanded === null) {
    card.style.display = 'block';
    setTimeout(() => {
      card.classList.add('visible');
    }, 10);
  }
}

// 隐藏悬停卡片
function hideHoverCard(id) {
  const card = document.getElementById(`hover-${id}`);
  if (card) {
    card.classList.remove('visible');
    setTimeout(() => {
      card.style.display = 'none';
    }, 300);
  }
}

// 展开章节
function expandChapters(id) {
  // 隐藏所有悬停卡片
  document.querySelectorAll('.hover-card').forEach(card => {
    card.classList.remove('visible');
    card.style.display = 'none';
  });
  
  // 如果点击当前展开的,则收起
  if (currentExpanded === id) {
    collapseChapters();
    return;
  }
  
  // 隐藏其他章节
  document.querySelectorAll('.chapters-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // 显示选中章节
  const section = document.getElementById(`section-${id}`);
  const container = document.getElementById('chaptersExpanded');
  
  if (section) {
    container.style.display = 'block';
    section.style.display = 'block';
    currentExpanded = id;
    
    setTimeout(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

// 收起章节
function collapseChapters() {
  if (currentExpanded !== null) {
    const section = document.getElementById(`section-${currentExpanded}`);
    const container = document.getElementById('chaptersExpanded');
    
    if (section) {
      section.style.display = 'none';
      container.style.display = 'none';
      currentExpanded = null;
    }
  }
}
</script>

<style>
/* ========== 页面头部 ========== */
.tutorials-hero {
  padding: 3rem 0 2rem;
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

/* ========== 3D弧形轮播 ========== */
.carousel-3d-container {
  position: relative;
  margin: 3rem 0;
  padding: 3rem 0;
}

.carousel-3d-viewport {
  width: 100%;
  height: 450px;
  perspective: 1200px;
  overflow: hidden;
  position: relative;
}

.carousel-3d-stage {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 3D圆柱形排列 */
.carousel-item-3d {
  position: absolute;
  width: 200px;
  height: 280px;
  left: 50%;
  top: 50%;
  margin-left: -100px;
  margin-top: -140px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  transition: all 0.3s;
  
  /* 3D圆柱排列公式 */
  transform: 
    rotateY(calc(360deg / var(--total) * var(--index)))
    translateZ(500px);
}

.carousel-item-3d:hover {
  transform: 
    rotateY(calc(360deg / var(--total) * var(--index)))
    translateZ(520px)
    scale(1.05);
  border-color: var(--global-theme-color);
  box-shadow: 0 12px 36px rgba(var(--global-theme-color-rgb), 0.4);
  z-index: 100;
}

.carousel-item-3d img {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.item-placeholder {
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  color: var(--global-theme-color);
  opacity: 0.3;
}

.item-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.item-badge i {
  font-size: 0.4rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.item-title {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--global-text-color);
  background: var(--global-bg-color);
}

/* 导航按钮 */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: rgba(var(--global-theme-color-rgb), 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 200;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.carousel-nav:hover {
  background: var(--global-theme-color);
  transform: translateY(-50%) scale(1.1);
}

.nav-prev {
  left: 2rem;
}

.nav-next {
  right: 2rem;
}

/* ========== 悬停大卡片 ========== */
.hover-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  background: var(--global-bg-color);
  border: 3px solid var(--global-theme-color);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  display: none;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.hover-card.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.hover-card-content {
  display: flex;
}

.hover-image {
  width: 180px;
  height: 100%;
  background: #000;
  flex-shrink: 0;
  border-radius: 17px 0 0 17px;
  overflow: hidden;
}

.hover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hover-placeholder {
  width: 100%;
  height: 100%;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  color: var(--global-theme-color);
  opacity: 0.3;
}

.hover-info {
  flex: 1;
  padding: 1.5rem;
}

.hover-info h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
}

.hover-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 14px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.hover-status i {
  font-size: 0.45rem;
}

.hover-info p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--global-text-color-light);
  margin: 0 0 1rem 0;
}

.hover-meta {
  font-size: 0.85rem;
  color: var(--global-text-color-light);
  margin-bottom: 0.75rem;
}

.hover-meta i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

.hover-hint {
  font-size: 0.8rem;
  color: var(--global-theme-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ========== 展开章节区域 ========== */
.chapters-expanded {
  margin: 3rem 0;
  display: none;
}

.chapters-section {
  background: var(--global-bg-color);
  border: 3px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2.5rem;
  animation: slideDown 0.4s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chapters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 3px solid var(--global-divider-color);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-info i {
  color: var(--global-theme-color);
  font-size: 1.4rem;
}

.header-info h3 {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0;
}

.total-badge {
  background: var(--global-theme-color);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
}

.collapse-btn {
  background: var(--global-theme-color);
  color: white;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 24px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: all 0.3s;
}

.collapse-btn:hover {
  background: var(--global-hover-color);
  transform: scale(1.05);
}

/* 章节横条 */
.chapters-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chapter-bar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.75rem;
  background: var(--global-code-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 14px;
  text-decoration: none;
  color: var(--global-text-color);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-bar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: linear-gradient(180deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  transform: scaleY(0);
  transition: transform 0.4s;
}

.chapter-bar:hover::before {
  transform: scaleY(1);
}

.chapter-bar:hover {
  transform: translateX(12px);
  background: var(--global-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 6px 20px rgba(var(--global-theme-color-rgb), 0.25);
}

.bar-number {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.bar-title {
  flex: 1;
  font-weight: 500;
  font-size: 1.05rem;
}

.bar-icon {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-12px);
  transition: all 0.4s;
  font-size: 1.1rem;
}

.chapter-bar:hover .bar-icon {
  opacity: 1;
  transform: translateX(0);
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
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .carousel-3d-viewport {
    height: 380px;
  }
  
  .carousel-item-3d {
    width: 160px;
    height: 240px;
    margin-left: -80px;
    margin-top: -120px;
    transform: 
      rotateY(calc(360deg / var(--total) * var(--index)))
      translateZ(350px);
  }
  
  .carousel-item-3d img {
    height: 180px;
  }
  
  .hover-card {
    width: 90%;
    max-width: 380px;
    flex-direction: column;
  }
  
  .hover-image {
    width: 100%;
    height: 180px;
    border-radius: 17px 17px 0 0;
  }
  
  .carousel-nav {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .nav-prev {
    left: 1rem;
  }
  
  .nav-next {
    right: 1rem;
  }
  
  .chapters-section {
    padding: 1.5rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>