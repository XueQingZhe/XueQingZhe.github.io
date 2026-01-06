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
  <div class="hero-content">
    <h1 class="hero-title">
      <i class="fas fa-graduation-cap"></i>
      教程系列
    </h1>
    <p class="hero-subtitle">系统化的技术学习路径</p>
  </div>
</div>

<!-- 主要内容区域 -->
<div class="tutorials-main-layout">
  <!-- 左侧弧形轮播区 -->
  <div class="carousel-section">
    <div class="carousel-container" id="carouselContainer">
      {% assign tutorial_series = site.data.tutorials %}
      
      {% for series in tutorial_series %}
      <div class="carousel-card" data-index="{{ forloop.index0 }}" onclick="showDetail({{ forloop.index }})">
        <div class="card-image">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="card-placeholder">
            <i class="fas fa-book-open fa-2x"></i>
          </div>
          {% endif %}
          
          {% if series.status %}
          <span class="card-badge badge-{{ series.status_color }}">
            <i class="fas fa-circle"></i>
          </span>
          {% endif %}
        </div>
        <div class="card-label">{{ series.title }}</div>
      </div>
      {% endfor %}
    </div>
    
    <div class="carousel-controls">
      <button class="ctrl-btn" onclick="prevSlide()">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="carousel-dots">
        {% for series in tutorial_series %}
        <span class="dot" data-index="{{ forloop.index0 }}" onclick="goToSlide({{ forloop.index0 }})"></span>
        {% endfor %}
      </div>
      <button class="ctrl-btn" onclick="nextSlide()">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  </div>
  
  <!-- 右侧详情展示区 -->
  <div class="detail-section" id="detailSection">
    <div class="detail-placeholder">
      <i class="fas fa-hand-pointer fa-3x"></i>
      <p>点击左侧卡片查看详情</p>
    </div>
    
    {% for series in tutorial_series %}
    <div class="detail-panel" id="panel-{{ forloop.index }}" style="display: none;">
      <div class="detail-header">
        <div class="detail-image-preview">
          {% if series.image %}
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}">
          {% else %}
          <div class="preview-placeholder">
            <i class="fas fa-book-open fa-2x"></i>
          </div>
          {% endif %}
        </div>
        
        <div class="detail-info">
          <h2 class="detail-title">
            <i class="fas fa-book"></i>
            {{ series.title }}
          </h2>
          {% if series.status %}
          <span class="detail-status badge-{{ series.status_color }}">
            <i class="fas fa-circle pulse"></i>
            {{ series.status }}
          </span>
          {% endif %}
          <p class="detail-desc">{{ series.description }}</p>
          <div class="detail-meta">
            <span><i class="fas fa-list"></i> {{ series.chapters.size }} 章节</span>
          </div>
        </div>
      </div>
      
      <!-- 章节列表 -->
      <div class="chapters-list" id="chapters-{{ forloop.index }}">
        {% for chapter in series.chapters %}
        <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-bar">
          <span class="chapter-num">{{ forloop.index }}</span>
          <span class="chapter-text">{{ chapter.title }}</span>
          <i class="fas fa-arrow-right"></i>
        </a>
        {% endfor %}
      </div>
    </div>
    {% endfor %}
  </div>
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
let currentSlide = 0;
let totalSlides = {{ tutorial_series.size }};

