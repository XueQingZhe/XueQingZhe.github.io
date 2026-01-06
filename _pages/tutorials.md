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

<!-- 弧形画廊区域 -->
<div class="arc-gallery-container">
  <div class="arc-viewport">
    <div class="arc-carousel" id="arcCarousel">
      {% assign tutorial_series = site.data.tutorials %}
      
      {% for series in tutorial_series %}
      <div class="arc-card" data-index="{{ forloop.index0 }}">
        <div class="card-inner" onclick="selectTutorial({{ forloop.index }})">
          <!-- 卡片内容 -->
          <div class="card-image-container">
            {% if series.image %}
            <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="card-image">
            {% else %}
            <div class="card-placeholder">
              <i class="fas fa-book-open fa-3x"></i>
            </div>
            {% endif %}
            
            {% if series.status %}
            <span class="card-status badge-{{ series.status_color }}">
              <i class="fas fa-circle"></i>
            </span>
            {% endif %}
          </div>
          
          <div class="card-info">
            <h3 class="card-title">{{ series.title }}</h3>
            <p class="card-chapters">
              <i class="fas fa-list"></i>
              {{ series.chapters.size }} 章节
            </p>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>
  
  <!-- 导航按钮 -->
  <button class="nav-btn nav-prev" onclick="rotateCarousel(-1)">
    <i class="fas fa-chevron-left"></i>
  </button>
  <button class="nav-btn nav-next" onclick="rotateCarousel(1)">
    <i class="fas fa-chevron-right"></i>
  </button>
  
  <!-- 指示器 -->
  <div class="carousel-indicators">
    {% for series in tutorial_series %}
    <span class="indicator" data-index="{{ forloop.index0 }}" onclick="goToSlide({{ forloop.index0 }})"></span>
    {% endfor %}
  </div>
</div>

<!-- 详情展示区域 -->
<div class="tutorial-details-section" id="detailsSection">
  {% for series in tutorial_series %}
  <div class="tutorial-detail" id="detail-{{ forloop.index }}" style="display: none;">
    <div class="detail-header">
      <div class="detail-title-area">
        <h2 class="detail-title">
          <i class="fas fa-book"></i>
          {{ series.title }}
        </h2>
        {% if series.status %}
        <span class="detail-badge badge-{{ series.status_color }}">
          <i class="fas fa-circle pulse-dot"></i>
          {{ series.status }}
        </span>
        {% endif %}
      </div>
      <button class="detail-close" onclick="closeDetail()">
        <i class="fas fa-times"></i>
        收起
      </button>
    </div>
    
    <div class="detail-content">
      <div class="detail-left">
        {% if series.image %}
        <div class="detail-image-wrapper">
          <div class="image-bg" style="background-image: url('{{ series.image | relative_url }}')"></div>
          <img src="{{ series.image | relative_url }}" alt="{{ series.title }}" class="detail-image">
        </div>
        {% else %}
        <div class="detail-placeholder">
          <i class="fas fa-book-open fa-4x"></i>
        </div>
        {% endif %}
        
        <div class="detail-description">
          <h4><i class="fas fa-info-circle"></i> 教程简介</h4>
          <p>{{ series.description }}</p>
        </div>
      </div>
      
      <div class="detail-right">
        <div class="chapters-header">
          <i class="fas fa-list-ul"></i>
          <span>章节列表</span>
          <span class="chapters-total">{{ series.chapters.size }}</span>
        </div>
        
        <div class="chapters-container">
          {% for chapter in series.chapters %}
          <a href="{{ series.base_url }}/{{ chapter.file | remove: '.md' }}/" class="chapter-link">
            <span class="chapter-num">{{ forloop.index }}</span>
            <span class="chapter-name">{{ chapter.title }}</span>
            <i class="fas fa-arrow-right"></i>
          </a>
          {% endfor %}
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

<script>
let currentIndex = 0;
let totalCards = {{ tutorial_series.size }};
let selectedTutorial = null;

function rotateCarousel(direction) {
  currentIndex = (currentIndex + direction + totalCards) % totalCards;
  updateCarousel();
}

function goToSlide(index) {
  currentIndex = index;
  updateCarousel();
}

function updateCarousel() {
  const cards = document.querySelectorAll('.arc-card');
  const indicators = document.querySelectorAll('.indicator');
  
  cards.forEach((card, index) => {
    const offset = index - currentIndex;
    card.style.setProperty('--offset', offset);
    
    if (offset === 0) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  indicators.forEach((indicator, index) => {
    if (index === currentIndex) {
      indicator.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }
  });
}

function selectTutorial(id) {
  // 隐藏所有详情
  document.querySelectorAll('.tutorial-detail').forEach(detail => {
    detail.style.display = 'none';
  });
  
  // 显示选中的详情
  const detail = document.getElementById(`detail-${id}`);
  if (detail) {
    detail.style.display = 'block';
    selectedTutorial = id;
    
    // 滚动到详情区域
    setTimeout(() => {
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

function closeDetail() {
  if (selectedTutorial) {
    const detail = document.getElementById(`detail-${selectedTutorial}`);
    if (detail) {
      detail.style.display = 'none';
    }
    selectedTutorial = null;
  }
}

// 初始化
updateCarousel();
</script>

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

/* ========== 弧形画廊 ========== */
.arc-gallery-container {
  position: relative;
  height: 500px;
  margin: 3rem 0;
  overflow: hidden;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.03) 0%,
    transparent 100%
  );
  border-radius: 20px;
}

.arc-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  perspective: 1500px;
}

.arc-carousel {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.arc-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 280px;
  height: 380px;
  transform-style: preserve-3d;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  /* 3D弧形排列 */
  transform: 
    translate(-50%, -50%)
    rotateY(calc(var(--offset) * 45deg))
    translateZ(calc(400px - abs(var(--offset)) * 100px))
    scale(calc(1 - abs(var(--offset)) * 0.2));
  
  opacity: calc(1 - abs(var(--offset)) * 0.3);
  z-index: calc(10 - abs(var(--offset)));
}

.arc-card.active {
  z-index: 100;
}

.card-inner {
  width: 100%;
  height: 100%;
  background: var(--global-bg-color);
  border: 2px solid var(--global-divider-color);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.arc-card:hover .card-inner,
.arc-card.active .card-inner {
  border-color: var(--global-theme-color);
  box-shadow: 0 12px 36px rgba(var(--global-theme-color-rgb), 0.3);
}

/* 卡片图片 */
.card-image-container {
  width: 100%;
  height: 280px;
  position: relative;
  overflow: hidden;
  background: #000;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.arc-card:hover .card-image {
  transform: scale(1.1);
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

.card-status {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.4rem 0.9rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.card-status i {
  font-size: 0.5rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 卡片信息 */
.card-info {
  padding: 1.25rem;
  background: var(--global-bg-color);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
}

.card-chapters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--global-text-color-light);
  font-size: 0.9rem;
  margin: 0;
}

.card-chapters i {
  color: var(--global-theme-color);
}

/* 导航按钮 */
.nav-btn {
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

.nav-btn:hover {
  background: var(--global-theme-color);
  transform: translateY(-50%) scale(1.1);
}

.nav-prev {
  left: 2rem;
}

.nav-next {
  right: 2rem;
}

/* 指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.75rem;
  z-index: 200;
}

.indicator {
  width: 12px;
  height: 12px;
  background: rgba(var(--global-text-color-rgb), 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
}

.indicator:hover {
  background: rgba(var(--global-text-color-rgb), 0.5);
  transform: scale(1.2);
}

.indicator.active {
  background: var(--global-theme-color);
  width: 32px;
  border-radius: 6px;
}

/* ========== 详情区域 ========== */
.tutorial-details-section {
  margin: 3rem 0;
}

.tutorial-detail {
  background: var(--global-bg-color);
  border: 2px solid var(--global-theme-color);
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.detail-title-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-title i {
  color: var(--global-theme-color);
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg,
    var(--global-theme-color) 0%,
    var(--global-hover-color) 100%
  );
  color: white;
  padding: 0.5rem 1.1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.pulse-dot {
  font-size: 0.5rem;
}

.detail-close {
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
  white-space: nowrap;
}

.detail-close:hover {
  background: var(--global-hover-color);
  transform: scale(1.05);
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 2.5rem;
}

/* 详情左侧 */
.detail-left {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-image-wrapper {
  width: 100%;
  height: 350px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: #000;
}

.image-bg {
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(20px) brightness(0.4);
  transform: scale(1.1);
}

.detail-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2rem;
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.6));
}

.detail-placeholder {
  width: 100%;
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg,
    rgba(var(--global-theme-color-rgb), 0.1) 0%,
    rgba(var(--global-theme-color-rgb), 0.05) 100%
  );
  border-radius: 16px;
  color: var(--global-theme-color);
  opacity: 0.3;
}

.detail-description {
  background: var(--global-code-bg-color);
  padding: 1.5rem;
  border-radius: 12px;
}

.detail-description h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--global-text-color);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-description h4 i {
  color: var(--global-theme-color);
}

.detail-description p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--global-text-color-light);
  margin: 0;
}

/* 详情右侧 - 章节 */
.detail-right {
  display: flex;
  flex-direction: column;
}

.chapters-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  color: var(--global-theme-color);
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--global-divider-color);
}

.chapters-total {
  background: var(--global-theme-color);
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin-left: auto;
}

.chapters-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.chapters-container::-webkit-scrollbar {
  width: 6px;
}

.chapters-container::-webkit-scrollbar-track {
  background: var(--global-divider-color);
  border-radius: 3px;
}

.chapters-container::-webkit-scrollbar-thumb {
  background: var(--global-theme-color);
  border-radius: 3px;
}

.chapter-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.1rem;
  background: var(--global-bg-color);
  border: 1px solid var(--global-divider-color);
  border-radius: 10px;
  color: var(--global-text-color);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chapter-link::before {
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

.chapter-link:hover::before {
  transform: scaleY(1);
}

.chapter-link:hover {
  transform: translateX(4px);
  background: var(--global-code-bg-color);
  border-color: var(--global-theme-color);
  box-shadow: 0 3px 10px rgba(0,0,0,0.08);
}

.chapter-num {
  width: 30px;
  height: 30px;
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
  font-size: 0.85rem;
  flex-shrink: 0;
}

.chapter-name {
  flex: 1;
  font-weight: 500;
  font-size: 0.9rem;
}

.chapter-link i {
  color: var(--global-theme-color);
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s;
  font-size: 0.85rem;
}

.chapter-link:hover i {
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
  .arc-gallery-container {
    height: 450px;
  }
  
  .arc-card {
    width: 240px;
    height: 340px;
  }
  
  .card-image-container {
    height: 240px;
  }
  
  .detail-content {
    grid-template-columns: 1fr;
  }
  
  .chapters-container {
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
  
  .arc-gallery-container {
    height: 400px;
  }
  
  .arc-card {
    width: 220px;
    height: 320px;
  }
  
  .card-image-container {
    height: 220px;
  }
  
  .nav-btn {
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
  
  .tutorial-detail {
    padding: 1.5rem;
  }
  
  .detail-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .planned-grid {
    grid-template-columns: 1fr;
  }
}
</style>