function updateCarousel() {
  const cards = document.querySelectorAll('.carousel-card');
  const dots = document.querySelectorAll('.dot');
  
  cards.forEach((card, index) => {
    const offset = index - currentSlide;
    card.style.setProperty('--offset', offset);
    
    if (index === currentSlide) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  dots.forEach((dot, index) => {
    if (index === currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  updateCarousel();
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % totalSlides;
  updateCarousel();
}

function goToSlide(index) {
  currentSlide = index;
  updateCarousel();
}

function showDetail(id) {
  // 隐藏占位符
  document.querySelector('.detail-placeholder').style.display = 'none';
  
  // 隐藏所有面板
  document.querySelectorAll('.detail-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // 显示选中的面板
  const panel = document.getElementById(`panel-${id}`);
  if (panel) {
    panel.style.display = 'block';
    panel.style.animation = 'slideIn 0.4s ease-out';
  }
}

// 初始化
updateCarousel();
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

/* ========== 主布局: 左右分栏 ========== */
.tutorials-main-layout {
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 2rem;
  margin: 3rem 0;
  min-height: 600px;
}

/* ========== 左侧轮播区 ========== */
.carousel-section {
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.05) 0%,
    rgba(var(--global-theme-color-rgb), 0.02) 100%
  );
  border: 2px solid var(--global-divider-color);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.carousel-container {
  position: relative;
  height: 450px;
  perspective: 1200px;
  overflow: visible;
}

.carousel-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 300px;
  transform-style: preserve-3d;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  /* 弧形排列 */
  transform: 
    translate(-50%, -50%)
    rotateY(calc(var(--offset) * 35deg))
    translateZ(calc(300px - abs(var(--offset)) * 80px))
    scale(calc(1 - abs(var(--offset)) * 0.2));
  
  opacity: calc(1 - abs(var(--offset)) * 0.4);
  z-index: calc(10 - abs(var(--offset)));
}

.carousel-card.active {
  z-index: 50;
}

.card-image {
  width: 100%;
  height: 240px;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: all 0.3s;
}

.carousel-card:hover .card-image,
.carousel-card.active .card-image {
  border-color: var(--global-theme-color);
  box-shadow: 0 8px 24px rgba(var(--global-theme-color-rgb), 0.3);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-placeholder {
  width: 100%;
  height: 100%;
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

.card-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.card-badge i {
  font-size: 0.4rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.card-label {
  margin-top: 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--global-text-color);
}

/* 轮播控制 */
.carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.ctrl-btn {
  width: 40px;
  height: 40px;
  background: var(--global-theme-color);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.ctrl-btn:hover {
  background: var(--global-hover-color);
  transform: scale(1.1);
}

.carousel-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  background: var(--global-divider-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.dot:hover {
  background: var(--global-text-color-light);
  transform: scale(1.2);
}

.dot.active {
  background: var(--global-theme-color);
  width: 24px;
  border-radius: 5px;
}

/* ========== 右侧详情区 ========== */
.detail-section {
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2rem;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.detail-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--global-text-color-light);
  opacity: 0.5;
}

.detail-placeholder i {
  color: var(--global-theme-color);
  margin-bottom: 1rem;
}

.detail-placeholder p {
  font-size: 1.1rem;
  margin: 0;
}

.detail-panel {
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 详情头部 */
.detail-header {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.detail-image-preview {
  width: 150px;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
}

.detail-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
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

.detail-info {
  flex: 1;
}

.detail-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-title i {
  color: var(--global-theme-color);
}

.detail-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.detail-status i {
  font-size: 0.5rem;
}

.detail-desc {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--global-text-color-light);
  margin: 0 0 1rem 0;
}

.detail-meta {
  display: flex;
  gap: 1rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
}

.detail-meta i {
  color: var(--global-theme-color);
  margin-right: 0.4rem;
}

/* ========== 章节列表(横条) ========== */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.chapters-list::-webkit-scrollbar {
  width: 6px;
}

.chapters-list::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 3px;
}

.chapters-list::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 3px;
}

.chapter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  background: var(--global-code-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 12px;
  text-decoration: none;
  color: var(--global-text-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-bar::before {
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
  transition: transform 0.3s;
}

.chapter-bar:hover::before {
  transform: scaleY(1);
}

.chapter-bar:hover {
  transform: translateX(8px);
  background: var(--global-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 4px 12px rgba(var(--global-theme-color-rgb), 0.2);
}

.chapter-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.chapter-text {
  flex: 1;
  font-weight: 500;
  font-size: 0.95rem;
}

.chapter-bar i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
}

.chapter-bar:hover i {
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
@media (max-width: 1024px) {
  .tutorials-main-layout {
    grid-template-columns: 1fr;
  }
  
  .carousel-section {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .carousel-card {
    width: 180px;
    height: 260px;
  }
  
  .card-image {
    height: 200px;
  }
  
  .detail-section {
    padding: 1.5rem;
  }
  
  .detail-header {
    flex-direction: column;
  }
  
  .detail-image-preview {
    width: 100%;
    height: 200px;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>